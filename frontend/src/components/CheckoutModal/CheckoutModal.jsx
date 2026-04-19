import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import LegalModal from "../LegalModal/LegalModal";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  PaymentRequestButtonElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { createOrder, applyPromo, getActivePromos } from "../../api/orders";
import { getServiceStatus, getSchedule, getSlotSettings, getDeliverySettings, getOpenDays, getClosedDays, getSlotAvailability, getMaintenanceMessage } from "../../api/admin";
import { getAvailableSlots } from "../../utils/deliverySlots";
import styles from "./CheckoutModal.module.css";
import { useModalHistory } from "../../hooks/useModalHistory";
import { useCloseAnimation } from "../../hooks/useCloseAnimation";
import { useLockBodyScroll } from "../../hooks/useLockBodyScroll";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

import { formatPrice } from "../../utils/formatting";

// ── Traduit une erreur Stripe en message lisible ────────────────────────────
function stripeErrorMessage(error) {
  if (error.type === 'card_error') {
    if (error.code === 'card_declined')   return "Carte refusée. Vérifiez vos informations ou essayez une autre carte.";
    if (error.code === 'insufficient_funds') return "Fonds insuffisants sur cette carte.";
    if (error.code === 'expired_card')    return "Cette carte est expirée.";
    if (error.code === 'incorrect_cvc')   return "Le code de sécurité (CVV) est incorrect.";
  }
  if (error.type === 'validation_error') return "Informations de paiement incomplètes. Vérifiez les champs.";
  if (error.type === 'api_connection_error' || error.type === 'api_error') return "Erreur de connexion. Vérifiez votre réseau et réessayez.";
  if (error.code === 'payment_intent_authentication_failure') return "Authentification 3D Secure échouée. Réessayez et validez dans votre application bancaire.";
  return error.message;
}

