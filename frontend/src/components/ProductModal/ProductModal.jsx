import { useState } from 'react'
import styles from './ProductModal.module.css'
import { API_BASE } from '../../config/api'
import { formatPrice } from '../../utils/formatting'
import { useSwipeDown } from '../../hooks/useSwipeDown'
import { useLockBodyScroll } from '../../hooks/useLockBodyScroll'
import { useModalHistory } from '../../hooks/useModalHistory'

function ProductModal({ product, onClose, onAdd }) {
  const [selectedOptions, setSelectedOptions] = useState([])
  const [quantity, setQuantity] = useState(1)
  const [added, setAdded] = useState(false)
  const modalRef = useSwipeDown(onClose)
  useLockBodyScroll()
  useModalHistory(onClose)

  if (!product) return null

  const hasOptions = product.options && product.options.length > 0

  const toggleOption = (opt) => {
    setSelectedOptions(prev =>
      prev.find(o => o.id === opt.id)
        ? prev.filter(o => o.id !== opt.id)
        : [...prev, opt]
    )
  }

  const optionsDelta = selectedOptions.reduce((sum, o) => sum + o.price_delta, 0)
  const unitPrice = parseFloat(product.price) + optionsDelta
  const totalPrice = unitPrice * quantity

  const handleAdd = () => {
    if (added) return
    setAdded(true)
    onAdd({
      type: 'product',
      product_id: product.id,
      name: product.name,
      price: parseFloat(product.price),
      image_url: product.image_url || null,
      options: selectedOptions,
      quantity,
    })
    // Vibration haptique légère sur mobile si supportée
    if (navigator.vibrate) navigator.vibrate(40)
    // Laisse le feedback visible 800ms avant de fermer
    setTimeout(onClose, 800)
  }


  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} ref={modalRef} onClick={e => e.stopPropagation()}>
        <div className={styles.dragHandle} />
        <button className={styles.closeBtn} onClick={onClose} aria-label="Fermer">✕</button>

        {product.image_url && (
          <div className={styles.imageWrap}>
            <img src={`${API_BASE}${product.image_url}`} alt={product.name} className={styles.productImage} loading="lazy" decoding="async" />
          </div>
        )}

        <div className={styles.header}>
          <div className={styles.nameRow}>
            <div className={styles.name}>{product.name}</div>
            {product.badge && <span className={styles.badge}>{product.badge}</span>}
          </div>
          <div className={styles.price}>{formatPrice(totalPrice)}</div>
          {product.description && (
            <p className={styles.description}>{product.description}</p>
          )}
          {product.allergens && product.allergens.length > 0 && (
            <div className={styles.allergens}>
              <span className={styles.allergensLabel}>Allergènes :</span>
              {product.allergens.join(', ')}
            </div>
          )}
        </div>

        {hasOptions && (
          <div className={styles.section}>
            <div className={styles.sectionTitle}>Options</div>
            <div className={styles.options}>
              {product.options.map(opt => {
                const isSelected = !!selectedOptions.find(o => o.id === opt.id)
                return (
                  <label
                    key={opt.id}
                    className={`${styles.optionRow} ${isSelected ? styles.selected : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleOption(opt)}
                    />
                    <span className={styles.optionName}>{opt.name}</span>
                    {opt.price_delta > 0 && (
                      <span className={styles.optionDelta}>+{formatPrice(opt.price_delta)}</span>
                    )}
                  </label>
                )
              })}
            </div>
          </div>
        )}

        <div className={styles.footer}>
          <div className={styles.qtyControl}>
            <button className={styles.qtyBtn} onClick={() => setQuantity(q => Math.max(1, q - 1))}>−</button>
            <span className={styles.qty}>{quantity}</span>
            <button className={styles.qtyBtn} onClick={() => setQuantity(q => q + 1)}>+</button>
          </div>
          <button
            className={`${styles.addBtn} ${added ? styles.addBtnSuccess : ''}`}
            onClick={handleAdd}
            disabled={added}
          >
            {added ? '✓ Ajouté !' : `Ajouter · ${formatPrice(totalPrice)}`}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ProductModal
