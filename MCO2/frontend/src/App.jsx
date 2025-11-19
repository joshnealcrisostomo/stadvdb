import React, { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout.jsx';

// Import your pages
const Homepage = lazy(() => import('./pages/Homepage.jsx'));
const LoginPage = lazy(() => import('./pages/LoginPage.jsx'));
const Statistics = lazy(() => import('./pages/Statistics.jsx'));
const CartPage = lazy(() => import('./pages/CartPage.jsx'));
const RestockItems = lazy(() => import('./pages/Restock.jsx'));
const RemoveItems = lazy(() => import('./pages/RemoveItems.jsx'));
const Inventory = lazy(() => import('./pages/Inventory.jsx'));

const Loading = () => <div>Loading...</div>;

function App() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        
        <Route element={<Layout />}>
          <Route path="/shop" element={<Homepage />} />
          <Route path="/statistics" element={<Statistics />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/restockItems" element={<RestockItems />} />
          <Route path="/removeItems" element={<RemoveItems />} />
          <Route path="/inventory" element={<Inventory />} />
        </Route>
        
      </Routes>
    </Suspense>
  );
}

export default App;