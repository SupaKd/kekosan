import { useState } from "react";
import { X } from "lucide-react";
import styles from "./ClosedModal.module.css";

function ClosedModal({ message }) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className={styles.backdrop} onClick={() => setDismissed(true)}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button
          className={styles.close}
          onClick={() => setDismissed(true)}
          aria-label="Fermer"
        >
          <X size={15} />
        </button>

        <img src="/logokekosan.png" alt="Kekosan" className={styles.logo} />

        <div className={styles.divider} />

        <h2 className={styles.title}>On est pas là pour l'instant 😴</h2>
        <p className={styles.message}>{message}</p>
        <p className={styles.sub}>
          T'inquiète, le menu est là pour te faire saliver en attendant.
        </p>

        <button className={styles.cta} onClick={() => setDismissed(true)}>
          Je regarde quand même →
        </button>
      </div>
    </div>
  );
}

export default ClosedModal;
