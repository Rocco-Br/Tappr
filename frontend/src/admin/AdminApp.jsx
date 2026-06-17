import { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AdminLogin from './AdminLogin';
import AdminDashboard from './AdminDashboard';
import axios from 'axios';

function AdminApp() {
 const [token, setToken] = useState(localStorage.getItem('adminToken'));
 const [isChecking, setIsChecking] = useState(!!localStorage.getItem('adminToken'));
 const [isValidAdmin, setIsValidAdmin] = useState(false);

 // Sync token deletion to isValidAdmin state during render
 if (!token && isValidAdmin) {
 setIsValidAdmin(false);
 }

 useEffect(() => {
 if (token) {
 axios.get(`${import.meta.env.VITE_API_URL}/api/auth/me`, {
 headers: { Authorization: `Bearer ${token}` }
 }).then(res => {
 if (res.data.role === 'ADMIN') {
 setIsValidAdmin(true);
 } else {
 localStorage.removeItem('adminToken');
 setToken(null);
 }
 }).catch(() => {
 localStorage.removeItem('adminToken');
 setToken(null);
 }).finally(() => {
 setIsChecking(false);
 });
 }
 }, [token]);

 if (isChecking) return <div className="loading">Laden...</div>;

 if (!isValidAdmin) {
 return <AdminLogin setToken={setToken} setIsValidAdmin={setIsValidAdmin} />;
 }

 return (
 <Routes>
 <Route path="*" element={<AdminDashboard token={token} setToken={setToken} />} />
 </Routes>
 );
}

export default AdminApp;
