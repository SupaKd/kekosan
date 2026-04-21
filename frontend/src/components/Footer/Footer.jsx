import { useState } from "react";
import { MapPin, Clock, Mail } from "lucide-react";
import styles from "./Footer.module.css";
import LegalModal from "../LegalModal/LegalModal";

const DAY_NAMES = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']

function formatOpenDaysLong(open_days) {
  if (!open_days || open_days.length === 0) return 'Fermé'
  const sorted = [...open_days].sort((a, b) => a - b)
  const ranges = []
  let start = sorted[0], end = sorted[0]
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === end + 1) { end = sorted[i] }
    else { ranges.push([start, end]); start = sorted[i]; end = sorted[i] }
  }
  ranges.push([start, end])
  return ranges.map(([s, e]) => s === e ? DAY_NAMES[s] : `${DAY_NAMES[s]} – ${DAY_NAMES[e]}`).join(', ')
}

function Footer({ opening_time = '11:00', closing_time = '15:00', opening_hour = 11, closing_hour = 15, open_days = [1, 2, 3, 4, 5] }) {
  const [showLegal, setShowLegal] = useState(false)

  return (
    <footer className={styles.footer}>
      <div className={styles.top}>

        <div className={styles.brand}>
          <div className={styles.brandName}>Keko<span>san</span></div>
          <div className={styles.brandTagline}>Saint-Genis-Pouilly</div>
        </div>

        <div className={styles.infos}>
          <div className={styles.infosTitle}>Informations</div>
          <div className={styles.infoItem}>
            <MapPin size={15} className={styles.infoIcon} />
            Livraison uniquement à Saint-Genis-Pouilly (01630)
          </div>
          <div className={styles.infoItem}>
            <Clock size={15} className={styles.infoIcon} />
            {formatOpenDaysLong(open_days)} : {opening_time} – {closing_time}
          </div>
          <div className={styles.infoItem}>
            <Mail size={15} className={styles.infoIcon} />
            kekosan01630@gmail.com
          </div>
        </div>

        <div className={styles.social}>
          <div className={styles.socialLabel}>Suivez-nous</div>
          <div className={styles.socialLinks}>
            <a
              href="https://instagram.com/kekosan01630"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.socialLink}
              aria-label="Instagram"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                <circle cx="12" cy="12" r="4" />
                <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
              </svg>
              Instagram
            </a>
            <a
              href="https://facebook.com/kekosan01630"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.socialLink}
              aria-label="Facebook"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
              </svg>
              Facebook
            </a>
          </div>
        </div>

      </div>

      <div className={styles.bottom}>
        <span className={styles.legal}>© {new Date().getFullYear()} Kekosan — Tous droits réservés</span>
        <button className={styles.legalLink} onClick={() => setShowLegal(true)}>
          CGV & Confidentialité
        </button>
        <span className={styles.madeBy}>
          Site réalisé par{" "}
          <a href="https://supaco-digital.com/" target="_blank" rel="noopener noreferrer" className={styles.madeByLink}>
            SupacoDigital
          </a>
        </span>
      </div>

      {showLegal && <LegalModal onClose={() => setShowLegal(false)} />}
    </footer>
  );
}

export default Footer;
