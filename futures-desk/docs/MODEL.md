# 데이터 모델

## 공통 타입

```ts
export type SymbolId = 'CL' | 'GC' | 'BTC'

/** 서버가 무엇을 쓰든 앱은 이 모양만 봅니다 */
export interface Quote {
  symbol: SymbolId
  price: number
  change: number
  changePct: number
  open: number
  dayHigh: number
  dayLow: number
  prevClose: number
  volume: number
  yearHigh: number
  yearLow: number
  /** 이 값이 만들어진 시각 (제공자 기준) */
  ts: number
  /** 어디서 왔는지 — 화면에 표시합니다 */
  source: string
  /** 정규장 / 얇음 / 휴장 */
  session: 'open' | 'thin' | 'closed'
}

export interface Bar {
  t: number   // 봉 시작 시각 (epoch ms, UTC)
  o: number
  h: number
  l: number
  c: number
  v: number
}

export type Interval = '1m' | '5m' | '15m' | '1h' | '1d'

export interface NewsItem {
  id: string            // url 해시 — 소스가 겹쳐도 중복되지 않게
  symbols: SymbolId[]   // 키워드 라우팅 결과. 매크로 뉴스는 여러 개
  title: string
  summary: string
  url: string
  source: string
  publishedAt: number
  image?: string
}
```

## 시그널

```ts
export type Direction = 'LONG' | 'SHORT' | 'WAIT'
export type Regime = 'TREND_UP' | 'TREND_DOWN' | 'RANGE' | 'SQUEEZE'
export type DetectorId = 'trend' | 'momentum' | 'volatility' | 'volume' | 'structure' | 'context'

export interface DetectorResult {
  id: DetectorId
  /** -1.0 ~ +1.0 */
  score: number
  /** 이 점수에 적용된 레짐별 가중치 */
  weight: number
  /** 화면에 그대로 뜨는 한 줄 — "EMA 정렬·기울기 양(+)" */
  reason: string
  /** 근거가 된 지표값들. 나중에 왜 이랬는지 되짚기 위해 통째로 보관 */
  inputs: Record<string, number>
}

export interface TradePlan {
  entryLow: number
  entryHigh: number
  stop: number
  target1: number
  target2: number
  /** |진입 - 손절| — 결과를 R 단위로 채점하는 기준 */
  riskPerUnit: number
  rr: number
  expiresAt: number
}

export interface GateResult {
  passed: boolean
  /** 걸린 게이트와 사유 — WAIT일 때 화면에 그대로 표시 */
  blocked: Array<{ gate: 'session' | 'volatility' | 'event' | 'data' | 'rr'; reason: string }>
}

export interface Signal {
  id: string
  symbol: SymbolId
  /** 이 시그널을 만든 봉의 마감 시각 */
  ts: number
  interval: Interval

  direction: Direction
  /** -100 ~ +100 */
  score: number
  strength: 'WAIT' | 'WEAK' | 'SIGNAL'
  regime: Regime
  gates: GateResult

  detectors: DetectorResult[]
  plan?: TradePlan          // WAIT이면 없음

  /** 발생 시점 가격 — 채점 기준점 */
  priceAtSignal: number

  /* ── 사후 채점 (score.ts가 나중에 채움) ── */
  outcome?: 'T1' | 'T2' | 'STOP' | 'EXPIRE'
  outcomeAt?: number
  /** 실현 R 배수: +2.0, -1.0, 0 */
  realizedR?: number
  /** 최대유리변동 — 목표가 너무 멀었는지 판단 */
  mfe?: number
  /** 최대불리변동 — 손절이 너무 타이트했는지 판단 */
  mae?: number

  /** 엔진 버전. 규칙이 바뀌면 과거 성적과 섞으면 안 되므로 */
  engineVersion: string
}
```

`detectors`와 `inputs`를 통째로 저장하는 게 핵심입니다. 나중에 "돌파 디텍터가
원유에서 왜 이렇게 못 맞나"를 물으려면 그때의 입력값이 남아 있어야 합니다.
`engineVersion`이 있어야 규칙을 고친 뒤의 성적과 그 전 성적을 섞지 않습니다.

## 저널

```ts
export type JournalTag = '롱' | '숏' | '관망' | '실수' | '잘함'

export interface JournalEntry {
  id: string
  symbol: SymbolId
  body: string
  tags: JournalTag[]

  /** 쓸 때 "현재가 첨부"를 켰으면 그 시각의 가격 */
  priceSnapshot?: { price: number; ts: number }
  /** 그 시각 활성 시그널이 있었으면 연결 */
  signalId?: string

  createdAt: number
  updatedAt: number
  /** 삭제는 소프트 삭제 — 5초 실행취소를 위해 */
  deletedAt?: number
}
```

저널을 단순하게 유지하는 게 이 탭의 전부입니다. 필수는 `body` 하나뿐이고 나머지는
전부 선택입니다. 폼이 길어지면 아무도 안 씁니다.

## 설정

```ts
export interface Settings {
  id: 'settings'
  quoteRefreshSec: 5 | 15 | 30 | 0      // 0 = 수동
  colorScheme: 'red-up' | 'green-up'
  timezone: 'KST' | 'exchange'
  /** 1회 거래에 걸 계좌 비율 — 포지션 사이즈 힌트 계산 */
  riskPerTradePct: number
  signalInterval: Interval               // 기본 '5m'
  minConviction: number                  // 기본 60
  notifications: boolean
  /** 부정기 이벤트 수동 입력 (v1) */
  customEvents: Array<{ symbol: SymbolId; name: string; at: number; blackoutMin: number }>
}
```

## Dexie 스키마

```ts
db.version(1).stores({
  journal:     'id, symbol, createdAt, updatedAt, *tags, deletedAt',
  signals:     'id, symbol, ts, direction, outcome, engineVersion, [symbol+ts]',
  settings:    'id',
  newsStates:  'newsId, readAt',

  // ── 캐시 (지워져도 앱이 동작해야 함) ──
  quoteCache:  'symbol, fetchedAt',
  candleCache: 'key, fetchedAt',      // key = `${symbol}:${interval}`
  newsCache:   'symbol, fetchedAt',
})
```

**두 부류를 구분합니다.** `journal`·`signals`·`settings`는 **사라지면 안 되는
사용자 데이터**이고, `*Cache`는 **언제든 버려도 되는 것**입니다. 이 구분이 있어야
저장소가 꽉 찼을 때 캐시만 비울 수 있고, 백업에 캐시를 넣지 않을 수 있습니다.

`signals`에 `[symbol+ts]` 복합 인덱스를 두는 건 성적표가 "이 종목의 이 기간"을
자주 훑기 때문입니다.

## 백업

기기 안에만 있는 데이터라 **내보내기가 유일한 안전장치입니다.** 설정에서
`journal + signals + settings`를 JSON으로 내보내고(캐시는 제외), 같은 파일로
가져오기가 됩니다. 저널만 마크다운으로 뽑는 것도 별도로 제공합니다 — 사람이 읽을
형태로 남겨두면 앱이 없어져도 기록은 남습니다.

아이폰 사파리는 저장소를 회수하는 경우가 있으므로 첫 실행에
`navigator.storage.persist()`를 조용히 요청합니다.
