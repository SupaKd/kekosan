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

// Calcule la fourchette de livraison estimée à partir du créneau (ex: "12:30" → "12:30 – 13:00")
function getDeliveryWindow(deliveryTime) {
  if (!deliveryTime) return null
  const [h, m] = deliveryTime.split(':').map(Number)
  const start = new Date(0)
  start.setHours(h, m, 0, 0)
  const end = new Date(start.getTime() + 30 * 60000)
  const fmt = (d) =>
    `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  return `${fmt(start)} – ${fmt(end)}`
}

function TrackingPage() {
  const { token } = useParams()
  const navigate = useNavigate()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [refreshing, setRefreshing] = useState(false)
  const [socketConnected, setSocketConnected] = useState(false)
  const [copied, setCopied] = useState(false)

  const fetchOrder = (showSpinner = false) => {
    if (showSpinner) setRefreshing(true)
    return getOrderByToken(token)
      .then(data => setOrder(data))
      .catch(() => setError('Commande introuvable.'))
      .finally(() => { if (showSpinner) setRefreshing(false) })
  }

  useEffect(() => {
    setLoading(true)
    fetchOrder()
      .finally(() => setLoading(false))
  }, [token])

  // Socket.io — écoute les mises à jour de statut en temps réel
  // On utilise le tracking_token (UUID public) comme identifiant de room, pas l'id interne
  useEffect(() => {
    if (!order) return
    const socket = io('/', { path: '/socket.io' })
    socket.on('connect', () => setSocketConnected(true))
    socket.on('disconnect', () => setSocketConnected(false))
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
        <div className={styles.errorCard}>
          <div className={styles.errorIcon}>📭</div>
          <div className={styles.errorMsg}>{error || 'Commande introuvable.'}</div>
          <p className={styles.errorHint}>Vérifiez le lien reçu par email ou contactez-nous.</p>
          <button className={styles.backBtn} onClick={() => navigate('/')}>← Retour au menu</button>
        </div>
      </div>
    )
  }

  const currentStepIndex = STATUS_STEPS.findIndex(s => s.key === order.status)
  const deliveryWindow = getDeliveryWindow(order.delivery_time)
  const isCancelled = order.status === 'cancelled'
  const isRefunded = isCancelled && order.payment_status === 'refunded'

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.logo}>Kekosan</div>
          <div className={styles.logoJp}>SUIVI DE COMMANDE</div>
          <div className={styles.headerActions}>
            {/* Indicateur connexion temps réel */}
            <div className={styles.socketStatus} title={socketConnected ? 'Temps réel actif' : 'Temps réel déconnecté'}>
              <span className={`${styles.socketDot} ${socketConnected ? styles.socketOn : styles.socketOff}`} />
              <span className={styles.socketLabel}>{socketConnected ? 'En direct' : 'Déconnecté'}</span>
            </div>
            {/* Bouton actualiser manuel */}
            <button
              className={styles.refreshBtn}
              onClick={() => fetchOrder(true)}
              disabled={refreshing}
              aria-label="Actualiser le statut"
            >
              <span className={refreshing ? styles.refreshSpinning : ''}>↻</span>
              {refreshing ? 'Actualisation…' : 'Actualiser'}
            </button>
          </div>
        </div>

        {/* Bandeau annulation / remboursement */}
        {isCancelled && (
          <div className={styles.cancelledBanner}>
            <div className={styles.cancelledIcon}>{isRefunded ? '↩' : '✕'}</div>
            <div>
              <div className={styles.cancelledTitle}>
                {isRefunded ? 'Commande annulée et remboursée' : 'Commande annulée'}
              </div>
              <div className={styles.cancelledDesc}>
                {isRefunded
                  ? `Le remboursement de ${formatPrice(order.total)} a été initié. Comptez 5 à 10 jours ouvrés pour le crédit sur votre compte.`
                  : 'Votre commande a été annulée. Contactez-nous si vous avez des questions.'}
              </div>
            </div>
          </div>
        )}

        {/* Stepper — masqué si annulée */}
        {!isCancelled && <div className={styles.stepper}>
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
                  {isCurrent && step.key === 'delivering' && deliveryWindow && (
                    <div className={styles.estimatedTime}>
                      🕐 Livraison estimée entre {deliveryWindow}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>}

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

        <div className={styles.footerActions}>
          <button
            className={`${styles.copyBtn} ${copied ? styles.copyBtnSuccess : ''}`}
            onClick={() => {
              navigator.clipboard.writeText(window.location.href)
                .then(() => {
                  setCopied(true)
                  setTimeout(() => setCopied(false), 2000)
                })
                .catch(() => {})
            }}
          >
            {copied ? '✓ Lien copié !' : '🔗 Copier le lien de suivi'}
          </button>
          <button className={styles.backBtn} onClick={() => navigate('/')}>
            ← Retour au menu
          </button>
        </div>
      </div>
    </div>
  )
}

export default TrackingPage
