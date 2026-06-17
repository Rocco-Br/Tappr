import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';

function AdminUsers({ token }) {
 const [users, setUsers] = useState([]);
 const [editingUserId, setEditingUserId] = useState(null);
 const [formData, setFormData] = useState({ username: '', password: '', role: 'GUEST', is_18_plus: false });
 const [error, setError] = useState('');
 const [loading, setLoading] = useState(false);

 // Layout & Filter states
 const [viewMode, setViewMode] = useState('list'); // Default to list view as table is highly readable for users
 const [isDrawerOpen, setIsDrawerOpen] = useState(false);
 const [searchQuery, setSearchQuery] = useState('');
 const [selectedFilter, setSelectedFilter] = useState('Alle'); // 'Alle' | 'Gasten' | 'Beheerders' | '18+ Geverifieerd'

 const fetchUsers = async () => {
 try {
 const res = await axios.get('http://localhost:8000/api/admin/users', {
 headers: { Authorization: `Bearer ${token}` }
 });
 setUsers(res.data);
 } catch (err) {
 console.error(err);
 }
 };

 useEffect(() => {
 const timer = setTimeout(() => {
 fetchUsers();
 }, 0);
 return () => clearTimeout(timer);
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, []);


 const handleEdit = (user) => {
 setEditingUserId(user.id);
 setFormData({
 username: user.username,
 password: '', // leave empty unless modifying
 role: user.role,
 is_18_plus: !!user.is_18_plus
 });
 setIsDrawerOpen(true);
 };

 const handleNewUser = () => {
 setEditingUserId(null);
 setFormData({ username: '', password: '', role: 'GUEST', is_18_plus: false });
 setError('');
 setIsDrawerOpen(true);
 };

 const handleCloseDrawer = () => {
 setIsDrawerOpen(false);
 setEditingUserId(null);
 setFormData({ username: '', password: '', role: 'GUEST', is_18_plus: false });
 setError('');
 };

 const handleSubmit = async (e) => {
 e.preventDefault();
 if (!formData.username.trim()) return;
 if (!editingUserId && !formData.password.trim()) return;
 setError('');
 setLoading(true);
 try {
 if (editingUserId) {
 await axios.put(`http://localhost:8000/api/admin/users/${editingUserId}`, formData, {
 headers: { Authorization: `Bearer ${token}` }
 });
 } else {
 await axios.post('http://localhost:8000/api/admin/users', formData, {
 headers: { Authorization: `Bearer ${token}` }
 });
 }
 handleCloseDrawer();
 fetchUsers();
 } catch (err) {
 setError(err.response?.data?.error || 'Mislukt om account te verwerken');
 } finally {
 setLoading(false);
 }
 };

 const currentUserId = (() => {
 try {
 const payload = JSON.parse(atob(token.split('.')[1]));
 return payload.id;
 } catch {
 return null;
 }
 })();

 const handleDeleteUser = async (id, name) => {
 if (!window.confirm(`Weet je zeker dat je gebruiker"${name}" wilt verwijderen?`)) return;
 try {
 await axios.delete(`http://localhost:8000/api/admin/users/${id}`, {
 headers: { Authorization: `Bearer ${token}` }
 });
 fetchUsers();
 } catch (err) {
 alert(err.response?.data?.error || 'Mislukt om gebruiker te verwijderen');
 }
 };

 // Avatar helper styling
 const getAvatarStyle = (username, role) => {
 if (role === 'ADMIN') {
 return 'bg-gradient-to-tr from-zinc-900 to-zinc-700 text-primary-text';
 }
 const colors = [
 'from-blue-500 to-indigo-600 text-white',
 'from-purple-500 to-pink-600 text-white',
 'from-emerald-500 to-teal-600 text-white',
 'from-orange-500 to-amber-600 text-white',
 ];
 let hash = 0;
 for (let i = 0; i < username.length; i++) {
 hash = username.charCodeAt(i) + ((hash << 5) - hash);
 }
 const colorIndex = Math.abs(hash) % colors.length;
 return `bg-gradient-to-tr ${colors[colorIndex]}`;
 };

 const getInitials = (username) => {
 if (!username) return '?';
 const clean = username.trim();
 if (clean.length <= 2) return clean.toUpperCase();
 const parts = clean.split(/\s+/);
 if (parts.length >= 2) {
 return (parts[0][0] + parts[1][0]).toUpperCase();
 }
 return clean.substring(0, 2).toUpperCase();
 };

 // Filter & Search logic
 const filteredUsers = users.filter(u => {
 const matchesSearch = u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
 u.role.toLowerCase().includes(searchQuery.toLowerCase());
 let matchesFilter = true;
 if (selectedFilter === 'Gasten') {
 matchesFilter = u.role === 'GUEST';
 } else if (selectedFilter === 'Beheerders') {
 matchesFilter = u.role === 'ADMIN';
 } else if (selectedFilter === '18+') {
 matchesFilter = !!u.is_18_plus;
 }
 return matchesSearch && matchesFilter;
 });

 // Stats
 const totalCount = users.length;
 const guestCount = users.filter(u => u.role === 'GUEST').length;
 const adminCount = users.filter(u => u.role === 'ADMIN').length;
 const verifiedCount = users.filter(u => u.is_18_plus).length;

 return (
 <div className="space-y-6 animate-fade-in">
 {/* Premium Page Header */}
 <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-surface/80 backdrop-blur border border-border rounded-2xl p-6 shadow-sm">
 <div>
 <h1 className="text-2xl font-bold tracking-tight text-primary">Gasten & Medewerkers</h1>
 <p className="text-xs text-muted mt-1">
 Beheer actieve gasten en admin accounts. Totaal: <strong className="text-secondary">{totalCount}</strong> | Gasten: <strong className="text-secondary">{guestCount}</strong> | Beheerders: <strong className="text-secondary">{adminCount}</strong> | 18+ Geverifieerd: <strong className="text-danger">{verifiedCount}</strong>
 </p>
 </div>
 <button
 onClick={handleNewUser}
 className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-primary-text text-primary-text font-semibold text-xs px-5 py-3 rounded-xl transition-all duration-200 hover:-translate-y-0.5 shadow-md active:translate-y-0"
 >
 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor" className="w-4 h-4">
 <path strokeLinecap="round" strokeLinejoin="round" d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM3 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 9.374 21c-2.331 0-4.512-.645-6.374-1.766Z" />
 </svg>
 Gebruiker Toevoegen
 </button>
 </div>

 {/* Controls: Search, View Mode Toggle & Filter Pills */}
 <div className="space-y-4">
 <div className="flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center">
 {/* Search bar */}
 <div className="relative flex-1 max-w-md">
 <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-zinc-400">
 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
 <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.604 10.604Z" />
 </svg>
 </span>
 <input
 type="text"
 placeholder="Zoek account op naam of rol..."
 value={searchQuery}
 onChange={e => setSearchQuery(e.target.value)}
 className="w-full pl-10 pr-4 py-2.5 bg-surface border border-border rounded-xl text-xs font-medium focus:bg-surface focus:ring-1 focus:ring-primary transition-all shadow-sm"
 />
 </div>

 {/* View Toggles */}
 <div className="flex items-center gap-1 bg-surface border border-border p-0.5 rounded-xl self-end sm:self-auto shadow-sm">
 <button
 onClick={() => setViewMode('grid')}
 className={`p-2 rounded-lg transition-all duration-200 ${
 viewMode === 'grid' ? 'bg-white text-primary shadow-sm' : 'text-zinc-400 hover:text-zinc-650 0'
 }`}
 title="Rasterweergave"
 >
 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
 <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" />
 </svg>
 </button>
 <button
 onClick={() => setViewMode('list')}
 className={`p-2 rounded-lg transition-all duration-200 ${
 viewMode === 'list' ? 'bg-white text-primary shadow-sm' : 'text-zinc-400 hover:text-zinc-650 0'
 }`}
 title="Tabelweergave"
 >
 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
 <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5m-16.5-7.5h16.5m-16.5 11.25h16.5" />
 </svg>
 </button>
 </div>
 </div>

 {/* Filter pills */}
 <div className="flex gap-1.5 overflow-x-auto pb-1 max-w-full no-scrollbar">
 {[
 { id: 'Alle', label: 'Alle', count: totalCount },
 { id: 'Gasten', label: 'Gasten', count: guestCount },
 { id: 'Beheerders', label: 'Beheerders', count: adminCount },
 { id: '18+', label: '🔞 18+ Geverifieerd', count: verifiedCount }
 ].map(filter => {
 const isSelected = selectedFilter === filter.id;
 return (
 <button
 key={filter.id}
 onClick={() => setSelectedFilter(filter.id)}
 className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap shadow-sm border border-transparent ${
 isSelected ? 'bg-primary text-primary-text' : 'bg-surface text-muted hover:text-secondary border-border'
 }`}
 >
 <span>{filter.label}</span>
 <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-bold ${
 isSelected ? 'bg-zinc-800 text-zinc-200 ' : 'bg-zinc-100 text-zinc-500 '
 }`}>
 {filter.count}
 </span>
 </button>
 );
 })}
 </div>
 </div>

 {/* Main Content Area */}
 {filteredUsers.length === 0 ? (
 <div className="bg-surface border border-dashed border-border rounded-2xl p-12 text-center shadow-sm">
 <div className="w-12 h-12 rounded-full border border-dashed border-zinc-300 flex items-center justify-center mx-auto mb-4 text-zinc-400">
 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-6 h-6">
 <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.604 10.604Z" />
 </svg>
 </div>
 <h3 className="font-bold text-zinc-900">Geen accounts gevonden</h3>
 <p className="text-xs text-secondary mt-1.5">
 Probeer een andere zoekterm of pas de filterselectie aan.
 </p>
 </div>
 ) : viewMode === 'grid' ? (
 /* GRID VIEW */
 <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
 {filteredUsers.map(u => (
 <div key={u.id} className="group bg-surface border border-border rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between overflow-hidden">
 <div className="space-y-4">
 {/* Header: Avatar and Role/18+ Badges */}
 <div className="flex items-start justify-between gap-3">
 <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-sm shadow-sm transition-transform duration-300 group-hover:scale-105 ${getAvatarStyle(u.username, u.role)}`}>
 {getInitials(u.username)}
 </div>

 <div className="flex flex-col items-end gap-1.5">
 <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
 u.role === 'ADMIN'
 ? 'bg-zinc-950 text-zinc-50 border border-zinc-900 shadow-sm'
 : 'bg-zinc-100 text-zinc-700 border border-border'
 }`}>
 {u.role === 'ADMIN' ? 'Beheerder' : 'Gast'}
 </span>
 {u.is_18_plus && (
 <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-extrabold bg-red-100 text-red-750 border border-danger-border shadow-sm animate-pulse-border">
 🔞 18+
 </span>
 )}
 </div>
 </div>

 {/* Username & Last Login info */}
 <div className="space-y-1">
 <h3 className="font-bold text-base text-primary truncate" title={u.username}>
 {u.username}
 </h3>
 <div className="text-[10px] text-muted flex items-center gap-1.5">
 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3">
 <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
 </svg>
 <span>Laatste login: <strong className="font-semibold text-secondary">{u.last_login ? new Date(u.last_login).toLocaleString() : 'Nooit'}</strong></span>
 </div>
 </div>
 </div>

 {/* Action Buttons */}
 <div className="pt-4 mt-5 border-t border-zinc-50 flex gap-2">
 <button
 onClick={() => handleEdit(u)}
 className="flex-1 text-center font-semibold text-xs text-secondary bg-zinc-100 hover:bg-surface-hover py-2.5 rounded-xl transition-all shadow-sm"
 >
 Bewerken
 </button>
 {u.id !== currentUserId ? (
 <button
 onClick={() => handleDeleteUser(u.id, u.username)}
 className="flex-1 text-center font-bold text-xs text-red-600 hover:text-danger bg-red-50 hover:bg-red-100/70 py-2.5 rounded-xl border border-transparent hover:border-red-200 transition-all"
 >
 Verwijderen
 </button>
 ) : (
 <div className="flex-1 flex items-center justify-center text-xs text-secondary italic py-2.5 font-medium">
 Jij
 </div>
 )}
 </div>
 </div>
 ))}
 </div>
 ) : (
 /* LIST VIEW (TABLE) */
 <div className="bg-surface border border-border rounded-2xl overflow-hidden shadow-sm">
 <div className="overflow-x-auto">
 <table className="w-full text-left border-collapse">
 <thead>
 <tr className="border-b border-border bg-background text-muted text-xs font-semibold uppercase tracking-wider">
 <th className="px-6 py-4">Gebruiker</th>
 <th className="px-6 py-4">Rol</th>
 <th className="px-6 py-4">18+ Status</th>
 <th className="px-6 py-4">Laatste Login</th>
 <th className="px-6 py-4 text-right">Acties</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-border text-sm">
 {filteredUsers.map(u => (
 <tr key={u.id} className="hover:bg-surface-hover transition-colors">
 <td className="px-6 py-4">
 <div className="flex items-center gap-3">
 <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shadow-sm ${getAvatarStyle(u.username, u.role)}`}>
 {getInitials(u.username)}
 </div>
 <div className="font-semibold text-secondary leading-snug">
 {u.username}
 </div>
 </div>
 </td>
 <td className="px-6 py-4">
 <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
 u.role === 'ADMIN' ? 'bg-zinc-950 text-zinc-50 border border-zinc-900 shadow-sm' : 'bg-zinc-100 text-secondary border border-border'
 }`}>
 {u.role === 'ADMIN' ? 'Beheerder' : 'Gast'}
 </span>
 </td>
 <td className="px-6 py-4">
 {u.is_18_plus ? (
 <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-bold bg-red-100 text-red-750 border border-danger-border shadow-sm">
 🔞 18+ Geverifieerd
 </span>
 ) : (
 <span className="text-xs text-secondary font-medium">Niet geverifieerd</span>
 )}
 </td>
 <td className="px-6 py-4 text-muted font-medium">
 {u.last_login ? new Date(u.last_login).toLocaleString() : 'Nooit'}
 </td>
 <td className="px-6 py-4 text-right space-x-2 whitespace-nowrap">
 <button
 onClick={() => handleEdit(u)}
 className="text-xs font-semibold text-secondary px-3 py-1.5 rounded-lg border border-zinc-250 hover:bg-surface-hover transition-all duration-200"
 >
 Bewerken
 </button>
 {u.id !== currentUserId ? (
 <button
 onClick={() => handleDeleteUser(u.id, u.username)}
 className="text-xs font-semibold text-red-655 hover:text-danger px-3 py-1.5 rounded-lg border border-transparent hover:border-red-200 hover:bg-red-50/50 transition-all duration-200"
 >
 Verwijderen
 </button>
 ) : (
 <span className="text-xs text-zinc-400 italic px-3 font-medium">Jij</span>
 )}
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </div>
 )}

 {/* Slide-over Drawer implemented via React Portal */}
 {createPortal(
 <>
 {/* Drawer backdrop overlay */}
 <div onClick={handleCloseDrawer}
 className={`fixed inset-0 bg-black/40 backdrop-blur-sm z-50 transition-opacity duration-300 ${
 isDrawerOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
 }`}
 />

 {/* Drawer panel */}
 <div className={`fixed right-0 top-0 bottom-0 w-full max-w-md bg-surface z-50 shadow-2xl flex flex-col justify-between transition-transform duration-300 ease-out transform ${
 isDrawerOpen ? 'translate-x-0' : 'translate-x-full'
 }`}>
 {/* Drawer Header */}
 <div className="p-6 border-b border-border flex justify-between items-center">
 <div>
 <h2 className="text-lg font-bold tracking-tight text-primary">
 {editingUserId ? 'Gebruiker Bewerken' : 'Nieuwe Gebruiker'}
 </h2>
 <p className="text-xs text-muted mt-0.5">
 {editingUserId ? 'Wijzig accountgegevens of leeftijdverificatie' : 'Maak een nieuw gast- of medewerkersaccount aan'}
 </p>
 </div>
 <button onClick={handleCloseDrawer}
 className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-surface text-muted flex items-center justify-center transition-colors"
 >
 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor" className="w-4 h-4">
 <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
 </svg>
 </button>
 </div>

 {/* Drawer Content */}
 <div className="flex-1 overflow-y-auto p-6 space-y-6">
 <form id="drawer-user-form" onSubmit={handleSubmit} className="space-y-6">
 {error && (
 <div className="text-red-500 bg-danger-bg p-3.5 rounded-xl text-xs border border-danger-border animate-pulse-border">
 {error}
 </div>
 )}

 {/* Section 1: Algemeen */}
 <div className="space-y-4">
 <span className="text-[10px] font-extrabold text-zinc-405 0 uppercase tracking-wider block border-b border-border-subtle pb-1">Basisgegevens</span>
 {/* Username */}
 <div className="space-y-1.5">
 <label className="block text-xs font-semibold text-zinc-700">
 Gebruikersnaam
 </label>
 <input type="text" placeholder="Bijv. Tafel 12 of Medewerker_Lisa"
 value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl focus:bg-surface transition-all text-xs focus:ring-1 focus:ring-black"
 required />
 </div>

 {/* Password */}
 <div className="space-y-1.5">
 <label className="block text-xs font-semibold text-zinc-700">
 Wachtwoord {editingUserId && <span className="text-zinc-400 font-normal">(Laat leeg om niet te wijzigen)</span>}
 </label>
 <input type="password" placeholder={editingUserId ?"Nieuw wachtwoord (optioneel)" :"Wachtwoord invoeren"}
 value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl focus:bg-surface transition-all text-xs focus:ring-1 focus:ring-black"
 required={!editingUserId} />
 </div>
 </div>

 {/* Section 2: Account type / Rol */}
 <div className="space-y-4">
 <span className="text-[10px] font-extrabold text-zinc-405 0 uppercase tracking-wider block border-b border-border-subtle pb-1">Type Account & Bevoegdheden</span>
 {/* Premium Segmented Role selector */}
 <div className="space-y-2">
 <label className="block text-xs font-semibold text-zinc-705">
 Rol / Toegangsniveau
 </label>
 <div className="grid grid-cols-2 gap-1.5 p-1 bg-zinc-100 rounded-xl border border-border">
 {[
 { id: 'GUEST', label: 'Gast (Kan bestellen)' },
 { id: 'ADMIN', label: 'Beheerder (Admin Panel)' }
 ].map(r => {
 const isSelected = formData.role === r.id;
 return (
 <button
 type="button"
 key={r.id}
 onClick={() => setFormData({ ...formData, role: r.id })}
 className={`py-2 px-3 rounded-lg text-xs font-bold transition-all duration-200 text-center ${
 isSelected
 ? 'bg-white text-black shadow-sm'
 : 'text-muted hover:text-zinc-700 '
 }`}
 >
 {r.label}
 </button>
 );
 })}
 </div>
 </div>

 {/* 18+ Checkbox wrapper */}
 <div className="flex items-center gap-3 py-3.5 px-4 bg-background rounded-xl border border-border mt-3">
 <input type="checkbox" id="is_18_plus"
 checked={formData.is_18_plus} onChange={e => setFormData({...formData, is_18_plus: e.target.checked})} className="w-4 h-4 rounded border-zinc-300 text-black focus:ring-black focus:ring-offset-0 cursor-pointer"
 />
 <label htmlFor="is_18_plus" className="text-xs font-semibold text-secondary cursor-pointer select-none">
 🔞 18+ Geverifieerd (Mag alcoholische dranken bestellen)
 </label>
 </div>
 </div>

 </form>
 </div>

 {/* Drawer Sticky Footer */}
 <div className="p-6 border-t border-border flex gap-3 bg-zinc-50">
 <button
 type="button"
 onClick={handleCloseDrawer}
 className="flex-1 bg-white hover:bg-surface text-secondary py-3 rounded-xl font-bold text-xs border border-border shadow-sm transition-colors text-center"
 >
 Annuleren
 </button>
 <button
 type="submit"
 form="drawer-user-form"
 disabled={loading}
 className="flex-1 bg-primary hover:bg-primary-hover text-primary-text text-primary-text py-3 rounded-xl font-bold text-xs shadow-md transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 text-center"
 >
 {loading ? 'Opslaan...' : editingUserId ? 'Opslaan' : 'Toevoegen'}
 </button>
 </div>

 </div>
 </>,
 document.body
 )}

 </div>
 );
}

export default AdminUsers;
