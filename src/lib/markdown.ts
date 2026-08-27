import { marked } from 'marked'

marked.setOptions({ gfm: true, breaks: true })

/**
 * 본문은 전부 내가 쓴 글이지만, 붙여넣기로 들어온 raw HTML까지 실행할 이유는 없습니다.
 * 파싱 전에 꺾쇠를 이스케이프해서 인라인 HTML은 그냥 글자로 남깁니다.
 */
export function renderMarkdown(src: string): string {
  const escaped = src.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  return marked.parse(escaped, { async: false })
}

/** 목록에서 보여줄 한 줄 요약 */
export function excerpt(body: string, max = 90): string {
  const flat = body
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/[#>*_`\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return flat.length > max ? `${flat.slice(0, max)}…` : flat
}
