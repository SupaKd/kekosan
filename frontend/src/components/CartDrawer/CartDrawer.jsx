import { useState, useRef, useEffect } from "react";
import styles from "./CartDrawer.module.css";
import { API_BASE } from "../../config/api";
import { formatPrice } from "../../utils/formatting";

// Retourne jusqu'à `max` produits non présents dans le panier
// Priorité : banhmi > entree > dessert > boisson
function getSuggestions(catalog, cartItems, max = 2) {
  if (!catalog || Object.keys(catalog).length === 0) return [];
  const cartProductIds = new Set(
    cartItems.filter((i) => i.type === "product").map((i) => i.product_id)
  );
  const PRIORITY = ["entree", "dessert"];
  const suggestions = [];
  for (const cat of PRIORITY) {
    if (!catalog[cat]) continue;
    for (const p of catalog[cat]) {
      if (!cartProductIds.has(p.id)) {
        suggestions.push(p);
        if (suggestions.length >= max) return suggestions;
      }
    }
  }
  return suggestions;
}

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
          width={96}
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

function CartDrawer({
  cart,
  onCheckout,
  catalog = {},
  deliveryConfig = {
    delivery_fee: 5,
    free_delivery_threshold: 20,
    min_order_amount: 20,
  },
}) {
  const [open, setOpen] = useState(false);
  const { items, updateQuantity, removeItem, total, count } = cart;
  const itemsRef = useRef(null);

  // Scroll en haut de la liste à chaque ouverture
  useEffect(() => {
    if (open && itemsRef.current) {
      itemsRef.current.scrollTop = 0;
    }
  }, [open]);

  const suggestions = getSuggestions(catalog, items);

  const { delivery_fee, free_delivery_threshold, min_order_amount } =
    deliveryConfig;
  const deliveryFee = total >= free_delivery_threshold ? 0 : delivery_fee;
  const totalWithDelivery = total + deliveryFee;
  const belowMinimum = total > 0 && total < min_order_amount;

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
          <div
            className={styles.drawer}
            role="dialog"
            aria-modal="true"
            aria-label="Panier"
          >
            <div className={styles.drawerHeader}>
              <div className={styles.drawerTitle}>Mon panier</div>
              <button
                className={styles.closeBtn}
                onClick={() => setOpen(false)}
              >
                ✕
              </button>
            </div>

            <div className={styles.items} ref={itemsRef}>
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

              {/* Suggestions intégrées dans le scroll, après les items */}
              {suggestions.length > 0 && (
                <div className={styles.suggestions}>
                  <div className={styles.suggestionsTitle}>
                    Tu pourrais aussi aimer
                  </div>
                  <div className={styles.suggestionsList}>
                    {suggestions.map((p) => (
                      <button
                        key={p.id}
                        className={styles.suggestionItem}
                        onClick={() =>
                          cart.addItem({
                            type: "product",
                            product_id: p.id,
                            name: p.name,
                            price: p.price,
                            image_url: p.image_url || null,
                            options: [],
                          })
                        }
                      >
                        {p.image_url && (
                          <img
                            src={`${API_BASE}${p.image_url}`}
                            alt={p.name}
                            width={40}
                            height={40}
                            className={styles.suggestionImg}
                            loading="lazy"
                            decoding="async"
                          />
                        )}
                        <div className={styles.suggestionBody}>
                          <span className={styles.suggestionName}>{p.name}</span>
                          <span className={styles.suggestionPrice}>
                            {formatPrice(p.price)}
                          </span>
                        </div>
                        <span className={styles.suggestionAdd}>+</span>
                      </button>
                    ))}
                  </div>
                </div>
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
                  <span
                    style={{
                      color:
                        deliveryFee === 0
                          ? "var(--success, #30d158)"
                          : undefined,
                    }}
                  >
                    {deliveryFee === 0
                      ? "Gratuite 🎉"
                      : formatPrice(deliveryFee)}
                  </span>
                </div>
                {belowMinimum && (
                  <p
                    className={styles.deliveryHint}
                    style={{ color: "var(--danger, #ff453a)" }}
                  >
                    Minimum de commande : {formatPrice(min_order_amount)}{" "}
                    (encore {formatPrice(min_order_amount - total)})
                  </p>
                )}
                {!belowMinimum && deliveryFee > 0 && (
                  <p className={styles.deliveryHint}>
                    Encore {formatPrice(free_delivery_threshold - total)} pour
                    la livraison gratuite
                  </p>
                )}
                <div className={`${styles.totalRow} ${styles.totalFinal}`}>
                  <span className={styles.totalLabel}>Total</span>
                  <span className={styles.totalAmount}>
                    {formatPrice(totalWithDelivery)}
                  </span>
                </div>
              </div>
              <button
                className={styles.checkoutBtn}
                disabled={items.length === 0 || belowMinimum}
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
