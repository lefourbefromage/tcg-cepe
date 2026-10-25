import { getCard, type Rarity } from '../engine'
import { frameImage, photoImage } from './images'

/** Taille de l'image partagée (SPEC §6.11). */
export const SHARE_WIDTH = 1000
export const SHARE_HEIGHT = 1500

// Mêmes repères que le composant Card (en fraction de la carte).
const PHOTO = { x: 0.08, y: 0.185, w: 0.83, h: 0.63, posX: 0.5, posY: 0.3 }
const TITLE = { x: 0.35, w: 0.55, y: 0.085, h: 0.08, font: 0.084, minFont: 0.55, minScaleX: 0.8 }
const NUM = { font: 0.07, y: { commun: 0.901, rare: 0.887, epique: 0.9, legendaire: 0.9 } satisfies Record<Rarity, number> }
const INK = '#4a2a12'
const GLOW: Record<Rarity, { color: string; blur: number }> = {
  commun: { color: '#f3e2bd', blur: 40 },
  rare: { color: '#5096ff', blur: 55 },
  epique: { color: '#b060ff', blur: 70 },
  legendaire: { color: '#ffc846', blur: 100 },
}

async function loadImage(src: string): Promise<HTMLImageElement> {
  const img = new Image()
  img.decoding = 'async'
  img.src = src
  await img.decode()
  return img
}

/** Dessine `img` en object-fit: cover dans le rectangle, avec object-position. */
function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number, posX: number, posY: number) {
  const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight)
  const sw = w / scale
  const sh = h / scale
  const sx = (img.naturalWidth - sw) * posX
  const sy = (img.naturalHeight - sh) * posY
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h)
}

/** Texte des cartes : encre brune avec un léger liseré clair, comme dans le composant Card. */
function drawInk(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, cardW: number) {
  ctx.fillStyle = 'rgba(255, 246, 224, 0.55)'
  ctx.fillText(text, x, y + cardW * 0.0025)
  ctx.fillStyle = INK
  ctx.fillText(text, x, y)
}

/** Qualité JPEG de l'image partagée : ~10× plus léger qu'un PNG, sans différence visible. */
const JPEG_QUALITY = 0.9

/** Génère l'image JPEG d'une carte (fond sombre, lueur de la rareté), sans holo. */
export async function renderCardImage(num: string, rarity: Rarity): Promise<Blob> {
  const title = getCard(num)?.title ?? `Carte ${num}`
  const cardW = SHARE_WIDTH * 0.84
  const cardH = cardW * 1.5
  const cx = (SHARE_WIDTH - cardW) / 2
  const cy = (SHARE_HEIGHT - cardH) / 2

  const [photo, frame] = await Promise.all([
    loadImage(photoImage(num).src),
    loadImage(frameImage(rarity).src),
    document.fonts.load(`${Math.round(cardW * TITLE.font)}px "Lilita One"`),
  ])

  const canvas = document.createElement('canvas')
  canvas.width = SHARE_WIDTH
  canvas.height = SHARE_HEIGHT
  const ctx = canvas.getContext('2d')!

  const bg = ctx.createRadialGradient(SHARE_WIDTH / 2, SHARE_HEIGHT * 0.45, 0, SHARE_WIDTH / 2, SHARE_HEIGHT * 0.45, SHARE_HEIGHT * 0.7)
  bg.addColorStop(0, '#1d1d26')
  bg.addColorStop(1, '#0b0b0f')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, SHARE_WIDTH, SHARE_HEIGHT)

  // Lueur : l'ombre du cadre suit sa découpe ; dessinée deux fois pour plus d'intensité.
  ctx.save()
  ctx.shadowColor = GLOW[rarity].color
  ctx.shadowBlur = GLOW[rarity].blur
  ctx.drawImage(frame, cx, cy, cardW, cardH)
  ctx.drawImage(frame, cx, cy, cardW, cardH)
  ctx.restore()

  drawCover(ctx, photo, cx + PHOTO.x * cardW, cy + PHOTO.y * cardH, PHOTO.w * cardW, PHOTO.h * cardH, PHOTO.posX, PHOTO.posY)
  ctx.drawImage(frame, cx, cy, cardW, cardH)

  // Titre : réduit jusqu'à 55 %, puis compressé jusqu'à 0,8 (même règle que useFitText).
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  const baseFont = cardW * TITLE.font
  ctx.font = `${baseFont}px "Lilita One"`
  const available = TITLE.w * cardW
  const ratio = Math.min(1, available / ctx.measureText(title).width)
  const fontScale = Math.max(TITLE.minFont, ratio)
  const scaleX = Math.max(TITLE.minScaleX, ratio / fontScale)
  ctx.font = `${baseFont * fontScale}px "Lilita One"`
  const titleMetrics = ctx.measureText(title)
  const titleCenterY = cy + (TITLE.y + TITLE.h / 2) * cardH
  const titleBaseline = titleCenterY + (titleMetrics.actualBoundingBoxAscent - titleMetrics.actualBoundingBoxDescent) / 2
  ctx.save()
  ctx.translate(cx + (TITLE.x + TITLE.w / 2) * cardW, 0)
  ctx.scale(scaleX, 1)
  drawInk(ctx, title, 0, titleBaseline, cardW)
  ctx.restore()

  // Numéro : centré sur l'axe de la carte et dans le cartouche de la rareté.
  const numText = `N°${num}`
  ctx.font = `${cardW * NUM.font}px "Lilita One"`
  ctx.letterSpacing = `${cardW * NUM.font * 0.02}px`
  const numMetrics = ctx.measureText(numText)
  const numBaseline = cy + NUM.y[rarity] * cardH + numMetrics.actualBoundingBoxAscent / 2
  drawInk(ctx, numText, SHARE_WIDTH / 2, numBaseline, cardW)

  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Image non générée'))), 'image/jpeg', JPEG_QUALITY),
  )
}
