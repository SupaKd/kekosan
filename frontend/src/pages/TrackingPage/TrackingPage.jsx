import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { io } from 'socket.io-client'
import { getOrderByToken } from '../../api/orders'
import styles from './TrackingPage.module.css'

const STATUS_STEPS = [
  { key: 'pending',    label: 'En attente',      icon: '🕐', desc: 'Votre commande est en cours de traitement' },
  { key: 'confirmed',  label: 'Confirmée',        icon: '✅', desc: 'Paiement validé, commande transmise' },
  { key: 'preparing',  label: 'En préparation',   icon: '👨‍🍳', desc: 'La cuisine prépare votre commande' },
  { key: 'delivering', label: 'En livraison',     icon: '🛵', desc: 'Votre livreur est en route' },
  { key: 'delivered',  label: 'Livrée',           icon: '🎉', desc: 'Bonne dégustation !' },
]

import { formatPrice } from '../../utils/formatting'

const formatDate = (d) =>
  new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' })

function TrackingPage() {
  const { token } = useParams()
  const navigate = useNavigate()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    getOrderByToken(token)
      .then(data => setOrder(data))
      .catch(() => setError('Commande introuvable.'))
      .finally(() => setLoading(false))
  }, [token])

  // Socket.io — écoute les mises à jour de statut en temps réel
  // On utilise le tracking_token (UUID public) comme identifiant de room, pas l'id interne
  useEffect(() => {
    if (!order) return
    const socket = io('/', { path: '/socket.io' })
    socket.emit('track_order', token)
    socket.on('order_status_updated', (data) => {
      setOrder(prev => ({ ...prev, status: data.status, payment_status: data.payment_status }))
    })
    return () => socket.disconnect()
  }, [order?.id, token])

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loading}>
          <div className={styles.spinner} />
          Chargement…
        </div>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className={styles.page}>
        <div className={styles.error}>{error || 'Commande introuvable.'}</div>
      </div>
    )
  }

  const currentStepIndex = STATUS_STEPS.findIndex(s => s.key === order.status)

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.logo}>Kekosan</div>
          <div className={styles.logoJp}>SUIVI DE COMMANDE</div>
        </div>

        {/* Stepper */}
        <div className={styles.stepper}>
          {STATUS_STEPS.map((step, i) => {
            const isDone = i < currentStepIndex
            const isCurrent = i === currentStepIndex
            return (
              <div
                key={step.key}
                className={`${styles.step} ${isDone ? styles.done : ''} ${isCurrent ? styles.current : ''}`}
              >
                <div className={styles.stepDot}>{isDone ? '✓' : step.icon}</div>
                <div className={styles.stepContent}>
                  <div className={styles.stepLabel}>{step.label}</div>
                  {isCurrent && <div className={styles.stepDesc}>{step.desc}</div>}
                </div>
              </div>
            )
          })}
        </div>

        {/* Récapitulatif des articles */}
        {((order.items?.length > 0) || (order.formula_items?.length > 0)) && (
          <>
            <hr className={styles.divider} />
            <div className={styles.itemsSection}>
              <div className={styles.sectionTitle}>Votre commande</div>
              {order.items?.map((item) => (
                <div key={item.id} className={styles.itemRow}>
                  <div className={styles.itemName}>
                    {item.product_name_snapshot}
                    {item.options_label && (
                      <div className={styles.itemOptions}>{item.options_label}</div>
                    )}
                  </div>
                  <div className={styles.itemQtyPrice}>
                    x{item.quantity} · {formatPrice(item.unit_price_snapshot * item.quantity)}
                  </div>
                </div>
              ))}
              {order.formula_items?.map((fi) => (
                <div key={fi.id} className={styles.itemRow}>
                  <div className={styles.itemName}>
                    {fi.formula_name_snapshot}
                    {fi.slots?.map((s) => (
                      <div key={s.slot_name} className={styles.itemOptions}>
                        {s.slot_name} : {s.product_name_snapshot}
                      </div>
                    ))}
                  </div>
                  <div className={styles.itemQtyPrice}>
                    x{fi.quantity} · {formatPrice(fi.formula_price_snapshot * fi.quantity)}
                  </div>
                </div>
              ))}
            </div>
            <hr className={styles.divider} />
          </>
        )}

        {/* Infos commande */}
        <div className={styles.infoGrid}>
          <div className={styles.infoItem}>
            <div className={styles.infoLabel}>Client</div>
            <div className={styles.infoValue}>{order.customer_name}</div>
          </div>
          <div className={styles.infoItem}>
            <div className={styles.infoLabel}>Total</div>
            <div className={`${styles.infoValue} ${styles.cyan}`}>{formatPrice(order.total)}</div>
          </div>
          <div className={styles.infoItem} style={{ gridColumn: '1 / -1' }}>
            <div className={styles.infoLabel}>Adresse de livraison</div>
            <div className={styles.infoValue}>{order.delivery_address}</div>
          </div>
          {order.delivery_time && (
            <div className={styles.infoItem}>
              <div className={styles.infoLabel}>Créneau</div>
              <div className={`${styles.infoValue} ${styles.cyan}`}>🕐 {order.delivery_time}</div>
            </div>
          )}
          <div className={styles.infoItem}>
            <div className={styles.infoLabel}>Commande passée le</div>
            <div className={styles.infoValue}>{formatDate(order.created_at)}</div>
          </div>
          <div className={styles.infoItem}>
            <div className={styles.infoLabel}>Référence</div>
            <div className={styles.infoValue} style={{ fontSize: 11, wordBreak: 'break-all' }}>
              #{order.id}
            </div>
          </div>
        </div>

        <button className={styles.backBtn} onClick={() => navigate('/')}>
          ← Retour au menu
        </button>
      </div>
    </div>
  )
}

export default TrackingPage
