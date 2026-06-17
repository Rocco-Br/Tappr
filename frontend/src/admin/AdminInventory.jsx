import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

function AdminInventory({ token }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  
  // Debounce timers
  const timers = useRef({});

  const fetchProducts = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/admin/products`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Sort so OUT_OF_STOCK is at the bottom, otherwise alphabetical
      const sorted = res.data.sort((a, b) => {
        if (a.status === 'OUT_OF_STOCK' && b.status !== 'OUT_OF_STOCK') return 1;
        if (a.status !== 'OUT_OF_STOCK' && b.status === 'OUT_OF_STOCK') return -1;
        return a.name.localeCompare(b.name);
      });
      setProducts(sorted);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveStock = async (id, amount, unit) => {
    setSavingId(id);
    try {
      await axios.put(`${import.meta.env.VITE_API_URL}/api/admin/products/${id}/stock`, {
        stock_amount: amount,
        stock_unit: unit
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (err) {
      alert('Voorraad opslaan mislukt.');
    } finally {
      setTimeout(() => setSavingId(null), 500); // UI feedback
    }
  };

  const handleStockChange = (id, field, value) => {
    setProducts(prev => prev.map(p => {
      if (p.id === id) {
        const updated = { ...p, [field]: value };
        
        // Auto-save logic with debounce
        if (timers.current[id]) clearTimeout(timers.current[id]);
        timers.current[id] = setTimeout(() => {
          saveStock(id, updated.stock_amount, updated.stock_unit);
        }, 800); // save 800ms after user stops typing
        
        return updated;
      }
      return p;
    }));
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const activeProducts = products.filter(p => p.status !== 'HIDDEN');

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-surface border border-border px-6 py-5 rounded-2xl shadow-sm">
        <h2 className="text-xl font-bold text-primary">Voorraad Beheer</h2>
        <p className="text-sm text-muted mt-1">
          Houd hier je inventaris bij. Vul een getal in en selecteer een eenheid. Wijzigingen worden automatisch opgeslagen tijdens het typen. Laat het veld leeg als je de voorraad van dit product niet wilt bijhouden.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {activeProducts.map(p => (
          <div key={p.id} className="bg-surface border border-border rounded-2xl overflow-hidden shadow-sm flex flex-col transition-all hover:border-primary-hover relative group">
            
            {savingId === p.id && (
              <div className="absolute top-2 right-2 z-10 bg-success text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-md animate-fade-in">
                Opgeslagen
              </div>
            )}

            <div className="h-32 bg-background relative border-b border-border">
              {p.image_url ? (
                <img 
                  src={`${import.meta.env.VITE_API_URL}/uploads/${p.image_url}`} 
                  alt={p.name} 
                  className={`w-full h-full object-cover ${p.status === 'OUT_OF_STOCK' ? 'grayscale opacity-50' : ''}`}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted text-xs">Geen foto</div>
              )}
              {p.status === 'OUT_OF_STOCK' && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                  <span className="bg-danger text-white font-bold text-xs px-3 py-1 rounded-full uppercase tracking-widest shadow-lg">Uitverkocht</span>
                </div>
              )}
            </div>

            <div className="p-4 flex-1 flex flex-col">
              <h3 className="font-bold text-primary text-sm line-clamp-1 mb-3">{p.name}</h3>
              
              <div className="mt-auto flex gap-2">
                <input
                  type="number"
                  min="0"
                  placeholder="∞"
                  value={p.stock_amount !== null && p.stock_amount !== undefined ? p.stock_amount : ''}
                  onChange={(e) => handleStockChange(p.id, 'stock_amount', e.target.value)}
                  className="w-1/2 bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors text-primary"
                />
                <div className="relative w-1/2">
                  <select
                    value={p.stock_unit || 'stuks'}
                    onChange={(e) => handleStockChange(p.id, 'stock_unit', e.target.value)}
                    className="w-full appearance-none bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors text-primary"
                  >
                    <option value="stuks">Stuks</option>
                    <option value="ml">ml</option>
                    <option value="cl">cl</option>
                    <option value="gram">Gram</option>
                    <option value="kg">Kg</option>
                    <option value="liter">Liter</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-muted">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default AdminInventory;
