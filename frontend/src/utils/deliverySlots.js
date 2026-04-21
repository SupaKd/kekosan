// Retourne { available: bool, slots: ['11:00', '11:30', ...], message: string | null }
// Tous les paramètres sont lus depuis la DB et passés en argument
// availability = objet { 'YYYY-MM-DD|HH:MM': placesRestantes } retourné par /slot-availability
export function getAvailableSlots({
  opening_time = '11:00', closing_time = '15:00',
  // Rétrocompatibilité : si opening_time absent, construit depuis opening_hour
  opening_hour = null, closing_hour = null,
  open_days = [1, 2, 3, 4, 5],
  closed_days = [], availability = {},
  slot_interval = 30, min_delivery_delay = 30,
} = {}) {
  const parseTime = (t) => { const [h, m] = t.split(':').map(Number); return { h, m } }

  const open  = parseTime(opening_hour !== null && !opening_time ? `${opening_hour}:00` : opening_time)
  const close = parseTime(closing_hour !== null && !closing_time ? `${closing_hour}:00` : closing_time)

  const SLOT_INTERVAL = slot_interval
  const MIN_DELAY     = min_delivery_delay

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

  // Convertit l'heure d'ouverture en minutes depuis minuit pour itérer
  const openMinutes  = open.h * 60 + open.m
  const closeMinutes = close.h * 60 + close.m

  const slots = []

  for (let totalMin = openMinutes; totalMin < closeMinutes; totalMin += SLOT_INTERVAL) {
    const h = Math.floor(totalMin / 60)
    const m = totalMin % 60
    const candidate = new Date(now)
    candidate.setHours(h, m, 0, 0)

    // Le créneau doit être suffisamment dans le futur
    if (candidate < earliest) continue

    const slotStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
    const key = `${todayStr}|${slotStr}`
    // Exclut le créneau si places restantes = 0
    if (key in availability && availability[key] === 0) continue
    slots.push(slotStr)
  }

  // Dernier créneau possible = closeMinutes - SLOT_INTERVAL
  const lastMin = closeMinutes - SLOT_INTERVAL
  const lastH = Math.floor(lastMin / 60)
  const lastM = lastMin % 60
  const lastSlotStr = `${String(lastH).padStart(2, '0')}h${String(lastM).padStart(2, '0')}`

  const message = slots.length === 0
    ? `Le service est terminé pour aujourd'hui (dernier créneau : ${lastSlotStr}). Revenez demain à partir de ${opening_time} !`
    : null

  return { available: slots.length > 0, slots, message }
}
