import { useState } from "react";
import styles from "./CartDrawer.module.css";
import { API_BASE } from '../../config/api'
import { formatPrice } from '../../utils/formatting'

const FREE_DELIVERY_THRESHOLD = 20;
const DELIVERY_FEE = 5;

function CartItem({ item, onUpdateQty, onRemove }) {
  const unitPrice =
    item.type === "formula"
      ? item.price
      : item.price +
        (item.options || []).reduce((s, o) => s + o.price_delta, 0);

  const optionsLabel =
    item.type === "product" && item.options?.length > 0
      ? item.options.map((o) => o.name).join(", ")
      : null;

  const slotsLabel =
    item.type === "formula" && item.slots?.length > 0
      ? item.slots.map((s) => `${s.slot_name} : ${s.product_name}`).join(" · ")
      : null;

  return (
    <div className={styles.item}>
      {item.image_url && (
        <img
          src={`${API_BASE}${item.image_url}`}
          alt={item.name}
          loading="lazy"
          decoding="async"
          className={styles.itemImage}
        />
      )}
      <div className={styles.itemBody}>
        <div className={styles.itemHeader}>
          <span className={styles.itemName}>{item.name}</span>
          <span className={styles.itemPrice}>
            {formatPrice(unitPrice * item.quantity)}
          </span>
        </div>
        {(optionsLabel || slotsLabel) && (
          <div className={styles.itemMeta}>{optionsLabel || slotsLabel}</div>
        )}
        <div className={styles.itemFooter}>
          <div className={styles.qtyControl}>
            <button
              className={styles.qtyBtn}
              onClick={() => onUpdateQty(item._key, item.quantity - 1)}
            >
              −
            </button>
            <span className={styles.qty}>{item.quantity}</span>
            <button
              className={styles.qtyBtn}
              onClick={() => onUpdateQty(item._key, item.quantity + 1)}
            >
              +
            </button>
          </div>
          <button
            className={styles.deleteBtn}
            onClick={() => onRemove(item._key)}
            aria-label="Supprimer"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}

function CartDrawer({ cart, onCheckout }) {
  const [open, setOpen] = useState(false);
  const { items, updateQuantity, removeItem, total, count } = cart;

  const deliveryFee = total >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE;
  const totalWithDelivery = total + deliveryFee;

  if (count === 0) return null;

  return (
    <>
      {/* Bouton flottant */}
      <button className={styles.fab} onClick={() => setOpen(true)}>
        <span className={styles.fabLeft}>
          <span className={styles.fabLabel}>
            {count === 1 ? "1 article" : `${count} articles`}
          </span>
        </span>
        <span className={styles.fabCenter}>Voir mon panier</span>
        <span className={styles.fabTotal}>{formatPrice(total)}</span>
      </button>

      {/* Drawer */}
      {open && (
        <>
          <div className={styles.overlay} onClick={() => setOpen(false)} />
          <div className={styles.drawer}>
            <div className={styles.drawerHeader}>
              <div className={styles.drawerTitle}>Mon panier</div>
              <button
                className={styles.closeBtn}
                onClick={() => setOpen(false)}
              >
                ✕
              </button>
            </div>

            <div className={styles.items}>
              {items.length === 0 ? (
                <div className={styles.emptyState}>
                  <div className={styles.emptyIcon}>🥡</div>
                  <p>Votre panier est vide</p>
                </div>
              ) : (
                items.map((item) => (
                  <CartItem
                    key={item._key}
                    item={item}
                    onUpdateQty={updateQuantity}
                    onRemove={removeItem}
                  />
                ))
              )}
            </div>

            <div className={styles.drawerFooter}>
              <div className={styles.footerTop}>
                <div className={styles.totalRow}>
                  <span className={styles.totalLabel}>Sous-total</span>
                  <span>{formatPrice(total)}</span>
                </div>
                <div className={styles.totalRow}>
                  <span className={styles.totalLabel}>Livraison</span>
                  <span style={{ color: deliveryFee === 0 ? 'var(--success, #30d158)' : undefined }}>
                    {deliveryFee === 0 ? 'Gratuite 🎉' : formatPrice(deliveryFee)}
                  </span>
                </div>
                {deliveryFee > 0 && (
                  <p className={styles.deliveryHint}>
                    Encore {formatPrice(FREE_DELIVERY_THRESHOLD - total)} pour la livraison gratuite
                  </p>
                )}
                <div className={`${styles.totalRow} ${styles.totalFinal}`}>
                  <span className={styles.totalLabel}>Total</span>
                  <span className={styles.totalAmount}>{formatPrice(totalWithDelivery)}</span>
                </div>
              </div>
              <button
                className={styles.checkoutBtn}
                disabled={items.length === 0}
                onClick={() => {
                  setOpen(false);
                  onCheckout();
                }}
              >
                Commander →
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}

export default CartDrawer;
