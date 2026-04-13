import { useState, useEffect, useCallback } from 'react'
import { getStats, getOrders } from '../../api/admin'
import { OrderDetailModal } from './OrdersPanel'
import styles from './DashboardPanel.module.css'
import orderStyles from './OrdersPanel.module.css'

const STATUS_OPTIONS = [
  { value: '',           label: 'Tous les statuts' },
  { value: 'pending',    label: 'En attente' },
  { value: 'confirmed',  label: 'Confirmée' },
  { value: 'preparing',  label: 'En préparation' },
  { value: 'delivering', label: 'En livraison' },
  { value: 'delivered',  label: 'Livrée' },
  { value: 'cancelled',  label: 'Annulée' },
]

const STATUS_LABELS = {
  pending:    { label: 'En attente',     cls: 'pending' },
  confirmed:  { label: 'Confirmée',      cls: 'confirmed' },
  preparing:  { label: 'En préparation', cls: 'preparing' },
  delivering: { label: 'En livraison',   cls: 'delivering' },
  delivered:  { label: 'Livrée',         cls: 'delivered' },
  cancelled:  { label: 'Annulée',        cls: 'cancelled' },
}

const fmt = (n) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n)

const fmtDateTime = (d) =>
  new Date(d).toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
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

// ── Mini barre graphe CA 30 jours ────────────────────────────────────────────
function RevenueChart({ data }) {
  if (!data || data.length === 0) return null
  const max = Math.max(...data.map(d => parseFloat(d.revenue)), 1)
  // Remplir les 30 derniers jours (jours sans commande = 0)
  const days = []
  for (let i = 29; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    const found = data.find(r => r.day?.slice(0, 10) === key)
    days.push({ day: key, revenue: found ? parseFloat(found.revenue) : 0, count: found?.count || 0 })
  }
  return (
    <div className={styles.chart}>
      {days.map((d, i) => (
        <div key={i} className={styles.chartCol} title={`${d.day}\n${fmt(d.revenue)} — ${d.count} cmd`}>
          <div
            className={styles.chartBar}
            style={{ height: `${Math.max(2, (d.revenue / max) * 100)}%` }}
          />
        </div>
      ))}
    </div>
  )
}

