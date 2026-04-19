// Retourne { available: bool, slots: ['11:00', '11:30', ...], message: string | null }
// Tous les paramètres sont lus depuis la DB et passés en argument
// availability = objet { 'YYYY-MM-DD|HH:MM': placesRestantes } retourné par /slot-availability
export function getAvailableSlots({
  opening_hour = 11, closing_hour = 15,
  open_days = [1, 2, 3, 4, 5],
  closed_days = [], availability = {},
  slot_interval = 30, min_delivery_delay = 30,
} = {}) {
  const SERVICE_START  = opening_hour
  const SERVICE_END    = closing_hour
  const SLOT_INTERVAL  = slot_interval
  const MIN_DELAY      = min_delivery_delay

  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Paris' }))

  // Vérification des jours d'ouverture configurés
  const dow = now.getDay()
  if (!open_days.includes(dow)) {
    const DAY_NAMES = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi']
    const openLabels = open_days.map(d => DAY_NAMES[d]).join(', ')
    return {
      available: false,
      slots: [],
      message: `Nous ne livrons pas aujourd'hui. Nous livrons le : ${openLabels}.`,
    }
  }

  // Vérification des jours de fermeture exceptionnelle
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  if (closed_days.includes(todayStr)) {
    return {
      available: false,
      slots: [],
      message: 'Nous sommes fermés exceptionnellement aujourd\'hui. Revenez bientôt !',
    }
  }

  const earliest = new Date(now.getTime() + MIN_DELAY * 60000)

  const slots = []

  // Génère tous les créneaux fixes de la journée dans la plage horaire
  for (let h = SERVICE_START; h < SERVICE_END; h++) {
    for (let m = 0; m < 60; m += SLOT_INTERVAL) {
      const candidate = new Date(now)
      candidate.setHours(h, m, 0, 0)

      // Le créneau doit être suffisamment dans le futur (aujourd'hui uniquement)
      // Un créneau passé est simplement ignoré — pas de report au lendemain
      if (candidate < earliest) continue

      const slotStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
      const key = `${todayStr}|${slotStr}`
      // Exclut le créneau si places restantes = 0 (clé présente et vaut 0)
      if (key in availability && availability[key] === 0) continue
      slots.push(slotStr)
    }
  }

  const lastSlotMin = 60 - SLOT_INTERVAL
  const message = slots.length === 0
    ? `Le service est terminé pour aujourd'hui (dernier créneau : ${SERVICE_END - 1}h${String(lastSlotMin).padStart(2, '0')}). Revenez demain à partir de ${SERVICE_START}h !`
    : null

  return { available: slots.length > 0, slots, message }
}
