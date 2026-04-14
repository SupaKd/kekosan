import { useState, useEffect, useCallback } from 'react'
import { getCatalog, getFormulas } from '../api/products'

export function useCatalog() {
  const [catalog, setCatalog] = useState({})
  const [formulas, setFormulas] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    const [catalogData, formulasData] = await Promise.all([getCatalog(), getFormulas()])
    setCatalog(catalogData)
    setFormulas(formulasData)
  }, [])

  useEffect(() => {
    load()
      .catch(() => setError('Impossible de charger le menu.'))
      .finally(() => setLoading(false))
  }, [load])

  const refresh = useCallback(() => load().catch(() => {}), [load])

  return { catalog, formulas, loading, error, refresh }
}
