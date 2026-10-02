# 청산도 에코 펜션 — 시스템 구조 설계

> 코딩 전 단계의 구조 문서입니다. 화면·데이터·결제·요금 규칙을 먼저 확정하고, 이 문서를 기준으로 구현합니다.

## 1. 한눈에 보기

```
[손님 브라우저] ──▶ Next.js (Vercel)  ──▶ Supabase (Postgres · Auth · Storage)
                       │                        ▲
                       │ 결제 승인(서버)         │ pg_cron: 미결제 예약 자동 만료
                       ▼                        │
                  토스페이먼츠 API ── 웹훅 ──────┘ (Next.js API로 수신 → DB 갱신)

[관리자] ──▶ /admin (Supabase Auth 로그인) ──▶ 요금·시즌·예약·객실 관리
[향후] 오프라인 단말기 ──▶ 같은 payments 테이블에 channel='offline'로 기록
```

## 2. 호스팅: Supabase가 맞을까?

**Supabase는 "백엔드"로는 아주 적합하고, "웹사이트 호스팅"은 Vercel을 함께 쓰는 구성을 권장합니다.**

| 역할 | 서비스 | 이유 |
| --- | --- | --- |
| DB · 인증 · 이미지 저장 | **Supabase** | Postgres라 예약 겹침 방지를 DB 제약으로 강제 가능. 관리자 로그인(Auth), 객실 사진(Storage), 예약 만료 스케줄(pg_cron) 모두 내장 |
| 웹사이트 · API | **Vercel** (Next.js) | Supabase 자체엔 Next.js 서버 호스팅 기능이 없음. Vercel 무료 플랜으로 충분, GitHub push 시 자동 배포 |
| 결제 | **토스페이먼츠** | 결제위젯 v2 (카드·간편결제·계좌이체) |

예상 비용: 펜션 규모에서는 Supabase Free + Vercel Hobby로 시작 가능. 운영 시작 시 Supabase Pro($25/월, 자동 백업·일시정지 없음) 권장.

## 3. 기술 스택

- **Next.js 15 (App Router) + TypeScript** — 페이지(SSR/SEO) + API 라우트를 한 프로젝트에
- **Tailwind CSS** — 스타일
- **Supabase JS** — DB 접근 (공개 화면은 anon key + RLS, 결제·관리 로직은 서버에서 service role)
- **@tosspayments/tosspayments-sdk** — 결제위젯 v2
- **date-fns** — 날짜 계산 (KST 기준)

## 4. 화면 구성 (사이트맵)

| 경로 | 화면 | 내용 |
| --- | --- | --- |
| `/` | 메인 | 히어로 이미지, 펜션 한 줄 소개, 객실 미리보기, 예약 바로가기, 오시는 길 |
| `/about` | 소개 | 펜션 이야기, 시설·부대시설, 이용 안내(체크인/아웃, 환불 규정), 오시는 길(완도항 → 청산도 배편) |
| `/rooms` | 객실안내 | 1~8호 목록 (작은 방 / 큰 방 필터) |
| `/rooms/[roomNo]` | 객실 상세 | 사진, 인원(기준/최대), 비품, 현재 시즌 요금표 |
| `/reservation` | 실시간 예약 | ① 캘린더에서 체크인·체크아웃 선택 → ② 빈 방 목록 + 1박별 요금 → ③ 예약자 정보 → ④ 토스 결제 |
| `/reservation/success` | 결제 완료 | 토스 리다이렉트 → 서버 승인 → 예약 확정 표시 |
| `/reservation/fail` | 결제 실패 | 실패 사유, 다시 시도 |
| `/reservation/lookup` | 예약 조회 | 예약번호 + 연락처로 조회 / 취소 요청 |
| `/tour` | 추천 주변관광 | 슬로길, 범바위, 서편제 촬영지, 유채꽃·보리밭, 지도 링크 |
| `/admin/*` | 관리자 | 아래 7장 |

## 5. 객실 규칙

- 총 8실, 1호 ~ 8호
- **홀수(1·3·5·7) = 작은 방(`small`)**, **짝수(2·4·6·8) = 큰 방(`large`)**
- 요금은 **방 타입(small/large) 단위**로 관리 → 4개 방이 같은 요금을 공유. (특정 방만 다르게 받고 싶으면 `rooms.price_override` 확장 여지 남김)

## 6. 요금 체계

### 6-1. 시기 3종

| 코드 | 이름 |
| --- | --- |
| `peak` | 성수기 |
| `shoulder` | 준성수기 |
| `off` | 비수기 |

관리자가 **날짜 구간**으로 지정 (예: 2026-07-15 ~ 2026-08-20 = 성수기). 구간에 해당하지 않는 날짜는 **비수기**로 간주.
매년 날짜가 바뀌므로 "연도별 구간"으로 저장합니다.

### 6-2. 주중 / 주말

