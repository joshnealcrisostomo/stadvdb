import React, { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './components/layout.jsx';
import LoadingSpinner from './components/loadingSpinner.jsx';

const Dashboard = lazy(() => import('../src/pages/dashboard'));
const EnergyMix = lazy(() => import('../src/pages/energyMix'));
const PhGreenEnergy = lazy(() => import('../src/pages/phGreenEnergy'));
const PhTotalEnergy = lazy(() => import('../src/pages/phTotalEnergy'));
const RenewableVsNonRenewable = lazy(() => import('../src/pages/renewVsNon'));
const NonRenewable = lazy(() => import('../src/pages/nonRenew'));

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
