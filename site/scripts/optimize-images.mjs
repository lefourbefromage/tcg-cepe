// Optimise les images du jeu (SPEC §3) et les écrit dans site/public/img/.
// Usage : npm run images [-- --force]
//   - cadres, dos, booster : WebP (+ AVIF) transparents @1x 512×768 / @2x 1024×1536
//   - photos des cartes    : WebP @1x 434×498 / @2x 868×996
// Affiche un tableau avant/après et sort en erreur si un fichier dépasse son objectif.
// Seuls frames/ et cartes/ sont lus : photos/, Webp/, export png/, figma/ ne sont jamais embarqués.

import { mkdir, readdir, stat } from 'node:fs/promises'
import { availableParallelism } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const SITE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const ROOT = path.resolve(SITE, '..')
const FRAMES_SRC = path.join(ROOT, 'frames')
const CARTES_SRC = path.join(ROOT, 'cartes')
const OUT = path.join(SITE, 'public', 'img')
const FRAMES_OUT = path.join(OUT, 'frames')
const CARTES_OUT = path.join(OUT, 'cartes')

const FORCE = process.argv.includes('--force')
const KB = 1024

const FRAME_NAMES = ['commun', 'rare', 'epique', 'legendaire', 'dos', 'booster']
// Objectifs = poids max mesurés avec les réglages du §3, arrondis à la dizaine de Ko supérieure.
const FRAME_SIZES = [
  { suffix: '@1x', width: 512, height: 768, max: { webp: 160 * KB, avif: 70 * KB } },
  { suffix: '@2x', width: 1024, height: 1536, max: { webp: 380 * KB, avif: 180 * KB } },
]
const PHOTO_SIZES = [
  { suffix: '@1x', width: 434, height: 498, max: 50 * KB },
  { suffix: '@2x', width: 868, height: 996, max: 160 * KB },
]

const ENCODERS = {
  webp: { frame: { quality: 82, alphaQuality: 90, effort: 6 }, photo: { quality: 78, effort: 6 } },
  avif: { frame: { quality: 55, effort: 6 } },
}

async function isUpToDate(src, dst) {
  if (FORCE) return false
  try {
    return (await stat(dst)).mtimeMs >= (await stat(src)).mtimeMs
  } catch {
    return false
  }
}

async function encode({ src, dst, width, height, format, options }) {
  if (!(await isUpToDate(src, dst))) {
    await sharp(src)
      .resize(width, height, { fit: 'cover', kernel: 'lanczos3' })
      [format](options)
      .toFile(dst)
  }
  return (await stat(dst)).size
}

async function pool(items, limit, fn) {
  const results = new Array(items.length)
  let next = 0
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++
      results[i] = await fn(items[i])
    }
  })
  await Promise.all(workers)
  return results
}

function buildJobs(photoFiles) {
  const jobs = []
  for (const name of FRAME_NAMES) {
    const src = path.join(FRAMES_SRC, `${name}.png`)
    for (const size of FRAME_SIZES) {
      for (const format of ['webp', 'avif']) {
        jobs.push({
          group: 'frame',
          label: `frames/${name}${size.suffix}.${format}`,
          src,
          dst: path.join(FRAMES_OUT, `${name}${size.suffix}.${format}`),
          width: size.width,
          height: size.height,
          max: size.max[format],
          format,
          options: ENCODERS[format].frame,
        })
      }
    }
  }
  for (const file of photoFiles) {
    const num = path.basename(file, '.webp')
    for (const size of PHOTO_SIZES) {
      jobs.push({
        group: 'photo',
        label: `cartes/${num}${size.suffix}.webp`,
        src: path.join(CARTES_SRC, file),
        dst: path.join(CARTES_OUT, `${num}${size.suffix}.webp`),
        width: size.width,
        height: size.height,
        max: size.max,
        format: 'webp',
        options: ENCODERS.webp.photo,
      })
    }
  }
  return jobs
}

const fmt = (bytes) => `${(bytes / KB).toFixed(1)} Ko`
const pad = (s, n, right = false) => (right ? String(s).padStart(n) : String(s).padEnd(n))