// ── Dashboard + Historique fusionnés ─────────────────────────────────────────
function DashboardPanel() {
  // Stats
  const [stats, setStats] = useState(null)
  const [statsLoading, setStatsLoading] = useState(true)
  const [statsError, setStatsError] = useState(null)

  // Historique
  const [orders, setOrders] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [ordersLoading, setOrdersLoading] = useState(false)
  const [filters, setFilters] = useState({ status: '', search: '', date_from: '', date_to: '' })
  const [pendingSearch, setPendingSearch] = useState('')

  const [selectedOrderId, setSelectedOrderId] = useState(null)

  const LIMIT = 15

  const loadStats = useCallback(async () => {
    try {
      setStatsLoading(true)
      setStatsError(null)
      const data = await getStats()
      setStats(data)
    } catch {
      setStatsError('Impossible de charger les statistiques')
    } finally {
      setStatsLoading(false)
    }
  }, [])

  const loadOrders = useCallback(async (p, f) => {
    setOrdersLoading(true)
    try {
      const result = await getOrders({
        status: f.status || undefined,
        search: f.search || undefined,
        date_from: f.date_from || undefined,
        date_to: f.date_to || undefined,
        page: p,
        limit: LIMIT,
      })
      setOrders(result.orders)
      setTotal(result.total)
      setPage(p)
    } catch {
      // token expiré géré en amont
    } finally {
      setOrdersLoading(false)
    }
  }, [])

  useEffect(() => { loadStats() }, [loadStats])
  useEffect(() => { loadOrders(1, filters) }, [filters, loadOrders])

  const applySearch = () => setFilters(f => ({ ...f, search: pendingSearch }))

  const resetFilters = () => {
    const empty = { status: '', search: '', date_from: '', date_to: '' }
    setPendingSearch('')
    setFilters(empty)
  }

  const totalPages = Math.ceil(total / LIMIT)

  return (
    <div className={styles.panel}>

      {/* ── Cartes stats ───────────────────────────────────────────────────── */}
      {statsLoading && <div className={styles.loader}>Chargement des statistiques…</div>}
      {statsError  && <div className={styles.errorMsg}>{statsError}</div>}
      {stats && (
        <div className={styles.statsGrid}>
          <StatCard label="Aujourd'hui"  count={stats.today.count}  revenue={stats.today.revenue}  accent="accentToday" />
          <StatCard label="Cette semaine" count={stats.week.count}  revenue={stats.week.revenue}   accent="accentWeek" />
          <StatCard label="Ce mois"      count={stats.month.count}  revenue={stats.month.revenue}  accent="accentMonth" />
        </div>
      )}

      {/* ── Statistiques détaillées ────────────────────────────────────────── */}
      {stats && (
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionTitle}>📊 Statistiques</span>
          </div>
          <div className={styles.statsDetail}>

            {/* Ticket moyen */}
            <div className={styles.statDetailCard}>
              <div className={styles.statDetailLabel}>Ticket moyen</div>
              <div className={styles.statDetailValue}>{fmt(stats.avg_ticket)}</div>
            </div>

            {/* Top produits */}
            <div className={styles.statDetailCard}>
              <div className={styles.statDetailLabel}>Top produits</div>
              <div className={styles.topList}>
                {stats.top_products.map((p, i) => (
                  <div key={i} className={styles.topRow}>
                    <span className={styles.topRank}>#{i + 1}</span>
                    <span className={styles.topName}>{p.name}</span>
                    <span className={styles.topVal}>{p.qty} vendus</span>
                  </div>
                ))}
                {stats.top_products.length === 0 && <div className={styles.topEmpty}>Aucune donnée</div>}
              </div>
            </div>

            {/* Top créneaux */}
            <div className={styles.statDetailCard}>
              <div className={styles.statDetailLabel}>Créneaux populaires</div>
              <div className={styles.topList}>
                {stats.top_slots.map((s, i) => (
                  <div key={i} className={styles.topRow}>
                    <span className={styles.topRank}>#{i + 1}</span>
                    <span className={styles.topName}>{s.slot}</span>
                    <span className={styles.topVal}>{s.cnt} cmd</span>
                  </div>
                ))}
                {stats.top_slots.length === 0 && <div className={styles.topEmpty}>Aucune donnée</div>}
              </div>
            </div>

          </div>

          {/* CA 30 derniers jours */}
          <div className={styles.chartSection}>
            <div className={styles.chartLabel}>Chiffre d'affaires — 30 derniers jours</div>
            <RevenueChart data={stats.revenue_by_day} />
          </div>
        </div>
      )}

      {/* ── Historique des commandes ────────────────────────────────────────── */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTitle}>📋 Historique des commandes</span>
          <button className={styles.refreshBtn} onClick={() => { loadStats(); loadOrders(1, filters) }}>
            ↻ Actualiser
          </button>
        </div>

        {/* Filtres + tableau dans un wrapper avec padding cohérent */}
        <div className={styles.historyBody}>

          <div className={orderStyles.filtersBar}>
            <div className={orderStyles.searchGroup}>
              <input
                className={orderStyles.searchInput}
                placeholder="#123, nom, email, téléphone…"
                value={pendingSearch}
                onChange={e => setPendingSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && applySearch()}
              />
              <button className={orderStyles.searchBtn} onClick={applySearch}>Chercher</button>
            </div>

            <select
              className={orderStyles.filterSelect}
              value={filters.status}
              onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
            >
              {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>

            <div className={orderStyles.dateGroup}>
              <label className={orderStyles.dateLabel}>Du</label>
              <input
                type="date"
                className={orderStyles.filterSelect}
                value={filters.date_from}
                onChange={e => setFilters(f => ({ ...f, date_from: e.target.value }))}
              />
            </div>
            <div className={orderStyles.dateGroup}>
              <label className={orderStyles.dateLabel}>Au</label>
              <input
                type="date"
                className={orderStyles.filterSelect}
                value={filters.date_to}
                onChange={e => setFilters(f => ({ ...f, date_to: e.target.value }))}
              />
            </div>

            <button className={orderStyles.resetBtn} onClick={resetFilters}>Effacer</button>
          </div>

          {/* Compteur */}
          <div className={orderStyles.resultsBar}>
            {ordersLoading ? 'Chargement…' : `${total} commande${total !== 1 ? 's' : ''}`}
          </div>

        </div>

        {/* Tableau pleine largeur (sans padding latéral pour coller aux bords) */}
        <div className={orderStyles.tableWrap}>
          <table className={orderStyles.table}>
            <thead>
              <tr>
                <th>#</th>
                <th>Client</th>
                <th>Date</th>
                <th>Créneau</th>
                <th>Statut</th>
                <th>Total</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 && !ordersLoading && (
                <tr><td colSpan={7} className={orderStyles.emptyCell}>Aucune commande</td></tr>
              )}
              {orders.map(o => {
                const st = STATUS_LABELS[o.status] || { label: o.status, cls: 'pending' }
                return (
                  <tr key={o.id} className={orderStyles.tr}>
                    <td className={orderStyles.tdId}>#{o.id}</td>
                    <td className={orderStyles.tdClient}>
                      <div>{o.customer_name}</div>
                      <div className={orderStyles.sub}>{o.customer_phone}</div>
                    </td>
                    <td className={orderStyles.tdDate}>{fmtDateTime(o.created_at)}</td>
                    <td className={orderStyles.tdSlot}>{o.delivery_time || '—'}</td>
                    <td>
                      <span className={`${orderStyles.badge} ${orderStyles[st.cls]}`}>{st.label}</span>
                    </td>
                    <td className={orderStyles.tdTotal}>{fmt(o.total)}</td>
                    <td>
                      <button className={orderStyles.detailBtn} onClick={() => setSelectedOrderId(o.id)}>
                        Voir →
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className={`${orderStyles.pagination} ${styles.historyPagination}`}>
            <button className={orderStyles.pageBtn} disabled={page <= 1} onClick={() => loadOrders(page - 1, filters)}>← Précédent</button>
            <span className={orderStyles.pageInfo}>Page {page} sur {totalPages}</span>
            <button className={orderStyles.pageBtn} disabled={page >= totalPages} onClick={() => loadOrders(page + 1, filters)}>Suivant →</button>
          </div>
        )}
      </div>

      {/* Modale détail */}
      {selectedOrderId && (
        <OrderDetailModal
          orderId={selectedOrderId}
          onClose={() => setSelectedOrderId(null)}
          onStatusChanged={() => { loadStats(); loadOrders(page, filters) }}
        />
      )}
    </div>
  )
}

export default DashboardPanel
