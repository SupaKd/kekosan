import { useState, useCallback, useEffect } from 'react'

const STORAGE_KEY = 'kekosan_cart'

// Génère une clé unique pour identifier un item dans le panier
const itemKey = (item) => {
  if (item.type === 'formula') {
    const slotsKey = item.slots.map(s =>
      `${s.product_id}:${(s.options || []).map(o => o.product_option_id).sort().join('_')}`
    ).join('-')
    return `formula-${item.formula_id}-${slotsKey}`
  }
  const optsKey = (item.options || []).map(o => o.id).sort().join('-')
  return `product-${item.product_id}-${optsKey}`
}

const loadFromStorage = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function useCart() {
  const [items, setItems] = useState(loadFromStorage)

  // Persiste dans localStorage à chaque changement
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  }, [items])

  const addItem = useCallback((item) => {
    setItems(prev => {
      const key = itemKey(item)
      const existing = prev.find(i => itemKey(i) === key)
      if (existing) {
        return prev.map(i => itemKey(i) === key ? { ...i, quantity: i.quantity + (item.quantity ?? 1) } : i)
      }
      return [...prev, { ...item, quantity: item.quantity ?? 1, _key: key }]
    })
  }, [])

  const removeItem = useCallback((key) => {
    setItems(prev => prev.filter(i => i._key !== key))
  }, [])

  const updateQuantity = useCallback((key, qty) => {
    if (qty <= 0) {
      setItems(prev => prev.filter(i => i._key !== key))
    } else {
      setItems(prev => prev.map(i => i._key === key ? { ...i, quantity: qty } : i))
    }
  }, [])

  const clearCart = useCallback(() => setItems([]), [])

  const total = items.reduce((sum, item) => {
    if (item.type === 'formula') return sum + item.price * item.quantity
    const optsDelta = (item.options || []).reduce((s, o) => s + o.price_delta, 0)
    return sum + (item.price + optsDelta) * item.quantity
  }, 0)

  const count = items.reduce((sum, i) => sum + i.quantity, 0)

  return { items, addItem, removeItem, updateQuantity, clearCart, total, count }
}
