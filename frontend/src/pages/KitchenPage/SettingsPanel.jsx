import { useState, useEffect, useCallback } from 'react'
import {
  getSchedule, setSchedule,
  getSlotSettings, setSlotSettings,
  getMaintenanceMessage, setMaintenanceMessage,
  getDeliverySettings, setDeliverySettings,
  getMaxOrdersPerSlot, setMaxOrdersPerSlot,
  getClosedDays, setClosedDays,
  getPromoCodes, createPromoCode, updatePromoCode, deletePromoCode,
} from '../../api/admin'
import ConfirmDialog from '../../components/ConfirmDialog/ConfirmDialog'
import styles from './AdminPanel.module.css'

// ── Modale code promo ─────────────────────────────────────────────────────────
function PromoModal({ promo, onClose, onSaved }) {
  const isEdit = !!promo
  const [form, setForm] = useState({
    code: promo?.code || '',
    type: promo?.type || 'percent',
    value: promo?.value != null ? String(promo.value) : '',
    starts_at: promo?.starts_at ? new Date(promo.starts_at).toISOString().slice(0, 16) : '',
    expires_at: promo?.expires_at ? new Date(promo.expires_at).toISOString().slice(0, 16) : '',
    active: promo?.active !== undefined ? !!promo.active : true,
  })
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleSave = async () => {
    setError(null)
    if (!form.code.trim()) return setError('Le code est requis')
    if (!form.value || isNaN(parseFloat(form.value)) || parseFloat(form.value) <= 0) return setError('Valeur invalide')
    if (form.type === 'percent' && parseFloat(form.value) > 100) return setError('Un pourcentage ne peut pas dépasser 100')
    setLoading(true)
    try {
      const body = {
        code: form.code.trim().toUpperCase(),
        type: form.type,
        value: parseFloat(form.value),
        starts_at: form.starts_at || null,
        expires_at: form.expires_at || null,
        active: form.active,
      }
      if (isEdit) await updatePromoCode(promo.id, body)
      else await createPromoCode(body)
      onSaved()
      onClose()
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors de la sauvegarde')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.modalOverlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        <div className={styles.modalTitle}>{isEdit ? 'Modifier le code' : 'Nouveau code promo'}</div>

        <div className={styles.fieldRow}>
          <div className={styles.field}>
            <label className={styles.label}>Code</label>
            <input
              className={styles.input}
              value={form.code}
              onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
              placeholder="KEKOSAN10"
              disabled={isEdit}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Type</label>
            <select className={styles.select} value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
              <option value="percent">Pourcentage (%)</option>
              <option value="fixed">Montant fixe (€)</option>
            </select>
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Valeur {form.type === 'percent' ? '(%)' : '(€)'}</label>
          <input
            className={styles.input}
            type="number"
            step="0.01"
            min="0"
            max={form.type === 'percent' ? '100' : undefined}
            value={form.value}
            onChange={e => setForm(f => ({ ...f, value: e.target.value }))}
            placeholder={form.type === 'percent' ? '10' : '5.00'}
          />
        </div>

        <div className={styles.fieldRow}>
          <div className={styles.field}>
            <label className={styles.label}>Valide à partir de <span style={{ opacity: 0.5 }}>(optionnel)</span></label>
            <input
              className={styles.input}
              type="datetime-local"
              value={form.starts_at}
              onChange={e => setForm(f => ({ ...f, starts_at: e.target.value }))}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Expire le <span style={{ opacity: 0.5 }}>(optionnel)</span></label>
            <input
              className={styles.input}
              type="datetime-local"
              value={form.expires_at}
              onChange={e => setForm(f => ({ ...f, expires_at: e.target.value }))}
            />
          </div>
        </div>

        <div className={styles.field}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: 'var(--text)' }}>
            <input
              type="checkbox"
              checked={form.active}
              onChange={e => setForm(f => ({ ...f, active: e.target.checked }))}
            />
            Actif
          </label>
        </div>

        {error && <div className={styles.errorMsg}>{error}</div>}

        <div className={styles.modalActions}>
          <button className={styles.cancelBtn} onClick={onClose} disabled={loading}>Annuler</button>
          <button className={styles.saveBtn} onClick={handleSave} disabled={loading}>
            {loading ? 'Sauvegarde…' : 'Sauvegarder'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Panneau Paramètres ────────────────────────────────────────────────────────
function SettingsPanel() {
  // Toast centralisé : { msg: string, ok: bool }
  const [toast, setToast] = useState(null)
  const showToast = (ok, msg) => {
    setToast({ ok, msg })
    setTimeout(() => setToast(null), 3000)
  }

  // Message de maintenance
  const [maintMsg, setMaintMsg] = useState('Le service est momentanément fermé. Revenez bientôt !')
  const [maintLoading, setMaintLoading] = useState(false)

  // Horaires
  const [scheduleForm, setScheduleForm] = useState({ opening_hour: 11, closing_hour: 15 })
  const [scheduleLoading, setScheduleLoading] = useState(false)

  // Créneaux
  const [slotForm, setSlotForm] = useState({ slot_interval: 30, min_delivery_delay: 30 })
  const [slotLoading, setSlotLoading] = useState(false)

  // Jours de fermeture
  const [closedDays, setClosedDaysState] = useState([])
  const [newClosedDay, setNewClosedDay] = useState('')

  // Livraison
  const [deliveryForm, setDeliveryForm] = useState({ delivery_fee: 5, free_delivery_threshold: 20, min_order_amount: 20 })
  const [deliveryLoading, setDeliveryLoading] = useState(false)

  // Limite commandes par créneau
  const [maxPerSlot, setMaxPerSlot] = useState(5)
  const [maxPerSlotLoading, setMaxPerSlotLoading] = useState(false)

  // Codes promo
  const [promoCodes, setPromoCodes] = useState([])
  const [promoModal, setPromoModal] = useState(null) // null | 'create' | promo obj
  const [promoDeleteConfirm, setPromoDeleteConfirm] = useState(null) // { code, id }

  const load = useCallback(async () => {
    try {
      const [sched, slots, maint, delivery, maxSlot, closed, promos] = await Promise.all([getSchedule(), getSlotSettings(), getMaintenanceMessage(), getDeliverySettings(), getMaxOrdersPerSlot(), getClosedDays(), getPromoCodes()])
      setScheduleForm({ opening_hour: sched.opening_hour, closing_hour: sched.closing_hour })
      setSlotForm({ slot_interval: slots.slot_interval, min_delivery_delay: slots.min_delivery_delay })
      setMaintMsg(maint.maintenance_message)
      setDeliveryForm({ delivery_fee: delivery.delivery_fee, free_delivery_threshold: delivery.free_delivery_threshold, min_order_amount: delivery.min_order_amount })
      setMaxPerSlot(maxSlot.max_orders_per_slot)
      setClosedDaysState(closed.closed_days || [])
      setPromoCodes(promos)
    } catch (err) {
      console.error('SettingsPanel load error', err)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleSaveSchedule = async () => {
    setScheduleLoading(true)
    try {
      await setSchedule(scheduleForm.opening_hour, scheduleForm.closing_hour)
      showToast(true, '✓ Horaires sauvegardés')
    } catch {
      showToast(false, '⚠️ Erreur lors de la sauvegarde')
    } finally {
      setScheduleLoading(false)
    }
  }

  const handleAddClosedDay = async () => {
    if (!newClosedDay) return
    const updated = [...new Set([...closedDays, newClosedDay])].sort()
    try {
      await setClosedDays(updated)
      setClosedDaysState(updated)
      setNewClosedDay('')
      showToast(true, '✓ Jour de fermeture ajouté')
    } catch {
      showToast(false, '⚠️ Erreur lors de la sauvegarde')
    }
  }

  const handleRemoveClosedDay = async (day) => {
    const updated = closedDays.filter(d => d !== day)
    try {
      await setClosedDays(updated)
      setClosedDaysState(updated)
      showToast(true, '✓ Jour supprimé')
    } catch {
      showToast(false, '⚠️ Erreur lors de la suppression')
    }
  }

  const handleSaveSlots = async () => {
    setSlotLoading(true)
    try {
      await setSlotSettings(slotForm)
      showToast(true, '✓ Créneaux sauvegardés')
    } catch {
      showToast(false, '⚠️ Erreur lors de la sauvegarde')
    } finally {
      setSlotLoading(false)
    }
  }

  const handleSaveMaintMsg = async () => {
    setMaintLoading(true)
    try {
      await setMaintenanceMessage(maintMsg)
      showToast(true, '✓ Message sauvegardé')
    } catch {
      showToast(false, '⚠️ Erreur lors de la sauvegarde')
    } finally {
      setMaintLoading(false)
    }
  }

  const handleSaveMaxPerSlot = async () => {
    setMaxPerSlotLoading(true)
    try {
      await setMaxOrdersPerSlot(maxPerSlot)
      showToast(true, '✓ Limite sauvegardée')
    } catch {
      showToast(false, '⚠️ Erreur lors de la sauvegarde')
    } finally {
      setMaxPerSlotLoading(false)
    }
  }

  const handleSaveDelivery = async () => {
    setDeliveryLoading(true)
    try {
      await setDeliverySettings(deliveryForm)
      showToast(true, '✓ Paramètres de livraison sauvegardés')
    } catch {
      showToast(false, '⚠️ Erreur lors de la sauvegarde')
    } finally {
      setDeliveryLoading(false)
    }
  }

  return (
    <div className={styles.panel}>

      {/* Toast centralisé */}
      {toast && (
        <div className={`${styles.settingsToast} ${toast.ok ? styles.settingsToastOk : styles.settingsToastErr}`}>
          {toast.msg}
        </div>
      )}

      {/* ── Horaires d'ouverture ──────────────────────────────────────────── */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionTitle}>🕐 Horaires d'ouverture</div>
        </div>
        <div className={styles.scheduleBody}>
          <div className={styles.scheduleRow}>
            <div className={styles.field}>
              <label className={styles.label}>Ouverture (h)</label>
              <input
                className={styles.input}
                type="number"
                min="0"
                max="23"
                value={scheduleForm.opening_hour}
                onChange={e => setScheduleForm(f => ({ ...f, opening_hour: parseInt(e.target.value) || 0 }))}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Fermeture (h)</label>
              <input
                className={styles.input}
                type="number"
                min="1"
                max="24"
                value={scheduleForm.closing_hour}
                onChange={e => setScheduleForm(f => ({ ...f, closing_hour: parseInt(e.target.value) || 0 }))}
              />
            </div>
            <button
              className={styles.addBtn}
              onClick={handleSaveSchedule}
              disabled={scheduleLoading}
              style={{ alignSelf: 'flex-end' }}
            >
              {scheduleLoading ? 'Sauvegarde…' : 'Enregistrer'}
            </button>
          </div>
          <p className={styles.scheduleHint}>
            Dernier créneau disponible : {scheduleForm.closing_hour - 1}h{String(60 - slotForm.slot_interval).padStart(2, '0')}. Les clients ne pourront commander que dans cette plage.
          </p>

          {/* Paramètres créneaux */}
          <div className={styles.scheduleRow} style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 14 }}>
            <div className={styles.field}>
              <label className={styles.label}>Intervalle entre créneaux (min)</label>
              <input
                className={styles.input}
                type="number"
                min="5"
                max="60"
                step="5"
                value={slotForm.slot_interval}
                onChange={e => setSlotForm(f => ({ ...f, slot_interval: parseInt(e.target.value) || 30 }))}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Délai minimum avant 1er créneau (min)</label>
              <input
                className={styles.input}
                type="number"
                min="0"
                max="120"
                step="5"
                value={slotForm.min_delivery_delay}
                onChange={e => setSlotForm(f => ({ ...f, min_delivery_delay: parseInt(e.target.value) || 0 }))}
              />
            </div>
            <button
              className={styles.addBtn}
              onClick={handleSaveSlots}
              disabled={slotLoading}
              style={{ alignSelf: 'flex-end' }}
            >
              {slotLoading ? 'Sauvegarde…' : 'Enregistrer'}
            </button>
          </div>
          <p className={styles.scheduleHint}>
            Créneaux toutes les {slotForm.slot_interval} min. Premier créneau disponible {slotForm.min_delivery_delay} min après la commande.
          </p>
        </div>
      </div>

      {/* ── Message service fermé ────────────────────────────────────────── */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionTitle}>💬 Message service fermé</div>
        </div>
        <div className={styles.scheduleBody}>
          <div className={styles.field}>
            <label className={styles.label}>Affiché sur le site quand le service est fermé manuellement</label>
            <textarea
              className={styles.input}
              rows={3}
              style={{ resize: 'vertical', lineHeight: 1.5 }}
              value={maintMsg}
              onChange={e => setMaintMsg(e.target.value)}
            />
          </div>
          <div className={styles.scheduleRow}>
            <button
              className={styles.addBtn}
              onClick={handleSaveMaintMsg}
              disabled={maintLoading || !maintMsg.trim()}
            >
              {maintLoading ? 'Sauvegarde…' : 'Enregistrer'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Jours de fermeture ───────────────────────────────────────────── */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionTitle}>📅 Jours de fermeture</div>
        </div>
        <div className={styles.scheduleBody}>
          <div className={styles.scheduleRow}>
            <div className={styles.field}>
              <label className={styles.label}>Ajouter une date fermée</label>
              <input
                className={styles.input}
                type="date"
                value={newClosedDay}
                onChange={e => setNewClosedDay(e.target.value)}
              />
            </div>
            <button
              className={styles.addBtn}
              onClick={handleAddClosedDay}
              disabled={!newClosedDay}
              style={{ alignSelf: 'flex-end' }}
            >
              Ajouter
            </button>
          </div>

          {closedDays.length === 0 ? (
            <p className={styles.scheduleHint}>Aucun jour de fermeture planifié.</p>
          ) : (
            <div className={styles.closedDaysList}>
              {closedDays.map(day => (
                <div key={day} className={styles.closedDayRow}>
                  <span className={styles.closedDayLabel}>
                    {new Date(day + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  </span>
                  <button
                    className={`${styles.iconBtn} ${styles.danger}`}
                    onClick={() => handleRemoveClosedDay(day)}
                  >🗑</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Livraison ────────────────────────────────────────────────────── */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionTitle}>🛵 Livraison</div>
        </div>
        <div className={styles.scheduleBody}>
          <div className={styles.scheduleRow}>
            <div className={styles.field}>
              <label className={styles.label}>Frais de livraison (€)</label>
              <input
                className={styles.input}
                type="number"
                step="0.5"
                min="0"
                value={deliveryForm.delivery_fee}
                onChange={e => setDeliveryForm(f => ({ ...f, delivery_fee: parseFloat(e.target.value) || 0 }))}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Livraison gratuite dès (€)</label>
              <input
                className={styles.input}
                type="number"
                step="0.5"
                min="0"
                value={deliveryForm.free_delivery_threshold}
                onChange={e => setDeliveryForm(f => ({ ...f, free_delivery_threshold: parseFloat(e.target.value) || 0 }))}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Minimum de commande (€)</label>
              <input
                className={styles.input}
                type="number"
                step="0.5"
                min="0"
                value={deliveryForm.min_order_amount}
                onChange={e => setDeliveryForm(f => ({ ...f, min_order_amount: parseFloat(e.target.value) || 0 }))}
              />
            </div>
            <button
              className={styles.addBtn}
              onClick={handleSaveDelivery}
              disabled={deliveryLoading}
              style={{ alignSelf: 'flex-end' }}
            >
              {deliveryLoading ? 'Sauvegarde…' : 'Enregistrer'}
            </button>
          </div>
          <p className={styles.scheduleHint}>
            Livraison gratuite à partir de {deliveryForm.free_delivery_threshold} €. Minimum de commande : {deliveryForm.min_order_amount} €.
          </p>

          {/* Limite par créneau */}
          <div className={styles.scheduleRow} style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 14 }}>
            <div className={styles.field}>
              <label className={styles.label}>Commandes max par créneau</label>
              <input
                className={styles.input}
                type="number"
                min="1"
                step="1"
                value={maxPerSlot}
                onChange={e => setMaxPerSlot(parseInt(e.target.value) || 1)}
              />
            </div>
            <button
              className={styles.addBtn}
              onClick={handleSaveMaxPerSlot}
              disabled={maxPerSlotLoading}
              style={{ alignSelf: 'flex-end' }}
            >
              {maxPerSlotLoading ? 'Sauvegarde…' : 'Enregistrer'}
            </button>
          </div>
          <p className={styles.scheduleHint}>
            Au-delà de {maxPerSlot} commande{maxPerSlot > 1 ? 's' : ''}, le créneau est masqué dans le checkout client.
          </p>
        </div>
      </div>

      {/* ── Codes promo ──────────────────────────────────────────────────── */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionTitle}>🎟 Codes promo</div>
          <button className={styles.addBtn} onClick={() => setPromoModal('create')}>+ Nouveau</button>
        </div>
        <div className={styles.list}>
          {promoCodes.length === 0 && (
            <div style={{ padding: '16px 20px', fontSize: 13, color: 'var(--text-muted)' }}>Aucun code promo</div>
          )}
          {promoCodes.map(promo => (
            <div key={promo.id} className={styles.row}>
              <div
                className={styles.availToggle}
                onClick={async () => {
                  await updatePromoCode(promo.id, { ...promo, active: !promo.active })
                  load()
                }}
              >
                <div className={`${styles.availToggleTrack} ${promo.active ? styles.on : styles.off}`}>
                  <div className={styles.availToggleThumb} />
                </div>
                <span className={`${styles.availToggleLabel} ${promo.active ? styles.on : styles.off}`}>
                  {promo.active ? 'Actif' : 'Inactif'}
                </span>
              </div>
              <div className={styles.rowInfo}>
                <div className={styles.rowName}>{promo.code}</div>
                <div className={styles.rowMeta}>
                  {promo.type === 'percent' ? `−${promo.value}%` : `−${promo.value} €`}
                  {promo.starts_at && ` · Dès le ${new Date(promo.starts_at).toLocaleDateString('fr-FR')}`}
                  {promo.expires_at && ` · Expire le ${new Date(promo.expires_at).toLocaleDateString('fr-FR')}`}
                  {!promo.starts_at && !promo.expires_at && ' · Sans limite de durée'}
                </div>
              </div>
              <div className={styles.rowActions}>
                <button className={styles.iconBtn} onClick={() => setPromoModal(promo)}>✏</button>
                <button
                  className={`${styles.iconBtn} ${styles.danger}`}
                  onClick={() => setPromoDeleteConfirm({ id: promo.id, code: promo.code })}
                >🗑</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Modale code promo ─────────────────────────────────────────────── */}
      {promoModal && (
        <PromoModal
          promo={promoModal === 'create' ? null : promoModal}
          onClose={() => setPromoModal(null)}
          onSaved={load}
        />
      )}

      {/* Confirmation suppression code promo */}
      {promoDeleteConfirm && (
        <ConfirmDialog
          message={`Supprimer le code "${promoDeleteConfirm.code}" ?`}
          confirmLabel="Supprimer"
          danger
          onConfirm={async () => {
            await deletePromoCode(promoDeleteConfirm.id)
            setPromoDeleteConfirm(null)
            load()
          }}
          onCancel={() => setPromoDeleteConfirm(null)}
        />
      )}
    </div>
  )
}

export default SettingsPanel