- 1박 요금은 **숙박하는 날(체크인 날짜) 기준**으로 판정
- 기본 규칙: **금·토 숙박 = 주말**, 일~목 = 주중
- **공휴일 전날**도 주말 요금 적용 (관리자가 `holidays` 테이블에 등록)
- 주말 요일은 설정값(`settings.weekend_days`)으로 바꿀 수 있게 둠

### 6-3. 요금표 = 방 타입 × 시기 × 주중/주말 = 12칸

| | 비수기 주중 | 비수기 주말 | 준성수기 주중 | 준성수기 주말 | 성수기 주중 | 성수기 주말 |
| --- | --- | --- | --- | --- | --- | --- |
| 작은 방 | ₩ | ₩ | ₩ | ₩ | ₩ | ₩ |
| 큰 방 | ₩ | ₩ | ₩ | ₩ | ₩ | ₩ |

관리자 화면에서 이 표를 그대로 편집합니다. 추가 인원 요금(`extra_person_fee`)은 방 타입별로 별도.

### 6-4. 요금 계산 예시

7/31(금) 체크인 → 8/2(일) 체크아웃, 큰 방, 성수기:
- 7/31(금) 숙박 → 성수기 주말
- 8/1(토) 숙박 → 성수기 주말
- 합계 = 성수기 주말 × 2

여러 시기에 걸친 예약도 **1박씩 따로 계산해서 합산**합니다. 계산은 반드시 **서버(DB 함수 `quote_stay`)** 에서 하고, 결제 금액도 서버 계산값과 대조합니다 (브라우저 금액은 신뢰하지 않음).

## 7. 관리자 기능 (`/admin`)

| 경로 | 기능 |
| --- | --- |
| `/admin` | 대시보드 — 오늘 체크인/아웃, 이번 달 예약 현황 캘린더 |
| `/admin/reservations` | 예약 목록·상세, 수동 예약(전화 예약), 취소·환불 |
| `/admin/rooms` | 객실 정보·사진·인원·판매 여부 |
| `/admin/rates` | **요금표 편집** (6-3의 12칸 표 + 추가 인원 요금) |
| `/admin/seasons` | **시즌 구간 설정** (연도별 성수기·준성수기 날짜, 공휴일 등록) + 달력 미리보기 |
| `/admin/blocks` | 특정 날짜·객실 판매 막기 (공사, 개인 사용 등) |

접근 제어: Supabase Auth 로그인 + `admin_users` 테이블에 등록된 계정만 허용 (RLS로 강제).

## 8. 실시간 예약 흐름

```
1. 손님: 캘린더에서 날짜 선택
2. GET /api/availability?from&to   → 날짜별 남은 방 수 (캘린더에 표시)
3. GET /api/quote?room&checkIn&checkOut&guests → 1박별 요금 + 합계
4. POST /api/reservations          → status='pending', 15분간 방 선점(hold)
                                     DB 제약으로 동시 예약 시 한 명만 성공
5. 토스 결제위젯 requestPayment(orderId=예약번호, amount=서버 계산 금액)
6. 토스 → /reservation/success?paymentKey&orderId&amount 로 리다이렉트
7. POST /api/payments/confirm      → 금액 대조 → 토스 승인 API 호출(시크릿 키)
                                     → payments 기록, reservation status='confirmed'
8. 토스 웹훅 /api/payments/webhook → 취소·가상계좌 입금 등 상태 동기화
9. pg_cron(1분마다): 만료된 pending 예약 → 'expired' (방 다시 풀림)
```

### 예약 상태

`pending`(결제 대기·선점) → `confirmed`(결제 완료) → `checked_in` → `completed`
↘ `expired`(결제 안 함) / `cancelled`(취소·환불)

### 이중 예약 방지

`reservations` 테이블에 Postgres **배타 제약(EXCLUDE USING gist)**: 같은 방에서 `pending/confirmed/checked_in` 상태의 숙박 기간이 겹치면 INSERT 자체가 실패합니다. 애플리케이션 코드 버그가 있어도 DB가 막아줍니다.

## 9. 결제 설계 (토스 → 향후 오프라인 단말기)

결제 수단을 **provider 인터페이스**로 감싸서, 온라인/오프라인이 같은 테이블·같은 예약 흐름을 공유합니다.

```ts
// src/lib/payments/types.ts (설계안)
interface PaymentProvider {
  channel: 'online' | 'offline';
  confirm(input: ConfirmInput): Promise<PaymentResult>;
  cancel(paymentId: string, reason: string, amount?: number): Promise<PaymentResult>;
}
```

| 단계 | provider | 비고 |
| --- | --- | --- |
| 1차 | `toss-online` | 결제위젯 v2, 서버 승인 `POST /v1/payments/confirm` |
| 2차 | `offline-terminal` | 현장 단말기(토스 플레이스 등) 결제 결과를 관리자 화면에서 등록 또는 단말기 연동 API로 기록 |
| 공통 | `manual` | 현금·계좌이체 수기 등록 (전화 예약용) |

