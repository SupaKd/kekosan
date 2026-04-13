import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import LegalModal from "../LegalModal/LegalModal";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { createOrder, applyPromo, getActivePromos } from "../../api/orders";
import { getServiceStatus, getSchedule, getSlotSettings, getDeliverySettings, getClosedDays, getSlotAvailability, getMaintenanceMessage } from "../../api/admin";
import { getAvailableSlots } from "../../utils/deliverySlots";
import styles from "./CheckoutModal.module.css";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

import { formatPrice } from "../../utils/formatting";

// ── Formulaire interne (doit être dans <Elements>) ──────────────────────────
function PaymentForm({
  clientSecret,
  onSuccess,
  onError,
  loading,
  setLoading,
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitted, setSubmitted] = useState(false);

  const handlePay = async () => {
    if (!stripe || !elements || submitted) return;
    setSubmitted(true);
    setLoading(true);
    onError(null);

    const { error } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
    });

    if (error) {
      onError(error.message);
      setLoading(false);
      setSubmitted(false);
    } else {
      onSuccess();
    }
  };

  return (
    <div className={styles.stripeBox}>
      <PaymentElement />
      <div style={{ marginTop: 20 }}>
        <button
          className={styles.payBtn}
          onClick={handlePay}
          disabled={!stripe || loading || submitted}
        >
          {loading ? "Traitement…" : `Payer`}
        </button>
      </div>
    </div>
  );
}

