import React, { useState, useEffect } from 'react';
import axios from 'axios';
import StoreLogin from './StoreLogin';

function StoreApp() {
  const [token, setToken] = useState(localStorage.getItem('storeToken'));
  const [isChecking, setIsChecking] = useState(true);
  const [isValidUser, setIsValidUser] = useState(false);
  const [username, setUsername] = useState('');
  const [is18Plus, setIs18Plus] = useState(false);
  
  const [activeEvent, setActiveEvent] = useState(null);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  
  // Search and filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Alle');
  
  // Ordering modal states
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedOptions, setSelectedOptions] = useState({});
  const [remark, setRemark] = useState('');
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [ordering, setOrdering] = useState(false);

  // Tutorial states
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(1);

  // Cooldown State (Anti-spam 30s)
  const [cooldownRemaining, setCooldownRemaining] = useState(0);

  // Check login token
  useEffect(() => {
    if (token) {
      axios.get('http://localhost:8000/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      }).then(res => {
        setIsValidUser(true);
        setUsername(res.data.username);
        setIs18Plus(!!res.data.is_18_plus);
        
        // Show tutorial if first time
        const completed = localStorage.getItem('tutorialCompleted');
        if (!completed) {
          setShowTutorial(true);
        }
      }).catch(() => {
        localStorage.removeItem('storeToken');
        setToken(null);
      }).finally(() => {
        setIsChecking(false);
      });
    } else {
      setIsChecking(false);
    }
  }, [token]);

  // Load shop data
  useEffect(() => {
    if (isValidUser) {
      fetchEventAndProducts();
      fetchOrders();

      // Poll orders and active event status (for live announcements) every 5 seconds
      const interval = setInterval(() => {
        fetchEventAndProducts();
        fetchOrders();
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [isValidUser, token]);

  // Cooldown countdown timer effect
  useEffect(() => {
    const checkCooldown = () => {
      const lastOrderTime = localStorage.getItem('lastOrderTime');
      if (lastOrderTime) {
        const elapsedMs = Date.now() - Number(lastOrderTime);
        const remainingSecs = Math.max(0, Math.ceil((30000 - elapsedMs) / 1000));
        setCooldownRemaining(remainingSecs);
      } else {
        setCooldownRemaining(0);
      }
    };

    checkCooldown();
    const interval = setInterval(checkCooldown, 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchEventAndProducts = async () => {
    try {
      const eventRes = await axios.get('http://localhost:8000/api/events/active');
      setActiveEvent(eventRes.data);

      const productsRes = await axios.get('http://localhost:8000/api/products');
      setProducts(productsRes.data);

      const meRes = await axios.get('http://localhost:8000/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setIs18Plus(!!meRes.data.is_18_plus);
    } catch (err) {
      console.error('Fout bij ophalen winkelgegevens:', err);
    }
  };

  const fetchOrders = async () => {
    try {
      const res = await axios.get('http://localhost:8000/api/orders', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOrders(res.data);
    } catch (err) {
      console.error('Fout bij ophalen bestellingen:', err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('storeToken');
    setToken(null);
    setIsValidUser(false);
  };

  // Open modal for product
  const handleOpenProduct = (product) => {
    if (product.status !== 'AVAILABLE') return;
    if (product.is_18_plus && !is18Plus) {
      alert('Dit product is alleen beschikbaar voor gasten van 18 jaar of ouder.');
      return;
    }
    if (cooldownRemaining > 0) {
      alert(`Wacht a.u.b. nog ${cooldownRemaining} seconden voor je volgende bestelling.`);
      return;
    }
    
    setSelectedProduct(product);
    setRemark('');
    setAgeConfirmed(false);
    
    // Initialize options with first choices
    const initialOptions = {};
    if (product.options && product.options.length > 0) {
      product.options.forEach(opt => {
        if (opt.choices && opt.choices.length > 0) {
          initialOptions[opt.name] = opt.choices[0];
        }
      });
    }
    setSelectedOptions(initialOptions);
  };

  // Submit Order
  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    if (!selectedProduct) return;

    if (cooldownRemaining > 0) {
      alert(`Wacht a.u.b. nog ${cooldownRemaining} seconden.`);
      return;
    }

    if (selectedProduct.is_18_plus && !is18Plus) {
      alert('Dit product is alleen beschikbaar voor gasten van 18 jaar of ouder.');
      return;
    }

    setOrdering(true);
    try {
      await axios.post('http://localhost:8000/api/orders', {
        items: [
          {
            product_id: selectedProduct.id,
            selected_options: selectedOptions,
            remark: remark
          }
        ]
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Set cooldown time
      localStorage.setItem('lastOrderTime', Date.now().toString());
      setCooldownRemaining(30);

      setSelectedProduct(null);
      fetchOrders();
    } catch (err) {
      alert(err.response?.data?.error || 'Bestelling plaatsen mislukt. Probeer het opnieuw.');
    } finally {
      setOrdering(false);
    }
  };

  // Cancel order
  const handleCancelOrder = async (orderId) => {
    if (!window.confirm('Weet je zeker dat je deze bestelling wilt annuleren?')) return;
    try {
      await axios.post(`http://localhost:8000/api/orders/${orderId}/cancel`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchOrders();
    } catch (err) {
      alert(err.response?.data?.error || 'Annuleren mislukt.');
    }
  };

  // Categories extraction
  const categories = ['Alle', ...new Set(products.map(p => p.category))];

  // Filtering
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory === 'Alle' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleCompleteTutorial = () => {
    localStorage.setItem('tutorialCompleted', 'true');
    setShowTutorial(false);
    setTutorialStep(1);
  };

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-black border-t-transparent dark:border-white dark:border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-semibold tracking-wide text-zinc-500">Winkel laden...</span>
        </div>
      </div>
    );
  }

  if (!isValidUser) {
    return <StoreLogin setToken={setToken} setIsValidUser={setIsValidUser} />;
  }

  return (
    <div className="min-h-screen bg-background text-zinc-950 dark:text-zinc-50 flex flex-col transition-colors duration-200">
      
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md border-b border-border px-4 py-3 flex justify-between items-center transition-colors">
        <div className="flex flex-col">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            {activeEvent ? activeEvent.name : 'Bestelsysteem'}
          </span>
          <span className="text-sm font-bold text-zinc-900 dark:text-white">
            Ingelogd als: {username}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Restart Tutorial Icon */}
          <button 
            onClick={() => { setShowTutorial(true); setTutorialStep(1); }} 
            className="w-8 h-8 rounded-xl flex items-center justify-center bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors text-zinc-500 dark:text-zinc-400"
            title="Bekijk Uitleg"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z" />
            </svg>
          </button>
          <button 
            onClick={handleLogout}
            className="text-xs font-medium bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-850 px-3 py-2 rounded-xl text-zinc-600 dark:text-zinc-300 transition-colors"
          >
            Uitloggen
          </button>
        </div>
      </header>

      {/* Live Mededelingen (Live Announcement Banner) */}
      {activeEvent && activeEvent.announcement && (
        <div className="bg-black text-white dark:bg-white dark:text-black px-4 py-2.5 text-center text-xs font-bold tracking-wide flex items-center justify-center gap-2 shadow-sm animate-pulse-border sticky top-[53px] z-30">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-amber-500 animate-bounce flex-shrink-0">
            <path d="M13.488 2.513a.75.75 0 0 1 1.012.114 8.5 8.5 0 0 1 0 10.746.75.75 0 0 1-1.126-.99 7 7 0 0 0 0-8.748.75.75 0 0 1 .114-1.022ZM10.84 4.755a.75.75 0 0 1 1.006.142 5 5 0 0 1 0 6.206.75.75 0 1 1-1.148-.96 3.5 3.5 0 0 0 0-4.286.75.75 0 0 1 .142-1.002ZM8.562 6.13a.75.75 0 0 1 .03 1.06 1.5 1.5 0 0 0 0 2.12.75.75 0 1 1-1.06 1.061 3 3 0 0 1 0-4.242.75.75 0 0 1 1.03-.028Z" />
            <path d="M7.003 11.003a.75.75 0 0 1 .143.22l.823 2.057a.75.75 0 0 1-.696 1.028H6.5a1.5 1.5 0 0 1-1.5-1.5v-.253a.75.75 0 0 1 .143-.443l1.86-2.109Z" />
          </svg>
          <span>MEDEDELING: {activeEvent.announcement}</span>
        </div>
      )}

      {/* Floating Cooldown Anti-spam banner */}
      {cooldownRemaining > 0 && (
        <div className="fixed top-16 left-0 right-0 z-50 max-w-xl mx-auto px-4 animate-fade-in">
          <div className="bg-black text-white dark:bg-white dark:text-black py-2.5 px-4 rounded-xl text-xs font-bold text-center shadow-lg flex items-center justify-center gap-2 border border-border">
            <span className="w-2 h-2 bg-amber-500 rounded-full animate-ping"></span>
            Spambeveiliging actief: Wacht nog {cooldownRemaining}s...
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 max-w-xl w-full mx-auto px-4 py-4 space-y-6 pb-48">
        
        {/* Active Event warning if none exists */}
        {!activeEvent && (
          <div className="bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 p-4 rounded-2xl text-center animate-fade-in">
            <h3 className="font-bold text-red-600 dark:text-red-400 text-sm mb-1">Geen actief evenement gestart</h3>
            <p className="text-xs text-red-500 dark:text-red-400/80">
              Vraag de bar of beheerder om een nieuw evenement te starten. Bestellen is nu uitgeschakeld.
            </p>
          </div>
        )}

        {activeEvent && (
          <>
            {/* Search Input */}
            <div className="relative">
              <input 
                type="text" 
                placeholder="Zoeken naar drankjes, snacks..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm text-sm focus:border-zinc-900 dark:focus:border-white focus:ring-1 focus:ring-zinc-950 transition-all placeholder:text-zinc-400"
              />
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor" className="absolute left-3.5 top-3.5 w-4 h-4 text-zinc-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.602 10.602Z" />
              </svg>
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3.5 top-3.5 text-zinc-400 hover:text-zinc-600"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                    <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                  </svg>
                </button>
              )}
            </div>

            {/* Category Pills (horizontal scrollable) */}
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-none">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap border transition-all duration-200 ${
                    selectedCategory === cat 
                      ? 'bg-black text-white dark:bg-white dark:text-black border-transparent shadow-sm'
                      : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Product Grid (Exactly 2 per row) */}
            <div className="grid grid-cols-2 gap-4">
              {filteredProducts.length === 0 ? (
                <div className="col-span-2 text-center py-12 text-zinc-400 dark:text-zinc-600 text-sm">
                  Geen producten gevonden die voldoen aan je zoekcriteria.
                </div>
              ) : (
                filteredProducts.map(p => {
                  const isAvailable = p.status === 'AVAILABLE';
                  const is18Blocked = p.is_18_plus && !is18Plus;
                  const isDisabled = !isAvailable || is18Blocked || cooldownRemaining > 0;
                  return (
                    <button
                      key={p.id}
                      onClick={() => handleOpenProduct(p)}
                      disabled={isDisabled}
                      className={`relative overflow-hidden bg-surface border rounded-2xl text-left shadow-sm flex flex-col justify-between transition-all duration-200 hover:-translate-y-1 select-none active:scale-[0.98] ${
                        p.image_url ? 'h-52' : 'h-40'
                      } ${
                        isAvailable && !is18Blocked
                          ? 'border-border opacity-100 hover:shadow-md cursor-pointer' 
                          : 'border-zinc-200/50 dark:border-zinc-800/50 opacity-50 cursor-not-allowed'
                      }`}
                    >
                      {/* Product Image Full-bleed */}
                      {p.image_url && (
                        <div className="w-full h-24 overflow-hidden border-b border-border mb-2">
                          <img 
                            src={`http://localhost:8000/uploads/${p.image_url}`} 
                            alt={p.name} 
                            className="w-full h-full object-cover" 
                          />
                        </div>
                      )}

                      {/* Product Content */}
                      <div className={`w-full flex-1 flex flex-col justify-between p-4 pt-0 ${!p.image_url ? 'pt-4' : ''}`}>
                        <div className="w-full">
                          <div className="flex justify-between items-start gap-1">
                            <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-semibold uppercase tracking-wider">
                              {p.category}
                            </span>
                            {p.is_18_plus && (
                              <span className="bg-red-50 text-red-600 dark:bg-red-950/20 dark:text-red-400 text-[9px] font-bold px-1.5 py-0.5 rounded border border-red-100 dark:border-red-900/30">
                                18+
                              </span>
                            )}
                          </div>
                          <h3 className="font-bold text-zinc-900 dark:text-white mt-1 text-sm line-clamp-2 leading-snug">
                            {p.name}
                          </h3>
                        </div>

                        {/* Product Status / Order Action */}
                        <div className="w-full flex justify-between items-center mt-2">
                          {!isAvailable ? (
                            <span className="text-xs font-semibold text-red-500 bg-red-50 dark:bg-red-950/20 px-2 py-0.5 rounded-md border border-red-150">
                              Uitverkocht
                            </span>
                          ) : is18Blocked ? (
                            <span className="text-xs font-semibold text-red-700 bg-red-50 dark:bg-red-950/20 px-2 py-0.5 rounded-md border border-red-150">
                              Alleen 18+
                            </span>
                          ) : (
                            <>
                              <span className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500">Snel bestellen</span>
                              <div className="w-7 h-7 bg-black dark:bg-white rounded-lg flex items-center justify-center text-white dark:text-black shadow-sm">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-4 h-4">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                                </svg>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </>
        )}

      </main>

      {/* Persistent Order History Overlay / Drawer at Bottom */}
      {isValidUser && (
        <div className="fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-zinc-950/95 border-t border-border z-30 shadow-2xl backdrop-blur-md max-w-xl mx-auto px-4 py-3.5 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold tracking-tight flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 bg-black dark:bg-white rounded-full"></span>
              Jouw Bestellingen
            </h3>
            <span className="text-xs text-zinc-400">
              {orders.length} {orders.length === 1 ? 'item' : 'items'}
            </span>
          </div>

          <div className="max-h-36 overflow-y-auto space-y-2 pb-1.5">
            {orders.length === 0 ? (
              <p className="text-xs text-zinc-400 dark:text-zinc-500 text-center py-4">
                Je hebt nog geen bestellingen geplaatst tijdens dit evenement.
              </p>
            ) : (
              orders.map(order => {
                const isPending = order.status === 'PENDING';
                return (
                  <div key={order.id} className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800 rounded-xl p-2.5 flex items-center justify-between gap-3 text-xs">
                    <div className="flex-1 min-w-0">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                          {item.product_name}
                          {Object.keys(item.selected_options || {}).length > 0 && (
                            <span className="font-medium text-zinc-500 dark:text-zinc-400 text-[10px] ml-1.5">
                              ({Object.entries(item.selected_options).map(([k, v]) => `${v}`).join(', ')})
                            </span>
                          )}
                        </div>
                      ))}
                      <div className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5">
                        Besteld om: {new Date(order.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        order.status === 'PENDING'
                          ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400 border border-amber-100'
                          : order.status === 'PREPARING'
                          ? 'bg-orange-50 text-orange-700 dark:bg-orange-950/20 dark:text-orange-400 border border-orange-100 animate-pulse'
                          : order.status === 'COMPLETED'
                          ? 'bg-green-50 text-green-700 dark:bg-green-950/20 dark:text-green-400 border border-green-100'
                          : 'bg-zinc-100 text-zinc-400 dark:bg-zinc-900 dark:text-zinc-500 border border-zinc-200/50'
                      }`}>
                        {order.status === 'PENDING' 
                          ? 'In bar-rij' 
                          : order.status === 'PREPARING'
                          ? 'Wordt bereid'
                          : order.status === 'COMPLETED' 
                          ? 'Afgerond' 
                          : 'Geannuleerd'}
                      </span>

                      {isPending && (
                        <button
                          onClick={() => handleCancelOrder(order.id)}
                          className="text-red-500 hover:text-red-650 dark:text-red-400 dark:hover:text-red-300 font-semibold px-2 py-1 hover:bg-red-50/50 dark:hover:bg-red-950/20 rounded-md transition-colors text-[10px]"
                        >
                          Annuleer
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Snel Bestellen Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity duration-200">
          <div className="bg-surface border border-border w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-fade-in relative max-h-[90vh] overflow-y-auto">
            {/* Close Button */}
            <button 
              onClick={() => setSelectedProduct(null)}
              className="absolute right-4 top-4 z-10 w-7 h-7 bg-black/10 hover:bg-black/20 dark:bg-white/10 dark:hover:bg-white/20 rounded-full flex items-center justify-center text-zinc-700 dark:text-zinc-200 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Product Image inside Modal Header */}
            {selectedProduct.image_url && (
              <div className="w-full h-36 overflow-hidden rounded-t-2xl -mt-6 -mx-6 mb-4 border-b border-border relative">
                <img 
                  src={`http://localhost:8000/uploads/${selectedProduct.image_url}`} 
                  alt={selectedProduct.name} 
                  className="w-full h-full object-cover" 
                />
              </div>
            )}

            {/* Modal Title */}
            <div className="mb-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                {selectedProduct.category}
              </span>
              <h2 className="text-xl font-bold tracking-tight mt-0.5 text-zinc-950 dark:text-white">
                {selectedProduct.name}
              </h2>
              {selectedProduct.description && (
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  {selectedProduct.description}
                </p>
              )}
            </div>

            {/* Static Specifications (String fields) */}
            {selectedProduct.options && selectedProduct.options.some(opt => opt.type === 'string') && (
              <div className="bg-zinc-50 dark:bg-zinc-900/40 p-3 rounded-2xl border border-border space-y-1.5 text-xs mb-4">
                <span className="font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block text-[9px]">Specificaties</span>
                {selectedProduct.options.filter(opt => opt.type === 'string').map(opt => (
                  <div key={opt.id || opt.name} className="flex justify-between">
                    <span className="text-zinc-500 dark:text-zinc-400">{opt.name}:</span>
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">{opt.choices[0]}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Order Form */}
            <form onSubmit={handlePlaceOrder} className="space-y-4">
              
              {/* Product Options */}
              {selectedProduct.options && selectedProduct.options.some(opt => opt.type !== 'string') && (
                <div className="space-y-3 pt-2">
                  {selectedProduct.options.filter(opt => opt.type !== 'string').map(opt => (
                    <div key={opt.id || opt.name} className="space-y-1.5">
                      {opt.type === 'toggle' ? (
                        <div className="flex justify-between items-center py-1.5 border-b border-zinc-100 dark:border-zinc-900 last:border-0 pb-2">
                          <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">{opt.name}</span>
                          <div className="flex bg-zinc-100 dark:bg-zinc-900 p-0.5 rounded-xl border border-zinc-200 dark:border-zinc-800">
                            {opt.choices.map(choice => {
                              const isSelected = selectedOptions[opt.name] === choice;
                              return (
                                <button
                                  type="button"
                                  key={choice}
                                  onClick={() => setSelectedOptions({...selectedOptions, [opt.name]: choice})}
                                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all duration-200 ${
                                    isSelected
                                      ? 'bg-white text-black dark:bg-zinc-800 dark:text-white shadow-sm'
                                      : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700'
                                  }`}
                                >
                                  {choice}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        // Default / select dropdown
                        <div className="space-y-1.5">
                          <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                            {opt.name}
                          </label>
                          <div className="flex flex-wrap gap-1.5">
                            {opt.choices.map(choice => {
                              const isSelected = selectedOptions[opt.name] === choice;
                              return (
                                <button
                                  type="button"
                                  key={choice}
                                  onClick={() => setSelectedOptions({...selectedOptions, [opt.name]: choice})}
                                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all duration-200 ${
                                    isSelected
                                      ? 'bg-black text-white dark:bg-white dark:text-black border-transparent'
                                      : 'bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400'
                                  }`}
                                >
                                  {choice}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Special Remarks Textarea */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                  Opmerking (Optioneel)
                </label>
                <textarea 
                  placeholder="Bijv. Extra ijs, Geen ketchup..."
                  value={remark}
                  onChange={e => setRemark(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:bg-white dark:focus:bg-zinc-900 transition-all text-xs h-16 resize-none"
                />
              </div>

              {/* 18+ Age Info Notice */}
              {selectedProduct.is_18_plus && (
                <div className="bg-red-55/40 dark:bg-red-950/20 border border-red-100 dark:border-red-900/35 p-2.5 rounded-2xl text-center">
                  <span className="text-[10px] font-bold text-red-650 dark:text-red-400 uppercase tracking-wider flex items-center justify-center gap-1.5">
                    🔞 18+ Product — Legitimitatie kan worden gevraagd
                  </span>
                </div>
              )}

              {/* Place Order Button */}
              <button 
                type="submit"
                disabled={ordering || cooldownRemaining > 0}
                className="w-full bg-black hover:bg-zinc-900 dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-black py-3 rounded-2xl font-bold tracking-wide shadow-md transition-all hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-40 disabled:cursor-not-allowed text-xs uppercase"
              >
                {ordering 
                  ? 'Verwerken...' 
                  : cooldownRemaining > 0 
                  ? `Wacht ${cooldownRemaining}s...` 
                  : 'Nu Bestellen (Direct)'}
              </button>

            </form>
          </div>
        </div>
      )}

      {/* Interactive Custom Onboarding Tutorial */}
      {showTutorial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md transition-opacity">
          <div className="bg-surface border border-border w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-fade-in relative">
            
            {/* Tutorial Header */}
            <div className="flex justify-between items-center mb-4">
              <span className="text-xs font-semibold text-zinc-400 dark:text-zinc-500">
                Stap {tutorialStep} van 4
              </span>
              <button 
                onClick={handleCompleteTutorial}
                className="text-xs font-semibold text-zinc-400 hover:text-zinc-600"
              >
                Overslaan
              </button>
            </div>

            {/* Tutorial Steps Content */}
            <div className="min-h-48 flex flex-col justify-center text-center space-y-4">
              {tutorialStep === 1 && (
                <>
                  <div className="text-3xl font-bold">🍻 Welkom!</div>
                  <h3 className="font-bold text-base mt-2">Leuk dat je er bent</h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                    Welkom in de bestelomgeving van <strong>{activeEvent ? activeEvent.name : 'ons evenement'}</strong>. In deze korte rondleiding leggen we je uit hoe je bestelt.
                  </p>
                </>
              )}

              {tutorialStep === 2 && (
                <>
                  <div className="text-3xl font-bold">🔍 Zoeken & Filters</div>
                  <h3 className="font-bold text-base mt-2">Vind snel wat je wilt</h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                    Gebruik de zoekbalk bovenaan of tik op de categorieën (Fris, Snack, Bier) om snel door het assortiment te bladeren.
                  </p>
                </>
              )}

              {tutorialStep === 3 && (
                <>
                  <div className="text-3xl font-bold">⚡ Snel Bestellen</div>
                  <h3 className="font-bold text-base mt-2">Geen winkelwagen!</h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                    Tik op een product, geef je specifieke wensen door (saus, extra ijs) en druk direct op <strong>Bestellen</strong>. Je bestelling wordt direct verstuurd naar de bar!
                  </p>
                </>
              )}

              {tutorialStep === 4 && (
                <>
                  <div className="text-3xl font-bold">🕒 Status & Annuleren</div>
                  <h3 className="font-bold text-base mt-2">Houd de bar-rij in de gaten</h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                    Onderaan het scherm zie je de status van je bestelling. Zolang de status op "In bar-rij" staat en het barpersoneel er nog niet mee bezig is, kun je jouw bestelling annuleren.
                  </p>
                </>
              )}
            </div>

            {/* Tutorial Navigation */}
            <div className="flex gap-2.5 mt-6">
              {tutorialStep > 1 && (
                <button
                  onClick={() => setTutorialStep(prev => prev - 1)}
                  className="flex-1 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-850 dark:text-zinc-100 font-semibold py-2.5 rounded-xl text-xs transition-colors"
                >
                  Terug
                </button>
              )}
              {tutorialStep < 4 ? (
                <button
                  onClick={() => setTutorialStep(prev => prev + 1)}
                  className="flex-1 bg-black hover:bg-zinc-900 dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-black font-semibold py-2.5 rounded-xl text-xs transition-colors"
                >
                  Volgende
                </button>
              ) : (
                <button
                  onClick={handleCompleteTutorial}
                  className="flex-1 bg-black hover:bg-zinc-900 dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-black font-semibold py-2.5 rounded-xl text-xs transition-colors"
                >
                  Begrepen!
                </button>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

export default StoreApp;
