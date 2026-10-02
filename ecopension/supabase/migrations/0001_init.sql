-- 청산도 에코 펜션 — 초기 스키마 (설계 초안)
-- 규칙 요약
--   * 객실 1~8호: 홀수 = small(작은 방), 짝수 = large(큰 방)
--   * 요금 = room_type × season_type(peak/shoulder/off) × day_type(weekday/weekend)
--   * 1박 요금은 숙박하는 날짜 기준. 금·토 숙박 + 공휴일 전날 = 주말
--   * 시즌 구간에 없는 날짜 = off(비수기)

create extension if not exists btree_gist;

-- ───────────────────────────── 열거형 ─────────────────────────────
create type season_type        as enum ('peak', 'shoulder', 'off');
create type day_type           as enum ('weekday', 'weekend');
create type reservation_status as enum ('pending', 'confirmed', 'checked_in', 'completed', 'cancelled', 'expired');
create type payment_channel    as enum ('online', 'offline');
create type payment_status     as enum ('ready', 'done', 'partial_cancelled', 'cancelled', 'failed');

-- ───────────────────────────── 설정 ─────────────────────────────
create table settings (
  id                 boolean primary key default true check (id), -- 단일 행
  weekend_days       int[]   not null default '{5,6}',           -- ISO 요일: 5=금, 6=토 숙박
  holiday_eve_is_weekend boolean not null default true,
  hold_minutes       int     not null default 15,                -- 결제 대기 선점 시간
  check_in_time      time    not null default '15:00',
  check_out_time     time    not null default '11:00',
  max_nights         int     not null default 14
);
insert into settings default values;

-- ───────────────────────────── 객실 ─────────────────────────────
create table room_types (
  code             text primary key,             -- 'small' | 'large'
  name             text not null,
  base_guests      int  not null,
  max_guests       int  not null,
  extra_person_fee int  not null default 0,
  check (max_guests >= base_guests)
);
insert into room_types (code, name, base_guests, max_guests) values
  ('small', '작은 방', 2, 4),
  ('large', '큰 방',   4, 6);

create table rooms (
  id          smallint primary key check (id between 1 and 8),  -- 호수 = id
  room_type   text not null references room_types(code),
  name        text not null,
  description text,
  amenities   text[] not null default '{}',
  images      text[] not null default '{}',                      -- Supabase Storage 경로
  is_active   boolean not null default true,
  check ((id % 2 = 1 and room_type = 'small') or (id % 2 = 0 and room_type = 'large'))
);
insert into rooms (id, room_type, name)
select n, case when n % 2 = 1 then 'small' else 'large' end, n || '호'
from generate_series(1, 8) as n;

-- ───────────────────────────── 요금 ─────────────────────────────
create table rates (
  room_type   text        not null references room_types(code),
  season      season_type not null,
  day         day_type    not null,
  price       int         not null check (price >= 0),
  updated_at  timestamptz not null default now(),
  primary key (room_type, season, day)
);
-- 12칸을 0원으로 생성해 두고 관리자 화면에서 채움
insert into rates (room_type, season, day, price)
select rt.code, s, d, 0
from room_types rt, unnest(enum_range(null::season_type)) s, unnest(enum_range(null::day_type)) d;

create table season_periods (
  id          bigint generated always as identity primary key,
  season      season_type not null check (season <> 'off'),      -- 비수기는 기본값이라 저장 안 함
  start_date  date not null,
  end_date    date not null,                                     -- 포함
  label       text,                                              -- 예: '2026 여름 성수기'
  check (end_date >= start_date)
);
create index on season_periods using gist (daterange(start_date, end_date, '[]'));

create table holidays (
  date  date primary key,
  name  text not null
);

-- ───────────────────────────── 예약 ─────────────────────────────
create table reservations (
  id             uuid primary key default gen_random_uuid(),
  code           text unique not null
                 default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10)), -- 토스 orderId 겸 예약번호
  room_id        smallint not null references rooms(id),
  check_in       date not null,
  check_out      date not null,
  guests         int  not null check (guests > 0),
  guest_name     text not null,
  guest_phone    text not null,
  guest_email    text,
  request_note   text,
  status         reservation_status not null default 'pending',
  total_amount   int  not null check (total_amount >= 0),
  source         text not null default 'web',                    -- web | phone | walk_in
  expires_at     timestamptz,                                    -- pending 선점 만료 시각
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  check (check_out > check_in),
  -- 같은 방·겹치는 기간에 살아있는 예약은 하나만 (이중 예약 DB 차단)
  exclude using gist (
    room_id with =,
    daterange(check_in, check_out, '[)') with &&
  ) where (status in ('pending', 'confirmed', 'checked_in'))
);

