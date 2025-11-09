import React, { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout.jsx';

// Import your pages
const Homepage = lazy(() => import('./pages/Homepage.jsx'));
const LoginPage = lazy(() => import('./pages/LoginPage.jsx'));

const Loading = () => <div>Loading...</div>;

function App() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        
        <Route element={<Layout />}>
          <Route path="/shop" element={<Homepage />} />
        </Route>
        
      </Routes>
    </Suspense>
  );
}

export default App;