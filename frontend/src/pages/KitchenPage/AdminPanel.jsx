import { useState, useEffect, useCallback } from 'react'
import {
  getAdminCategories, createCategory, updateCategory, deleteCategory,
  getAdminProducts, createProduct, updateProduct, deleteProduct, toggleProduct,
  uploadProductImage, deleteProductImage,
  createOption, updateOption, deleteOption,
  getAdminFormulas, createFormula, updateFormula, deleteFormula, toggleFormula,
  uploadFormulaImage, deleteFormulaImage,
  getPromoCodes, createPromoCode, updatePromoCode, deletePromoCode,
} from '../../api/admin'
import styles from './AdminPanel.module.css'

import { API_BASE } from '../../config/api'

// ── Toggle disponibilité ────────────────────────────────────────────────────
function AvailToggle({ available, onChange }) {
  return (
    <div className={styles.availToggle} onClick={onChange}>
      <div className={`${styles.availToggleTrack} ${available ? styles.on : styles.off}`}>
        <div className={styles.availToggleThumb} />
      </div>
      <span className={`${styles.availToggleLabel} ${available ? styles.on : styles.off}`}>
        {available ? 'Dispo' : 'Indispo'}
      </span>
    </div>
  )
}

// ── Modale catégorie ────────────────────────────────────────────────────────
function CategoryModal({ category, onClose, onSaved }) {
  const isEdit = !!category
  const [form, setForm] = useState({
    slug: category?.slug || '',
    label: category?.label || '',
    sort_order: category?.sort_order != null ? String(category.sort_order) : '0',
  })
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleSave = async () => {
    setError(null)
    if (!form.slug.trim()) return setError('Slug requis')
    if (!form.label.trim()) return setError('Label requis')
    setLoading(true)
    try {
      const body = { slug: form.slug.trim(), label: form.label.trim(), sort_order: parseInt(form.sort_order) || 0 }
      if (isEdit) await updateCategory(category.id, body)
      else await createCategory(body)
      onSaved()
      onClose()
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.modalOverlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        <div className={styles.modalTitle}>{isEdit ? 'Modifier la catégorie' : 'Nouvelle catégorie'}</div>

        <div className={styles.fieldRow}>
          <div className={styles.field}>
            <label className={styles.label}>Slug <span style={{ color: 'var(--text-muted)' }}>(ex: banhmi)</span></label>
            <input
              className={styles.input}
              value={form.slug}
              onChange={e => setForm(f => ({ ...f, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') }))}
              placeholder="banhmi"
              disabled={isEdit}
            />
            {isEdit && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Le slug ne peut pas être modifié</span>}
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Ordre d'affichage</label>
            <input
              className={styles.input}
              type="number"
              min="0"
              value={form.sort_order}
              onChange={e => setForm(f => ({ ...f, sort_order: e.target.value }))}
            />
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Nom affiché</label>
          <input
            className={styles.input}
            value={form.label}
            onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
            placeholder="Bánh mì"
          />
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

// ── Modale produit ──────────────────────────────────────────────────────────
function ProductModal({ product, categories, onClose, onSaved }) {
  const isEdit = !!product
  const [form, setForm] = useState({
    category: product?.category || (categories[0]?.slug || ''),
    name: product?.name || '',
    description: product?.description || '',
    price: product?.price != null ? String(product.price) : '',
    sort_order: product?.sort_order != null ? String(product.sort_order) : '0',
    formula_quantity: product?.formula_quantity != null ? String(product.formula_quantity) : '',
  })
  const [imageUrl, setImageUrl] = useState(product?.image_url || null)
  const [imageUploading, setImageUploading] = useState(false)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleImageChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !isEdit) return
    setImageUploading(true)
    try {
      const { image_url } = await uploadProductImage(product.id, file)
      setImageUrl(image_url)
      onSaved()
    } catch {
      setError('Erreur lors de l\'upload de l\'image')
    } finally {
      setImageUploading(false)
    }
  }

  const handleDeleteImage = async () => {
    if (!isEdit || !imageUrl) return
    try {
      await deleteProductImage(product.id)
      setImageUrl(null)
      onSaved()
    } catch {
      setError('Erreur lors de la suppression de l\'image')
    }
  }

  const handleSave = async () => {
    setError(null)
    if (!form.name.trim()) return setError('Nom requis')
    if (isNaN(parseFloat(form.price))) return setError('Prix invalide')
    setLoading(true)
    try {
      const body = {
        category: form.category,
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        price: parseFloat(form.price),
        sort_order: parseInt(form.sort_order) || 0,
        available: true,
        formula_quantity: form.formula_quantity ? parseInt(form.formula_quantity) : null,
      }
      if (isEdit) await updateProduct(product.id, body)
      else await createProduct(body)
      onSaved()
      onClose()
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.modalOverlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        <div className={styles.modalTitle}>{isEdit ? 'Modifier le produit' : 'Nouveau produit'}</div>

        <div className={styles.field}>
          <label className={styles.label}>Catégorie</label>
          <select className={styles.select} value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
            {categories.map(c => <option key={c.slug} value={c.slug}>{c.label}</option>)}
          </select>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Nom</label>
          <input className={styles.input} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Bánh mì classique" />
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Description <span style={{ color: 'var(--text-muted)' }}>(optionnel)</span></label>
          <textarea className={styles.textarea} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Description courte…" />
        </div>

        <div className={styles.fieldRow}>
          <div className={styles.field}>
            <label className={styles.label}>Prix (€)</label>
            <input className={styles.input} type="number" step="0.01" min="0" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} placeholder="8.50" />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Ordre d'affichage</label>
            <input className={styles.input} type="number" min="0" value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: e.target.value }))} />
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>
            Quantité en formule <span style={{ color: 'var(--text-muted)' }}>(optionnel — ex: 2 pour les nems)</span>
          </label>
          <input
            className={styles.input}
            type="number"
            min="1"
            value={form.formula_quantity}
            onChange={e => setForm(f => ({ ...f, formula_quantity: e.target.value }))}
            placeholder="Vide = pas de quantité affichée"
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label}>
            Photo du produit
            {!isEdit && <span style={{ color: 'var(--text-muted)', marginLeft: 6 }}>(disponible après création)</span>}
          </label>
          {isEdit && (
            <div className={styles.imageUpload}>
              {imageUrl ? (
                <div className={styles.imagePreview}>
                  <img src={`${API_BASE}${imageUrl}`} alt="aperçu" className={styles.previewImg} />
                  <button className={styles.deleteImageBtn} onClick={handleDeleteImage} type="button">✕ Supprimer</button>
                </div>
              ) : (
                <label className={styles.uploadZone}>
                  {imageUploading ? 'Upload en cours…' : '📷 Cliquer pour uploader une photo'}
                  <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImageChange} style={{ display: 'none' }} />
                </label>
              )}
            </div>
          )}
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

// ── Modale option ───────────────────────────────────────────────────────────
function OptionModal({ productId, option, onClose, onSaved }) {
  const isEdit = !!option
  const [form, setForm] = useState({
    name: option?.name || '',
    price_delta: option?.price_delta != null ? String(option.price_delta) : '0',
  })
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleSave = async () => {
    setError(null)
    if (!form.name.trim()) return setError('Nom requis')
    setLoading(true)
    try {
      const body = { name: form.name.trim(), price_delta: parseFloat(form.price_delta) || 0, available: true }
      if (isEdit) await updateOption(productId, option.id, body)
      else await createOption(productId, body)
      onSaved()
      onClose()
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.modalOverlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        <div className={styles.modalTitle}>{isEdit ? 'Modifier l\'option' : 'Nouvelle option'}</div>
        <div className={styles.fieldRow}>
          <div className={styles.field}>
            <label className={styles.label}>Nom de l'option</label>
            <input className={styles.input} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Supplémentaire" />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Supplément (€)</label>
            <input className={styles.input} type="number" step="0.01" value={form.price_delta} onChange={e => setForm(f => ({ ...f, price_delta: e.target.value }))} />
          </div>
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

// ── Modale formule ──────────────────────────────────────────────────────────
// Un slot = { slot_name: string, allowed_categories: string[] }
// Exemple : { slot_name: 'Entrée ou Dessert', allowed_categories: ['entree', 'dessert'] }
function FormulaModal({ formula, categories, onClose, onSaved }) {
  const isEdit = !!formula

  const initSlots = () => {
    if (!formula?.slots?.length) return []
    return formula.slots.map(s => ({
      slot_name: s.slot_name,
      allowed_categories: Array.isArray(s.allowed_categories)
        ? s.allowed_categories
        : (s.allowed_categories || '').split(',').map(c => c.trim()).filter(Boolean),
    }))
  }

  const [form, setForm] = useState({
    name: formula?.name || '',
    description: formula?.description || '',
    price: formula?.price != null ? String(formula.price) : '',
    sort_order: formula?.sort_order != null ? String(formula.sort_order) : '0',
  })
  // slots = tableau de { slot_name, allowed_categories[] }
  const [slots, setSlots] = useState(initSlots)
  const [imageUrl, setImageUrl] = useState(formula?.image_url || null)
  const [imageUploading, setImageUploading] = useState(false)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleImageChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !isEdit) return
    setImageUploading(true)
    try {
      const { image_url } = await uploadFormulaImage(formula.id, file)
      setImageUrl(image_url)
      onSaved()
    } catch {
      setError("Erreur lors de l'upload de l'image")
    } finally {
      setImageUploading(false)
    }
  }

  const handleDeleteImage = async () => {
    if (!isEdit || !imageUrl) return
    try {
      await deleteFormulaImage(formula.id)
      setImageUrl(null)
      onSaved()
    } catch {
      setError("Erreur lors de la suppression de l'image")
    }
  }

  const addSlot = () => {
    setSlots(prev => [...prev, { slot_name: '', allowed_categories: [] }])
  }

  const removeSlot = (i) => {
    setSlots(prev => prev.filter((_, idx) => idx !== i))
  }

  const updateSlotName = (i, name) => {
    setSlots(prev => prev.map((s, idx) => idx === i ? { ...s, slot_name: name } : s))
  }

  const toggleSlotCategory = (i, cat) => {
    setSlots(prev => prev.map((s, idx) => {
      if (idx !== i) return s
      const has = s.allowed_categories.includes(cat)
      return {
        ...s,
        allowed_categories: has
          ? s.allowed_categories.filter(c => c !== cat)
          : [...s.allowed_categories, cat],
      }
    }))
  }

  const handleSave = async () => {
    setError(null)
    if (!form.name.trim()) return setError('Nom requis')
    if (isNaN(parseFloat(form.price))) return setError('Prix invalide')
    if (slots.length === 0) return setError('Ajoute au moins un slot')
    for (const s of slots) {
      if (!s.slot_name.trim()) return setError('Chaque slot doit avoir un nom')
      if (s.allowed_categories.length === 0) return setError(`Le slot "${s.slot_name}" doit autoriser au moins une catégorie`)
    }
    setLoading(true)
    try {
      const body = {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        price: parseFloat(form.price),
        sort_order: parseInt(form.sort_order) || 0,
        available: true,
        slots: slots.map(s => ({
          slot_name: s.slot_name.trim(),
          allowed_categories: s.allowed_categories.join(','),
        })),
      }
      if (isEdit) await updateFormula(formula.id, body)
      else await createFormula(body)
      onSaved()
      onClose()
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.modalOverlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        <div className={styles.modalTitle}>{isEdit ? 'Modifier la formule' : 'Nouvelle formule'}</div>

        <div className={styles.field}>
          <label className={styles.label}>Nom</label>
          <input className={styles.input} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Formule midi" />
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Description <span style={{ color: 'var(--text-muted)' }}>(optionnel)</span></label>
          <textarea className={styles.textarea} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
        </div>

        <div className={styles.fieldRow}>
          <div className={styles.field}>
            <label className={styles.label}>Prix (€)</label>
            <input className={styles.input} type="number" step="0.01" min="0" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Ordre d'affichage</label>
            <input className={styles.input} type="number" min="0" value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: e.target.value }))} />
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>
            Photo de la formule
            {!isEdit && <span style={{ color: 'var(--text-muted)', marginLeft: 6 }}>(disponible après création)</span>}
          </label>
          {isEdit && (
            <div className={styles.imageUpload}>
              {imageUrl ? (
                <div className={styles.imagePreview}>
                  <img src={`${API_BASE}${imageUrl}`} alt="aperçu" className={styles.previewImg} />
                  <button className={styles.deleteImageBtn} onClick={handleDeleteImage} type="button">✕ Supprimer</button>
                </div>
              ) : (
                <label className={styles.uploadZone}>
                  {imageUploading ? 'Upload en cours…' : '📷 Cliquer pour uploader une photo'}
                  <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImageChange} style={{ display: 'none' }} />
                </label>
              )}
            </div>
          )}
        </div>

        {/* ── Éditeur de slots ── */}
        <div className={styles.field}>
          <label className={styles.label}>Slots (choix du client)</label>
          <div className={styles.slotEditor}>
            {slots.map((slot, i) => (
              <div key={i} className={styles.slotRow}>
                <div className={styles.slotRowHeader}>
                  <span className={styles.slotNum}>{i + 1}</span>
                  <input
                    className={styles.slotNameInput}
                    placeholder="Nom du slot, ex : Bánh mì"
                    value={slot.slot_name}
                    onChange={e => updateSlotName(i, e.target.value)}
                  />
                  <button
                    type="button"
                    className={styles.slotRemoveBtn}
                    onClick={() => removeSlot(i)}
                    title="Supprimer ce slot"
                  >✕</button>
                </div>
                <div className={styles.slotCatPicker}>
                  <span className={styles.slotCatHint}>Catégories autorisées :</span>
                  {categories.map(cat => (
                    <label
                      key={cat.slug}
                      className={`${styles.catChip} ${slot.allowed_categories.includes(cat.slug) ? styles.catChipActive : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={slot.allowed_categories.includes(cat.slug)}
                        onChange={() => toggleSlotCategory(i, cat.slug)}
                        style={{ display: 'none' }}
                      />
                      {cat.label}
                    </label>
                  ))}
                </div>
                {slot.allowed_categories.length > 1 && (
                  <div className={styles.slotMultiHint}>
                    Le client choisira parmi : {slot.allowed_categories.map(c => categories.find(x => x.slug === c)?.label || c).join(' ou ')}
                  </div>
                )}
              </div>
            ))}
            <button type="button" className={styles.addSlotBtn} onClick={addSlot}>
              + Ajouter un slot
            </button>
          </div>

          {slots.length > 0 && (
            <div className={styles.slotSummary}>
              Résumé : {slots.map(s => s.slot_name || '…').join(' + ')}
            </div>
          )}
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

// ── Panneau principal ───────────────────────────────────────────────────────
function AdminPanel() {
  const [categories, setCategories] = useState([])
  const [products, setProducts] = useState([])
  const [formulas, setFormulas] = useState([])
  const [promoCodes, setPromoCodes] = useState([])

  // Modales
  const [categoryModal, setCategoryModal] = useState(null) // null | 'create' | category obj
  const [productModal, setProductModal] = useState(null)
  const [optionModal, setOptionModal] = useState(null)
  const [formulaModal, setFormulaModal] = useState(null)
  const [promoModal, setPromoModal] = useState(null) // null | 'create' | promo obj

  // Expanded rows produits (options)
  const [expandedProduct, setExpandedProduct] = useState(null)

  const load = useCallback(async () => {
    try {
      const [cats, prods, forms, promos] = await Promise.all([
        getAdminCategories(),
        getAdminProducts(),
        getAdminFormulas(),
        getPromoCodes(),
      ])
      setCategories(cats)
      setProducts(prods)
      setFormulas(forms)
      setPromoCodes(promos)
    } catch (err) {
      console.error('AdminPanel load error', err)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // ── Handlers catégories ────────────────────────────────────────────────
  const handleDeleteCategory = async (id) => {
    if (!confirm('Supprimer cette catégorie ?')) return
    try {
      await deleteCategory(id)
      load()
    } catch (err) {
      alert(err.response?.data?.error || 'Erreur lors de la suppression')
    }
  }

  // ── Handlers produits ──────────────────────────────────────────────────
  const handleToggleProduct = async (p) => {
    const next = !p.available
    setProducts(prev => prev.map(x => x.id === p.id ? { ...x, available: next } : x))
    try { await toggleProduct(p.id, next) } catch { load() }
  }

  const handleDeleteProduct = async (id) => {
    if (!confirm('Supprimer ce produit ?')) return
    try { await deleteProduct(id); load() } catch { alert('Erreur lors de la suppression') }
  }

  const handleDeleteOption = async (productId, optionId) => {
    if (!confirm('Supprimer cette option ?')) return
    try { await deleteOption(productId, optionId); load() } catch { alert('Erreur') }
  }

  const handleToggleOption = async (productId, option) => {
    const next = !option.available
    setProducts(prev => prev.map(p => {
      if (p.id !== productId) return p
      return { ...p, options: p.options.map(o => o.id === option.id ? { ...o, available: next } : o) }
    }))
    try { await updateOption(productId, option.id, { name: option.name, price_delta: option.price_delta, available: next }) }
    catch { load() }
  }

  // ── Handlers formules ──────────────────────────────────────────────────
  const handleToggleFormula = async (f) => {
    const next = !f.available
    setFormulas(prev => prev.map(x => x.id === f.id ? { ...x, available: next } : x))
    try { await toggleFormula(f.id, next) } catch { load() }
  }

  const handleDeleteFormula = async (id) => {
    if (!confirm('Supprimer cette formule ?')) return
    try { await deleteFormula(id); load() } catch { alert('Erreur lors de la suppression') }
  }

  return (
    <div className={styles.panel}>

      {/* ── Catégories ────────────────────────────────────────────────────── */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionTitle}>🏷️ Catégories</div>
          <button className={styles.addBtn} onClick={() => setCategoryModal('create')}>+ Nouvelle</button>
        </div>
        <div className={styles.list}>
          {categories.map(cat => (
            <div key={cat.id} className={styles.row}>
              <div className={styles.rowInfo}>
                <div className={styles.rowName}>{cat.label}</div>
                <div className={styles.rowMeta}>slug : {cat.slug} · ordre : {cat.sort_order}</div>
              </div>
              <div className={styles.rowActions}>
                <button className={styles.iconBtn} title="Modifier" onClick={() => setCategoryModal(cat)}>✏</button>
                <button className={`${styles.iconBtn} ${styles.danger}`} title="Supprimer" onClick={() => handleDeleteCategory(cat.id)}>🗑</button>
              </div>
            </div>
          ))}
          {categories.length === 0 && (
            <div style={{ padding: '16px 20px', fontSize: 13, color: 'var(--text-muted)' }}>Aucune catégorie</div>
          )}
        </div>
      </div>

      {/* ── Produits ─────────────────────────────────────────────────────── */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionTitle}>🍱 Produits</div>
          <button
            className={styles.addBtn}
            onClick={() => setProductModal('create')}
            disabled={categories.length === 0}
            title={categories.length === 0 ? 'Créez d\'abord une catégorie' : undefined}
          >+ Nouveau</button>
        </div>
        {categories.length === 0 && (
          <div className={styles.emptyHint}>
            ⚠️ Créez au moins une catégorie avant d'ajouter des produits.
          </div>
        )}
        <div className={styles.list}>
          {products.map(p => (
            <div key={p.id}>
              <div className={styles.row}>
                <AvailToggle available={p.available} onChange={() => handleToggleProduct(p)} />
                <div className={styles.rowInfo}>
                  <div className={styles.rowName}>{p.name}</div>
                  <div className={styles.rowMeta}>
                    {categories.find(c => c.slug === p.category)?.label || p.category}
                    {p.description ? ` — ${p.description}` : ''}
                  </div>
                  {p.options?.length > 0 && (
                    <div className={styles.options}>
                      {p.options.map(o => (
                        <span
                          key={o.id}
                          className={`${styles.optionChip} ${!o.available ? styles.disabled : ''}`}
                        >
                          {o.name}{o.price_delta > 0 ? ` +${o.price_delta}€` : ''}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className={styles.rowPrice}>{parseFloat(p.price).toFixed(2)} €</div>
                <div className={styles.rowActions}>
                  <button
                    className={styles.iconBtn}
                    title="Options"
                    onClick={() => setExpandedProduct(expandedProduct === p.id ? null : p.id)}
                  >⚙</button>
                  <button className={styles.iconBtn} title="Modifier" onClick={() => setProductModal(p)}>✏</button>
                  <button className={`${styles.iconBtn} ${styles.danger}`} title="Supprimer" onClick={() => handleDeleteProduct(p.id)}>🗑</button>
                </div>
              </div>

              {/* Options sous-panneau */}
              {expandedProduct === p.id && (
                <div style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border)', padding: '12px 20px 12px 48px' }}>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8, fontWeight: 600 }}>Options du produit</div>
                  {p.options?.length === 0 && (
                    <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8 }}>Aucune option</div>
                  )}
                  {p.options?.map(o => (
                    <div key={o.id} className={styles.row} style={{ padding: '8px 0' }}>
                      <AvailToggle available={o.available} onChange={() => handleToggleOption(p.id, o)} />
                      <div className={styles.rowInfo}>
                        <div className={styles.rowName} style={{ fontSize: 13 }}>{o.name}</div>
                      </div>
                      <div className={styles.rowPrice} style={{ fontSize: 13 }}>
                        {o.price_delta > 0 ? `+${parseFloat(o.price_delta).toFixed(2)} €` : '—'}
                      </div>
                      <div className={styles.rowActions}>
                        <button className={styles.iconBtn} onClick={() => setOptionModal({ productId: p.id, option: o })}>✏</button>
                        <button className={`${styles.iconBtn} ${styles.danger}`} onClick={() => handleDeleteOption(p.id, o.id)}>🗑</button>
                      </div>
                    </div>
                  ))}
                  <button
                    className={styles.addBtn}
                    style={{ marginTop: 8 }}
                    onClick={() => setOptionModal({ productId: p.id, option: null })}
                  >+ Ajouter une option</button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Formules ─────────────────────────────────────────────────────── */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionTitle}>🎌 Formules</div>
          <button
            className={styles.addBtn}
            onClick={() => setFormulaModal('create')}
            disabled={categories.length === 0}
            title={categories.length === 0 ? 'Créez d\'abord une catégorie' : undefined}
          >+ Nouveau</button>
        </div>
        {categories.length === 0 && (
          <div className={styles.emptyHint}>
            ⚠️ Créez au moins une catégorie avant d'ajouter des formules.
          </div>
        )}
        <div className={styles.list}>
          {formulas.map(f => (
            <div key={f.id} className={styles.row}>
              <AvailToggle available={f.available} onChange={() => handleToggleFormula(f)} />
              <div className={styles.rowInfo}>
                <div className={styles.rowName}>{f.name}</div>
                <div className={styles.rowMeta}>{f.description || ''}</div>
                {f.slots?.length > 0 && (
                  <div className={styles.options}>
                    {f.slots.map(s => (
                      <span key={s.slot_name} className={styles.optionChip}>
                        {s.slot_name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className={styles.rowPrice}>{parseFloat(f.price).toFixed(2)} €</div>
              <div className={styles.rowActions}>
                <button className={styles.iconBtn} onClick={() => setFormulaModal(f)}>✏</button>
                <button className={`${styles.iconBtn} ${styles.danger}`} onClick={() => handleDeleteFormula(f.id)}>🗑</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Codes promo ──────────────────────────────────────────────────── */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionTitle}>Codes promo</div>
          <button className={styles.addBtn} onClick={() => setPromoModal('create')}>+ Nouveau</button>
        </div>
        <div className={styles.list}>
          {promoCodes.length === 0 && (
            <div style={{ padding: '16px 20px', fontSize: 13, color: 'var(--text-muted)' }}>Aucun code promo</div>
          )}
          {promoCodes.map(promo => (
            <div key={promo.id} className={styles.row}>
              <AvailToggle available={!!promo.active} onChange={async () => {
                await updatePromoCode(promo.id, { ...promo, active: !promo.active })
                load()
              }} />
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
                  onClick={async () => {
                    if (window.confirm(`Supprimer le code ${promo.code} ?`)) {
                      await deletePromoCode(promo.id)
                      load()
                    }
                  }}
                >🗑</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Modales ───────────────────────────────────────────────────────── */}
      {categoryModal && (
        <CategoryModal
          category={categoryModal === 'create' ? null : categoryModal}
          onClose={() => setCategoryModal(null)}
          onSaved={load}
        />
      )}
      {productModal && (
        <ProductModal
          product={productModal === 'create' ? null : productModal}
          categories={categories}
          onClose={() => setProductModal(null)}
          onSaved={load}
        />
      )}
      {optionModal && (
        <OptionModal
          productId={optionModal.productId}
          option={optionModal.option}
          onClose={() => setOptionModal(null)}
          onSaved={load}
        />
      )}
      {formulaModal && (
        <FormulaModal
          formula={formulaModal === 'create' ? null : formulaModal}
          categories={categories}
          onClose={() => setFormulaModal(null)}
          onSaved={load}
        />
      )}
      {promoModal && (
        <PromoModal
          promo={promoModal === 'create' ? null : promoModal}
          onClose={() => setPromoModal(null)}
          onSaved={load}
        />
      )}
    </div>
  )
}

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

export default AdminPanel