-- 1박별 요금 스냅샷 (요금표가 바뀌어도 기존 예약 금액 보존)
create table reservation_nights (
  reservation_id uuid not null references reservations(id) on delete cascade,
  night          date not null,
  season         season_type not null,
  day            day_type    not null,
  price          int not null,
  primary key (reservation_id, night)
);

create table room_blocks (
  id         bigint generated always as identity primary key,
  room_id    smallint not null references rooms(id),
  start_date date not null,
  end_date   date not null,                                      -- 미포함 (예약과 동일하게 [start, end))
  reason     text,
  check (end_date > start_date)
);

-- ───────────────────────────── 결제 ─────────────────────────────
create table payments (
  id                    uuid primary key default gen_random_uuid(),
  reservation_id        uuid not null references reservations(id),
  channel               payment_channel not null,                -- online | offline
  provider              text not null,                           -- toss-online | offline-terminal | manual
  method                text,                                    -- 카드, 간편결제, 계좌이체, 현금 …
  provider_payment_key  text unique,                             -- 토스 paymentKey / 단말기 승인번호
  amount                int not null,
  cancelled_amount      int not null default 0,
  status                payment_status not null default 'ready',
  approved_at           timestamptz,
  raw                   jsonb,                                   -- 원본 응답 (분쟁·정산 대비)
  created_at            timestamptz not null default now()
);

-- ───────────────────────────── 관리자 ─────────────────────────────
create table admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade
);

create function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from admin_users where user_id = auth.uid());
$$;

-- ───────────────────────────── 요금 계산 ─────────────────────────────
create function season_of(d date) returns season_type
language sql stable as $$
  select coalesce(
    (select season from season_periods
      where d between start_date and end_date
      order by case season when 'peak' then 0 else 1 end    -- 겹치면 성수기 우선
      limit 1),
    'off'::season_type);
$$;

create function day_type_of(d date) returns day_type
language sql stable as $$
  select case
    when extract(isodow from d)::int = any (s.weekend_days) then 'weekend'::day_type
    when s.holiday_eve_is_weekend and exists (select 1 from holidays h where h.date = d + 1) then 'weekend'::day_type
    else 'weekday'::day_type
  end
  from settings s;
$$;

-- 1박별 견적. 화면 표시·예약 생성 모두 이 함수 하나만 사용
create function quote_stay(p_room_id smallint, p_check_in date, p_check_out date, p_guests int default null)
returns table (night date, season season_type, day day_type, price int)
language sql stable as $$
  with n as (
    select g::date as night
    from generate_series(p_check_in, p_check_out - 1, interval '1 day') g
  ), r as (
    select rm.room_type, rt.base_guests, rt.extra_person_fee
    from rooms rm join room_types rt on rt.code = rm.room_type
    where rm.id = p_room_id
  )
  select n.night, season_of(n.night), day_type_of(n.night),
         ra.price + greatest(coalesce(p_guests, r.base_guests) - r.base_guests, 0) * r.extra_person_fee
  from n
  cross join r
  join rates ra on ra.room_type = r.room_type
               and ra.season = season_of(n.night)
               and ra.day = day_type_of(n.night)
  order by n.night;
$$;

-- ───────────────────────────── 빈 방 조회 ─────────────────────────────
-- 개인정보 없이 날짜×방 별 예약 가능 여부만 공개
create function room_availability(p_from date, p_to date)
returns table (night date, room_id smallint, available boolean)
language sql stable security definer set search_path = public as $$
  select d::date, rm.id,
         rm.is_active
         and not exists (
           select 1 from reservations r
           where r.room_id = rm.id
             and r.status in ('pending', 'confirmed', 'checked_in')
             and (r.status <> 'pending' or r.expires_at > now())
             and d::date >= r.check_in and d::date < r.check_out)
         and not exists (
           select 1 from room_blocks b
           where b.room_id = rm.id and d::date >= b.start_date and d::date < b.end_date)
  from generate_series(p_from, p_to - 1, interval '1 day') d
  cross join rooms rm
  order by 1, 2;
$$;

