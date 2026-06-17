import React, { useState } from 'react';
import axios from 'axios';

function AdminLogin({ setToken, setIsValidAdmin }) {
 const [username, setUsername] = useState('');
 const [password, setPassword] = useState('');
 const [error, setError] = useState('');
 const [loading, setLoading] = useState(false);

 const handleSubmit = async (e) => {
 e.preventDefault();
 setError('');
 setLoading(true);
 try {
 const res = await axios.post('http://localhost:8000/api/auth/login', {
 username,
 password
 });
 if (res.data.role === 'ADMIN') {
 localStorage.setItem('adminToken', res.data.token);
 setToken(res.data.token);
 setIsValidAdmin(true);
 } else {
 setError('Alleen beheerders kunnen hier inloggen.');
 }
 } catch (err) {
 setError(err.response?.data?.error || 'Inloggen mislukt.');
 } finally {
 setLoading(false);
 }
 };

 return (
 <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12 transition-colors duration-200">
 <div className="bg-surface border border-border rounded-2xl shadow-2xl p-8 max-w-md w-full animate-fade-in">
 <div className="flex flex-col items-center mb-8">
 <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center mb-4 shadow-md">
 <span className="text-primary-text font-bold text-xl font-mono">A</span>
 </div>
 <h2 className="text-2xl font-bold tracking-tight text-primary">
 Beheerder Login
 </h2>
 <p className="text-sm text-muted mt-1">
 Bestelsysteem Admin Panel
 </p>
 </div>

 <form onSubmit={handleSubmit} className="space-y-5">
 {error && (
 <div className="text-red-500 bg-danger-bg p-3 rounded-xl text-sm border border-danger-border animate-pulse-border animate-fade-in">
 {error}
 </div>
 )}

 <div className="space-y-1">
 <label className="block text-xs font-semibold uppercase tracking-wider text-muted">
 Gebruikersnaam
 </label>
 <input type="text" value={username} onChange={e => setUsername(e.target.value)} className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:bg-surface transition-all duration-200"
 required />
 </div>

 <div className="space-y-1">
 <label className="block text-xs font-semibold uppercase tracking-wider text-muted">
 Wachtwoord
 </label>
 <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:bg-surface transition-all duration-200"
 required />
 </div>

 <button type="submit" disabled={loading}
 className="w-full bg-primary hover:bg-primary-hover text-primary-text text-primary-text py-3 rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
 >
 {loading ? 'Inloggen...' : 'Inloggen'}
 </button>
 </form>
 </div>
 </div>
 );
}

export default AdminLogin;
