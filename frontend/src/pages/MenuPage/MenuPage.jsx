import { useState } from "react";
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
import styles from "./MenuPage.module.css";

import { API_BASE } from '../../config/api'
import { formatPrice } from '../../utils/formatting'

const CATEGORY_LABELS = {
  entree: "Entrées",
  banhmi: "Bánh Mì",
  dessert: "Desserts",
  boisson: "Boissons",
};

function MenuPage({ cart, onCheckout }) {
  const { catalog, formulas, loading, error } = useCatalog();

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedFormula, setSelectedFormula] = useState(null);
  const [activeFilter, setActiveFilter] = useState(null);

  const scrollToSection = (id) => {
    setActiveFilter(id);
    const el = document.getElementById(`section-${id}`);
    if (!el) return;
    const offset = 48; // filterBar sticky
    const top = el.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top, behavior: "smooth" });
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <span>Chargement du menu…</span>
        </div>
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
      {/* Hero */}
      <PromoBanner />
      <div className={styles.hero}>
        <Header />
        <video
          className={styles.heroVideo}
          src="/hero.mp4"
          autoPlay
          muted
          loop
          playsInline
        />
        <div className={styles.heroContent}>
          <img src="/kekosanlogo.png" alt="Kekosan" className={styles.heroLogo} />
          <div className={styles.heroCtaGroup}>
            <button
              className={`${styles.heroCta} ${styles.heroCtaYellow}`}
              onClick={() =>
                scrollToSection(
                  formulas.length > 0 ? "formules" : Object.keys(catalog)[0]
                )
              }
            >
              Commander
            </button>
            <button
              className={`${styles.heroCta} ${styles.heroCtaRed}`}
              onClick={() =>
                scrollToSection(
                  formulas.length > 0 ? "formules" : Object.keys(catalog)[0]
                )
              }
            >
              Voir le menu
            </button>
          </div>
        </div>
      </div>

      <main id="menu">
        {/* Section formules */}
        {formulas.length > 0 && (
          <section
            id="section-formules"
            className={`${styles.section} ${styles.sectionFormulas}`}
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
                          className={styles.formulaImage}
                          loading="lazy"
                          decoding="async"
                        />
                        <span className={styles.formulaTicketNum}>
                          #{String(index + 1).padStart(2, "0")}
                        </span>
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
                        <span className={styles.formulaName}>{formula.name}</span>
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
          </section>
        )}

        {/* Bandeau défilant */}
        <Marquee />

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
            <div key={cat}>
              {cat === "dessert" && <IngredientsStrip />}
              <section
                key={cat}
                id={`section-${cat}`}
                className={`${styles.section} ${sectionCls}`}
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
              </section>
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
      <Footer />

      {/* Panier flottant */}
      <CartDrawer cart={cart} onCheckout={onCheckout} />
    </div>
  );
}

export default MenuPage;