`payments` 테이블은 `channel`, `provider`, `method`, `provider_payment_key`, `raw` (원본 응답 JSON)를 저장해서, 어떤 경로로 결제되든 정산·환불을 한곳에서 봅니다.

### 키 관리

| 키 | 위치 |
| --- | --- |
| `NEXT_PUBLIC_TOSS_CLIENT_KEY` | 브라우저 (공개 가능) |
| `TOSS_SECRET_KEY` | 서버 전용 (Vercel 환경변수) |
| `SUPABASE_SERVICE_ROLE_KEY` | 서버 전용 — 절대 브라우저에 노출 금지 |

개발 중에는 토스 **테스트 키**로 실제 돈 없이 전체 흐름 검증 → 사업자 심사 후 라이브 키로 교체.

## 10. 데이터 모델

전체 SQL 초안: [`supabase/migrations/0001_init.sql`](../supabase/migrations/0001_init.sql)

```
room_types (small, large)
   └─< rooms (1~8호)
   └─< rates (room_type × season_type × day_type → price)

season_periods (연도별 날짜 구간 → peak/shoulder)
holidays       (공휴일 → 전날을 주말 요금으로)
settings       (weekend_days, hold_minutes, check_in/out 시각 등)

reservations  (room, check_in, check_out, guest, status, total_amount)
   └─< reservation_nights (1박별 요금 스냅샷: 날짜·시기·주중/주말·금액)
   └─< payments (channel, provider, status, amount, raw)

room_blocks (판매 중지 날짜)
admin_users
```

`reservation_nights`에 **예약 당시 요금을 스냅샷**으로 남겨서, 나중에 요금표를 바꿔도 기존 예약 금액이 변하지 않게 합니다.

## 11. 폴더 구조

```
ecopension/
├── docs/ARCHITECTURE.md              ← 이 문서
├── supabase/
│   └── migrations/0001_init.sql       DB 스키마·RLS·요금 계산 함수
├── public/images/{rooms,tour}/        정적 이미지 (운영 사진은 Supabase Storage)
└── src/
    ├── app/
    │   ├── (public)/                  손님용 화면
    │   │   ├── page.tsx               메인
    │   │   ├── about/                 소개
    │   │   ├── rooms/ · rooms/[roomNo]/  객실안내
    │   │   ├── reservation/           실시간 예약 (+ success / fail / lookup)
    │   │   └── tour/                  추천 주변관광
    │   ├── admin/                     관리자 (reservations, rooms, rates, seasons, blocks)
    │   └── api/
    │       ├── availability/          날짜별 빈 방
    │       ├── quote/                 요금 견적
    │       ├── reservations/          예약 생성(선점)·조회
    │       └── payments/{confirm,webhook}/  토스 승인·웹훅
    ├── components/{layout,home,rooms,reservation,admin,ui}/
    ├── lib/
    │   ├── supabase/                  browser / server / admin 클라이언트
    │   ├── pricing/                   시기·주중주말 판정, 요금 표시 포맷
    │   ├── reservation/               날짜 검증, 상태 전이
    │   ├── payments/                  PaymentProvider 인터페이스
    │   │   └── providers/             toss-online, offline-terminal, manual
    │   └── utils/                     KST 날짜, 금액 포맷
    └── types/                         DB 타입 (supabase gen types)
```

## 12. 개발 순서 (제안)

1. **기반** — Next.js 프로젝트 생성, Supabase 프로젝트 연결, 마이그레이션 적용
2. **정적 화면** — 메인·소개·객실안내·주변관광 (사진·문구만 있으면 완성)
3. **요금 관리** — `/admin/seasons`, `/admin/rates` + `quote_stay` 함수 → 견적이 맞는지 먼저 검증
4. **예약 캘린더** — 빈 방 조회, pending 선점, 만료 cron
5. **토스 결제** — 테스트 키로 결제 → 승인 → 확정, 실패·취소·웹훅
6. **예약 관리** — 관리자 예약 목록, 수동 예약, 환불
7. **알림** — 예약 확정 문자/카카오 알림톡 (선택)
8. **오프라인 단말기** — `offline-terminal` provider 추가

## 13. 결정이 필요한 항목

- [ ] 주말 기준: 금·토 숙박 = 주말 (공휴일 전날 포함) — 이대로 확정?
- [ ] 방 타입별 기준/최대 인원, 추가 인원 요금
- [ ] 결제 대기 선점 시간 (기본 15분)
- [ ] 환불 규정 (예: 7일 전 100%, 3일 전 50% …) — 취소 화면·자동 환불 금액 계산에 사용
- [ ] 예약 확정 알림 방식 (문자 / 카카오 알림톡 / 이메일)
- [ ] 도메인 (예: ecopension.co.kr)
