/**
 * 말할 때 꺼내 쓰는 틀. 라이브러리 화면은 아직 없습니다 — 리허설 안에서만 등장합니다.
 * 안 쓰는 참고자료가 되는 걸 막으려고 일부러 그렇게 둡니다.
 */
export interface Structure {
  id: string
  name: string
  /** 언제 꺼내 쓰나 */
  when: string
  /** 말하면서 따라갈 뼈대 */
  beats: string[]
}

export const STRUCTURES: Structure[] = [
  {
    id: 'scr',
    name: 'SCR',
    when: '진행 상황을 보고할 때. 모든 업데이트의 기본기.',
    beats: [
      'Situation — 다들 동의하는 사실부터',
      'Complication — 그런데 무엇이 바뀌었나',
      'Resolution — 그래서 무엇을 하려는가',
    ],
  },
  {
    id: 'pyramid',
    name: 'Pyramid',
    when: '임원에게. 시간이 30초밖에 없을 때.',
    beats: [
      '결론을 먼저 한 문장으로',
      '근거 셋 — 서로 겹치지 않게',
      '각 근거에 증거 하나씩',
    ],
  },
  {
    id: 'wsw',
    name: 'What / So what / Now what',
    when: '데이터나 발견을 전달할 때.',
    beats: ['What — 무엇을 봤나', 'So what — 그게 왜 중요한가', 'Now what — 그래서 뭘 하나'],
  },
  {
    id: 'prep',
    name: 'PREP',
    when: '즉석 질문에 30초로 답할 때.',
    beats: ['Point — 결론', 'Reason — 이유 하나', 'Example — 구체적 사례', 'Point — 결론 반복'],
  },
  {
    id: 'bab',
    name: 'Before / After / Bridge',
    when: '변화를 설득할 때. 제안·투자 요청.',
    beats: ['Before — 지금의 고통', 'After — 달라진 세상', 'Bridge — 거기 가는 길이 이 제안'],
  },
  {
    id: 'zoom',
    name: 'Zoom in / Zoom out',
    when: '디테일과 전략을 오갈 때. 시니어로 읽히는 핵심 기술.',
    beats: [
      'Zoom out — 이게 어느 큰 그림의 일부인가',
      'Zoom in — 구체적으로 무슨 일이 있었나',
      'Zoom out — 그래서 큰 그림이 어떻게 바뀌나',
    ],
  },
  {
    id: 'steelman',
    name: 'Steel-man then pivot',
    when: '반대할 때. 먼저 상대를 이기게 해주고 시작합니다.',
    beats: [
      '상대 주장을 상대보다 더 잘 요약',
      '그 주장이 성립하는 조건을 명시',
      '그 조건이 여기서는 왜 안 맞는지',
      '대안',
    ],
  },
  {
    id: 'numbers',
    name: 'Numbers ladder',
    when: '숫자를 말로 옮길 때. 표를 읽지 않기 위해.',
    beats: ['큰 수 하나만', '비교 대상 하나 — "작년 대비", "경쟁사 대비"', '사람 한 명의 이야기로 착지'],
  },
  {
    id: 'star',
    name: 'STAR',
    when: '승진 심사·면접. "그때 무슨 일을 했나요?"',
    beats: ['Situation', 'Task — 내 몫이 무엇이었나', 'Action — 내가 한 것', 'Result — 숫자로'],
  },
  {
    id: 'badnews',
    name: 'Bad news first',
    when: '일정이 밀리거나 실패를 전할 때.',
    beats: [
      '나쁜 소식을 첫 문장에 — 돌려 말하지 않기',
      '원인 한 줄',
      '이미 한 조치',
      '필요한 결정 또는 도움',
    ],
  },
  {
    id: 'three-act',
    name: 'Three-act',
    when: '긴 이야기. 5분 이상 붙잡아야 할 때.',
    beats: ['설정 — 평범한 상태', '전환 — 무너진 순간', '해결 — 무엇이 달라졌나'],
  },
  {
    id: 'question',
    name: 'Open with the question',
    when: '회의를 열 때. 논의의 틀을 내가 잡습니다.',
    beats: [
      '오늘 답해야 할 질문 하나를 칠판에',
      '그 질문이 왜 지금 중요한가',
      '답의 선택지를 두세 개로',
    ],
  },
]

export const structureById = (id: string | undefined): Structure | undefined =>
  STRUCTURES.find((s) => s.id === id)