// ── Formulaire interne (doit être dans <Elements>) ──────────────────────────
function PaymentForm({
  clientSecret,
  totalWithDelivery,
  onSuccess,
  onError,
  loading,
  setLoading,
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitted, setSubmitted] = useState(false);
  const [paymentRequest, setPaymentRequest] = useState(null);

  // Initialise Apple Pay / Google Pay dès que Stripe est prêt
  useEffect(() => {
    if (!stripe || !clientSecret) return;
    const pr = stripe.paymentRequest({
      country: 'FR',
      currency: 'eur',
      total: {
        label: 'Kekosan',
        amount: Math.round(totalWithDelivery * 100),
      },
      requestPayerName: false,
      requestPayerEmail: false,
    });
    pr.canMakePayment().then((result) => {
      if (result) setPaymentRequest(pr);
    });
    pr.on('paymentmethod', async (ev) => {
      setLoading(true);
      onError(null);
      const { error: confirmError } = await stripe.confirmCardPayment(
        clientSecret,
        { payment_method: ev.paymentMethod.id },
        { handleActions: false }
      );
      if (confirmError) {
        ev.complete('fail');
        onError(stripeErrorMessage(confirmError));
        setLoading(false);
      } else {
        ev.complete('success');
        onSuccess();
      }
    });
  }, [stripe, clientSecret]);

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
      onError(stripeErrorMessage(error));
      setLoading(false);
      setSubmitted(false);
    } else {
      onSuccess();
    }
  };

  return (
    <div>
      {/* Bouton Apple Pay / Google Pay — affiché uniquement si disponible */}
      {paymentRequest && (
        <>
          <div className={styles.stripeBox}>
            <PaymentRequestButtonElement
              options={{
                paymentRequest,
                style: {
                  paymentRequestButton: {
                    type: 'buy',
                    theme: 'dark',
                    height: '48px',
                  },
                },
              }}
            />
          </div>
          <div className={styles.orDivider}>
            <span>ou</span>
          </div>
        </>
      )}

      {/* Formulaire carte classique */}
      <div className={styles.stripeBox}>
        <PaymentElement />
        <div style={{ marginTop: 20 }}>
          <button
            className={styles.payBtn}
            onClick={handlePay}
            disabled={!stripe || loading || submitted}
          >
            {loading ? "Traitement…" : "Payer par carte"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Modal principale ─────────────────────────────────────────────────────────
// Sur iOS le clavier pousse le viewport — on scrolle le champ dans la vue
const scrollToField = (e) => {
  setTimeout(() => {
    e.target.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, 300)
}

function CheckoutModal({ cart, onClose }) {
  const navigate = useNavigate();
  const { items, total, clearCart } = cart;
  const modalRef = useRef(null);
  const { closing, triggerClose } = useCloseAnimation(onClose);
  useLockBodyScroll();

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

  const swipeHandleRef = useRef(null); // swipe-down désactivé sur le checkout
  const [clientSecret, setClientSecret] = useState(null);
  const [trackingToken, setTrackingToken] = useState(null);
  const [loading, setLoading] = useState(false);
  const [globalError, setGlobalError] = useState(null);
  const [showLegal, setShowLegal] = useState(false);

  const [serviceOpen, setServiceOpen] = useState(true);
  const [schedule, setSchedule] = useState({ opening_hour: 11, closing_hour: 15, open_days: [1, 2, 3, 4, 5], closed_days: [], availability: {}, slot_interval: 30, min_delivery_delay: 30 });
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
    getOpenDays()
      .then((d) => setSchedule(s => ({ ...s, open_days: d.open_days })))
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

  // C — Auto-sélection du premier créneau + invalidation si plus disponible
  useEffect(() => {
    if (slots.length === 0) return;
    if (!form.delivery_time) {
      // Pré-sélectionne le premier créneau dispo si rien n'est encore choisi
      setForm(f => ({ ...f, delivery_time: slots[0] }));
    } else if (!slots.includes(form.delivery_time)) {
      // Invalide le créneau sauvegardé s'il n'est plus disponible
      setForm(f => ({ ...f, delivery_time: slots[0] || "" }));
    }
  }, [slots.join(",")]);

  const FORM_KEY = "kekosan_checkout_form";

  const [form, setForm] = useState(() => {
    try {
      const saved = sessionStorage.getItem(FORM_KEY);
      if (saved) return { ...{ name: "", phone: "", email: "", street: "", delivery_time: "", notes: "" }, ...JSON.parse(saved) };
    } catch {}
    return { name: "", phone: "", email: "", street: "", delivery_time: "", notes: "" };
  });
  const [fieldErrors, setFieldErrors] = useState({});

  // Persiste le formulaire dans sessionStorage à chaque changement
  useEffect(() => {
    try {
      sessionStorage.setItem(FORM_KEY, JSON.stringify(form));
    } catch {}
  }, [form]);

  useModalHistory(onClose);

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

  // Valide un champ individuel — utilisé au blur et au submit
  const validateField = (name, value) => {
    switch (name) {
      case "name":    return (!value.trim() || value.trim().length < 2) ? "Nom requis" : null;
      case "phone":   return (!value.trim() || value.trim().length < 8) ? "Téléphone invalide" : null;
      case "email":   return (!value.trim() || !value.includes("@")) ? "Email invalide" : null;
      case "street":  return (!value.trim() || value.trim().length < 3) ? "Numéro et rue requis" : null;
      case "delivery_time": return !value ? "Choisissez un créneau" : null;
      default: return null;
    }
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    const error = validateField(name, value);
    setFieldErrors(prev => ({ ...prev, [name]: error || undefined }));
  };

  const validate = () => {
    const errors = {};
    ["name", "phone", "email", "street", "delivery_time"].forEach(field => {
      const error = validateField(field, form[field]);
      if (error) errors[field] = error;
    });
    return errors;
  };

  const handleSubmitForm = async () => {
    // Ferme le clavier virtuel iOS avant de soumettre
    if (document.activeElement) document.activeElement.blur();

    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    setLoading(true);
    setGlobalError(null);

    // Re-vérification en temps réel : le service a pu fermer pendant la saisie
    try {
      const statusNow = await getServiceStatus();
      if (!statusNow.service_open) {
        setServiceOpen(false);
        setGlobalError("Le service vient de fermer. Votre commande n'a pas pu être passée.");
        setLoading(false);
        return;
      }
    } catch {
      // Si la vérification échoue, on laisse passer — le serveur rejettera si fermé
    }

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
              options: s.options || [],
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
    try { sessionStorage.removeItem(FORM_KEY); } catch {}
    setStep("success");
  };

  const stripeOptions = clientSecret
    ? {
        clientSecret,
        appearance: {
          theme: "stripe",
          variables: {
            colorPrimary: "#c0392b",
            colorBackground: "#ffffff",
            colorText: "#1a1a1a",
            colorDanger: "#ff453a",
            borderRadius: "6px",
            fontFamily: "Space Grotesk, system-ui, sans-serif",
          },
        },
      }
    : null;

  return (
    <div
      className={`${styles.overlay} ${closing ? styles.overlayClosing : ''}`}
      onClick={(e) => e.target === e.currentTarget && !loading && triggerClose()}
    >
      <div className={`${styles.modal} ${closing ? styles.modalClosing : ''}`} role="dialog" aria-modal="true" aria-label="Commander" ref={modalRef}>
        {/* Header — zone de swipe-down pour fermer sur mobile */}
        <div className={styles.modalHeader} ref={swipeHandleRef}>
          <div className={styles.title}>
            {step === "success" ? "Commande confirmée" : "Commander"}
          </div>
          {step !== "success" && (
            <button
              className={styles.closeBtn}
              onClick={triggerClose}
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
              {/* A — Créneau en premier : le client voit immédiatement si c'est possible */}
              <div>
                <div className={styles.sectionTitle}>Créneau de livraison</div>
                {!isOpen ? (
                  <div className={styles.closedMessage}>{maintenanceMessage}</div>
                ) : (
                  <div className={styles.field}>
                    <select
                      name="delivery_time"
                      className={`${styles.select} ${fieldErrors.delivery_time ? styles.error : ""}`}
                      value={form.delivery_time}
                      onChange={(e) => setForm((f) => ({ ...f, delivery_time: e.target.value }))}
                      onBlur={handleBlur}
                    >
                      {slots.map((slot) => (
                        <option key={slot} value={slot}>{slot}</option>
                      ))}
                    </select>
                    {fieldErrors.delivery_time && (
                      <span className={styles.fieldError}>{fieldErrors.delivery_time}</span>
                    )}
                  </div>
                )}
              </div>

              {/* Infos client */}
              <div>
                <div className={styles.sectionTitle}>Vos informations</div>
                <div className={styles.fields}>
                  <div className={styles.fieldRow}>
                    <div className={styles.field}>
                      <label className={styles.label}>Prénom et nom</label>
                      <input
                        name="name"
                        className={`${styles.input} ${fieldErrors.name ? styles.error : ""}`}
                        placeholder="Jean Dupont"
                        value={form.name}
                        onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                        onBlur={handleBlur}
                        onFocus={scrollToField}
                        autoComplete="name"
                        inputMode="text"
                      />
                      {fieldErrors.name && (
                        <span className={styles.fieldError}>{fieldErrors.name}</span>
                      )}
                    </div>
                    <div className={styles.field}>
                      <label className={styles.label}>Téléphone</label>
                      <input
                        name="phone"
                        className={`${styles.input} ${fieldErrors.phone ? styles.error : ""}`}
                        placeholder="06 12 34 56 78"
                        value={form.phone}
                        onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                        onBlur={handleBlur}
                        onFocus={scrollToField}
                        type="tel"
                        autoComplete="tel"
                        inputMode="tel"
                      />
                      {fieldErrors.phone && (
                        <span className={styles.fieldError}>{fieldErrors.phone}</span>
                      )}
                    </div>
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>Email</label>
                    <input
                      name="email"
                      className={`${styles.input} ${fieldErrors.email ? styles.error : ""}`}
                      type="email"
                      placeholder="jean@exemple.fr"
                      value={form.email}
                      onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                      onBlur={handleBlur}
                      onFocus={scrollToField}
                      autoComplete="email"
                      inputMode="email"
                    />
                    {fieldErrors.email && (
                      <span className={styles.fieldError}>{fieldErrors.email}</span>
                    )}
                  </div>
                  <div className={styles.fieldRow}>
                    <div className={styles.field}>
                      <label className={styles.label}>Numéro et rue</label>
                      <input
                        name="street"
                        className={`${styles.input} ${fieldErrors.street ? styles.error : ""}`}
                        placeholder="12 rue des Fleurs"
                        value={form.street}
                        onChange={(e) => setForm((f) => ({ ...f, street: e.target.value }))}
                        onBlur={handleBlur}
                        onFocus={scrollToField}
                        autoComplete="street-address"
                        inputMode="text"
                      />
                      {fieldErrors.street && (
                        <span className={styles.fieldError}>{fieldErrors.street}</span>
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

                  {/* Code promo — affiché uniquement si des promos sont actives */}
                  {activePromos.length > 0 && (
                    <div className={styles.field}>
                      <label className={styles.label}>
                        Code promo{" "}
                        <span style={{ color: "var(--text-muted)" }}>(optionnel)</span>
                      </label>
                      {!appliedPromo ? (
                        <div className={styles.promoRow}>
                          <input
                            className={styles.input}
                            placeholder="BIENVENUE10"
                            value={promoInput}
                            onChange={(e) => { setPromoInput(e.target.value.toUpperCase()); setPromoError(null); }}
                            onKeyDown={(e) => e.key === "Enter" && handleApplyPromo()}
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
                            ✓ <strong>{appliedPromo.promo_code}</strong> — − {formatPrice(discountAmount)}
                          </span>
                          <button className={styles.promoRemoveBtn} onClick={handleRemovePromo}>✕</button>
                        </div>
                      )}
                      {promoError && <span className={styles.fieldError}>{promoError}</span>}
                    </div>
                  )}

                  {/* D — Notes en dernier, visuellement déprioritisées */}
                  <div className={styles.field}>
                    <label className={styles.label} style={{ color: "#aaa" }}>
                      Note pour la cuisine{" "}
                      <span style={{ color: "var(--text-muted)" }}>(optionnel)</span>
                    </label>
                    <input
                      className={styles.input}
                      placeholder="Allergie, instruction particulière…"
                      value={form.notes}
                      onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                      onFocus={scrollToField}
                      autoComplete="off"
                      inputMode="text"
                      style={{ opacity: 0.7 }}
                    />
                  </div>
                </div>
              </div>

              {/* B — Récap en bas, juste avant le bouton */}
              <div className={styles.recap}>
                {items.map((item) => {
                  const unitPrice =
                    item.type === "formula"
                      ? item.price
                      : item.price + (item.options || []).reduce((s, o) => s + o.price_delta, 0);
                  return (
                    <div key={item._key} className={styles.recapItem}>
                      <span className={styles.recapItemName}>{item.name}</span>
                      <span className={styles.recapItemQty}>×{item.quantity}</span>
                      <span className={styles.recapItemPrice}>{formatPrice(unitPrice * item.quantity)}</span>
                    </div>
                  );
                })}
                <hr className={styles.recapDivider} />
                {appliedPromo && (
                  <div className={styles.recapRow} style={{ color: "var(--success, #30d158)" }}>
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
                  <span style={{ color: deliveryFee === 0 ? "var(--success, #30d158)" : undefined }}>
                    {deliveryFee === 0 ? "Gratuite 🎉" : formatPrice(deliveryFee)}
                  </span>
                </div>
                <div className={styles.recapTotal}>
                  <span>Total</span>
                  <span className={styles.recapTotalAmount}>{formatPrice(totalWithDelivery)}</span>
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
                  totalWithDelivery={totalWithDelivery}
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
