import React from 'react';
// 1. Import HashRouter instead of BrowserRouter
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './components/landing/LandingPage';
import CustomerDashboard from './components/customer/CustomerDashboard';
import BrokerDashboard from './components/broker/BrokerDashboard';
import WorkerDashboard from './components/worker/WorkerDashboard';
import { AuthProvider } from './context/AuthContext';
import './App.css';

function App() {
  return (
    <AuthProvider>
      {/* 2. Use the imported Router (which is now HashRouter) */}
      <Router>
        <div className="App">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/customer" element={<CustomerDashboard />} />
            <Route path="/broker" element={<BrokerDashboard />} />
            <Route path="/worker" element={<WorkerDashboard />} />
            {/* A fallback route can be useful */}
            <Route path="*" element={<LandingPage />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;

