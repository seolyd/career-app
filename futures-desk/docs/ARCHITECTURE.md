# 아키텍처

## 한 장 요약

```
┌─ 아이폰 홈화면 (PWA) ───────────────────────────────┐
│  React 19 + Vite + TS + Tailwind 4                  │
│                                                     │
│  화면 ──────────────────────────────────────┐       │
│   마켓(홈) · 종목상세[써머리/뉴스/시그널/저널]│      │
│                                              │      │
│  시그널 엔진 (전부 클라이언트 계산) ─────────┤      │
│   게이트 → 레짐 → 디텍터6 → 합성 → 거래계획  │      │
│                                              │      │
│  IndexedDB (Dexie) ──────────────────────────┤      │
│   저널 · 시그널이력/채점 · 시세·캔들·뉴스 캐시│      │
└──────────────────┬──────────────────────────────────┘
                   │ HTTPS (same-origin)
┌──────────────────▼──────────────────────────────────┐
│  Vercel 서버리스 함수                                │
│   /api/quote   /api/candles   /api/news             │
│   - API 키 은닉  - CORS 해결  - 응답 정규화          │
│   - 엣지 캐시(s-maxage + stale-while-revalidate)     │
│   - 프로바이더 어댑터 + 폴백 체인                     │
└──────────────────┬──────────────────────────────────┘
                   │
      ┌────────────┼────────────┬─────────────┐
   Binance      Yahoo chart     RSS 소스들     FMP
   (BTC)        (CL/GC)        (뉴스)      (플랜 업그레이드 시)
```

## 왜 서버가 생겼나

세 가지 이유 때문에 순수 정적 PWA로는 안 됩니다.

1. **CORS.** 브라우저에서 시세 제공자를 직접 부르면 대부분 막힙니다. (BTC의 Binance는
   예외적으로 열려 있습니다.)
2. **API 키.** 유료 제공자로 갈아탈 때 키가 번들에 박히면 그대로 공개됩니다.
3. **주기.** 단타 시그널은 5분봉이 마감될 때마다 갱신돼야 합니다. GitHub Action이
   빌드 타임에 JSON을 굽는 방식(최소 5분 주기, 실제로는 수 분 지연)으로는 부족합니다.

대신 서버는 **얇게** 유지합니다. 서버가 하는 일은 중계·정규화·캐시뿐이고,
지표 계산도 시그널 판정도 전부 클라이언트에서 합니다. 그래야 (a) 서버리스 호출이
캔들 요청 한 번으로 끝나고, (b) 오프라인에서도 과거 시그널을 재현할 수 있고,
(c) 로직이 브라우저 안에 있어서 디버깅이 가능합니다. 계정도 로그인도 없습니다.

## 기술 선택

| 영역 | 선택 | 이유 |
| --- | --- | --- |
| 프레임워크 | React 19 + Vite + TypeScript | 기존 career-app과 동일한 스택 — 익숙한 패턴 재사용 |
| 스타일 | Tailwind 4 | 동일 |
| 라우팅 | React Router 7 | 동일 |
| 로컬 저장 | Dexie (IndexedDB) | 저널·시그널 이력이 수천 건이 돼도 견딤. localStorage로는 부족 |
| PWA | vite-plugin-pwa | 홈화면 설치, 오프라인 셸 |
| 캔들 차트 | `lightweight-charts` (TradingView, ~45KB) | 터치 제스처·크로스헤어·거래량 서브차트가 기본 제공. 직접 만들 이유가 없음 |
| 스파크라인 | 직접 만든 SVG | 40줄이면 끝남. 라이브러리 의존 불필요 |
| 지표 계산 | 직접 구현 (순수 함수) | EMA/RSI/ATR/MACD/BB/ADX는 각 10~30줄. 라이브러리를 넣으면 계산 방식(예: RSI의 Wilder smoothing)을 통제할 수 없음. 순수 함수라 테스트가 쉬움 |
| 배포 | Vercel | 정적 + 서버리스가 한 프로젝트. 엣지 캐시 헤더로 호출 수 통제 |

