import { useState, useEffect, useRef } from "react";
import { useCatalog } from "../../hooks/useCatalog";
import ProductCard from "../../components/ProductCard/ProductCard";
import ProductModal from "../../components/ProductModal/ProductModal";
import FormulaModal from "../../components/FormulaModal/FormulaModal";
import CartDrawer from "../../components/CartDrawer/CartDrawer";
import Header from "../../components/Header/Header";
import Footer from "../../components/Footer/Footer";
import InstagramSection from "../../components/InstagramSection/InstagramSection";
import Marquee from "../../components/Marquee/Marquee";
import PromoBanner from "../../components/PromoBanner/PromoBanner";
import IngredientsStrip from "../../components/IngredientsStrip/IngredientsStrip";
import ClosedModal from "../../components/ClosedModal/ClosedModal";
import LazySection from "../../components/LazySection/LazySection";
import styles from "./MenuPage.module.css";

import { API_BASE } from "../../config/api";
import { formatPrice } from "../../utils/formatting";
import {
  getServiceStatus,
  getSchedule,
  getSlotSettings,
  getDeliverySettings,
  getOpenDays,
  getClosedDays,
  getMaintenanceMessage,
} from "../../api/admin";
import { getAvailableSlots } from "../../utils/deliverySlots";

const CATEGORY_LABELS = {
  entree: "Entrées",
  banhmi: "Bánh Mì",
  dessert: "Desserts",
  boisson: "Boissons",
};

const HERO_SLIDES = [
  {
    id: "formules",
    label: "Formules",
    accroche: "Entrée, Bánh Mì & Boisson.",
    cta: "Voir les formules",
    image: "/formule.png",
  },
  {
    id: "banhmi",
    label: "Bánh Mì",
    accroche: "Fait maison, préparé avec coeur.",
    cta: "Commander",
    image: "/banhh.png",
  },
  {
    id: null,
    label: "Notre histoire",
    accroche: "Née à Saint-Genis-Pouilly, avec goût et passion.",
    cta: "En savoir plus",
    image: "/about.png",
  },
];

