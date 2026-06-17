import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import AdminApp from './admin/AdminApp';
import StoreApp from './store/StoreApp';
import './index.css';

function App() {
  const hostname = window.location.hostname;
  
  // Basic routing based on subdomain or path
  const isAdmin = hostname.includes('admin') || window.location.pathname.startsWith('/admin');

  return (
    <Router>
      <Routes>
        {isAdmin ? (
          <Route path="/*" element={<AdminApp />} />
        ) : (
          <Route path="/*" element={<StoreApp />} />
        )}
      </Routes>
    </Router>
  );
}

export default App;
