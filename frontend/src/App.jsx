import { useState, lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import { useCart } from './hooks/useCart'
import MenuPage from './pages/MenuPage/MenuPage'
import TrackingPage from './pages/TrackingPage/TrackingPage'
import NotFoundPage from './pages/NotFoundPage/NotFoundPage'
import CheckoutModal from './components/CheckoutModal/CheckoutModal'
import IabBanner from './components/IabBanner/IabBanner'

// KitchenPage chargée en lazy — socket.io-client (~25KB) n'est pas inclus dans le bundle principal
const KitchenPage = lazy(() => import('./pages/KitchenPage/KitchenPage'))

function App() {
  const cart = useCart()
  const [checkoutOpen, setCheckoutOpen] = useState(false)

  return (
    <>
      <IabBanner />
      <Routes>
        <Route path="/" element={
          <MenuPage cart={cart} onCheckout={() => setCheckoutOpen(true)} />
        } />
        <Route path="/tracking/:token" element={<TrackingPage />} />
        <Route path="/cuisine" element={
          <Suspense fallback={null}>
            <KitchenPage />
          </Suspense>
        } />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>

      {checkoutOpen && (
        <CheckoutModal
          cart={cart}
          onClose={() => setCheckoutOpen(false)}
        />
      )}
    </>
  )
}

export default App
