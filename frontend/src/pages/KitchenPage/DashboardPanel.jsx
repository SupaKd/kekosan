import { useState, useEffect, useCallback } from 'react'
import { getStats } from '../../api/admin'
import { OrderDetailModal } from './OrdersPanel'
import styles from './DashboardPanel.module.css'

const STATUS_LABELS = {
  pending:    { label: 'En attente',    cls: 'pending' },
  confirmed:  { label: 'Confirmée',     cls: 'confirmed' },
  preparing:  { label: 'En préparation', cls: 'preparing' },
  delivering: { label: 'En livraison',  cls: 'delivering' },
  delivered:  { label: 'Livrée',        cls: 'delivered' },
  cancelled:  { label: 'Annulée',       cls: 'cancelled' },
}

const fmt = (n) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n)

const fmtTime = (d) =>
  new Date(d).toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'Europe/Paris',
  })

// ── Carte stat ───────────────────────────────────────────────────────────────
function StatCard({ label, count, revenue, accent }) {
  return (
    <div className={`${styles.statCard} ${styles[accent]}`}>
      <div className={styles.statLabel}>{label}</div>
      <div className={styles.statRevenue}>{fmt(revenue)}</div>
      <div className={styles.statCount}>{count} commande{count !== 1 ? 's' : ''}</div>
    </div>
  )
}

// ── Dashboard ────────────────────────────────────────────────────────────────
function DashboardPanel() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedOrderId, setSelectedOrderId] = useState(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getStats()
      setStats(data)
    } catch {
      setError('Impossible de charger les statistiques')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  if (loading) return <div className={styles.loader}>Chargement…</div>
  if (error)   return <div className={styles.errorMsg}>{error}</div>

  const { today, week, month, recentOrders } = stats

  return (
    <div className={styles.panel}>

      {/* ── Cartes stats ───────────────────────────────────────────────────── */}
      <div className={styles.statsGrid}>
        <StatCard label="Aujourd'hui" count={today.count}  revenue={today.revenue}  accent="accentToday" />
        <StatCard label="Cette semaine" count={week.count} revenue={week.revenue}   accent="accentWeek" />
        <StatCard label="Ce mois"     count={month.count}  revenue={month.revenue}  accent="accentMonth" />
      </div>

      {/* ── Dernières commandes ─────────────────────────────────────────────── */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTitle}>🕐 Dernières commandes</span>
          <button className={styles.refreshBtn} onClick={load}>↻ Actualiser les stats</button>
        </div>

        {recentOrders.length === 0 ? (
          <div className={styles.empty}>Aucune commande pour l'instant</div>
        ) : (
          <div className={styles.orderList}>
            {recentOrders.map(o => {
              const st = STATUS_LABELS[o.status] || { label: o.status, cls: 'pending' }
              return (
                <div
                  key={o.id}
                  className={`${styles.orderRow} ${styles.orderRowClickable}`}
                  onClick={() => setSelectedOrderId(o.id)}
                >
                  <span className={styles.orderId}>#{o.id}</span>
                  <span className={styles.orderName}>{o.customer_name}</span>
                  <span className={`${styles.statusBadge} ${styles[st.cls]}`}>{st.label}</span>
                  <span className={styles.orderTotal}>{fmt(o.total)}</span>
                  <span className={styles.orderDate}>{fmtTime(o.created_at)}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {selectedOrderId && (
        <OrderDetailModal
          orderId={selectedOrderId}
          onClose={() => setSelectedOrderId(null)}
          onStatusChanged={load}
        />
      )}
    </div>
  )
}

export default DashboardPanel
