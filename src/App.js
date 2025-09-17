import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import LandingPage from './components/landing/LandingPage';
import CustomerDashboard from './components/customer/CustomerDashboard';
import BrokerDashboard from './components/broker/BrokerDashboard';
import WorkerDashboard from './components/worker/WorkerDashboard';
import { AuthProvider } from './context/AuthContext';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/customer" element={<CustomerDashboard />} />
            <Route path="/broker" element={<BrokerDashboard />} />
            <Route path="/worker" element={<WorkerDashboard />} />
            <Route path="*" element={<LandingPage />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;