-- ───────────────────────────── 예약 선점 ─────────────────────────────
-- 서버(service role)에서만 호출. 금액은 여기서 계산하므로 클라이언트 금액은 무시됨
create function create_pending_reservation(
  p_room_id smallint, p_check_in date, p_check_out date, p_guests int,
  p_name text, p_phone text, p_email text default null, p_note text default null
) returns reservations
language plpgsql security definer set search_path = public as $$
declare
  s settings;
  rt room_types;
  total int;
  res reservations;
begin
  select * into s from settings;
  select t.* into rt from rooms r join room_types t on t.code = r.room_type
   where r.id = p_room_id and r.is_active;
  if not found then raise exception 'ROOM_NOT_AVAILABLE'; end if;

  if p_check_in < (now() at time zone 'Asia/Seoul')::date then raise exception 'PAST_DATE'; end if;
  if p_check_out - p_check_in > s.max_nights then raise exception 'TOO_MANY_NIGHTS'; end if;
  if p_guests > rt.max_guests then raise exception 'TOO_MANY_GUESTS'; end if;
  if exists (select 1 from room_blocks b where b.room_id = p_room_id
             and daterange(b.start_date, b.end_date, '[)') && daterange(p_check_in, p_check_out, '[)'))
  then raise exception 'ROOM_BLOCKED'; end if;

  -- 시간이 지난 선점은 먼저 풀어줌 (cron 주기 사이의 공백 보완)
  update reservations set status = 'expired', updated_at = now()
   where room_id = p_room_id and status = 'pending' and expires_at <= now();

  select sum(q.price) into total from quote_stay(p_room_id, p_check_in, p_check_out, p_guests) q;
  if total is null or total <= 0 then raise exception 'RATE_NOT_SET'; end if;

  insert into reservations (room_id, check_in, check_out, guests, guest_name, guest_phone,
                            guest_email, request_note, total_amount, expires_at)
  values (p_room_id, p_check_in, p_check_out, p_guests, p_name, p_phone,
          p_email, p_note, total, now() + make_interval(mins => s.hold_minutes))
  returning * into res;   -- 겹치면 exclusion 제약 위반(23P01) → API에서 '이미 예약된 방'으로 응답

  insert into reservation_nights (reservation_id, night, season, day, price)
  select res.id, q.night, q.season, q.day, q.price
  from quote_stay(p_room_id, p_check_in, p_check_out, p_guests) q;

  return res;
end;
$$;

-- 결제 대기 만료 (Supabase 대시보드에서 pg_cron 활성화 후)
-- select cron.schedule('expire-pending', '* * * * *',
--   $$update reservations set status = 'expired', updated_at = now()
--     where status = 'pending' and expires_at <= now()$$);

-- ───────────────────────────── RLS ─────────────────────────────
alter table settings           enable row level security;
alter table room_types         enable row level security;
alter table rooms              enable row level security;
alter table rates              enable row level security;
alter table season_periods     enable row level security;
alter table holidays           enable row level security;
alter table reservations       enable row level security;
alter table reservation_nights enable row level security;
alter table room_blocks        enable row level security;
alter table payments           enable row level security;
alter table admin_users        enable row level security;

-- 공개 읽기: 객실·요금·시즌 (요금표를 손님에게 보여주기 위함)
create policy public_read on settings       for select using (true);
create policy public_read on room_types     for select using (true);
create policy public_read on rooms          for select using (true);
create policy public_read on rates          for select using (true);
create policy public_read on season_periods for select using (true);
create policy public_read on holidays       for select using (true);

-- 관리자 전체 권한
create policy admin_all on settings           for all using (is_admin()) with check (is_admin());
create policy admin_all on room_types         for all using (is_admin()) with check (is_admin());
create policy admin_all on rooms              for all using (is_admin()) with check (is_admin());
create policy admin_all on rates              for all using (is_admin()) with check (is_admin());
create policy admin_all on season_periods     for all using (is_admin()) with check (is_admin());
create policy admin_all on holidays           for all using (is_admin()) with check (is_admin());
create policy admin_all on reservations       for all using (is_admin()) with check (is_admin());
create policy admin_all on reservation_nights for all using (is_admin()) with check (is_admin());
create policy admin_all on room_blocks        for all using (is_admin()) with check (is_admin());
create policy admin_all on payments           for all using (is_admin()) with check (is_admin());
create policy admin_read on admin_users       for select using (is_admin());

-- 예약·결제 생성은 서버(service role, RLS 우회)에서만. 손님에게 직접 쓰기 권한 없음
revoke execute on function create_pending_reservation from anon, authenticated;