function printTable(rows) {
  const header = ['Fichier', 'Source', 'Sortie', 'Gain', 'Objectif', '']
  const lines = rows.map((r) => [
    r.label,
    fmt(r.before),
    fmt(r.after),
    `-${(100 - (r.after / r.before) * 100).toFixed(0)} %`,
    r.max ? `≤ ${fmt(r.max)}` : '—',
    r.over ? '✗ TROP LOURD' : '✓',
  ])
  const widths = header.map((h, i) => Math.max(h.length, ...lines.map((l) => l[i].length)))
  const row = (cells) => cells.map((c, i) => pad(c, widths[i], i >= 1 && i <= 4)).join('  ')
  console.log(row(header))
  console.log(widths.map((w) => '─'.repeat(w)).join('  '))
  for (const l of lines) console.log(row(l))
}

function summarize(rows, title) {
  const after = rows.reduce((s, r) => s + r.after, 0)
  const maxRow = rows.reduce((a, b) => (b.after > a.after ? b : a))
  console.log(`  ${pad(title, 26)} ${pad(rows.length, 4, true)} fichiers  total ${pad(fmt(after), 11, true)}  max ${fmt(maxRow.after)} (${maxRow.label})`)
}

async function main() {
  await mkdir(FRAMES_OUT, { recursive: true })
  await mkdir(CARTES_OUT, { recursive: true })

  const photoFiles = (await readdir(CARTES_SRC)).filter((f) => /^\d{3}\.webp$/.test(f)).sort()
  const jobs = buildJobs(photoFiles)
  const sourceSizes = new Map()
  for (const src of new Set(jobs.map((j) => j.src))) sourceSizes.set(src, (await stat(src)).size)

  const t0 = performance.now()
  const sizes = await pool(jobs, availableParallelism(), encode)
  const rows = jobs.map((j, i) => ({
    ...j,
    before: sourceSizes.get(j.src),
    after: sizes[i],
    over: j.max != null && sizes[i] > j.max,
  }))

  const frames = rows.filter((r) => r.group === 'frame')
  const photos = rows.filter((r) => r.group === 'photo')

  console.log('\nCadres, dos et booster')
  printTable(frames)

  console.log('\nPhotos des cartes (fichiers au-dessus de 80 % de l’objectif, ou en échec)')
  const notable = photos.filter((r) => r.after > r.max * 0.8)
  if (notable.length) printTable(notable)
  else console.log('  (aucune)')

  const srcFrames = [...new Set(frames.map((r) => r.src))].reduce((s, f) => s + sourceSizes.get(f), 0)
  const srcPhotos = [...new Set(photos.map((r) => r.src))].reduce((s, f) => s + sourceSizes.get(f), 0)
  console.log('\nRésumé')
  console.log(`  Sources : cadres ${fmt(srcFrames)} · photos ${fmt(srcPhotos)} (${photoFiles.length} fichiers)`)
  for (const [title, test] of [
    ['Cadres WebP @1x', (r) => r.group === 'frame' && r.format === 'webp' && r.label.includes('@1x')],
    ['Cadres WebP @2x', (r) => r.group === 'frame' && r.format === 'webp' && r.label.includes('@2x')],
    ['Cadres AVIF @1x', (r) => r.group === 'frame' && r.format === 'avif' && r.label.includes('@1x')],
    ['Cadres AVIF @2x', (r) => r.group === 'frame' && r.format === 'avif' && r.label.includes('@2x')],
    ['Photos WebP @1x', (r) => r.group === 'photo' && r.label.includes('@1x')],
    ['Photos WebP @2x', (r) => r.group === 'photo' && r.label.includes('@2x')],
  ]) {
    summarize(rows.filter(test), title)
  }
  console.log(`  Durée : ${((performance.now() - t0) / 1000).toFixed(1)} s${FORCE ? ' (--force)' : ''}`)

  const failures = rows.filter((r) => r.over)
  if (failures.length) {
    console.error(`\n✗ ${failures.length} fichier(s) dépassent l’objectif :`)
    for (const r of failures) console.error(`  ${r.label} : ${fmt(r.after)} > ${fmt(r.max)}`)
    process.exit(1)
  }
  console.log('\n✓ Tous les fichiers respectent les objectifs.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
