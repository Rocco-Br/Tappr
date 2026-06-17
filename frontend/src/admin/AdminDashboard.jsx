import { useState, useEffect } from 'react';
import axios from 'axios';
import AdminLiveOrders from './AdminLiveOrders';
import AdminEvents from './AdminEvents';
import AdminProducts from './AdminProducts';
import AdminUsers from './AdminUsers';
import AdminAgeVerifications from './AdminAgeVerifications';
import AdminInventory from './AdminInventory';

function AdminDashboard({ token, setToken }) {
 const [activeTab, setActiveTab] = useState('dashboard');
 const [activeEvent, setActiveEvent] = useState(null);
 const [isDark, setIsDark] = useState(document.documentElement.classList.contains('dark'));
 const [notifications, setNotifications] = useState([]);
 const [showNotifications, setShowNotifications] = useState(false);

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
    const fetchActiveEventAndNotifications = async () => {
      await fetchActiveEvent();
      await fetchNotifications();
    };
    fetchActiveEventAndNotifications();
    const timer = setInterval(() => {
      fetchNotifications();
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const fetchNotifications = async () => {
    if (!token) return;
    try {
      const res = await axios.get('http://localhost:8000/api/admin/notifications', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleReadNotification = async (id) => {
    try {
      await axios.post(`http://localhost:8000/api/admin/notifications/${id}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  const handleReadAllNotifications = async () => {
    try {
      await axios.post('http://localhost:8000/api/admin/notifications/read-all', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

 const handleLogout = () => {
 localStorage.removeItem('adminToken');
 setToken(null);
 };

 const tabs = [
 { id: 'dashboard', label: 'Live Bestellingen' },
 { id: 'events', label: 'Evenementen' },
 { id: 'products', label: 'Producten' },
 { id: 'inventory', label: 'Voorraad' },
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
          {/* Notification Bell */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className={`relative w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${showNotifications ? 'bg-primary text-primary-text' : 'bg-surface hover:bg-surface-hover text-muted'}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
              </svg>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-danger rounded-full border-2 border-surface flex items-center justify-center animate-pulse">
                  <span className="absolute w-full h-full rounded-full bg-danger opacity-75 animate-ping"></span>
                </span>
              )}
            </button>

            {/* Notification Dropdown */}
            {showNotifications && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)}></div>
                <div className="absolute right-0 mt-2 w-80 bg-surface border border-border rounded-2xl shadow-xl z-50 overflow-hidden animate-fade-in origin-top-right">
                  <div className="flex justify-between items-center p-4 border-b border-border bg-background">
                    <h3 className="font-bold text-primary text-sm">Notificaties</h3>
                    {unreadCount > 0 && (
                      <button onClick={handleReadAllNotifications} className="text-[10px] font-semibold text-primary hover:text-primary-hover uppercase tracking-wide">
                        Alles gelezen
                      </button>
                    )}
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-muted text-xs">Je hebt geen notificaties.</div>
                    ) : (
                      notifications.map(n => (
                        <div key={n.id} onClick={() => !n.is_read && handleReadNotification(n.id)} className={`p-4 border-b border-border last:border-b-0 cursor-pointer transition-colors hover:bg-background ${n.is_read ? 'opacity-60' : 'bg-primary/5 border-l-4 border-l-primary'}`}>
                          <div className="flex justify-between items-start gap-2">
                            <span className="text-xs font-medium text-primary">{n.message}</span>
                            {!n.is_read && <span className="w-2 h-2 bg-primary rounded-full shrink-0 mt-1"></span>}
                          </div>
                          <div className="text-[10px] text-muted mt-1">{new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

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
 {activeTab === 'inventory' && <AdminInventory token={token} />}
 {activeTab === 'users' && <AdminUsers token={token} />}
 {activeTab === 'age-verification' && <AdminAgeVerifications token={token} />}
 </main>
 </div>
 );
}

export default AdminDashboard;
