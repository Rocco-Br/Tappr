import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

function AdminLiveOrders({ token }) {
  const [orders, setOrders] = useState([]);
  const [dragOverZone, setDragOverZone] = useState(false);
  const [timeTick, setTimeTick] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  
  const lastOrderIds = useRef(new Set());

  // Periodically fetch orders
  useEffect(() => {
    fetchLiveOrders();
    const interval = setInterval(() => {
      fetchLiveOrders();
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Update timers every second
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeTick(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchLiveOrders = async () => {
    try {
      const res = await axios.get('http://localhost:8000/api/admin/orders', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = res.data;
      setOrders(data);

      // Check if we should play a chime sound for new orders
      const currentIds = new Set(data.map(o => o.id));
      let hasNewOrder = false;
      for (const id of currentIds) {
        if (!lastOrderIds.current.has(id)) {
          hasNewOrder = true;
          break;
        }
      }

      if (hasNewOrder && lastOrderIds.current.size > 0 && soundEnabled) {
        playRetroBell();
      }

      lastOrderIds.current = currentIds;
    } catch (err) {
      console.error('Fout bij ophalen live bestellingen:', err);
    }
  };

  // Synthesize a retro bell chime using browser AudioContext
  const playRetroBell = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      
      // Chime note 1 (high bell pitch)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(880, ctx.currentTime); // A5
      osc1.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.12); // E6
      gain1.gain.setValueAtTime(0, ctx.currentTime);
      gain1.gain.linearRampToValueAtTime(0.25, ctx.currentTime + 0.05);
      gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start();
      osc1.stop(ctx.currentTime + 0.6);

      // Chime note 2 (harmonious undertone)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(440, ctx.currentTime); // A4
      osc2.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5
      gain2.gain.setValueAtTime(0, ctx.currentTime);
      gain2.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.08);
      gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start();
      osc2.stop(ctx.currentTime + 0.8);

    } catch (e) {
      console.error('Audio synthesizer error:', e);
    }
  };

  // Bulk prepare guest orders
  const prepareOrders = async (orderIds) => {
    try {
      await Promise.all(
        orderIds.map(id =>
          axios.post(`http://localhost:8000/api/admin/orders/${id}/prepare`, {}, {
            headers: { Authorization: `Bearer ${token}` }
          })
        )
      );
      fetchLiveOrders();
    } catch (err) {
      alert('Fout bij starten bereiding.');
    }
  };

  // Bulk complete guest orders
  const completeOrders = async (orderIds) => {
    try {
      await Promise.all(
        orderIds.map(id =>
          axios.post(`http://localhost:8000/api/admin/orders/${id}/complete`, {}, {
            headers: { Authorization: `Bearer ${token}` }
          })
        )
      );
      fetchLiveOrders();
    } catch (err) {
      alert('Fout bij afronden bestelling(en).');
    }
  };

  // Group pending orders by Guest
  const getGroupedOrders = () => {
    const groups = {};
    orders.forEach(order => {
      const key = order.guest_name || `Gast ${order.user_id}`;
      if (!groups[key]) {
        groups[key] = {
          guestName: key,
          orders: [],
          oldestCreated: order.created_at,
          has18Plus: false
        };
      }
      groups[key].orders.push(order);
      if (new Date(order.created_at) < new Date(groups[key].oldestCreated)) {
        groups[key].oldestCreated = order.created_at;
      }
      if (order.items.some(item => item.is_18_plus)) {
        groups[key].has18Plus = true;
      }
    });
    return Object.values(groups);
  };

  // Format wait timer (MM:SS)
  const formatWaitTime = (createdAtString) => {
    const diffMs = new Date() - new Date(createdAtString);
    const diffSecs = Math.max(0, Math.floor(diffMs / 1000));
    const mins = Math.floor(diffSecs / 60);
    const secs = diffSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // HTML5 Drag and Drop handlers
  const handleDragStart = (e, guestName, orderIds) => {
    e.dataTransfer.setData('text/plain', JSON.stringify({ guestName, orderIds }));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOverZone(true);
  };

  const handleDragLeave = () => {
    setDragOverZone(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOverZone(false);
    try {
      const data = JSON.parse(e.dataTransfer.getData('text/plain'));
      if (data && data.orderIds) {
        completeOrders(data.orderIds);
      }
    } catch (err) {
      console.error('Drop parsing error:', err);
    }
  };

  const grouped = getGroupedOrders();

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Settings / Top controls */}
      <div className="flex justify-between items-center bg-surface border border-border px-5 py-3 rounded-2xl shadow-sm">
        <div>
          <h2 className="text-lg font-bold">Wachtrij Bestellingen</h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {orders.length} lopende bestelling{orders.length === 1 ? '' : 'en'} verdeeld over {grouped.length} gast{grouped.length === 1 ? '' : 'en'}
          </p>
        </div>
        
        {/* Toggle Notification Sound */}
        <button
          onClick={() => {
            setSoundEnabled(!soundEnabled);
            if (!soundEnabled) playRetroBell(); // play sound once to test
          }}
          className={`flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-xl border transition-colors ${
            soundEnabled 
              ? 'bg-black text-white dark:bg-white dark:text-black border-transparent'
              : 'bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400'
          }`}
        >
          {soundEnabled ? (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path d="M10 2a6 6 0 0 0-6 6v3.586l-.707.707A1 1 0 0 0 4 14h12a1 1 0 0 0 .707-1.707L16 11.586V8a6 6 0 0 0-6-6ZM10 18a3 3 0 0 1-3-3h6a3 3 0 0 1-3 3Z" />
              </svg>
              Geluid Aan
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 opacity-50">
                <path d="M5.555 4.09A1 1 0 0 0 4.09 5.555L7.535 9H4a1 1 0 0 0-1 1v3.586l-.707.707A1 1 0 0 0 3 16h8.465l3.98 3.98a1 1 0 0 0 1.414-1.414l-11.304-11.3ZM11 18a3 3 0 0 1-3-3h6a3 3 0 0 1-3 3ZM10 2a6 6 0 0 0-6 6v1.465l11.304 11.304A6 6 0 0 0 16 8v3.586l.707.707A1 1 0 0 0 17 14V8a6 6 0 0 0-6-6Z" />
              </svg>
              Geluid Uit
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Active Queue Cards (Columns) */}
        <div className="lg:col-span-3 space-y-4">
          {grouped.length === 0 ? (
            <div className="bg-surface border border-dashed border-zinc-300 dark:border-zinc-800 rounded-3xl p-12 text-center">
              <div className="w-12 h-12 rounded-full border border-dashed border-zinc-300 dark:border-zinc-800 flex items-center justify-center mx-auto mb-4 text-zinc-400">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
              </div>
              <h3 className="font-bold text-zinc-900 dark:text-zinc-50">Helemaal Bijgewerkt!</h3>
              <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
                Er zijn momenteel geen bestellingen in behandeling.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {grouped.map(group => {
                const orderIds = group.orders.map(o => o.id);
                const isPreparing = group.orders.some(o => o.status === 'PREPARING');
                return (
                  <div
                    key={group.guestName}
                    draggable="true"
                    onDragStart={(e) => handleDragStart(e, group.guestName, orderIds)}
                    className={`bg-surface border hover:border-black dark:hover:border-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-200 cursor-grab active:cursor-grabbing flex flex-col justify-between ${
                      isPreparing 
                        ? 'border-amber-400 dark:border-amber-500 shadow-amber-50/10 dark:shadow-none' 
                        : 'border-border'
                    }`}
                  >
                    <div>
                      {/* Card Header */}
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Klant</span>
                          <h3 className="text-lg font-bold text-zinc-900 dark:text-white leading-tight flex items-center gap-1.5 flex-wrap">
                            {group.guestName}
                            {isPreparing && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400 border border-amber-100 dark:border-amber-900/30 animate-pulse">
                                Bereiden...
                              </span>
                            )}
                          </h3>
                        </div>
                        
                        {/* Wait Timer */}
                        <div className="flex flex-col items-end">
                          <span className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase">Wachttijd</span>
                          <span className="text-sm font-mono font-bold text-black dark:text-white tracking-wide">
                            {formatWaitTime(group.oldestCreated)}
                          </span>
                        </div>
                      </div>

                      {/* Items List */}
                      <div className="space-y-3 mb-6">
                        {group.orders.map(order => (
                          <div key={order.id} className="border-t border-zinc-100 dark:border-zinc-900 pt-2.5">
                            {order.items.map((item, idx) => (
                              <div key={idx} className="space-y-1">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="font-medium text-sm text-zinc-900 dark:text-zinc-100">
                                    {item.product_name}
                                  </div>
                                  {item.is_18_plus && (
                                    <span className="bg-red-50 text-red-650 dark:bg-red-950/20 dark:text-red-400 text-[9px] font-bold px-1.5 py-0.5 rounded border border-red-100 dark:border-red-900/30">
                                      18+
                                    </span>
                                  )}
                                </div>
                                
                                {/* Selected Choices */}
                                {Object.keys(item.selected_options || {}).length > 0 && (
                                  <div className="text-xs text-zinc-505 dark:text-zinc-450 pl-2 border-l border-zinc-200 dark:border-zinc-800">
                                    {Object.entries(item.selected_options).map(([k, v]) => (
                                      <div key={k}>{k}: <span className="font-semibold text-zinc-700 dark:text-zinc-300">{v}</span></div>
                                    ))}
                                  </div>
                                )}

                                {/* Remarks */}
                                {item.remark && (
                                  <div className="text-xs bg-amber-50/50 dark:bg-amber-950/10 text-amber-800 dark:text-amber-300 p-2 rounded-lg border border-amber-100/40 dark:border-amber-900/10 italic">
                                    Opmerking: "{item.remark}"
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Completion / Prep Actions */}
                    <div className="flex items-center gap-2">
                      {!isPreparing && (
                        <button
                          onClick={() => prepareOrders(orderIds)}
                          className="flex-1 bg-amber-500 hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-700 text-white py-2.5 rounded-xl text-xs font-bold transition-all text-center"
                        >
                          Start Bereiden
                        </button>
                      )}
                      <button
                        onClick={() => completeOrders(orderIds)}
                        className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all text-center ${
                          isPreparing 
                            ? 'bg-black text-white dark:bg-white dark:text-black hover:bg-zinc-900 dark:hover:bg-zinc-100'
                            : 'bg-zinc-100 text-zinc-705 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 dark:text-zinc-350'
                        }`}
                      >
                        Afronden
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Drag and Drop Afrond-Zone (Column 4) */}
        <div className="lg:col-span-1">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`min-h-[320px] rounded-3xl border-2 border-dashed flex flex-col items-center justify-center p-6 text-center transition-all duration-200 h-full ${
              dragOverZone
                ? 'bg-black text-white dark:bg-white dark:text-black border-transparent scale-[1.02] shadow-lg'
                : 'bg-zinc-50/50 dark:bg-zinc-900/10 border-zinc-300 dark:border-zinc-800 text-zinc-400'
            }`}
          >
            <div className={`w-14 h-14 rounded-full border-2 border-dashed flex items-center justify-center mb-4 transition-colors ${
              dragOverZone ? 'border-white dark:border-black text-white dark:text-black' : 'border-zinc-300 dark:border-zinc-850'
            }`}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor" className="w-7 h-7">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
            </div>
            
            <h3 className={`font-bold text-sm mb-1 transition-colors ${
              dragOverZone ? 'text-white dark:text-black' : 'text-zinc-800 dark:text-zinc-200'
            }`}>
              Afrond Zone
            </h3>
            
            <p className="text-xs text-zinc-400 dark:text-zinc-500 max-w-[150px] mx-auto leading-relaxed">
              Sleep een klantkaart hiernaartoe om deze bestellingen direct te voltooien
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}

export default AdminLiveOrders;
