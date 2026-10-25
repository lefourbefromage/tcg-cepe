// Génère src/data/cards.json (catalogue des cartes) à partir de ../cartes/cartes.json.
// Usage : npm run catalog
//   - garde num + title ; title absent → "Carte 001" (SPEC §2)
//   - vérifie que les numéros se suivent et que chaque photo existe
//   - avertit si un titre dépasse 16 caractères (il sera réduit à l'affichage, SPEC §4)

import { access, mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const SITE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const ROOT = path.resolve(SITE, '..')
const SRC = path.join(ROOT, 'cartes', 'cartes.json')
const OUT = path.join(SITE, 'src', 'data', 'cards.json')
const TITLE_MAX = 16

async function main() {
  const entries = JSON.parse(await readFile(SRC, 'utf8'))
  if (!Array.isArray(entries) || entries.length === 0) throw new Error(`${SRC} : tableau vide ou invalide`)

  const errors = []
  const cards = []
  for (const [i, entry] of entries.entries()) {
    const expected = String(i + 1).padStart(3, '0')
    if (entry.num !== expected) errors.push(`entrée ${i} : num "${entry.num}", attendu "${expected}"`)
    try {
      await access(path.join(ROOT, entry.file))
    } catch {
      errors.push(`${entry.num} : fichier introuvable (${entry.file})`)
    }
    const title = typeof entry.title === 'string' && entry.title.trim() ? entry.title.trim() : `Carte ${entry.num}`
    if (title.length > TITLE_MAX) console.warn(`⚠ ${entry.num} : titre de ${title.length} caractères (> ${TITLE_MAX}) « ${title} »`)
    cards.push({ num: entry.num, title })
  }
  if (errors.length) {
    console.error(`✗ ${errors.length} erreur(s) dans ${SRC} :`)
    for (const e of errors) console.error(`  ${e}`)
    process.exit(1)
  }

  await mkdir(path.dirname(OUT), { recursive: true })
  await writeFile(OUT, JSON.stringify(cards, null, 1) + '\n')
  const titled = entries.filter((e) => typeof e.title === 'string' && e.title.trim()).length
  console.log(`✓ ${cards.length} cartes → ${path.relative(SITE, OUT)} (${titled} avec titre, ${cards.length - titled} par défaut)`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
