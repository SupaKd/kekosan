import { useEffect } from 'react'
import styles from './LegalModal.module.css'

function LegalModal({ onClose }) {
  useEffect(() => {
    const handler = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div className={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <span className={styles.title}>CGV & Politique de confidentialité</span>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>
        <div className={styles.body}>

          <h3>1. Identification</h3>
          <p>Kekosan — Dark Kitchen — Saint-Genis-Pouilly (01630). Livraison exclusivement sur la commune de Saint-Genis-Pouilly.</p>

          <h3>2. Commandes</h3>
          <p>Toute commande passée sur ce site est ferme et définitive après confirmation du paiement. Vous recevez un email de confirmation avec un lien de suivi unique.</p>

          <h3>3. Paiement</h3>
          <p>Le paiement est effectué en ligne via Stripe (carte bancaire). Aucune donnée bancaire n'est stockée sur nos serveurs. La transaction est sécurisée par chiffrement SSL.</p>

          <h3>4. Livraison</h3>
          <p>La livraison est assurée sur Saint-Genis-Pouilly uniquement. Le créneau choisi est indicatif ; des délais peuvent survenir selon l'affluence.</p>

          <h3>5. Droit de rétractation</h3>
          <p>Conformément à l'article L221-28 du Code de la consommation, le droit de rétractation ne s'applique pas aux denrées alimentaires périssables.</p>

          <h3>6. Données personnelles (RGPD)</h3>
          <p><strong>Données collectées :</strong> nom, email, téléphone, adresse de livraison.</p>
          <p><strong>Finalité :</strong> traitement et suivi de votre commande uniquement.</p>
          <p><strong>Base légale :</strong> exécution du contrat (article 6.1.b du RGPD).</p>
          <p><strong>Durée de conservation :</strong> 10 ans (obligation légale comptable).</p>
          <p><strong>Destinataires :</strong> vos données ne sont pas vendues ni cédées à des tiers. Stripe reçoit les informations nécessaires au paiement conformément à sa propre politique de confidentialité.</p>
          <p><strong>Vos droits :</strong> accès, rectification, effacement, opposition. Contactez-nous par email pour exercer vos droits.</p>

          <h3>7. Cookies</h3>
          <p>Ce site n'utilise pas de cookies de tracking ou publicitaires. Seuls des cookies techniques strictement nécessaires au fonctionnement du paiement Stripe sont déposés.</p>

        </div>
      </div>
    </div>
  )
}

export default LegalModal
