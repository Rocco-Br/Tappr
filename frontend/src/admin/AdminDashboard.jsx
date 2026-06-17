import { useState, useEffect } from 'react';
import axios from 'axios';
import AdminLiveOrders from './AdminLiveOrders';
import AdminEvents from './AdminEvents';
import AdminProducts from './AdminProducts';
import AdminUsers from './AdminUsers';
import AdminAgeVerifications from './AdminAgeVerifications';

function AdminDashboard({ token, setToken }) {
 const [activeTab, setActiveTab] = useState('dashboard');
 const [activeEvent, setActiveEvent] = useState(null);
 const [isDark, setIsDark] = useState(document.documentElement.classList.contains('dark'));

 const toggleDarkMode = () => {
 const nextIsDark = !isDark;
 setIsDark(nextIsDark);
 if (nextIsDark) {
 document.documentElement.classList.add('dark');
 localStorage.setItem('theme', 'dark');
 } else {
 document.documentElement.classList.remove('dark');
 localStorage.setItem('theme', 'light');
 }
 };

 const fetchActiveEvent = async () => {
 try {
 const res = await axios.get('http://localhost:8000/api/events/active');
 setActiveEvent(res.data);
 } catch (err) {
 console.error(err);
 }
 };

 useEffect(() => {
 const timer = setTimeout(() => {
 fetchActiveEvent();
 }, 0);
 return () => clearTimeout(timer);
 }, []);

 const handleLogout = () => {
 localStorage.removeItem('adminToken');
 setToken(null);
 };

 const tabs = [
 { id: 'dashboard', label: 'Live Bestellingen' },
 { id: 'events', label: 'Evenementen' },
 { id: 'products', label: 'Producten' },
 { id: 'users', label: 'Gasten' },
 { id: 'age-verification', label: '18+ Verzoeken' },
 ];

 return (
 <div className="min-h-screen bg-background text-primary flex flex-col transition-colors duration-200">
 {/* Navigation Header */}
 <nav className="sticky top-0 z-50 bg-surface backdrop-blur-md border-b border-border transition-colors duration-200">
 <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
 <div className="flex justify-between h-16 items-center">
 <div className="flex items-center gap-3">
 <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-sm">
 <span className="text-primary-text font-bold text-sm font-mono">A</span>
 </div>
 <div>
 <span className="font-bold text-lg tracking-tight">Admin Panel</span>
 {activeEvent ? (
 <span className="ml-2 text-xs px-2 py-0.5 bg-surface border border-border rounded-full font-medium text-muted">
 {activeEvent.name}
 </span>
 ) : (
 <span className="ml-2 text-xs px-2 py-0.5 bg-danger-bg border border-danger-border rounded-full font-medium text-danger">
 Geen actief event
 </span>
 )}
 </div>
 </div>
 <div className="flex items-center gap-2">
 <button
 onClick={toggleDarkMode}
 className="w-8 h-8 rounded-xl flex items-center justify-center bg-surface hover:bg-surface-hover transition-colors text-muted"
 title={isDark ?"Lichte modus" :"Donkere modus"}
 >
 {isDark ? (
 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor" className="w-4 h-4">
 <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m0 13.5V21M5.197 5.197l1.591 1.591M17.213 17.213l1.591 1.591M3 12h2.25m13.5 0H21M5.197 18.803l1.591-1.591M17.213 6.787l1.591-1.591M12 7.5a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9Z" />
 </svg>
 ) : (
 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor" className="w-4 h-4">
 <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" />
 </svg>
 )}
 </button>
 <button onClick={handleLogout} className="text-xs bg-surface hover:bg-surface-hover text-secondary font-medium px-3.5 py-2 rounded-xl transition-all duration-200"
 >
 Uitloggen
 </button>
 </div>
 </div>
 </div>

 {/* Tab Links */}
 <div className="border-t border-border-subtle">
 <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
 <div className="flex space-x-8 -mb-px overflow-x-auto">
 {tabs.map(tab => (
 <button
 key={tab.id}
 onClick={() => setActiveTab(tab.id)}
 className={`py-3.5 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-all duration-200 ${
 activeTab === tab.id
 ? 'border-primary text-primary'
 : 'border-transparent text-muted hover:text-secondary'
 }`}
 >
 {tab.label}
 </button>
 ))}
 </div>
 </div>
 </div>
 </nav>

 {/* Main Content Area */}
 <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
 {activeTab === 'dashboard' && <AdminLiveOrders token={token} />}
 {activeTab === 'events' && (
 <AdminEvents token={token} activeEvent={activeEvent} fetchActiveEvent={fetchActiveEvent} />
 )}
 {activeTab === 'products' && <AdminProducts token={token} />}
 {activeTab === 'users' && <AdminUsers token={token} />}
 {activeTab === 'age-verification' && <AdminAgeVerifications token={token} />}
 </main>
 </div>
 );
}

export default AdminDashboard;
