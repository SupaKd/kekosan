import { useState, useRef, useEffect } from "react";
import styles from "./CartDrawer.module.css";
import { API_BASE } from "../../config/api";
import { formatPrice } from "../../utils/formatting";
import { useLockBodyScroll } from "../../hooks/useLockBodyScroll";

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

function haptic(duration = 10) {
  if (navigator.vibrate) navigator.vibrate(duration);
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

  // ── Swipe-to-delete ──────────────────────────────────────────────────────────
  const swipeRef = useRef(null);
  const startXRef = useRef(null);
  const currentXRef = useRef(0);
  const THRESHOLD = 80; // px pour révéler le bouton delete
  const DELETE_THRESHOLD = 200; // px pour suppression directe

  const onTouchStart = (e) => {
    startXRef.current = e.touches[0].clientX;
    if (swipeRef.current) {
      swipeRef.current.style.transition = 'none';
    }
  };

  const onTouchMove = (e) => {
    if (startXRef.current === null) return;
    const dx = e.touches[0].clientX - startXRef.current;
    // Seulement vers la gauche
    if (dx > 0) return;
    currentXRef.current = dx;
    if (swipeRef.current) {
      swipeRef.current.style.transform = `translateX(${dx}px)`;
    }
  };

  const onTouchEnd = () => {
    const dx = currentXRef.current;
    if (swipeRef.current) {
      swipeRef.current.style.transition = 'transform 0.25s cubic-bezier(0.32, 0.72, 0, 1)';
    }
    if (dx < -DELETE_THRESHOLD) {
      // Suppression directe
      haptic(40);
      if (swipeRef.current) {
        swipeRef.current.style.transform = `translateX(-100%)`;
      }
      setTimeout(() => onRemove(item._key), 220);
    } else if (dx < -THRESHOLD) {
      // Révèle le bouton delete
      haptic(10);
      if (swipeRef.current) {
        swipeRef.current.style.transform = `translateX(-80px)`;
      }
    } else {
      // Retour position initiale
      if (swipeRef.current) {
        swipeRef.current.style.transform = `translateX(0)`;
      }
    }
    startXRef.current = null;
    currentXRef.current = 0;
  };

  const resetSwipe = () => {
    if (swipeRef.current) {
      swipeRef.current.style.transition = 'transform 0.25s cubic-bezier(0.32, 0.72, 0, 1)';
      swipeRef.current.style.transform = `translateX(0)`;
    }
  };

  return (
    <div className={styles.itemWrap}>
      {/* Fond rouge visible lors du swipe */}
      <div className={styles.itemDeleteBg} aria-hidden="true">
        <span>Supprimer</span>
      </div>
      <div
        ref={swipeRef}
        className={styles.item}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {item.image_url && (
          <div className={styles.itemImageWrap}>
            <div className={styles.itemImageSkeleton} />
            <img
              src={`${API_BASE}${item.image_url}`}
              alt={item.name}
              width={96}
              loading="lazy"
              decoding="async"
              className={styles.itemImage}
              onLoad={e => e.currentTarget.previousSibling.style.display = 'none'}
            />
          </div>
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
                onClick={() => { haptic(10); resetSwipe(); onUpdateQty(item._key, item.quantity - 1); }}
              >
                −
              </button>
              <span className={styles.qty}>{item.quantity}</span>
              <button
                className={styles.qtyBtn}
                onClick={() => { haptic(10); resetSwipe(); onUpdateQty(item._key, item.quantity + 1); }}
              >
                +
              </button>
            </div>
            <button
              className={styles.deleteBtn}
              onClick={() => { haptic(30); onRemove(item._key); }}
              aria-label="Supprimer"
            >
              ✕
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SuggestionButton({ p, onAdd }) {
  const [added, setAdded] = useState(false)
  const timerRef = useRef(null)

  const handleClick = () => {
    if (added) return
    onAdd()
    setAdded(true)
    if (navigator.vibrate) navigator.vibrate(30)
    timerRef.current = setTimeout(() => setAdded(false), 1500)
  }

  useEffect(() => () => clearTimeout(timerRef.current), [])

  return (
    <button
      className={`${styles.suggestionItem} ${added ? styles.suggestionAdded : ''}`}
      onClick={handleClick}
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
      <span className={`${styles.suggestionAdd} ${added ? styles.suggestionAddDone : ''}`}>
        {added ? '✓' : '+'}
      </span>
    </button>
  )
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
  const drawerRef = useRef(null);
  const dragStartY = useRef(null);
  const dragCurrentY = useRef(0);
  const dragVelocity = useRef(0);
  const lastDragTime = useRef(null);
  useLockBodyScroll(open);

  // Scroll en haut de la liste à chaque ouverture
  useEffect(() => {
    if (open && itemsRef.current) {
      itemsRef.current.scrollTop = 0;
    }
  }, [open]);

  // Ferme le drawer si le panier se vide (évite le lock scroll persistant)
  useEffect(() => {
    if (count === 0 && open) {
      setOpen(false);
    }
  }, [count]);

  // ── Drag-to-close (bottom sheet mobile) ─────────────────────────────────────
  const onDragStart = (e) => {
    dragStartY.current = e.touches[0].clientY;
    dragCurrentY.current = 0;
    dragVelocity.current = 0;
    lastDragTime.current = Date.now();
    if (drawerRef.current) {
      drawerRef.current.style.transition = 'none';
    }
  };

  const onDragMove = (e) => {
    if (dragStartY.current === null) return;
    const dy = e.touches[0].clientY - dragStartY.current;
    if (dy < 0) return; // Pas vers le haut
    const now = Date.now();
    const dt = now - lastDragTime.current;
    if (dt > 0) {
      dragVelocity.current = (dy - dragCurrentY.current) / dt;
    }
    dragCurrentY.current = dy;
    lastDragTime.current = now;
    if (drawerRef.current) {
      drawerRef.current.style.transform = `translateY(${dy}px)`;
    }
  };

  const onDragEnd = () => {
    const dy = dragCurrentY.current;
    const velocity = dragVelocity.current;
    if (drawerRef.current) {
      drawerRef.current.style.transition = 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)';
    }
    // Ferme si tiré > 120px ou lancé rapidement vers le bas
    if (dy > 120 || velocity > 0.5) {
      haptic(10);
      if (drawerRef.current) {
        drawerRef.current.style.transform = 'translateY(100%)';
      }
      setTimeout(() => {
        setOpen(false);
        if (drawerRef.current) {
          drawerRef.current.style.transform = '';
          drawerRef.current.style.transition = '';
        }
      }, 280);
    } else {
      // Rebondit en position initiale
      if (drawerRef.current) {
        drawerRef.current.style.transform = 'translateY(0)';
      }
    }
    dragStartY.current = null;
    dragCurrentY.current = 0;
  };

  const suggestions = getSuggestions(catalog, items);

  const { delivery_fee, free_delivery_threshold, min_order_amount } =
    deliveryConfig;
  const deliveryFee = total >= free_delivery_threshold ? 0 : delivery_fee;
  const totalWithDelivery = total + deliveryFee;
  const belowMinimum = total > 0 && total < min_order_amount;

  if (count === 0) return null;

  return (
    <>
      {/* Bouton flottant — masqué quand le sheet est ouvert */}
      <button
        className={`${styles.fab} ${open ? styles.fabHidden : ''}`}
        onClick={() => setOpen(true)}
      >
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
            ref={drawerRef}
            className={styles.drawer}
            role="dialog"
            aria-modal="true"
            aria-label="Panier"
          >
            {/* Drag handle — mobile uniquement */}
            <div
              className={styles.dragHandle}
              onTouchStart={onDragStart}
              onTouchMove={onDragMove}
              onTouchEnd={onDragEnd}
            >
              <div className={styles.dragHandleBar} />
            </div>

            <div
              className={styles.drawerHeader}
              onTouchStart={onDragStart}
              onTouchMove={onDragMove}
              onTouchEnd={onDragEnd}
            >
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
                      <SuggestionButton
                        key={p.id}
                        p={p}
                        onAdd={() =>
                          cart.addItem({
                            type: "product",
                            product_id: p.id,
                            name: p.name,
                            price: p.price,
                            image_url: p.image_url || null,
                            options: [],
                          })
                        }
                      />
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
                  <span style={{ color: deliveryFee === 0 ? "var(--success, #30d158)" : undefined }}>
                    {deliveryFee === 0 ? "Gratuite" : formatPrice(deliveryFee)}
                  </span>
                </div>
                {belowMinimum && (
                  <div className={styles.progressBar}>
                    <div className={styles.progressLabel} style={{ color: "var(--danger, #ff453a)" }}>
                      Minimum {formatPrice(min_order_amount)} — encore {formatPrice(min_order_amount - total)}
                    </div>
                    <div className={styles.progressTrack}>
                      <div
                        className={styles.progressFill}
                        style={{ width: `${Math.min(100, (total / min_order_amount) * 100)}%`, background: '#ff453a' }}
                      />
                    </div>
                  </div>
                )}
                {!belowMinimum && deliveryFee > 0 && (
                  <div className={styles.progressBar}>
                    <div className={styles.progressLabel}>
                      Encore {formatPrice(free_delivery_threshold - total)} pour la livraison gratuite 🛵
                    </div>
                    <div className={styles.progressTrack}>
                      <div
                        className={styles.progressFill}
                        style={{ width: `${Math.min(100, (total / free_delivery_threshold) * 100)}%` }}
                      />
                    </div>
                  </div>
                )}
                {!belowMinimum && deliveryFee === 0 && (
                  <div className={styles.progressBar}>
                    <div className={styles.progressLabel} style={{ color: '#30d158' }}>
                      🎉 Livraison gratuite débloquée !
                    </div>
                    <div className={styles.progressTrack}>
                      <div className={`${styles.progressFill} ${styles.reached}`} style={{ width: '100%' }} />
                    </div>
                  </div>
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
