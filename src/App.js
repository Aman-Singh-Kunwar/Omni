import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';  // Change to HashRouter
import LandingPage from './components/landing/LandingPage';
import CustomerDashboard from './components/customer/CustomerDashboard';
import BrokerDashboard from './components/broker/BrokerDashboard';
import WorkerDashboard from './components/worker/WorkerDashboard';
import './App.css';

function App() {
  return (
    <HashRouter>  {/* Wrap with HashRouter */}
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/customer" element={<CustomerDashboard />} />
        <Route path="/broker" element={<BrokerDashboard />} />
        <Route path="/worker" element={<WorkerDashboard />} />
        <Route path="*" element={<div>404 - Page Not Found</div>} />
      </Routes>
    </HashRouter>
  );
}

export default App;