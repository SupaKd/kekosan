import { useState } from 'react'
import styles from './FormulaModal.module.css'
import { API_BASE } from '../../config/api'
import { formatPrice } from '../../utils/formatting'
import { useSwipeDown } from '../../hooks/useSwipeDown'
import { useLockBodyScroll } from '../../hooks/useLockBodyScroll'
import { useModalHistory } from '../../hooks/useModalHistory'
import { useCloseAnimation } from '../../hooks/useCloseAnimation'

const CATEGORY_LABELS = {
  entree: 'Entrée',
  banhmi: 'Bánh Mì',
  dessert: 'Dessert',
  boisson: 'Boisson',
}

function FormulaModal({ formula, catalog, onClose, onAdd }) {
  // slotChoices : { [slot_name]: product }
  // slotOptions : { [slot_name]: [option, ...] } — options cochées pour le produit choisi dans ce slot
  const [slotChoices, setSlotChoices] = useState({})
  const [slotOptions, setSlotOptions] = useState({})
  const [quantity, setQuantity] = useState(1)
  const [added, setAdded] = useState(false)
  const { closing, triggerClose } = useCloseAnimation(onClose)
  const dragRef = useSwipeDown(triggerClose)
  useLockBodyScroll()
  useModalHistory(triggerClose)

  if (!formula) return null

  const allSlotsFilled = formula.slots
    .filter(s => s.required !== false)
    .every(s => slotChoices[s.slot_name])

  const supplementTotal = Object.values(slotChoices).reduce(
    (sum, p) => sum + (parseFloat(p.price_supplement) || 0),
    0
  )
  const totalPrice = (parseFloat(formula.price) + supplementTotal) * quantity

  const selectSlotProduct = (slotName, product) => {
    setSlotChoices(prev => ({ ...prev, [slotName]: product }))
    // Réinitialise les options si on change de produit
    setSlotOptions(prev => ({ ...prev, [slotName]: [] }))
  }

  const toggleSlotOption = (slotName, opt) => {
    setSlotOptions(prev => {
      const current = prev[slotName] || []
      const exists = current.find(o => o.id === opt.id)
      return {
        ...prev,
        [slotName]: exists
          ? current.filter(o => o.id !== opt.id)
          : [...current, opt],
      }
    })
  }

  const handleAdd = () => {
    if (!allSlotsFilled || added) return
    setAdded(true)
    onAdd({
      type: 'formula',
      formula_id: formula.id,
      name: formula.name,
      price: parseFloat(formula.price) + supplementTotal,
      image_url: formula.image_url || null,
      slots: formula.slots.map(s => {
        const product = slotChoices[s.slot_name]
        if (!product) return { slot_name: s.slot_name, product_id: null, product_name: null }
        const opts = slotOptions[s.slot_name] || []
        const optLabel = opts.length > 0 ? ` (${opts.map(o => o.name).join(', ')})` : ''
        return {
          slot_name: s.slot_name,
          product_id: product.id,
          product_name: product.name + optLabel,
        }
      }),
      quantity,
    })
    if (navigator.vibrate) navigator.vibrate(40)
    setTimeout(onClose, 800)
  }

  return (
    <div className={`${styles.overlay} ${closing ? styles.overlayClosing : ''}`} onClick={triggerClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.dragHandle} />
        <div className={styles.header} ref={dragRef}>
          <div className={styles.headerTop}>
            <div className={styles.name}>{formula.name}</div>
            <div className={styles.headerRight}>
              <div className={styles.price}>{formatPrice(totalPrice)}</div>
              <button className={styles.closeBtn} onClick={triggerClose} aria-label="Fermer">✕</button>
            </div>
          </div>
          {formula.description && (
            <p className={styles.description}>{formula.description}</p>
          )}
          {formula.allergens && formula.allergens.length > 0 && (
            <div className={styles.allergens}>
              <span className={styles.allergensLabel}>Allergènes :</span>
              {formula.allergens.join(', ')}
            </div>
          )}
          <div className={styles.progress}>
            {formula.slots.map(s => (
              <div
                key={s.slot_name}
                className={`${styles.progressDot} ${slotChoices[s.slot_name] ? styles.progressDotFilled : ''}`}
                title={s.slot_name}
              />
            ))}
          </div>
        </div>

        <div className={styles.slots}>
          {formula.slots.map((slot, slotIndex) => {
            const chosen = slotChoices[slot.slot_name]
            const chosenOptions = slotOptions[slot.slot_name] || []
            const groups = slot.allowed_categories.map(cat => ({
              cat,
              label: CATEGORY_LABELS[cat] || cat,
              products: catalog[cat] || [],
            })).filter(g => g.products.length > 0)
            const multiGroup = groups.length > 1

            return (
              <div key={slot.slot_name} className={`${styles.slot} ${chosen ? styles.slotDone : ''}`}>
                <div className={styles.slotLabel}>
                  <span className={styles.slotNumber}>{String(slotIndex + 1).padStart(2, '0')}</span>
                  <span className={styles.slotName}>{slot.slot_name}</span>
                  {slot.required === false && (
                    <span className={styles.slotOptionalTag}>Optionnel</span>
                  )}
                  {chosen
                    ? <span className={styles.slotChosen}>
                        {chosen.name}
                        {chosen.formula_quantity > 1 && ` ×${chosen.formula_quantity}`}
                        {' '}✓
                      </span>
                    : <span className={styles.slotHint}>{groups.map(g => g.label).join(' ou ')}</span>
                  }
                </div>

                {groups.map((group, gi) => (
                  <div key={group.cat} className={styles.categoryGroup}>
                    {multiGroup && gi > 0 && (
                      <div className={styles.categoryDivider}>
                        <div className={styles.categoryDividerLine} />
                        <span className={styles.orBadge}>ou</span>
                        <div className={styles.categoryDividerLine} />
                      </div>
                    )}
                    <div className={styles.productOptions}>
                      {group.products.map(product => (
                        <div key={product.id}>
                          <button
                            className={`${styles.productCard} ${chosen?.id === product.id ? styles.selected : ''}`}
                            onClick={() => selectSlotProduct(slot.slot_name, product)}
                          >
                            <div className={styles.productCardImage}>
                              {product.image_url
                                ? <img src={`${API_BASE}${product.image_url}`} alt={product.name} loading="lazy" decoding="async" />
                                : <span>🥖</span>
                              }
                              {chosen?.id === product.id && (
                                <div className={styles.productCardCheck}>✓</div>
                              )}
                            </div>
                            <div className={styles.productCardName}>
                              {product.name}
                              {product.formula_quantity > 1 && (
                                <span className={styles.productCardQty}>×{product.formula_quantity}</span>
                              )}
                              {product.price_supplement > 0 && (
                                <span className={styles.productCardSupplement}>+{formatPrice(product.price_supplement)}</span>
                              )}
                            </div>
                            <div className={styles.productCardRadio}>
                              {chosen?.id === product.id && <div className={styles.productCardRadioDot} />}
                            </div>
                          </button>

                          {/* Options du produit — affichées seulement si ce produit est sélectionné */}
                          {chosen?.id === product.id && product.options?.length > 0 && (
                            <div className={styles.slotProductOptions}>
                              <div className={styles.slotProductOptionsTitle}>Options</div>
                              {product.options.map(opt => {
                                const isChecked = !!chosenOptions.find(o => o.id === opt.id)
                                return (
                                  <label
                                    key={opt.id}
                                    className={`${styles.slotOptionRow} ${isChecked ? styles.slotOptionChecked : ''}`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() => toggleSlotOption(slot.slot_name, opt)}
                                    />
                                    <span className={styles.slotOptionName}>{opt.name}</span>
                                    {opt.price_delta > 0 && (
                                      <span className={styles.slotOptionDelta}>+{formatPrice(opt.price_delta)}</span>
                                    )}
                                  </label>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )
          })}
        </div>

        <div className={styles.footer}>
          <div className={styles.qtyControl}>
            <button className={styles.qtyBtn} onClick={() => setQuantity(q => Math.max(1, q - 1))}>−</button>
            <span className={styles.qty}>{quantity}</span>
            <button className={styles.qtyBtn} onClick={() => setQuantity(q => q + 1)}>+</button>
          </div>
          <button
            className={`${styles.addBtn} ${added ? styles.addBtnSuccess : ''}`}
            onClick={handleAdd}
            disabled={!allSlotsFilled || added}
          >
            {added ? '✓ Ajouté !' : allSlotsFilled ? `Ajouter · ${formatPrice(totalPrice)}` : 'Complétez la formule'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default FormulaModal
