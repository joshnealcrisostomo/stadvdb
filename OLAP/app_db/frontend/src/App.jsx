import React, { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './components/layout.jsx';
import LoadingSpinner from './components/loadingSpinner.jsx';

const Dashboard = lazy(() => import('./pages/dashboard.jsx'));
const EnergyMix = lazy(() => import('./pages/energyMix.jsx'));
const PhGreenEnergy = lazy(() => import('./pages/phGreenEnergy.jsx'));
const PhTotalEnergy = lazy(() => import('./pages/phTotalEnergy.jsx'));
const RenewableVsNonRenewable = lazy(() => import('./pages/renewVsNon.jsx'));
const NonRenewable = lazy(() => import('./pages/nonRenew.jsx'));

function App() {
  return (
    <Layout>
      <Suspense fallback={<LoadingSpinner />}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/energyMix" element={<EnergyMix />} />
          <Route path="/phGreenEnergy" element={<PhGreenEnergy />} />
          <Route path="/phTotalEnergy" element={<PhTotalEnergy />} />
          <Route path="/renewVsNon" element={<RenewableVsNonRenewable />} />
          <Route path="/nonRenew" element={<NonRenewable />} />
        </Routes>
      </Suspense>
    </Layout>
  );
}

export default App;
