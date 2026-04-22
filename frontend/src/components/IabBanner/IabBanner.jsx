import { useState } from 'react'
import styles from './IabBanner.module.css'

const isInAppBrowser = () => {
  const ua = navigator.userAgent || ''
  return /Instagram|FBAN|FBAV|FB_IAB|FB4A|FBIOS|LinkedInApp|Twitter|Line\/|MicroMessenger/i.test(ua)
}

function IabBanner() {
  const [copied, setCopied] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  if (!isInAppBrowser() || dismissed) return null

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      // fallback si clipboard API indisponible
      const input = document.createElement('input')
      input.value = window.location.href
      document.body.appendChild(input)
      input.select()
      document.execCommand('copy')
      document.body.removeChild(input)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    }
  }

  return (
    <div className={styles.banner}>
      <div className={styles.content}>
        <span className={styles.icon}>⚠️</span>
        <span className={styles.text}>
          Pour commander, ouvre ce lien dans <strong>Safari</strong> ou <strong>Chrome</strong>
        </span>
      </div>
      <div className={styles.actions}>
        <button className={styles.copyBtn} onClick={handleCopy}>
          {copied ? '✓ Copié !' : '📋 Copier le lien'}
        </button>
        <button className={styles.dismissBtn} onClick={() => setDismissed(true)} aria-label="Fermer">
          ✕
        </button>
      </div>
    </div>
  )
}

export default IabBanner
