import { useState, useEffect, useCallback } from 'react'
import { getOrders, getOrderById, updateOrderStatus } from '../../api/admin'
import ConfirmDialog from '../../components/ConfirmDialog/ConfirmDialog'
import styles from './OrdersPanel.module.css'

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

// Statuts vers lesquels on peut manuellement basculer
const NEXT_STATUSES = {
  pending:    ['confirmed', 'cancelled'],
  confirmed:  ['preparing', 'cancelled'],
  preparing:  ['delivering', 'cancelled'],
  delivering: ['delivered', 'cancelled'],
  delivered:  [],
  cancelled:  [],
}

const NEXT_STATUS_LABELS = {
  confirmed:  '✅ Confirmer la commande',
  preparing:  '👨‍🍳 Lancer la préparation',
  delivering: '🛵 Partir en livraison',
  delivered:  '✓ Marquer comme livré',
  cancelled:  '🚫 Annuler la commande',
}

const fmt = (n) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n)

const fmtDateTime = (d) =>
  new Date(d).toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'Europe/Paris',
  })

// ── Modale détail commande ───────────────────────────────────────────────────
export function OrderDetailModal({ orderId, onClose, onStatusChanged }) {
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [statusLoading, setStatusLoading] = useState(false)
  const [error, setError] = useState(null)
  const [statusConfirm, setStatusConfirm] = useState(null) // { newStatus, label }

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const data = await getOrderById(orderId)
      setOrder(data)
    } catch {
      setError('Impossible de charger la commande')
    } finally {
      setLoading(false)
    }
  }, [orderId])

  useEffect(() => { load() }, [load])

  const handleStatusChange = (newStatus) => {
    setStatusConfirm({ newStatus, label: STATUS_LABELS[newStatus]?.label })
  }

  const doStatusChange = async () => {
    const { newStatus } = statusConfirm
    setStatusConfirm(null)
    setStatusLoading(true)
    try {
      await updateOrderStatus(order.id, newStatus)
      await load()
      onStatusChanged()
    } catch {
      setError('Erreur lors du changement de statut')
    } finally {
      setStatusLoading(false)
    }
  }

  return (
    <div className={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <span className={styles.modalTitle}>
            Commande {order ? `#${order.id}` : '…'}
          </span>
          <button className={styles.closeBtn} onClick={onClose}>✕ Fermer</button>
        </div>

        {loading && <div className={styles.loader}>Chargement…</div>}
        {error   && <div className={styles.errorMsg}>{error}</div>}

        {order && !loading && (
          <div className={styles.modalBody}>

            {/* Statut + actions */}
            <div className={styles.statusRow}>
              <span className={`${styles.badge} ${styles[STATUS_LABELS[order.status]?.cls]}`}>
                {STATUS_LABELS[order.status]?.label || order.status}
              </span>
              <div className={styles.statusActions}>
                {(NEXT_STATUSES[order.status] || []).map(s => (
                  <button
                    key={s}
                    className={`${styles.statusBtn} ${s === 'cancelled' ? styles.cancelStatus : styles.nextStatus}`}
                    onClick={() => handleStatusChange(s)}
                    disabled={statusLoading}
                  >
                    {NEXT_STATUS_LABELS[s] || STATUS_LABELS[s]?.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Infos client */}
            <div className={styles.infoGrid}>
              <div className={styles.infoBlock}>
                <div className={styles.infoLabel}>Client</div>
                <div className={styles.infoValue}>{order.customer_name}</div>
                <div className={styles.infoSub}>{order.customer_phone}</div>
                <div className={styles.infoSub}>{order.customer_email}</div>
              </div>
              <div className={styles.infoBlock}>
                <div className={styles.infoLabel}>Livraison</div>
                <div className={styles.infoValue}>{order.delivery_address}</div>
                {order.delivery_time && (
                  <div className={styles.infoSub}>Créneau : {order.delivery_time}</div>
                )}
              </div>
              <div className={styles.infoBlock}>
                <div className={styles.infoLabel}>Commande</div>
                <div className={styles.infoValue}>{fmtDateTime(order.created_at)}</div>
                <div className={styles.infoSub}>
                  Paiement : {order.payment_status === 'paid' ? '✓ Payé' : order.payment_status}
                </div>
              </div>
            </div>

            {/* Articles */}
            <div className={styles.itemsSection}>
              <div className={styles.infoLabel}>Articles</div>
              {(order.items || []).map(item => (
                <div key={item.id} className={styles.itemRow}>
                  <span className={styles.itemQty}>×{item.quantity}</span>
                  <span className={styles.itemName}>{item.product_name_snapshot}</span>
                  {item.options_label && (
                    <span className={styles.itemOptions}>{item.options_label}</span>
                  )}
                  <span className={styles.itemPrice}>
                    {fmt(item.unit_price_snapshot * item.quantity)}
                  </span>
                </div>
              ))}
              {(order.formula_items || []).map(fi => (
                <div key={fi.id}>
                  <div className={styles.itemRow}>
                    <span className={styles.itemQty}>×{fi.quantity}</span>
                    <span className={styles.itemName}>🍱 {fi.formula_name_snapshot}</span>
                    <span className={styles.itemPrice}>
                      {fmt(fi.formula_price_snapshot * fi.quantity)}
                    </span>
                  </div>
                  {(fi.slots || []).map(s => (
                    <div key={s.slot_name} className={styles.slotRow}>
                      {s.slot_name} → {s.product_name_snapshot}
                    </div>
                  ))}
                </div>
              ))}
            </div>

            {/* Notes */}
            {order.notes && (
              <div className={styles.notesBlock}>
                <div className={styles.infoLabel}>Notes</div>
                <div className={styles.notesText}>⚠️ {order.notes}</div>
              </div>
            )}

            {/* Total */}
            <div className={styles.totalRow}>
              <span>Total</span>
              <span className={styles.totalAmount}>{fmt(order.total)}</span>
            </div>
          </div>
        )}

        {/* Confirmation changement de statut */}
        {statusConfirm && (
          <ConfirmDialog
            message={`Passer la commande #${order.id} en "${statusConfirm.label}" ?`}
            confirmLabel="Confirmer"
            danger={statusConfirm.newStatus === 'cancelled'}
            onConfirm={doStatusChange}
            onCancel={() => setStatusConfirm(null)}
          />
        )}
      </div>
    </div>
  )
}

// ── Panel historique ─────────────────────────────────────────────────────────
function OrdersPanel() {
  const [orders, setOrders] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)

  const [filters, setFilters] = useState({
    status: '',
    search: '',
    date_from: '',
    date_to: '',
  })
  const [pendingSearch, setPendingSearch] = useState('')

  const [selectedOrderId, setSelectedOrderId] = useState(null)

  const LIMIT = 15

  // load prend explicitement les filtres en paramètre — pas de dépendance circulaire
  const load = useCallback(async (p, f) => {
    setLoading(true)
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
      setLoading(false)
    }
  }, [])

  useEffect(() => { load(1, filters) }, [filters, load])

  const applySearch = () => {
    setFilters(f => ({ ...f, search: pendingSearch }))
  }

  const resetFilters = () => {
    const empty = { status: '', search: '', date_from: '', date_to: '' }
    setPendingSearch('')
    setFilters(empty)
  }

  const totalPages = Math.ceil(total / LIMIT)

  return (
    <div className={styles.panel}>

      {/* ── Filtres ──────────────────────────────────────────────────────── */}
      <div className={styles.filtersBar}>
        <div className={styles.searchGroup}>
          <input
            className={styles.searchInput}
            placeholder="#123, nom, email, téléphone…"
            value={pendingSearch}
            onChange={e => setPendingSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && applySearch()}
          />
          <button className={styles.searchBtn} onClick={applySearch}>Chercher</button>
        </div>

        <select
          className={styles.filterSelect}
          value={filters.status}
          onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
        >
          {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>

        <div className={styles.dateGroup}>
          <label className={styles.dateLabel}>Du</label>
          <input
            type="date"
            className={styles.filterSelect}
            value={filters.date_from}
            onChange={e => setFilters(f => ({ ...f, date_from: e.target.value }))}
          />
        </div>
        <div className={styles.dateGroup}>
          <label className={styles.dateLabel}>Au</label>
          <input
            type="date"
            className={styles.filterSelect}
            value={filters.date_to}
            onChange={e => setFilters(f => ({ ...f, date_to: e.target.value }))}
          />
        </div>

        <button className={styles.resetBtn} onClick={resetFilters}>Effacer les filtres</button>
      </div>

      {/* ── Résultats ─────────────────────────────────────────────────────── */}
      <div className={styles.resultsBar}>
        {loading ? 'Chargement…' : `${total} commande${total !== 1 ? 's' : ''}`}
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
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
            {orders.length === 0 && !loading && (
              <tr><td colSpan={7} className={styles.emptyCell}>Aucune commande</td></tr>
            )}
            {orders.map(o => {
              const st = STATUS_LABELS[o.status] || { label: o.status, cls: 'pending' }
              return (
                <tr key={o.id} className={styles.tr}>
                  <td className={styles.tdId}>#{o.id}</td>
                  <td className={styles.tdClient}>
                    <div>{o.customer_name}</div>
                    <div className={styles.sub}>{o.customer_phone}</div>
                  </td>
                  <td className={styles.tdDate}>{fmtDateTime(o.created_at)}</td>
                  <td className={styles.tdSlot}>{o.delivery_time || '—'}</td>
                  <td>
                    <span className={`${styles.badge} ${styles[st.cls]}`}>{st.label}</span>
                  </td>
                  <td className={styles.tdTotal}>{fmt(o.total)}</td>
                  <td>
                    <button className={styles.detailBtn} onClick={() => setSelectedOrderId(o.id)}>
                      Voir la commande
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* ── Pagination ────────────────────────────────────────────────────── */}
      {totalPages > 1 && (
        <div className={styles.pagination}>
          <button className={styles.pageBtn} disabled={page <= 1} onClick={() => load(page - 1, filters)}>← Précédent</button>
          <span className={styles.pageInfo}>Page {page} sur {totalPages}</span>
          <button className={styles.pageBtn} disabled={page >= totalPages} onClick={() => load(page + 1, filters)}>Suivant →</button>
        </div>
      )}

      {/* ── Modale détail ─────────────────────────────────────────────────── */}
      {selectedOrderId && (
        <OrderDetailModal
          orderId={selectedOrderId}
          onClose={() => setSelectedOrderId(null)}
          onStatusChanged={() => load(page, filters)}
        />
      )}
    </div>
  )
}

export default OrdersPanel
