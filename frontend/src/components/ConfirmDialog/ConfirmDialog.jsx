import { useEffect } from 'react'
import styles from './ConfirmDialog.module.css'

/**
 * Boîte de dialogue de confirmation personnalisée.
 *
 * Props :
 *   message   — texte affiché (string)
 *   onConfirm — appelé si l'utilisateur confirme
 *   onCancel  — appelé si l'utilisateur annule (ou clique hors de la modale)
 *   danger    — (bool) colore le bouton de confirmation en rouge
 *   confirmLabel — texte du bouton confirmer (défaut : "Confirmer")
 *   cancelLabel  — texte du bouton annuler  (défaut : "Annuler")
 */
function ConfirmDialog({
  message,
  onConfirm,
  onCancel,
  danger = false,
  confirmLabel = 'Confirmer',
  cancelLabel = 'Annuler',
}) {
  // Fermeture au clavier
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') onCancel()
      if (e.key === 'Enter')  onConfirm()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onConfirm, onCancel])

  return (
    <div className={styles.overlay} onClick={e => e.target === e.currentTarget && onCancel()}>
      <div className={styles.dialog} role="alertdialog" aria-modal="true">
        <p className={styles.message}>{message}</p>
        <div className={styles.actions}>
          <button className={styles.cancelBtn} onClick={onCancel}>{cancelLabel}</button>
          <button
            className={`${styles.confirmBtn} ${danger ? styles.danger : ''}`}
            onClick={onConfirm}
            autoFocus
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmDialog
