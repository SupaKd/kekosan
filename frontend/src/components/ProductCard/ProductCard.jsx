import styles from './ProductCard.module.css'

import { API_BASE } from '../../config/api'
import { formatPrice } from '../../utils/formatting'

function ProductCard({ product, onSelect }) {
  const hasOptions = product.options && product.options.length > 0

  return (
    <div className={styles.card} onClick={() => onSelect(product)}>
      <div className={styles.content}>
        <div className={styles.info}>
          <span className={styles.name}>{product.name}</span>
          {product.description && (
            <p className={styles.description}>{product.description}</p>
          )}
          <span className={styles.price}>{formatPrice(product.price)}</span>
        </div>
        <div className={styles.imageWrap}>
          {product.image_url
            ? <img src={`${API_BASE}${product.image_url}`} alt={product.name} className={styles.image} loading="lazy" decoding="async" />
            : <div className={styles.imagePlaceholder}>🥖</div>
          }
          <button
            className={styles.addBtn}
            onClick={e => { e.stopPropagation(); onSelect(product) }}
            aria-label="Ajouter"
          >+</button>
        </div>
      </div>
    </div>
  )
}

export default ProductCard
