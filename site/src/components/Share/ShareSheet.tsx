import { useEffect, useMemo, useRef, useState } from 'react'
import { getCard, type Rarity, RARITY_LABEL } from '../../engine'
import { renderCardImage } from '../../lib/cardImage'
import buttons from '../../styles/buttons.module.css'
import styles from './ShareSheet.module.css'

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/**
 * Écran 11 : aperçu de la carte et partage natif de l'image seule (l'utilisateur choisit Telegram
 * et le groupe). Pas de texte : combiné à un fichier, il est mal géré par certaines applis.
 * Sans partage de fichiers : téléchargement de l'image.
 */
export function ShareSheet({ num, rarity, onClose }: { num: string; rarity: Rarity; onClose: () => void }) {
  const title = getCard(num)?.title ?? `Carte ${num}`
  const [blob, setBlob] = useState<Blob | null>(null)
  const [error, setError] = useState(false)
  const [notice, setNotice] = useState('')
  const closeRef = useRef<HTMLButtonElement>(null)
  const filename = `confrerie-du-cepe-${num}-${rarity}.jpg`

  // Image générée dès l'ouverture : navigator.share doit être appelé directement dans le geste.
  useEffect(() => {
    let cancelled = false
    renderCardImage(num, rarity)
      .then((b) => !cancelled && setBlob(b))
      .catch(() => !cancelled && setError(true))
    return () => {
      cancelled = true
    }
  }, [num, rarity])

  const previewUrl = useMemo(() => (blob ? URL.createObjectURL(blob) : null), [blob])
  useEffect(() => () => void (previewUrl && URL.revokeObjectURL(previewUrl)), [previewUrl])

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
    }
    addEventListener('keydown', onKey, true)
    return () => {
      removeEventListener('keydown', onKey, true)
      previous?.focus()
    }
  }, [onClose])

  const share = async () => {
    if (!blob) return
    const file = new File([blob], filename, { type: 'image/jpeg' })
    try {
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file] })
        return
      }
      download(blob, filename)
      setNotice('Partage non disponible ici : l’image a été enregistrée.')
    } catch (e) {
      if ((e as DOMException).name !== 'AbortError') setNotice('Le partage a échoué. Enregistrez l’image à la place.')
    }
  }

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div
        className={styles.sheet}
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className={styles.head}>
          <h2 id="share-title">Partager la carte</h2>
          <button ref={closeRef} type="button" className={styles.close} onClick={onClose} aria-label="Fermer">
            <svg viewBox="0 0 24 24" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </header>

        <div className={styles.body}>
          <div className={styles.preview}>
            {previewUrl ? (
              <img src={previewUrl} alt={`Carte N°${num} « ${title} », ${RARITY_LABEL[rarity]}`} />
            ) : (
              <span className={styles.loading}>{error ? 'Image indisponible' : 'Préparation de l’image…'}</span>
            )}
          </div>

          <div className={styles.form}>
            <div className={styles.actions}>
              <button type="button" className={buttons.primary} disabled={!blob} onClick={share}>
                Partager
              </button>
              <button type="button" className={buttons.secondary} disabled={!blob} onClick={() => blob && download(blob, filename)}>
                Enregistrer l’image
              </button>
            </div>
            <p className={styles.notice} aria-live="polite">
              {notice}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
