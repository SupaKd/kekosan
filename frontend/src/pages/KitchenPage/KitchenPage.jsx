import { useState, useEffect, useCallback, useRef } from "react";
import { io } from "socket.io-client";
import {
  getOrders,
  updateOrderStatus,
  login,
  refreshToken,
  getServiceStatus,
  setServiceStatus,
} from "../../api/admin";
import AdminPanel from "./AdminPanel";
import DashboardPanel from "./DashboardPanel";
import SettingsPanel from "./SettingsPanel";
import ConfirmDialog from "../../components/ConfirmDialog/ConfirmDialog";
import styles from "./KitchenPage.module.css";

const formatTime = (d) =>
  new Date(d).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Paris",
  });

const COLUMNS = [
  {
    key: "confirmed",
    label: "À préparer",
    nextLabel: "En préparation →",
    nextStatus: "preparing",
    btnClass: "next",
  },
  {
    key: "preparing",
    label: "En cours",
    nextLabel: "Livrer →",
    nextStatus: "delivering",
    btnClass: "deliver",
  },
  {
    key: "delivering",
    label: "En livraison",
    nextLabel: "Livré ✓",
    nextStatus: "delivered",
    btnClass: "done",
  },
];

// ── Horloge ────────────────────────────────────────────────────────────────
function Clock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <span className={styles.clock}>
      {time.toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        timeZone: "Europe/Paris",
      })}
    </span>
  );
}

