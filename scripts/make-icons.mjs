// public/favicon.svg 하나에서 PWA 아이콘을 만들어 냅니다.
// 저장소에 바이너리를 두지 않으려고 빌드 시점에 생성합니다.
import sharp from 'sharp'
import { mkdirSync, readFileSync } from 'node:fs'

const src = readFileSync('public/favicon.svg')
// 마스커블 아이콘은 안전영역(80%) 때문에 여백을 두고 배경을 꽉 채웁니다.
const maskable = Buffer.from(
  src.toString().replace('rx="112"', 'rx="0"').replace('viewBox="0 0 512 512"', 'viewBox="-64 -64 640 640"'),
)

mkdirSync('public/icons', { recursive: true })
await Promise.all([
  sharp(src).resize(192, 192).png().toFile('public/icons/icon-192.png'),
  sharp(src).resize(512, 512).png().toFile('public/icons/icon-512.png'),
  sharp(src).resize(180, 180).png().toFile('public/apple-touch-icon.png'),
  sharp(maskable).resize(512, 512).png().toFile('public/icons/icon-512-maskable.png'),
])
console.log('icons generated from public/favicon.svg')
