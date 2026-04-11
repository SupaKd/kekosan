import { Component } from 'react'
import styles from './ErrorBoundary.module.css'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <div className={styles.icon}>💥</div>
          <h1 className={styles.title}>Oups, quelque chose s'est cassé</h1>
          <p className={styles.message}>
            Une erreur inattendue s'est produite. Rechargez la page ou revenez plus tard.
          </p>
          <button
            className={styles.reloadBtn}
            onClick={() => window.location.reload()}
          >
            Recharger la page
          </button>
          <a href="/" className={styles.homeLink}>← Retour à l'accueil</a>
        </div>
      </div>
    )
  }
}

export default ErrorBoundary
