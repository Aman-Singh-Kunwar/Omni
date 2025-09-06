import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import CustomerPage from './pages/CustomerPage';
import BrokerPage from './pages/BrokerPage';
import WorkerPage from './pages/WorkerPage';
import NotFoundPage from './pages/NotFoundPage';
import { AuthProvider } from './context/AuthContext';
import './App.css';

function App() {
    return (
    <AuthProvider>
        <Router>
            <div className="App">
            <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/customer" element={<CustomerPage />} />
                <Route path="/broker" element={<BrokerPage />} />
                <Route path="/worker" element={<WorkerPage />} />
                <Route path="*" element={<NotFoundPage />} />
            </Routes>
        </div>
        </Router>
    </AuthProvider>
    );
}

export default App;