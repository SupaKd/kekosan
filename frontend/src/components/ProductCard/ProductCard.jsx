import { useState } from 'react'
import styles from './ProductCard.module.css'

import { API_BASE } from '../../config/api'
import { formatPrice } from '../../utils/formatting'

function ProductCard({ product, onSelect }) {
  const [imgLoaded, setImgLoaded] = useState(false)

  return (
    <div className={styles.card} onClick={() => onSelect(product)}>
      <div className={styles.info}>
        <div className={styles.nameRow}>
          <span className={styles.name}>{product.name}</span>
        </div>
        {product.description && (
          <p className={styles.description}>{product.description}</p>
        )}
        <div className={styles.bottom}>
          <span className={styles.price}>{formatPrice(product.price)}</span>
          <button
            className={styles.addBtn}
            onClick={e => { e.stopPropagation(); onSelect(product) }}
            aria-label="Ajouter"
          >+</button>
        </div>
      </div>
      <div className={styles.imageWrap}>
        {product.image_url ? (
          <>
            {!imgLoaded && <div className={styles.imageSkeleton} />}
            <img
              src={`${API_BASE}${product.image_url}`}
              alt={product.name}
              width={110}
              height={110}
              className={styles.image}
              style={{ opacity: imgLoaded ? 1 : 0 }}
              loading="lazy"
              decoding="async"
              onLoad={() => setImgLoaded(true)}
            />
          </>
        ) : (
          <div className={styles.imagePlaceholder}>🥖</div>
        )}
        {product.badge && <span className={styles.badge}>{product.badge}</span>}
      </div>
    </div>
  )
}

export default ProductCard
