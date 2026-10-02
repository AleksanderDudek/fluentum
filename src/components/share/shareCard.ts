import { APP_URL } from '@/components/support/links'

/** Pigments of the card: fixed (a shared picture has no theme), the light "Lagoon" palette. */
const INK = {
  paper: '#eef4f1',
  surface: '#ffffff',
  ink: '#10282c',
  soft: '#3d5a5e',
  teal: '#0b6b66',
  tealLight: '#9fe3d5',
  gold: '#f2b33d',
  goldInk: '#855600',
  coral: '#ef6a4e',
} as const

const SIZE = 1080
const DISPLAY = '"Lexend Variable", Lexend, system-ui, sans-serif'
const SANS = '"Instrument Sans Variable", "Instrument Sans", system-ui, sans-serif'

export interface CardContent {
  /** Small label at the top, e.g. the date. */
  eyebrow: string
  title: string
  /** Up to four big numbers with a label under each. */
  stats: Array<{ value: string; label: string }>
  /** Optional line under the numbers (the conversation's stars). */
  note?: string
  motto: string
  /** Markup of a Figure/Character SVG (fixed pigments, so it renders without the page's CSS). */
  figureSvg?: string
}

function loadSvg(markup: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('figure'))
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`
  })
}

/** Makes an inline SVG element a standalone file (namespace, fixed size). */
export function standaloneSvg(svg: SVGSVGElement, width: number): string {
  const clone = svg.cloneNode(true) as SVGSVGElement
  const [, , vw = 200, vh = 220] = (svg.getAttribute('viewBox') ?? '0 0 200 220').split(/\s+/).map(Number)
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  clone.setAttribute('width', String(width))
  clone.setAttribute('height', String(Math.round((width * vh) / vw)))
  clone.removeAttribute('style')
  return new XMLSerializer().serializeToString(clone)
}

async function fontsReady(): Promise<void> {
  if (!document.fonts) return
  // fillText draws with a fallback until a face is loaded, so ask for the exact faces used.
  await Promise.allSettled([
    document.fonts.load(`600 64px ${DISPLAY}`),
    document.fonts.load(`600 30px ${DISPLAY}`),
    document.fonts.load(`600 72px ${SANS}`),
  ])
  await document.fonts.ready
}

/** A gentle wave across the card, `amplitude` px high, filled down to the bottom edge. */
function wave(ctx: CanvasRenderingContext2D, y: number, amplitude: number, color: string, alpha: number) {
  ctx.beginPath()
  ctx.moveTo(0, y)
  for (let x = 0; x <= SIZE; x += 270) {
    ctx.quadraticCurveTo(x + 67.5, y - amplitude, x + 135, y)
    ctx.quadraticCurveTo(x + 202.5, y + amplitude, x + 270, y)
  }
  ctx.lineTo(SIZE, SIZE)
  ctx.lineTo(0, SIZE)
  ctx.closePath()
  ctx.globalAlpha = alpha
  ctx.fillStyle = color
  ctx.fill()
  ctx.globalAlpha = 1
}

function frame(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = INK.paper
  ctx.fillRect(0, 0, SIZE, SIZE)
  // Light through water, as at the top of every screen.
  const glow = ctx.createRadialGradient(SIZE / 2, 300, 40, SIZE / 2, 300, 620)
  glow.addColorStop(0, 'rgba(159, 227, 213, 0.75)')
  glow.addColorStop(1, 'rgba(238, 244, 241, 0)')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, SIZE, SIZE)
  // The floor of the lagoon: two waves along the bottom.
  wave(ctx, SIZE - 230, 22, INK.teal, 0.08)
  wave(ctx, SIZE - 200, 16, INK.teal, 0.1)
}

function rule(ctx: CanvasRenderingContext2D, y: number, half: number) {
  const line = ctx.createLinearGradient(SIZE / 2 - half, 0, SIZE / 2 + half, 0)
  line.addColorStop(0, 'rgba(11, 107, 102, 0)')
  line.addColorStop(0.2, INK.teal)
  line.addColorStop(0.8, INK.teal)
  line.addColorStop(1, 'rgba(11, 107, 102, 0)')
  ctx.fillStyle = line
  ctx.globalAlpha = 0.45
  ctx.fillRect(SIZE / 2 - half, y, half * 2, 2)
  ctx.globalAlpha = 1
}

/** Square card (fits every social feed uncropped) with the day's numbers and the user's figure. */
export async function drawShareCard(content: CardContent): Promise<Blob> {
  const canvas = document.createElement('canvas')
  canvas.width = SIZE
  canvas.height = SIZE
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas')
  await fontsReady()
  frame(ctx)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'

  ctx.fillStyle = INK.teal
  ctx.font = `600 28px ${DISPLAY}`
  ctx.fillText(content.eyebrow.toUpperCase(), SIZE / 2, 128, SIZE - 220)
  ctx.fillStyle = INK.ink
  ctx.font = `600 64px ${DISPLAY}`
  // A long title is narrowed rather than cut.
  ctx.fillText(content.title, SIZE / 2, 200, SIZE - 220)
  rule(ctx, 226, 300)

  // Without a note line the figure grows into its room, so the card has no empty band.
  let top = content.note ? 250 : 262
  const figure = content.figureSvg ? await loadSvg(content.figureSvg).catch(() => null) : null
  if (figure) {
    const height = content.note ? 300 : 360
    const width = (figure.width / figure.height) * height
    ctx.drawImage(figure, (SIZE - width) / 2, top, width, height)
    top += height + 20
  }

  // Up to four numbers in one row, separated by teal hairlines.
  const stats = content.stats.slice(0, 4)
  const column = (SIZE - 160) / Math.max(1, stats.length)
  stats.forEach((stat, i) => {
    const cx = 80 + column * i + column / 2
    ctx.fillStyle = INK.ink
    ctx.font = `600 72px ${SANS}`
    ctx.fillText(stat.value, cx, top + 80)
    ctx.fillStyle = INK.soft
    ctx.font = `500 26px ${SANS}`
    ctx.fillText(stat.label, cx, top + 122)
    if (i > 0) {
      ctx.fillStyle = INK.teal
      ctx.globalAlpha = 0.25
      ctx.fillRect(80 + column * i, top + 20, 2, 110)
      ctx.globalAlpha = 1
    }
  })
  top += 170

  if (content.note) {
    ctx.fillStyle = INK.goldInk
    ctx.font = `600 32px ${DISPLAY}`
    ctx.fillText(content.note, SIZE / 2, top + 20)
  }

  ctx.fillStyle = INK.teal
  ctx.font = `600 40px ${DISPLAY}`
  ctx.fillText(content.motto, SIZE / 2, SIZE - 132)
  ctx.fillStyle = INK.soft
  ctx.font = `600 26px ${SANS}`
  ctx.fillText(APP_URL.replace(/^https:\/\//, '').replace(/\/$/, ''), SIZE / 2, SIZE - 88)

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('png'))), 'image/png')
  })
}