## 폴더 구조

```
futures-desk/
├─ api/                            # Vercel 서버리스 함수
│  ├─ quote.ts                     # GET /api/quote?symbols=CL,GC,BTC
│  ├─ candles.ts                   # GET /api/candles?symbol=CL&interval=5m&range=5d
│  ├─ news.ts                      # GET /api/news?symbol=CL&limit=30
│  └─ _lib/
│     ├─ providers/
│     │  ├─ binance.ts             # BTC: klines, 24h ticker, 펀딩비, 미결제약정
│     │  ├─ yahoo.ts               # CL=F, GC=F, DX-Y.NYB 차트 엔드포인트
│     │  ├─ fmp.ts                 # 플랜 업그레이드 시 활성화
│     │  └─ rss.ts                 # 뉴스 소스 수집 + 파싱
│     ├─ registry.ts               # 종목 → 프로바이더 매핑과 폴백 순서
│     ├─ normalize.ts              # 무엇을 쓰든 같은 모양으로 내보냄
│     └─ cache.ts                  # Cache-Control 헤더 조립
│
├─ src/
│  ├─ main.tsx  App.tsx  index.css
│  ├─ symbols.ts                   # 세 종목의 모든 상수 (아래 참조)
│  ├─ types.ts
│  ├─ db.ts                        # Dexie 스키마 + 마이그레이션
│  │
│  ├─ api/                         # 클라이언트 데이터 층
│  │  ├─ client.ts                 # fetch + 타임아웃 + 재시도
│  │  ├─ quotes.ts  candles.ts  news.ts
│  │  └─ swr.ts                    # 캐시 먼저 그리고 뒤에서 갱신
│  │
│  ├─ indicators/                  # 순수 함수, 입력 Bar[] → 출력 number[]
│  │  ├─ ema.ts  sma.ts  rsi.ts  atr.ts  macd.ts
│  │  ├─ bbands.ts  adx.ts  vwap.ts  donchian.ts  obv.ts
│  │  ├─ stochrsi.ts  keltner.ts
│  │  └─ index.ts
│  │
│  ├─ signal/                      # 시그널 엔진 — docs/SIGNAL.md 참조
│  │  ├─ gates.ts                  # 거래 가능 여부 (세션·변동성·이벤트)
│  │  ├─ regime.ts                 # 추세 / 박스 / 스퀴즈 판별
│  │  ├─ detectors/
│  │  │  ├─ trend.ts  momentum.ts  volatility.ts
│  │  │  ├─ volume.ts  structure.ts  context.ts
│  │  │  └─ index.ts
│  │  ├─ weights.ts                # 레짐별 가중치 테이블
│  │  ├─ compose.ts                # 점수 합성 → 방향·확신도
│  │  ├─ plan.ts                   # 진입·손절·목표·R:R 계산
│  │  ├─ score.ts                  # 발생한 시그널의 사후 채점
│  │  └─ engine.ts                 # 위를 순서대로 실행하는 진입점
│  │
│  ├─ components/
│  │  ├─ Sparkline.tsx  PriceChart.tsx  RangeBar.tsx
│  │  ├─ SymbolCard.tsx  StatGrid.tsx
│  │  ├─ SignalCard.tsx  DetectorBars.tsx  RegimeBadge.tsx
│  │  ├─ NewsRow.tsx  EventStrip.tsx
│  │  ├─ JournalComposer.tsx  JournalItem.tsx
│  │  └─ BottomNav.tsx  StickyPriceHeader.tsx  ui.tsx
│  │
│  ├─ pages/
│  │  ├─ Market.tsx                # 홈
│  │  ├─ Symbol.tsx                # 상세 셸 (고정 헤더 + 탭)
│  │  ├─ tabs/{Summary,News,Signal,Journal}.tsx
│  │  ├─ AllSignals.tsx  AllJournal.tsx
│  │  └─ Settings.tsx
│  │
│  └─ lib/
│     ├─ format.ts                 # 가격·퍼센트·거래량 표기
│     ├─ time.ts                   # KST 변환, "3분 전"
│     ├─ session.ts                # 종목별 장중 시간대 판정
│     ├─ events.ts                 # 예정 이벤트 캘린더
│     ├─ backup.ts                 # 저널 JSON/마크다운 내보내기
│     └─ hooks.ts
│
├─ docs/                           # 이 문서들
├─ public/                         # 아이콘, manifest 자산
├─ vercel.json  vite.config.ts  tsconfig*.json  package.json
```

