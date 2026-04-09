import { useNavigate } from 'react-router-dom'
import styles from './NotFoundPage.module.css'

function NotFoundPage() {
  const navigate = useNavigate()

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.code}>404</div>
        <div className={styles.title}>Page introuvable</div>
        <div className={styles.desc}>Cette page n'existe pas ou a été déplacée.</div>
        <button className={styles.btn} onClick={() => navigate('/')}>
          ← Retour au menu
        </button>
      </div>
    </div>
  )
}

export default NotFoundPage