function MenuPage({ cart, onCheckout }) {
  const { catalog, formulas, loading, error } = useCatalog();

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedFormula, setSelectedFormula] = useState(null);
  const [activeFilter, setActiveFilter] = useState(null);
  const [heroIndex, setHeroIndex] = useState(0);
  const timerRef = useRef(null);
  const touchStartX = useRef(null);

  // État service ouvert/fermé + horaires + jours fermés + config livraison
  const [serviceOpen, setServiceOpen] = useState(true);
  const [schedule, setSchedule] = useState({
    opening_time: '11:00',
    closing_time: '15:00',
    opening_hour: 11,
    closing_hour: 15,
    open_days: [1, 2, 3, 4, 5],
    closed_days: [],
    slot_interval: 30,
    min_delivery_delay: 30,
  });
  const [deliveryConfig, setDeliveryConfig] = useState({
    delivery_fee: 5,
    free_delivery_threshold: 20,
    min_order_amount: 20,
  });
  const [maintenanceMessage, setMaintenanceMessage] = useState(
    "Le service est momentanément fermé. Revenez bientôt !"
  );
  useEffect(() => {
    getServiceStatus()
      .then((d) => setServiceOpen(d.service_open))
      .catch(() => {});
    getSchedule()
      .then((d) => setSchedule((s) => ({ ...s, ...d })))
      .catch(() => {});
    getSlotSettings()
      .then((d) => setSchedule((s) => ({ ...s, ...d })))
      .catch(() => {});
    getOpenDays()
      .then((d) => setSchedule((s) => ({ ...s, open_days: d.open_days })))
      .catch(() => {});
    getClosedDays()
      .then((d) => setSchedule((s) => ({ ...s, closed_days: d.closed_days })))
      .catch(() => {});
    getDeliverySettings()
      .then((d) => setDeliveryConfig(d))
      .catch(() => {});
    getMaintenanceMessage()
      .then((d) => setMaintenanceMessage(d.maintenance_message))
      .catch(() => {});
  }, []);
  const { available: slotsAvailable, message: closedMessage } =
    getAvailableSlots(schedule);
  const isClosed = !serviceOpen || !slotsAvailable;

  const goTo = (index) => {
    setHeroIndex((index + HERO_SLIDES.length) % HERO_SLIDES.length);
  };

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setHeroIndex((i) => (i + 1) % HERO_SLIDES.length);
    }, 4500);
    return () => clearInterval(timerRef.current);
  }, []);

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) {
      clearInterval(timerRef.current);
      goTo(heroIndex + (diff > 0 ? 1 : -1));
      timerRef.current = setInterval(() => {
        setHeroIndex((i) => (i + 1) % HERO_SLIDES.length);
      }, 4500);
    }
    touchStartX.current = null;
  };

  const scrollToSection = (id) => {
    setActiveFilter(id);
    const el = document.getElementById(`section-${id}`);
    if (!el) return;
    const offset = 48; // filterBar sticky
    const top = el.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top, behavior: "smooth" });
  };

  if (loading) {
    const SKELETON_CARDS = 4;
    return (
      <div className={styles.page}>
        {/* Hero skeleton */}
        <div className={styles.skeletonHero}>
          <div className={styles.skeletonHeroTitle} />
          <div className={styles.skeletonHeroSub} />
          <div className={styles.skeletonHeroBtn} />
        </div>
        {/* Filtres skeleton */}
        <div className={styles.skeletonFilterBar}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className={styles.skeletonFilterItem} />
          ))}
        </div>
        {/* Section produits skeleton */}
        {Array.from({ length: 2 }).map((_, si) => (
          <div key={si} className={styles.skeletonSection}>
            <div className={styles.skeletonSectionTitle} />
            <div className={styles.skeletonGrid}>
              {Array.from({ length: SKELETON_CARDS }).map((_, ci) => (
                <div key={ci} className={styles.skeletonCard}>
                  <div className={styles.skeletonCardImg} />
                  <div className={styles.skeletonCardBody}>
                    <div className={styles.skeletonCardName} />
                    <div className={styles.skeletonCardDesc} />
                    <div className={styles.skeletonCardPrice} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.page}>
        <div className={styles.error}>{error}</div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {/* Hero slider */}
      <PromoBanner />

      {/* Modal service fermé */}
      {isClosed && (
        <ClosedModal message={maintenanceMessage} />
      )}

      <div
        className={styles.hero}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <Header
          opening_time={schedule.opening_time}
          closing_time={schedule.closing_time}
          open_days={schedule.open_days}
        />

        {/* Panneaux */}
        <div
          className={styles.heroSlider}
          style={{ transform: `translateX(-${heroIndex * 100}%)` }}
        >
          {HERO_SLIDES.map((slide) => (
            <div key={slide.id} className={styles.heroSlide}>
              <picture>
                <source
                  srcSet={slide.image.replace(".png", ".webp")}
                  type="image/webp"
                />
                <img
                  src={slide.image}
                  alt={slide.label}
                  className={styles.heroSlideImg}
                  loading="eager"
                  decoding="async"
                  fetchPriority="high"
                />
              </picture>
              <div className={styles.heroSlideOverlay} />
            </div>
          ))}
        </div>

        {/* Contenu du slide actif */}
        <div className={styles.heroContent} key={heroIndex}>
          <div className={styles.heroEyebrow}>Saint-Genis-Pouilly</div>
          <div className={styles.heroLabel}>{HERO_SLIDES[heroIndex].label}</div>
          <div className={styles.heroDivider} />
          <p className={styles.heroSub}>{HERO_SLIDES[heroIndex].accroche}</p>
          <button
            className={styles.heroCta}
            onClick={() => {
              const slide = HERO_SLIDES[heroIndex];
              if (slide.id) scrollToSection(slide.id);
              else
                window.scrollTo({
                  top: document.body.scrollHeight,
                  behavior: "smooth",
                });
            }}
          >
            {HERO_SLIDES[heroIndex].cta}
          </button>
        </div>

        {/* Vague de transition */}
        <div className={styles.heroWave}>
          <svg
            viewBox="0 0 1440 80"
            preserveAspectRatio="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M0,40 C360,80 1080,0 1440,40 L1440,80 L0,80 Z"
              fill="#000"
            />
          </svg>
        </div>

        {/* Numéro du slide */}
        <div className={styles.heroCounter}>
          <span className={styles.heroCounterCurrent}>
            {String(heroIndex + 1).padStart(2, "0")}
          </span>
          <span className={styles.heroCounterSep}>/</span>
          <span className={styles.heroCounterTotal}>
            {String(HERO_SLIDES.length).padStart(2, "0")}
          </span>
        </div>
      </div>

      <main id="menu">
        {/* Bandeau défilant */}
        <Marquee />
        {/* Section formules */}
        {formulas.length > 0 && (
          <LazySection
            id="section-formules"
            className={`${styles.section} ${styles.sectionFormulas}`}
            minHeight={500}
          >
            <div className={styles.sectionInner}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>Formules</h2>
              </div>
              <div className={styles.formulasGrid}>
                {formulas.map((formula, index) => (
                  <div
                    key={formula.id}
                    className={styles.formulaCard}
                    onClick={() => setSelectedFormula(formula)}
                  >
                    {formula.image_url ? (
                      <div className={styles.formulaImageWrap}>
                        <img
                          src={`${API_BASE}${formula.image_url}`}
                          alt={formula.name}
                          width={400}
                          height={180}
                          className={styles.formulaImage}
                          loading="lazy"
                          decoding="async"
                        />
                        <span className={styles.formulaTicketNum}>
                          #{String(index + 1).padStart(2, "0")}
                        </span>
                        {formula.badge && (
                          <span className={styles.formulaBadge}>
                            {formula.badge}
                          </span>
                        )}
                      </div>
                    ) : null}
                    {!formula.image_url && (
                      <div className={styles.formulaTicketHeader}>
                        <span className={styles.formulaTicketNum}>
                          #{String(index + 1).padStart(2, "0")}
                        </span>
                      </div>
                    )}
                    <div className={styles.formulaBody}>
                      <div className={styles.formulaTop}>
                        <span className={styles.formulaName}>
                          {formula.name}
                        </span>
                        <span className={styles.formulaPrice}>
                          {formatPrice(formula.price)}
                        </span>
                      </div>
                      {formula.description && (
                        <p className={styles.formulaDesc}>
                          {formula.description}
                        </p>
                      )}
                    </div>
                    <div className={styles.formulaCta}>Composer ma formule</div>
                  </div>
                ))}
              </div>
            </div>
          </LazySection>
        )}

        {/* Barre de filtres sticky */}
        <nav className={styles.filterBar}>
          {formulas.length > 0 && (
            <button
              className={`${styles.filterBtn} ${styles.filterFormula} ${
                activeFilter === "formules" ? styles.filterActive : ""
              }`}
              onClick={() => scrollToSection("formules")}
            >
              Formules ✦
            </button>
          )}
          {Object.keys(catalog).map((cat) => (
            <button
              key={cat}
              className={`${styles.filterBtn} ${
                activeFilter === cat ? styles.filterActive : ""
              }`}
              onClick={() => scrollToSection(cat)}
            >
              {CATEGORY_LABELS[cat] || cat}
            </button>
          ))}
        </nav>

        {/* Sections produits par catégorie */}
        {Object.entries(catalog).map(([cat, products], index) => {
          const label = CATEGORY_LABELS[cat] || cat;
          const sectionCls =
            styles[`section_${cat}`] ||
            (index % 2 === 0 ? "" : styles.sectionAlt);
          return (
            <div
              key={cat}
              className={cat === "dessert" ? styles.dessertWrapper : undefined}
            >
              {cat === "dessert" && <IngredientsStrip />}
              <LazySection
                id={`section-${cat}`}
                className={`${styles.section} ${sectionCls}`}
                minHeight={400}
              >
                <div className={styles.sectionInner}>
                  <div className={styles.sectionHeader}>
                    <h2 className={styles.sectionTitle}>{label}</h2>
                  </div>
                  <div className={styles.productsGrid}>
                    {products.map((product) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        onSelect={setSelectedProduct}
                      />
                    ))}
                  </div>
                </div>
              </LazySection>
            </div>
          );
        })}
      </main>

      {/* Modals */}
      {selectedProduct && (
        <ProductModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onAdd={(item) => {
            cart.addItem(item);
            setSelectedProduct(null);
          }}
        />
      )}

      {selectedFormula && (
        <FormulaModal
          formula={selectedFormula}
          catalog={catalog}
          onClose={() => setSelectedFormula(null)}
          onAdd={(item) => {
            cart.addItem(item);
            setSelectedFormula(null);
          }}
        />
      )}

      <InstagramSection />
      <Footer opening_time={schedule.opening_time} closing_time={schedule.closing_time} open_days={schedule.open_days} />

      {/* Panier flottant */}
      <CartDrawer
        cart={cart}
        onCheckout={onCheckout}
        catalog={catalog}
        deliveryConfig={deliveryConfig}
      />
    </div>
  );
}

export default MenuPage;
