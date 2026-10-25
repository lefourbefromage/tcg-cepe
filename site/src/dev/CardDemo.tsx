// Page de démonstration provisoire du composant Card (étape 3). Accessible via /#demo.
import { useState } from 'react'
import { Card } from '../components/Card/Card'
import { CARDS, type Rarity, RARITIES, RARITY_LABEL } from '../engine'
import styles from './CardDemo.module.css'

const SAMPLES: { num: string; rarity: Rarity }[] = [
  { num: '001', rarity: 'commun' },
  { num: '024', rarity: 'rare' },
  { num: '087', rarity: 'epique' },
  { num: '062', rarity: 'legendaire' },
]

export default function CardDemo() {
  const [num, setNum] = useState('062')
  const [rarity, setRarity] = useState<Rarity>('legendaire')
  const [title, setTitle] = useState('')
  const [width, setWidth] = useState(320)

  return (
    <main className={styles.page}>
      <h1 className={styles.h1}>Composant Card</h1>

      <section className={styles.section}>
        <h2 className={styles.h2}>Les 4 raretés</h2>
        <div className={styles.grid}>
          {SAMPLES.map((s) => (
            <figure key={s.rarity} className={styles.cell}>
              <Card num={s.num} rarity={s.rarity} sizes="(max-width: 600px) 45vw, 220px" loading="eager" />
              <figcaption>{RARITY_LABEL[s.rarity]}</figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.h2}>Variantes et badges</h2>
        <div className={styles.grid}>
          <figure className={styles.cell}>
            <Card num="001" variant="back" sizes="220px" />
            <figcaption>Dos</figcaption>
          </figure>
          <figure className={styles.cell}>
            <Card num="042" variant="missing" sizes="220px" />
            <figcaption>Manquante</figcaption>
          </figure>
          <figure className={styles.cell}>
            <Card num="015" rarity="rare" isNew sizes="220px" />
            <figcaption>Nouveau</figcaption>
          </figure>
          <figure className={styles.cell}>
            <Card num="097" rarity="commun" count={3} glow={false} sizes="220px" />
            <figcaption>×3, sans glow</figcaption>
          </figure>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.h2}>Carte interactive</h2>
        <div className={styles.controls}>
          <label>
            Carte
            <select value={num} onChange={(e) => setNum(e.target.value)}>
              {CARDS.map((c) => (
                <option key={c.num} value={c.num}>
                  {c.num} · {c.title}
                </option>
              ))}
            </select>
          </label>
          <label>
            Rareté
            <select value={rarity} onChange={(e) => setRarity(e.target.value as Rarity)}>
              {RARITIES.map((r) => (
                <option key={r} value={r}>
                  {RARITY_LABEL[r]}
                </option>
              ))}
            </select>
          </label>
          <label>
            Titre (test)
            <input value={title} placeholder="titre du catalogue" onChange={(e) => setTitle(e.target.value)} />
          </label>
          <label>
            Largeur {width} px
            <input type="range" min={120} max={480} value={width} onChange={(e) => setWidth(Number(e.target.value))} />
          </label>
        </div>
        <div className={styles.stage} style={{ width }}>
          <Card num={num} rarity={rarity} title={title || undefined} tilt gyro isNew count={2} sizes={`${width}px`} loading="eager" />
        </div>
      </section>
    </main>
  )
}
