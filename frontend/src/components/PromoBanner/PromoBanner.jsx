import { useState, useEffect } from 'react'
import client from '../../api/client'
import styles from './PromoBanner.module.css'

function PromoBanner() {
  const [promoCodes, setPromoCodes] = useState([])

  useEffect(() => {
    client.get('/orders/active-promos').then(r => setPromoCodes(r.data)).catch(() => {})
  }, [])

  if (promoCodes.length === 0) return null

  // Génère les items à afficher — répétés pour remplir la bande
  const items = []
  for (let i = 0; i < 8; i++) {
    promoCodes.forEach(promo => {
      const label = promo.type === 'percent'
        ? `${promo.value}% de réduction`
        : `${promo.value} € de réduction`
      items.push({ code: promo.code, label })
    })
  }

  return (
    <div className={styles.banner}>
      <div className={styles.track}>
        {items.map((item, i) => (
          <span key={i} className={styles.item}>
            <span className={styles.tag}>PROMO</span>
            <span className={styles.label}>{item.label} avec le code</span>
            <span className={styles.code}>{item.code}</span>
            <span className={styles.sep}>✦</span>
          </span>
        ))}
      </div>
    </div>
  )
}

export default PromoBanner