## symbols.ts — 종목 정의를 한 곳에

세 종목의 차이를 코드 여기저기에 `if (symbol === 'BTC')`로 흩뿌리지 않기 위해,
차이나는 것은 전부 데이터로 한 파일에 모읍니다.

```ts
{
  id: 'CL',
  name: '원유 WTI',
  fullName: 'WTI Crude Oil Futures',
  providerSymbols: { yahoo: 'CL=F', fmp: 'CLUSD' },
  quoteCurrency: 'USD',
  tickSize: 0.01,
  decimals: 2,
  unit: '배럴',
  // 유동성이 실제로 있는 시간 (KST) — 게이트가 이걸 봄
  activeSessions: [{ from: '22:00', to: '03:30' }],
  tradesWeekends: false,
  hasContractRoll: true,            // 만기 교체 시 차트 갭 주의
  // 이 종목에만 붙는 문맥 디텍터의 재료
  contextInputs: ['BZ', 'NG', 'DX'],
  recurringEvents: [
    { name: 'EIA 주간 원유재고', cron: '수 23:30 KST', blackoutMin: 15 },
    { name: 'API 재고(비공식)', cron: '화 05:30 KST', blackoutMin: 10 },
    { name: '베이커휴즈 리그카운트', cron: '금 02:00 KST', blackoutMin: 5 },
  ],
}
```

금은 `DX`(달러지수)와 미 10년물이 문맥 입력이고 FOMC·CPI·고용지표가 이벤트,
BTC는 24/7에 주말 거래가 있고 펀딩비·미결제약정이 문맥 입력입니다.

## 데이터 흐름 (앱을 열었을 때)

1. IndexedDB 캐시를 먼저 읽어 **즉시** 화면을 그립니다. 오래된 값이면 "3분 전"이라고 표시.
2. 동시에 `/api/quote`, `/api/candles`를 호출해 갱신합니다.
3. 새 캔들이 오면 지표를 다시 계산하고, **봉이 마감된 경우에만** 시그널 엔진을 돌립니다.
4. 새 시그널이 나오면 IndexedDB에 스냅샷과 함께 저장합니다.
5. 동시에, 이전에 저장된 미채점 시그널들을 새 캔들로 채점합니다.
6. 앱이 백그라운드로 가면 폴링을 멈춥니다(배터리·호출 수).

## 경계를 지키는 규칙

- **서버는 판단하지 않는다.** 서버 코드에 지표나 시그널 로직이 들어가면 안 됩니다.
  중계·정규화·캐시만. 그래야 프로바이더를 바꿔도 앱 로직이 흔들리지 않습니다.
- **지표는 순수 함수다.** `indicators/`의 어떤 파일도 fetch·Dexie·React를 몰라야
  합니다. 입력은 `Bar[]`, 출력은 숫자 배열. 그래야 테스트할 수 있습니다.
- **디텍터는 서로를 모른다.** 각 디텍터는 캔들과 지표만 보고 -1~+1을 냅니다.
  합성은 `compose.ts` 한 곳에서만 일어납니다. 디텍터를 넣고 빼는 게 한 줄이어야
  나중에 가중치를 데이터로 튜닝할 수 있습니다.
- **UI는 계산하지 않는다.** 컴포넌트 안에서 RSI를 구하지 않습니다. 훅이 계산된 값을 받습니다.
