import React, { useState, useEffect } from 'react';
import axios from 'axios';
import AdminLiveOrders from './AdminLiveOrders';
import AdminEvents from './AdminEvents';
import AdminProducts from './AdminProducts';
import AdminUsers from './AdminUsers';

function AdminDashboard({ token, setToken }) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [activeEvent, setActiveEvent] = useState(null);

  useEffect(() => {
    fetchActiveEvent();
  }, []);

  const fetchActiveEvent = async () => {
    try {
      const res = await axios.get('http://localhost:8000/api/events/active');
      setActiveEvent(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    setToken(null);
  };

  const tabs = [
    { id: 'dashboard', label: 'Live Bestellingen' },
    { id: 'events', label: 'Evenementen' },
    { id: 'products', label: 'Producten' },
    { id: 'users', label: 'Gasten' },
  ];

  return (
    <div className="min-h-screen bg-background text-zinc-900 dark:text-zinc-50 flex flex-col transition-colors duration-200">
      {/* Navigation Header */}
      <nav className="sticky top-0 z-50 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md border-b border-border transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-black dark:bg-white rounded-lg flex items-center justify-center shadow-sm">
                <span className="text-white dark:text-black font-bold text-sm font-mono">A</span>
              </div>
              <div>
                <span className="font-bold text-lg tracking-tight">Admin Panel</span>
                {activeEvent ? (
                  <span className="ml-2 text-xs px-2 py-0.5 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-full font-medium text-zinc-500 dark:text-zinc-400">
                    {activeEvent.name}
                  </span>
                ) : (
                  <span className="ml-2 text-xs px-2 py-0.5 bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/30 rounded-full font-medium text-red-500 dark:text-red-400">
                    Geen actief event
                  </span>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button 
                onClick={handleLogout} 
                className="text-xs bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium px-3.5 py-2 rounded-xl transition-all duration-200"
              >
                Uitloggen
              </button>
            </div>
          </div>
        </div>

        {/* Tab Links */}
        <div className="border-t border-zinc-100 dark:border-zinc-900">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex space-x-8 -mb-px overflow-x-auto">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-3.5 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-all duration-200 ${
                    activeTab === tab.id
                      ? 'border-black dark:border-white text-zinc-900 dark:text-white'
                      : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
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
          <AdminEvents 
            token={token} 
            activeEvent={activeEvent} 
            fetchActiveEvent={fetchActiveEvent} 
          />
        )}
        {activeTab === 'products' && <AdminProducts token={token} />}
        {activeTab === 'users' && <AdminUsers token={token} />}
      </main>
    </div>
  );
}

export default AdminDashboard;