// ── Modal principale ─────────────────────────────────────────────────────────
function CheckoutModal({ cart, onClose }) {
  const navigate = useNavigate();
  const { items, total, clearCart } = cart;

  // État code promo
  const [promoInput, setPromoInput] = useState("");
  const [appliedPromo, setAppliedPromo] = useState(null); // { promo_code, discount_amount }
  const [promoError, setPromoError] = useState(null);
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoFlash, setPromoFlash] = useState(false);
  const [activePromos, setActivePromos] = useState([]);

  const [deliveryConfig, setDeliveryConfig] = useState({ delivery_fee: 5, free_delivery_threshold: 20, min_order_amount: 20 });

  const discountAmount = appliedPromo?.discount_amount || 0;
  const subtotalAfterDiscount = Math.max(0, total - discountAmount);
  // La livraison gratuite se base sur le panier brut — la promo ne la retire pas
  const deliveryFee = total >= deliveryConfig.free_delivery_threshold ? 0 : deliveryConfig.delivery_fee;
  const totalWithDelivery = subtotalAfterDiscount + deliveryFee;

  // Étapes : 'form' → 'payment' → 'success'
  const [step, setStep] = useState("form");
  const [clientSecret, setClientSecret] = useState(null);
  const [trackingToken, setTrackingToken] = useState(null);
  const [loading, setLoading] = useState(false);
  const [globalError, setGlobalError] = useState(null);
  const [showLegal, setShowLegal] = useState(false);

  const [serviceOpen, setServiceOpen] = useState(true);
  const [schedule, setSchedule] = useState({ opening_hour: 11, closing_hour: 15, closed_days: [], availability: {}, slot_interval: 30, min_delivery_delay: 30 });
  const [maintenanceMessage, setMaintenanceMsg] = useState('Le service est momentanément fermé. Revenez bientôt !');
  useEffect(() => {
    getServiceStatus()
      .then((d) => setServiceOpen(d.service_open))
      .catch(() => {});
    getSchedule()
      .then((d) => setSchedule(s => ({ ...s, ...d })))
      .catch(() => {});
    getSlotSettings()
      .then((d) => setSchedule(s => ({ ...s, ...d })))
      .catch(() => {});
    getClosedDays()
      .then((d) => setSchedule(s => ({ ...s, closed_days: d.closed_days })))
      .catch(() => {});
    getSlotAvailability()
      .then((d) => setSchedule(s => ({ ...s, availability: d.availability })))
      .catch(() => {});
    getDeliverySettings()
      .then((d) => setDeliveryConfig(d))
      .catch(() => {});
    getMaintenanceMessage()
      .then((d) => setMaintenanceMsg(d.maintenance_message))
      .catch(() => {});
    getActivePromos()
      .then((d) => setActivePromos(d))
      .catch(() => {});
  }, []);

  const { available, slots, message: closedMessage } = getAvailableSlots(schedule);
  const isOpen = serviceOpen && available;

  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    street: "",
    delivery_time: "",
    notes: "",
  });
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    const handler = (e) => e.key === "Escape" && !loading && onClose();
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, loading]);

  const handleApplyPromo = async () => {
    setPromoError(null);
    if (!promoInput.trim()) return;
    setPromoLoading(true);
    try {
      const result = await applyPromo(promoInput.trim().toUpperCase(), total);
      setAppliedPromo(result);
      setPromoInput("");
      // Flash d'animation pour confirmer visuellement l'application
      setPromoFlash(true);
      setTimeout(() => setPromoFlash(false), 500);
    } catch (err) {
      setPromoError(err.response?.data?.error || "Code promo invalide");
    } finally {
      setPromoLoading(false);
    }
  };

  const handleRemovePromo = () => {
    setAppliedPromo(null);
    setPromoError(null);
    setPromoInput("");
  };

  const validate = () => {
    const errors = {};
    if (!form.name.trim() || form.name.trim().length < 2)
      errors.name = "Nom requis";
    if (!form.phone.trim() || form.phone.trim().length < 8)
      errors.phone = "Téléphone invalide";
    if (!form.email.trim() || !form.email.includes("@"))
      errors.email = "Email invalide";
    if (!form.street.trim() || form.street.trim().length < 3)
      errors.street = "Numéro et rue requis";
    if (!form.delivery_time) errors.delivery_time = "Choisissez un créneau";
    return errors;
  };

  const handleSubmitForm = async () => {
    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    setLoading(true);
    setGlobalError(null);

    try {
      const orderBody = {
        customer: { name: form.name, phone: form.phone, email: form.email },
        delivery_address: `${form.street.trim()}, Saint-Genis-Pouilly 01630`,
        delivery_time: form.delivery_time,
        notes: form.notes || undefined,
        promo_code: appliedPromo?.promo_code || null,
        items: items
          .filter((i) => i.type === "product")
          .map((i) => ({
            product_id: i.product_id,
            quantity: i.quantity,
            options: (i.options || []).map((o) => ({
              product_option_id: o.id,
            })),
          })),
        formula_items: items
          .filter((i) => i.type === "formula")
          .map((i) => ({
            formula_id: i.formula_id,
            quantity: i.quantity,
            slots: i.slots.map((s) => ({
              slot_name: s.slot_name,
              product_id: s.product_id,
            })),
          })),
      };

      const data = await createOrder(orderBody);
      setClientSecret(data.client_secret);
      setTrackingToken(data.tracking_token);
      setStep("payment");
    } catch (err) {
      setGlobalError(err.response?.data?.error || "Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = () => {
    clearCart();
    setStep("success");
  };

  const stripeOptions = clientSecret
    ? {
        clientSecret,
        appearance: {
          theme: "night",
          variables: {
            colorPrimary: "#ffd60a",
            colorBackground: "#16161f",
            colorText: "#f0f0f8",
            colorDanger: "#ff453a",
            borderRadius: "6px",
            fontFamily: "Space Grotesk, system-ui, sans-serif",
          },
        },
      }
    : null;

  return (
    <div
      className={styles.overlay}
      onClick={(e) => e.target === e.currentTarget && !loading && onClose()}
    >
      <div className={styles.modal}>
        {/* Header */}
        <div className={styles.modalHeader}>
          <div className={styles.title}>
            {step === "success" ? "Commande confirmée" : "Commander"}
          </div>
          {step !== "success" && (
            <button
              className={styles.closeBtn}
              onClick={onClose}
              disabled={loading}
            >
              ✕
            </button>
          )}
        </div>

        {/* ── Succès ── */}
        {step === "success" && (
          <div className={styles.success}>
            <div className={styles.successIcon}>🎉</div>
            <div className={styles.successTitle}>
              Merci pour votre commande !
            </div>
            <p className={styles.successText}>
              Un email de confirmation a été envoyé.
              <br />
              Vous pouvez suivre votre commande en temps réel.
            </p>
            <button
              className={styles.trackingBtn}
              onClick={() => {
                onClose();
                navigate(`/tracking/${trackingToken}`);
              }}
            >
              Suivre ma commande →
            </button>
          </div>
        )}

        {/* ── Étape 1 : Formulaire client ── */}
        {step === "form" && !loading && (
          <>
            <div className={styles.body}>
              {/* Récap */}
              <div className={styles.recap}>
                {items.map((item) => {
                  const unitPrice =
                    item.type === "formula"
                      ? item.price
                      : item.price +
                        (item.options || []).reduce(
                          (s, o) => s + o.price_delta,
                          0
                        );
                  return (
                    <div key={item._key} className={styles.recapItem}>
                      <span className={styles.recapItemName}>{item.name}</span>
                      <span className={styles.recapItemQty}>
                        ×{item.quantity}
                      </span>
                      <span className={styles.recapItemPrice}>
                        {formatPrice(unitPrice * item.quantity)}
                      </span>
                    </div>
                  );
                })}
                <hr className={styles.recapDivider} />

                {/* Ligne remise promo */}
                {appliedPromo && (
                  <div
                    className={styles.recapRow}
                    style={{ color: "var(--success, #30d158)" }}
                  >
                    <span>Code promo ({appliedPromo.promo_code})</span>
                    <span>− {formatPrice(discountAmount)}</span>
                  </div>
                )}

                <div className={styles.recapRow}>
                  <span>Sous-total</span>
                  <span>{formatPrice(subtotalAfterDiscount)}</span>
                </div>
                <div className={styles.recapRow}>
                  <span>Livraison</span>
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
                <div className={styles.recapTotal}>
                  <span>Total</span>
                  <span className={styles.recapTotalAmount}>
                    {formatPrice(totalWithDelivery)}
                  </span>
                </div>
              </div>

              {/* Infos client */}
              <div>
                <div className={styles.sectionTitle}>Vos informations</div>
                <div className={styles.fields}>
                  <div className={styles.fieldRow}>
                    <div className={styles.field}>
                      <label className={styles.label}>Prénom et nom</label>
                      <input
                        className={`${styles.input} ${
                          fieldErrors.name ? styles.error : ""
                        }`}
                        placeholder="Jean Dupont"
                        value={form.name}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, name: e.target.value }))
                        }
                      />
                      {fieldErrors.name && (
                        <span className={styles.fieldError}>
                          {fieldErrors.name}
                        </span>
                      )}
                    </div>
                    <div className={styles.field}>
                      <label className={styles.label}>Téléphone</label>
                      <input
                        className={`${styles.input} ${
                          fieldErrors.phone ? styles.error : ""
                        }`}
                        placeholder="06 12 34 56 78"
                        value={form.phone}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, phone: e.target.value }))
                        }
                      />
                      {fieldErrors.phone && (
                        <span className={styles.fieldError}>
                          {fieldErrors.phone}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>Email</label>
                    <input
                      className={`${styles.input} ${
                        fieldErrors.email ? styles.error : ""
                      }`}
                      type="email"
                      placeholder="jean@exemple.fr"
                      value={form.email}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, email: e.target.value }))
                      }
                    />
                    {fieldErrors.email && (
                      <span className={styles.fieldError}>
                        {fieldErrors.email}
                      </span>
                    )}
                  </div>
                  <div className={styles.fieldRow}>
                    <div className={styles.field}>
                      <label className={styles.label}>Numéro et rue</label>
                      <input
                        className={`${styles.input} ${
                          fieldErrors.street ? styles.error : ""
                        }`}
                        placeholder="12 rue des Fleurs"
                        value={form.street}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, street: e.target.value }))
                        }
                      />
                      {fieldErrors.street && (
                        <span className={styles.fieldError}>
                          {fieldErrors.street}
                        </span>
                      )}
                    </div>
                    <div className={styles.field}>
                      <label className={styles.label}>Ville</label>
                      <input
                        className={styles.input}
                        value="Saint-Genis-Pouilly 01630"
                        readOnly
                        style={{ opacity: 0.5, cursor: "not-allowed" }}
                      />
                    </div>
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>Créneau de livraison</label>
                    {!isOpen ? (
                      <div className={styles.closedMessage}>
                        {!serviceOpen
                          ? maintenanceMessage
                          : closedMessage}
                      </div>
                    ) : (
                      <>
                        <select
                          className={`${styles.select} ${
                            fieldErrors.delivery_time ? styles.error : ""
                          }`}
                          value={form.delivery_time}
                          onChange={(e) =>
                            setForm((f) => ({
                              ...f,
                              delivery_time: e.target.value,
                            }))
                          }
                        >
                          <option value="">-- Choisir une heure --</option>
                          {slots.map((slot) => (
                            <option key={slot} value={slot}>
                              {slot}
                            </option>
                          ))}
                        </select>
                        {fieldErrors.delivery_time && (
                          <span className={styles.fieldError}>
                            {fieldErrors.delivery_time}
                          </span>
                        )}
                      </>
                    )}
                  </div>

                  {/* Code promo — affiché uniquement si des promos sont actives */}
                  {activePromos.length > 0 && (
                    <div className={styles.field}>
                      <label className={styles.label}>
                        Code promo{" "}
                        <span style={{ color: "var(--text-muted)" }}>
                          (optionnel)
                        </span>
                      </label>
                      {!appliedPromo ? (
                        <div className={styles.promoRow}>
                          <input
                            className={styles.input}
                            placeholder="BIENVENUE10"
                            value={promoInput}
                            onChange={(e) => {
                              setPromoInput(e.target.value.toUpperCase());
                              setPromoError(null);
                            }}
                            onKeyDown={(e) =>
                              e.key === "Enter" && handleApplyPromo()
                            }
                            disabled={promoLoading}
                          />
                          <button
                            className={styles.promoBtn}
                            onClick={handleApplyPromo}
                            disabled={promoLoading || !promoInput.trim()}
                          >
                            {promoLoading ? "…" : "Appliquer"}
                          </button>
                        </div>
                      ) : (
                        <div className={`${styles.promoApplied}${promoFlash ? ` ${styles.promoFlash}` : ''}`}>
                          <span className={styles.promoAppliedLabel}>
                            ✓ <strong>{appliedPromo.promo_code}</strong> — −{" "}
                            {formatPrice(discountAmount)}
                          </span>
                          <button
                            className={styles.promoRemoveBtn}
                            onClick={handleRemovePromo}
                          >
                            ✕
                          </button>
                        </div>
                      )}
                      {promoError && (
                        <span className={styles.fieldError}>{promoError}</span>
                      )}
                    </div>
                  )}

                  <div className={styles.field}>
                    <label className={styles.label}>
                      Note pour la cuisine{" "}
                      <span style={{ color: "var(--text-muted)" }}>
                        (optionnel)
                      </span>
                    </label>
                    <input
                      className={styles.input}
                      placeholder="Allergie, instruction particulière…"
                      value={form.notes}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, notes: e.target.value }))
                      }
                    />
                  </div>
                </div>
              </div>

              {globalError && (
                <div className={styles.globalError}>{globalError}</div>
              )}
            </div>

            <div className={styles.footer}>
              <button
                className={styles.payBtn}
                onClick={handleSubmitForm}
                disabled={loading || !isOpen}
              >
                {loading
                  ? "Préparation…"
                  : isOpen
                  ? `Continuer · ${formatPrice(totalWithDelivery)}`
                  : "Service fermé"}
              </button>
              <p className={styles.secureNote}>
                🔒 Paiement sécurisé par Stripe
              </p>
              <p className={styles.legalNote}>
                En passant commande, vous acceptez nos{' '}
                <button className={styles.legalLink} onClick={() => setShowLegal(true)}>
                  CGV et politique de confidentialité
                </button>
              </p>
            </div>
          </>
        )}

        {/* ── Skeleton : transition form → payment ── */}
        {step === "form" && loading && (
          <div className={styles.skeletonPayment}>
            <div className={styles.skeletonPaymentRow} />
            <div className={styles.skeletonPaymentRowShort} />
            <div className={styles.skeletonPaymentCard} />
            <div className={styles.skeletonPaymentCard} />
            <div className={styles.skeletonPaymentBtn} />
          </div>
        )}

        {/* ── Étape 2 : Paiement Stripe ── */}
        {step === "payment" && stripeOptions && (
          <>
            <div className={styles.body}>
              <Elements stripe={stripePromise} options={stripeOptions}>
                <PaymentForm
                  clientSecret={clientSecret}
                  onSuccess={handlePaymentSuccess}
                  onError={setGlobalError}
                  loading={loading}
                  setLoading={setLoading}
                />
              </Elements>
              {globalError && (
                <div className={styles.globalError}>{globalError}</div>
              )}
            </div>
            <div className={styles.footer}>
              <p className={styles.secureNote}>
                🔒 Paiement sécurisé par Stripe
              </p>
              <p className={styles.legalNote}>
                En passant commande, vous acceptez nos{' '}
                <button className={styles.legalLink} onClick={() => setShowLegal(true)}>
                  CGV et politique de confidentialité
                </button>
              </p>
            </div>
          </>
        )}

        {showLegal && <LegalModal onClose={() => setShowLegal(false)} />}
      </div>
    </div>
  );
}

export default CheckoutModal;
