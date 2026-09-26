/**
 * 리허설 질문. 실제 회의에서 튀어나올 법한 것들만 넣습니다 —
 * "리더십이란 무엇인가" 같은 건 말할 거리가 없어 연습이 안 됩니다.
 *
 * targetSec은 방의 크기입니다. 30초는 복도에서, 120초는 회의에서,
 * 300초는 발표에서. 같은 내용을 세 길이로 말하는 게 시니어의 기술이라
 * 같은 주제가 길이만 바꿔 다시 나오기도 합니다.
 */
export const PROMPT_CATEGORIES = [
  'Update',
  'Explain',
  'Push back',
  'Bad news',
  'Pitch',
  'Lead the room',
  'Hard question',
  'Your story',
] as const
export type PromptCategory = (typeof PROMPT_CATEGORIES)[number]

export interface SpeakPrompt {
  id: string
  category: PromptCategory
  text: string
  targetSec: number
  /** 이 질문에 잘 맞는 틀. 추천일 뿐 강제하지 않습니다. */
  suggests?: string
}

export const PROMPTS: SpeakPrompt[] = [
  // ── Update ─────────────────────────────────────────────
  { id: 'u1', category: 'Update', text: '이번 분기에 당신 팀은 무엇을 했습니까? 30초로.', targetSec: 30, suggests: 'pyramid' },
  { id: 'u2', category: 'Update', text: '지금 가장 큰 리스크 하나만 말해보세요.', targetSec: 60, suggests: 'scr' },
  { id: 'u3', category: 'Update', text: '지난주에 무엇이 바뀌었나요?', targetSec: 60, suggests: 'scr' },
  { id: 'u4', category: 'Update', text: '이 프로젝트, 지금 몇 퍼센트쯤 왔나요? 그 숫자를 어떻게 알죠?', targetSec: 90, suggests: 'numbers' },
  { id: 'u5', category: 'Update', text: '한 달 동안 아무것도 보고하지 않았다면 무엇을 놓친 겁니까?', targetSec: 120, suggests: 'wsw' },

  // ── Explain ────────────────────────────────────────────
  { id: 'e1', category: 'Explain', text: '기술을 모르는 임원에게 이 시스템이 하는 일을 설명하세요.', targetSec: 90, suggests: 'zoom' },
  { id: 'e2', category: 'Explain', text: '왜 이 데이터를 하나로 합쳐야 합니까? 합치지 않으면 무슨 일이 생기죠?', targetSec: 120, suggests: 'bab' },
  { id: 'e3', category: 'Explain', text: 'AI를 붙였다고 했는데, 구체적으로 무엇이 달라졌나요?', targetSec: 90, suggests: 'numbers' },
  { id: 'e4', category: 'Explain', text: '이 지표가 오르면 회사에 무엇이 좋습니까?', targetSec: 60, suggests: 'wsw' },
  { id: 'e5', category: 'Explain', text: '당신 제품을 처음 듣는 사람에게 한 문장으로 설명하세요.', targetSec: 30, suggests: 'prep' },
  { id: 'e6', category: 'Explain', text: '내부에 흩어진 도구들을 왜 통합해야 하나요? 지금 그대로 두면요?', targetSec: 120, suggests: 'bab' },

  // ── Push back ──────────────────────────────────────────
  { id: 'p1', category: 'Push back', text: '"그냥 사서 쓰면 되지 않나요?" — 직접 만들기로 한 이유를 말하세요.', targetSec: 120, suggests: 'steelman' },
  { id: 'p2', category: 'Push back', text: '상사가 이번 분기에 넣자고 합니다. 못 넣는다고 말하세요.', targetSec: 90, suggests: 'steelman' },
  { id: 'p3', category: 'Push back', text: '요구받은 기능이 틀렸다고 생각합니다. 어떻게 말하겠습니까?', targetSec: 120, suggests: 'steelman' },
  { id: 'p4', category: 'Push back', text: '"경쟁사도 하는데 우리는 왜 안 하죠?"에 답하세요.', targetSec: 90, suggests: 'prep' },

  // ── Bad news ───────────────────────────────────────────
  { id: 'b1', category: 'Bad news', text: '출시가 6주 밀렸습니다. 첫 문장을 말하세요.', targetSec: 60, suggests: 'badnews' },
  { id: 'b2', category: 'Bad news', text: '당신이 밀어붙인 결정이 틀렸습니다. 어떻게 보고하겠습니까?', targetSec: 120, suggests: 'badnews' },
  { id: 'b3', category: 'Bad news', text: '지표가 개선되지 않았습니다. 계속할 이유를 대거나, 접겠다고 하세요.', targetSec: 120, suggests: 'wsw' },
  { id: 'b4', category: 'Bad news', text: '예측이 빗나갔습니다. 무엇을 놓쳤는지 말하세요.', targetSec: 90, suggests: 'star' },

  // ── Pitch ──────────────────────────────────────────────
  { id: 'i1', category: 'Pitch', text: '개발자 두 명을 더 요청하세요. 이유와 함께.', targetSec: 120, suggests: 'bab' },
  { id: 'i2', category: 'Pitch', text: '지금 가장 크게 걸고 싶은 베팅 하나를 팔아보세요.', targetSec: 180, suggests: 'bab' },
  { id: 'i3', category: 'Pitch', text: '이 일을 1년 더 해야 하는 이유를 3분 안에.', targetSec: 180, suggests: 'three-act' },
  { id: 'i4', category: 'Pitch', text: '예산이 절반으로 줄었습니다. 무엇을 지키겠습니까?', targetSec: 120, suggests: 'pyramid' },

  // ── Lead the room ──────────────────────────────────────
  { id: 'l1', category: 'Lead the room', text: '이 회의의 목적을 첫 30초에 말하세요.', targetSec: 30, suggests: 'question' },
  { id: 'l2', category: 'Lead the room', text: '논의가 겉돕니다. 다시 틀을 잡으세요.', targetSec: 60, suggests: 'question' },
  { id: 'l3', category: 'Lead the room', text: '결론 없이 끝나려 합니다. 마지막 1분을 가져가세요.', targetSec: 60, suggests: 'pyramid' },
  { id: 'l4', category: 'Lead the room', text: '두 사람이 대립합니다. 중재하세요.', targetSec: 90, suggests: 'steelman' },

  // ── Hard question ──────────────────────────────────────
  { id: 'h1', category: 'Hard question', text: '"그건 이미 작년에 실패한 방식 아닌가요?"', targetSec: 90, suggests: 'steelman' },
  { id: 'h2', category: 'Hard question', text: '"이거 당신이 아니어도 되는 일 아닌가요?"', targetSec: 90, suggests: 'prep' },
  { id: 'h3', category: 'Hard question', text: '답을 모르는 질문을 받았습니다. 말하세요.', targetSec: 30, suggests: 'prep' },
  { id: 'h4', category: 'Hard question', text: '"숫자로 증명할 수 있나요?" — 아직 없습니다.', targetSec: 60, suggests: 'badnews' },

  // ── Your story ─────────────────────────────────────────
  { id: 's1', category: 'Your story', text: '당신은 어떤 PM입니까? 2분으로.', targetSec: 120, suggests: 'three-act' },
  { id: 's2', category: 'Your story', text: '채용을 하다가 다시 PM으로 돌아온 이유를 말하세요.', targetSec: 120, suggests: 'three-act' },
  { id: 's3', category: 'Your story', text: '가장 자랑스러운 결정 하나와, 그게 왜 어려웠는지.', targetSec: 120, suggests: 'star' },
  { id: 's4', category: 'Your story', text: '10년 뒤 무엇이 되어 있고 싶습니까? 왜죠?', targetSec: 120, suggests: 'bab' },
  { id: 's5', category: 'Your story', text: '당신이 일하는 방식의 원칙 하나를 사례와 함께.', targetSec: 90, suggests: 'star' },
]

export const promptById = (id: string | undefined): SpeakPrompt | undefined =>
  PROMPTS.find((p) => p.id === id)

/**
 * 날짜로 고정합니다 — 하루에 몇 번 열어도 같은 질문이 나옵니다.
 * doneIds는 **최신이 앞**입니다. 호출부의 reps가 그 순서라서, 뒤에서 자르면
 * 가장 오래된 20개를 제외하게 됩니다 — 최근 것을 걸러야 하는데 정반대였습니다.
 */
export function pickPrompt(seed: string, doneIdsNewestFirst: string[]): SpeakPrompt {
  const recent = new Set(doneIdsNewestFirst.slice(0, 20))
  const pool = PROMPTS.filter((p) => !recent.has(p.id))
  const list = pool.length ? pool : PROMPTS
  let h = 0
  for (let i = 0; i < seed.length; i += 1) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  return list[h % list.length]
}