// ── Carte commande ──────────────────────────────────────────────────────────
function OrderCard({ order, onStatusChange, isNew }) {
  const col = COLUMNS.find((c) => c.key === order.status);

  return (
    <div
      className={`${styles.orderCard} ${styles[order.status]} ${
        isNew ? styles.new : ""
      }`}
    >
      <div className={styles.cardHeader}>
        <span className={styles.orderId}>#{order.id}</span>
        <span className={styles.orderTime}>{formatTime(order.created_at)}</span>
      </div>

      <div className={styles.customerInfo}>
        <span className={styles.customerName}>{order.customer_name}</span>
        <span className={styles.customerPhone}>{order.customer_phone}</span>
      </div>

      <div className={styles.address}>
        {order.delivery_address}
        {order.delivery_time && (
          <span
            style={{
              display: "block",
              marginTop: 4,
              color: "var(--neon-yellow)",
              fontWeight: 700,
            }}
          >
            🕐 Livraison à {order.delivery_time}
          </span>
        )}
      </div>

      <div className={styles.items}>
        {(order.items || []).map((item) => (
          <div key={item.id}>
            <div className={styles.item}>
              <span className={styles.itemQty}>×{item.quantity}</span>
              <span className={styles.itemName}>
                {item.product_name_snapshot}
              </span>
            </div>
            {(item.options || []).map((opt) => (
              <div key={opt.name} className={styles.itemMeta}>
                + {opt.name}
              </div>
            ))}
          </div>
        ))}
        {(order.formula_items || []).map((fi) => (
          <div key={fi.id}>
            <div className={styles.item}>
              <span className={styles.itemQty}>×{fi.quantity}</span>
              <span className={styles.itemName}>
                🍱 {fi.formula_name_snapshot}
              </span>
            </div>
            {(fi.slots || []).map((s) => (
              <div key={s.slot_name} className={styles.itemMeta}>
                {s.slot_name} → {s.product_name_snapshot}
                {parseFloat(s.price_supplement_snapshot) > 0 && ` (+${parseFloat(s.price_supplement_snapshot).toFixed(2)}€)`}
              </div>
            ))}
          </div>
        ))}
      </div>

      {order.notes && <div className={styles.notes}>⚠️ {order.notes}</div>}

      {col && (
        <div className={styles.cardActions}>
          <button
            className={`${styles.actionBtn} ${styles[col.btnClass]}`}
            onClick={() => onStatusChange(order.id, col.nextStatus)}
          >
            {col.nextLabel}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Page principale ─────────────────────────────────────────────────────────
function KitchenPage() {
  const [authenticated, setAuthenticated] = useState(
    !!localStorage.getItem("admin_token")
  );
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [loginError, setLoginError] = useState(null);
  const [orders, setOrders] = useState([]);
  const [newOrderIds, setNewOrderIds] = useState(new Set());
  const [connected, setConnected] = useState(false);
  const [activeTab, setActiveTab] = useState("kds");
  const [serviceOpen, setServiceOpen] = useState(null);
  const [serviceLoading, setServiceLoading] = useState(false);
  const [serviceToast, setServiceToast] = useState(null); // 'open' | 'closed' | 'error'
  const [confirmClose, setConfirmClose] = useState(false);
  const [statusError, setStatusError] = useState(null);

  // Référence audio pour le son de nouvelle commande
  const audioCtxRef = useRef(null);

  // Joue un bip court via Web Audio API (pas besoin de fichier audio)
  const playNewOrderSound = useCallback(() => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new window.AudioContext();
      }
      const ctx = audioCtxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.4, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.4);
    } catch {
      // Web Audio non disponible — on ignore
    }
  }, []);

  // Chargement initial des commandes actives + statut service
  const loadOrders = useCallback(async () => {
    try {
      const statuses = ["confirmed", "preparing", "delivering"];
      const results = await Promise.all(
        statuses.map((s) => getOrders({ status: s, limit: 50 }))
      );
      const all = results.flatMap((r) => r.orders);
      setOrders(all);
    } catch {
      localStorage.removeItem("admin_token");
      setAuthenticated(false);
    }
  }, []);

  const loadService = useCallback(async () => {
    try {
      const data = await getServiceStatus();
      setServiceOpen(data.service_open);
    } catch {
      // ignoré
    }
  }, []);

  useEffect(() => {
    if (authenticated) {
      loadOrders();
      loadService();
    }
  }, [authenticated, loadOrders, loadService]);

  const handleToggleService = () => {
    // Fermeture : demande confirmation via dialog personnalisé
    if (serviceOpen) { setConfirmClose(true); return; }
    doToggleService(true);
  };

  const doToggleService = async (next) => {
    setConfirmClose(false);
    setServiceOpen(next);
    setServiceLoading(true);
    try {
      await setServiceStatus(next);
      setServiceToast(next ? "open" : "closed");
      setTimeout(() => setServiceToast(null), 3000);
    } catch {
      setServiceOpen(!next);
      setServiceToast("error");
      setTimeout(() => setServiceToast(null), 3000);
    } finally {
      setServiceLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("admin_token");
    setAuthenticated(false);
  };

  // Socket.io — reçoit les nouvelles commandes et les mises à jour de statut
  useEffect(() => {
    if (!authenticated) return;

    const socket = io("/", { path: "/socket.io" });

    socket.on("connect", () => {
      setConnected(true);
      socket.emit("join_kitchen");
    });
    socket.on("disconnect", () => setConnected(false));
    socket.on("reconnect", () => {
      socket.emit("join_kitchen");
      // Recharge les commandes actives pour ne pas manquer celles reçues pendant la déconnexion
      loadOrders();
    });

    socket.on("new_order", (order) => {
      setOrders((prev) => {
        if (prev.find((o) => o.id === order.id)) return prev;
        return [order, ...prev];
      });
      setNewOrderIds((prev) => new Set([...prev, order.id]));
      setTimeout(() => {
        setNewOrderIds((prev) => {
          const s = new Set(prev);
          s.delete(order.id);
          return s;
        });
      }, 2000);
      playNewOrderSound();
    });

    socket.on("order_status_updated", ({ order_id, status }) => {
      if (status === "delivered" || status === "cancelled") {
        setOrders((prev) => prev.filter((o) => o.id !== order_id));
      } else {
        setOrders((prev) =>
          prev.map((o) => (o.id === order_id ? { ...o, status } : o))
        );
      }
    });

    return () => socket.disconnect();
  }, [authenticated, playNewOrderSound]);

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      await updateOrderStatus(orderId, newStatus);
      if (newStatus === "delivered") {
        setOrders((prev) => prev.filter((o) => o.id !== orderId));
      } else {
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
        );
      }
    } catch {
      setStatusError("Erreur lors du changement de statut");
      setTimeout(() => setStatusError(null), 3000);
    }
  };

  const handleLogin = async () => {
    setLoginError(null);
    try {
      const { token } = await login(loginForm.email, loginForm.password);
      localStorage.setItem("admin_token", token);
      setAuthenticated(true);
    } catch {
      setLoginError("Identifiants invalides");
    }
  };

  // Auto-refresh du token 30 min avant expiration (évite la déco en plein service)
  useEffect(() => {
    if (!authenticated) return;

    const scheduleRefresh = () => {
      const token = localStorage.getItem("admin_token");
      if (!token) return;
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        const msUntilExpiry = payload.exp * 1000 - Date.now();
        const msUntilRefresh = msUntilExpiry - 30 * 60 * 1000; // 30 min avant
        if (msUntilRefresh <= 0) return; // déjà trop tard
        return setTimeout(async () => {
          try {
            const { token: newToken } = await refreshToken();
            localStorage.setItem("admin_token", newToken);
            scheduleRefresh(); // replanifie pour le prochain token
          } catch {
            // Le token a expiré entre temps — l'intercepteur axios gère le logout
          }
        }, msUntilRefresh);
      } catch {
        // Token malformé — on laisse l'intercepteur axios gérer
      }
    };

    const timerId = scheduleRefresh();
    return () => clearTimeout(timerId);
  }, [authenticated]);

  // ── Écran de connexion ────────────────────────────────────────────────────
  if (!authenticated) {
    return (
      <div className={styles.page}>
        <div className={styles.connectScreen}>
          <div className={styles.connectCard}>
            <div className={styles.connectTitle}>🍳 Cuisine KDS</div>
            <input
              className={styles.input}
              type="email"
              placeholder="Email admin"
              value={loginForm.email}
              onChange={(e) =>
                setLoginForm((f) => ({ ...f, email: e.target.value }))
              }
            />
            <input
              className={styles.input}
              type="password"
              placeholder="Mot de passe"
              value={loginForm.password}
              onChange={(e) =>
                setLoginForm((f) => ({ ...f, password: e.target.value }))
              }
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            />
            {loginError && (
              <div className={styles.connectError}>{loginError}</div>
            )}
            <button className={styles.connectBtn} onClick={handleLogin}>
              Se connecter
            </button>
          </div>
        </div>
      </div>
    );
  }

  const activeCount = orders.filter((o) =>
    ["confirmed", "preparing", "delivering"].includes(o.status)
  ).length;

  // ── Board KDS + Admin ─────────────────────────────────────────────────────
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.title}>KDS</span>
          <div className={styles.tabs}>
            <button
              className={`${styles.tab} ${
                activeTab === "kds" ? styles.tabActive : ""
              }`}
              onClick={() => setActiveTab("kds")}
            >
              🍳 Commandes
              {activeCount > 0 && (
                <span className={styles.tabBadge}>{activeCount}</span>
              )}
            </button>
            <button
              className={`${styles.tab} ${
                activeTab === "dashboard" ? styles.tabActive : ""
              }`}
              onClick={() => setActiveTab("dashboard")}
            >
              📋 Historique
            </button>
            <button
              className={`${styles.tab} ${
                activeTab === "admin" ? styles.tabActive : ""
              }`}
              onClick={() => setActiveTab("admin")}
            >
              🍱 Produits
            </button>
            <button
              className={`${styles.tab} ${
                activeTab === "settings" ? styles.tabActive : ""
              }`}
              onClick={() => setActiveTab("settings")}
            >
              ⚙️ Paramètres
            </button>
          </div>
        </div>

        <div className={styles.headerRight}>
          {/* Toggle service ouvert/fermé */}
          {serviceOpen !== null && (
            <button
              className={`${styles.serviceBtn} ${
                serviceOpen ? styles.serviceBtnOpen : styles.serviceBtnClosed
              }`}
              onClick={handleToggleService}
              disabled={serviceLoading}
            >
              <span
                className={`${styles.serviceToggleTrack} ${
                  serviceOpen ? styles.serviceToggleOn : styles.serviceToggleOff
                }`}
              >
                <span className={styles.serviceToggleThumb} />
              </span>
              {serviceOpen ? "🟢 Service ouvert" : "🔴 Service fermé"}
            </button>
          )}

          <Clock />

          <button className={styles.logoutBtn} onClick={handleLogout}>
            Déconnexion
          </button>
        </div>
      </header>

      {/* Tous les panneaux restent montés — on masque avec CSS pour éviter les flash */}
      <div
        className={styles.board}
        style={{ display: activeTab === "kds" ? undefined : "none" }}
      >
        {COLUMNS.map((col) => {
          const colOrders = orders
            .filter((o) => o.status === col.key)
            .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
          return (
            <div key={col.key} className={styles.column}>
              <div className={`${styles.columnHeader} ${styles[col.key]}`}>
                <span className={styles.columnTitle}>{col.label}</span>
                <span className={styles.columnBadge}>{colOrders.length}</span>
              </div>
              {colOrders.length === 0 ? (
                <div className={styles.emptyCol}>Aucune commande</div>
              ) : (
                colOrders.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    onStatusChange={handleStatusChange}
                    isNew={newOrderIds.has(order.id)}
                  />
                ))
              )}
            </div>
          );
        })}
      </div>

      <div style={{ display: activeTab === "dashboard" ? undefined : "none" }}>
        <DashboardPanel />
      </div>
      <div style={{ display: activeTab === "admin" ? undefined : "none" }}>
        <AdminPanel />
      </div>
      <div style={{ display: activeTab === "settings" ? undefined : "none" }}>
        <SettingsPanel />
      </div>

      {/* Toast feedback service */}
      {serviceToast && (
        <div className={`${styles.toast} ${styles[`toast_${serviceToast}`]}`}>
          {serviceToast === "open"   && "🟢 Service ouvert — les clients peuvent commander"}
          {serviceToast === "closed" && "🔴 Service fermé — aucune commande possible"}
          {serviceToast === "error"  && "⚠️ Erreur lors du changement de statut"}
        </div>
      )}

      {/* Toast erreur changement de statut commande */}
      {statusError && (
        <div className={`${styles.toast} ${styles.toast_error}`}>{statusError}</div>
      )}

      {/* Confirmation fermeture service */}
      {confirmClose && (
        <ConfirmDialog
          message="Fermer le service ? Les clients ne pourront plus passer de commande."
          confirmLabel="Fermer le service"
          danger
          onConfirm={() => doToggleService(false)}
          onCancel={() => setConfirmClose(false)}
        />
      )}
    </div>
  );
}

export default KitchenPage;
