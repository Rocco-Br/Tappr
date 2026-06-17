import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';

function AdminProducts({ token }) {
  const [products, setProducts] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    is_18_plus: false,
    status: 'AVAILABLE',
    image_url: '',
    options: [] // [{ name: '', type: 'select', choices: [] }]
  });
  
  const [editingProductId, setEditingProductId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Layout & filter states
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Alle');
  const [dragOver, setDragOver] = useState(false);

  const fetchProducts = async () => {
    try {
      const res = await axios.get('http://localhost:8000/api/admin/products', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProducts(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProducts();
    }, 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const uploadFile = async (file) => {
    const data = new FormData();
    data.append('image', file);

    setUploading(true);
    try {
      const res = await axios.post('http://localhost:8000/api/admin/products/upload', data, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`
        }
      });
      setFormData(prev => ({ ...prev, image_url: res.data.filename }));
    } catch (err) {
      console.error(err);
      alert('Afbeelding uploaden mislukt. Probeer een kleiner bestand.');
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    await uploadFile(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      await uploadFile(file);
    }
  };

  const triggerFileInput = () => {
    document.getElementById('product-image-file').click();
  };

  const handleEdit = (product) => {
    setEditingProductId(product.id);
    setFormData({
      name: product.name,
      description: product.description || '',
      category: product.category,
      is_18_plus: product.is_18_plus,
      status: product.status,
      image_url: product.image_url || '',
      options: product.options ? product.options.map(opt => ({
        name: opt.name,
        type: opt.type || 'select',
        choices: opt.choices || []
      })) : []
    });
    setIsDrawerOpen(true);
  };

  const handleNewProduct = () => {
    setEditingProductId(null);
    setFormData({
      name: '',
      description: '',
      category: '',
      is_18_plus: false,
      status: 'AVAILABLE',
      image_url: '',
      options: []
    });
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setEditingProductId(null);
    setFormData({
      name: '',
      description: '',
      category: '',
      is_18_plus: false,
      status: 'AVAILABLE',
      image_url: '',
      options: []
    });
    const fileInput = document.getElementById('product-image-file');
    if (fileInput) fileInput.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.category.trim()) return;
    
    setLoading(true);
    try {
      const optionsArray = formData.options.map(opt => {
        let choices;
        if (opt.type === 'string') {
          choices = [opt.choices[0] || ''];
        } else if (opt.type === 'toggle') {
          choices = [
            opt.choices[0] || 'Ja',
            opt.choices[1] || 'Nee'
          ];
        } else { // select
          choices = opt.choices.map(c => c.trim()).filter(Boolean);
        }
        return {
          name: opt.name.trim(),
          type: opt.type,
          choices: choices
        };
      }).filter(opt => opt.name);

      const payload = {
        name: formData.name,
        description: formData.description,
        category: formData.category,
        is_18_plus: formData.is_18_plus,
        status: formData.status,
        image_url: formData.image_url,
        options: optionsArray
      };

      if (editingProductId) {
        await axios.put(`http://localhost:8000/api/admin/products/${editingProductId}`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        await axios.post('http://localhost:8000/api/admin/products', payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }

      handleCloseDrawer();
      fetchProducts();
    } catch (err) {
      console.error(err);
      alert(editingProductId ? 'Product wijzigen mislukt.' : 'Product toevoegen mislukt.');
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = async (product) => {
    const newStatus = product.status === 'AVAILABLE' ? 'OUT_OF_STOCK' : 'AVAILABLE';
    try {
      await axios.put(`http://localhost:8000/api/admin/products/${product.id}`, { ...product, status: newStatus }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchProducts();
    } catch (err) {
      console.error(err);
    }
  };

  // Option Helper Functions
  const handleAddOption = () => {
    setFormData(prev => ({
      ...prev,
      options: [...prev.options, { name: '', type: 'select', choices: [] }]
    }));
  };

  const handleRemoveOption = (index) => {
    setFormData(prev => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== index)
    }));
  };

  const handleOptionChange = (index, key, value) => {
    setFormData(prev => {
      const updatedOptions = [...prev.options];
      updatedOptions[index] = { ...updatedOptions[index], [key]: value };
      
      if (key === 'type') {
        if (value === 'string') {
          updatedOptions[index].choices = [''];
        } else if (value === 'toggle') {
          updatedOptions[index].choices = ['Ja', 'Nee'];
        } else {
          updatedOptions[index].choices = [];
        }
      }
      return { ...prev, options: updatedOptions };
    });
  };

  const handleStringValueChange = (index, value) => {
    setFormData(prev => {
      const updatedOptions = [...prev.options];
      updatedOptions[index].choices = [value];
      return { ...prev, options: updatedOptions };
    });
  };

  const handleToggleValueChange = (index, choiceIndex, value) => {
    setFormData(prev => {
      const updatedOptions = [...prev.options];
      const newChoices = [...(updatedOptions[index].choices || [])];
      newChoices[choiceIndex] = value;
      updatedOptions[index].choices = newChoices;
      return { ...prev, options: updatedOptions };
    });
  };

  const handleSelectChoicesChange = (index, value) => {
    setFormData(prev => {
      const updatedOptions = [...prev.options];
      updatedOptions[index].choices = value.split(',').map(c => c.trimStart());
      return { ...prev, options: updatedOptions };
    });
  };

  // Filtering
  const categories = ['Alle', ...new Set(products.map(p => p.category).filter(Boolean))];

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
                          p.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'Alle' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Premium Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-surface/80 backdrop-blur border border-border rounded-2xl p-6 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Menukaart Beheer</h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Beheer producten en hun opties. Totaal: <strong className="text-zinc-900 dark:text-zinc-100">{products.length}</strong> | Beschikbaar: <strong className="text-green-600 dark:text-green-400">{products.filter(p => p.status === 'AVAILABLE').length}</strong>
          </p>
        </div>
        
        <button
          onClick={handleNewProduct}
          className="flex items-center gap-2 bg-black hover:bg-zinc-900 dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-black font-semibold text-xs px-5 py-3 rounded-xl transition-all duration-200 hover:-translate-y-0.5 shadow-md active:translate-y-0"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Product Toevoegen
        </button>
      </div>

      {/* Controls: Search, View Mode Toggle & Category Pills */}
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
              placeholder="Zoek product op naam, omschrijving of categorie..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-surface border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-medium focus:bg-surface dark:focus:bg-zinc-900 focus:ring-1 focus:ring-black dark:focus:ring-white transition-all shadow-sm"
            />
          </div>

          {/* View Toggles */}
          <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-0.5 rounded-xl self-end sm:self-auto shadow-sm">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-all duration-200 ${
                viewMode === 'grid' 
                  ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm' 
                  : 'text-zinc-400 hover:text-zinc-650 dark:text-zinc-500'
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
                viewMode === 'list' 
                  ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm' 
                  : 'text-zinc-400 hover:text-zinc-650 dark:text-zinc-500'
              }`}
              title="Tabelweergave"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5m-16.5-7.5h16.5m-16.5 11.25h16.5" />
              </svg>
            </button>
          </div>
        </div>

        {/* Category filters */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 max-w-full no-scrollbar">
          {categories.map(cat => {
            const isSelected = selectedCategory === cat;
            const count = cat === 'Alle' ? products.length : products.filter(p => p.category === cat).length;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap shadow-sm border border-transparent ${
                  isSelected 
                    ? 'bg-black text-white dark:bg-white dark:text-black' 
                    : 'bg-surface text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 border-zinc-200 dark:border-zinc-800'
                }`}
              >
                <span>{cat}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-bold ${
                  isSelected 
                    ? 'bg-zinc-800 text-zinc-200 dark:bg-zinc-200 dark:text-zinc-800' 
                    : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      {filteredProducts.length === 0 ? (
        <div className="bg-surface border border-dashed border-zinc-300 dark:border-zinc-850 rounded-2xl p-12 text-center shadow-sm">
          <div className="w-12 h-12 rounded-full border border-dashed border-zinc-300 dark:border-zinc-800 flex items-center justify-center mx-auto mb-4 text-zinc-400">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.604 10.604Z" />
            </svg>
          </div>
          <h3 className="font-bold text-zinc-900 dark:text-zinc-100">Geen producten gevonden</h3>
          <p className="text-xs text-zinc-400 dark:text-zinc-550 mt-1.5">
            Probeer een andere zoekterm of selecteer een andere categorie.
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        /* GRID VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredProducts.map(p => (
            <div key={p.id} className="group bg-surface border border-border rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between overflow-hidden">
              <div>
                {/* Image & status badges container */}
                <div className="h-44 overflow-hidden relative bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-900">
                  {p.image_url ? (
                    <img 
                      src={`http://localhost:8000/uploads/${p.image_url}`} 
                      alt={p.name}
                      className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-zinc-300 dark:text-zinc-800">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-12 h-12">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                      </svg>
                      <span className="text-[10px] uppercase font-bold tracking-wider mt-1.5 font-mono">Geen Foto</span>
                    </div>
                  )}

                  {/* Status Badges */}
                  <div className="absolute top-3 left-3 flex gap-1.5 z-10">
                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${
                      p.status === 'AVAILABLE'
                        ? 'bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-405 border-green-100 dark:border-green-900/30 shadow-sm'
                        : 'bg-red-50 text-red-750 dark:bg-red-950/40 dark:text-red-405 border-red-100 dark:border-red-900/30'
                    }`}>
                      {p.status === 'AVAILABLE' ? 'Beschikbaar' : 'Uitverkocht'}
                    </span>
                  </div>

                  {/* Age restriction badge */}
                  {p.is_18_plus && (
                    <div className="absolute top-3 right-3 z-10">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-extrabold bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400 border border-red-200 dark:border-red-900/40 shadow-sm">
                        18+
                      </span>
                    </div>
                  )}
                </div>

                {/* Card Body */}
                <div className="p-4 space-y-2">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 block">
                    {p.category}
                  </span>
                  <div>
                    <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-50 leading-snug">{p.name}</h3>
                    {p.description && (
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-2">{p.description}</p>
                    )}
                  </div>

                  {/* Custom Fields Tags */}
                  {p.options && p.options.length > 0 && (
                    <div className="pt-2.5 border-t border-zinc-100 dark:border-zinc-900 flex flex-wrap gap-1.5">
                      {p.options.map(opt => {
                        let badgeStyle;
                        if (opt.type === 'string') {
                          badgeStyle = 'bg-zinc-50 dark:bg-zinc-900/50 text-zinc-650 dark:text-zinc-400 border-zinc-200/50 dark:border-zinc-800';
                        } else if (opt.type === 'toggle') {
                          badgeStyle = 'bg-blue-50/40 dark:bg-blue-950/10 text-blue-600 dark:text-blue-400 border-blue-100/30 dark:border-blue-900/10';
                        } else {
                          badgeStyle = 'bg-indigo-50/40 dark:bg-indigo-950/10 text-indigo-600 dark:text-indigo-400 border-indigo-100/30 dark:border-indigo-900/10';
                        }
                        return (
                          <div 
                            key={opt.id} 
                            className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold border ${badgeStyle}`}
                            title={`${opt.type.toUpperCase()}: ${opt.name}`}
                          >
                            <span className="font-bold">{opt.name}</span>
                            <span className="opacity-40 font-normal">|</span>
                            <span className="opacity-80">
                              {opt.type === 'string' ? opt.choices[0] : `${opt.choices.length} opties`}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="px-4 pb-4 pt-2 border-t border-zinc-50 dark:border-zinc-900 flex gap-2">
                <button
                  onClick={() => handleEdit(p)}
                  className="flex-1 text-center font-semibold text-xs text-zinc-700 dark:text-zinc-350 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-850 py-2 rounded-xl transition-all shadow-sm"
                >
                  Bewerken
                </button>
                <button
                  onClick={() => toggleStatus(p)}
                  className={`flex-1 text-center font-bold text-xs py-2 rounded-xl border transition-all ${
                    p.status === 'AVAILABLE'
                      ? 'bg-surface text-zinc-700 hover:bg-background dark:text-zinc-300 border-zinc-200 dark:border-zinc-800 shadow-sm'
                      : 'bg-black text-white hover:bg-zinc-900 dark:bg-white dark:text-black dark:hover:bg-zinc-100 border-transparent shadow-md'
                  }`}
                >
                  {p.status === 'AVAILABLE' ? 'Zet op Op' : 'Zet op Beschikbaar'}
                </button>
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
                <tr className="border-b border-border bg-zinc-50/50 dark:bg-zinc-900/30 text-zinc-500 dark:text-zinc-400 text-xs font-semibold uppercase tracking-wider">
                  <th className="px-6 py-4">Product</th>
                  <th className="px-6 py-4">Categorie</th>
                  <th className="px-6 py-4">Custom Velden</th>
                  <th className="px-6 py-4">18+</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Acties</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900 text-sm">
                {filteredProducts.map(p => (
                  <tr key={p.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/10 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {p.image_url ? (
                          <img 
                            src={`http://localhost:8000/uploads/${p.image_url}`} 
                            alt={p.name}
                            className="w-10 h-10 object-cover rounded-lg border border-border"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-zinc-100 dark:bg-zinc-900 border border-border rounded-lg flex items-center justify-center text-[10px] font-bold text-zinc-400 font-mono">
                            GEEN
                          </div>
                        )}
                        <div>
                          <div className="font-semibold text-zinc-900 dark:text-zinc-100 leading-snug">{p.name}</div>
                          {p.description && (
                            <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 line-clamp-1">{p.description}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-zinc-650 dark:text-zinc-450 font-medium">
                      {p.category}
                    </td>
                    <td className="px-6 py-4 text-xs">
                      {p.options && p.options.length > 0 ? (
                        <div className="space-y-1">
                          {p.options.map(opt => {
                            let typeLabel;
                            let typeClass;
                            if (opt.type === 'string') {
                              typeLabel = 'spec';
                              typeClass = 'bg-zinc-100 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800';
                            } else if (opt.type === 'toggle') {
                              typeLabel = 'toggle';
                              typeClass = 'bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-405 border border-blue-100/30 dark:border-blue-900/20';
                            } else {
                              typeLabel = 'lijst';
                              typeClass = 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/20 dark:text-indigo-405 border border-indigo-100/30 dark:border-indigo-900/20';
                            }
                            return (
                              <div key={opt.id} className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
                                <span className={`px-1.5 py-0.2 rounded text-[8px] font-extrabold uppercase tracking-wider ${typeClass}`}>
                                  {typeLabel}
                                </span>
                                <span>
                                  <strong className="text-zinc-800 dark:text-zinc-200">{opt.name}</strong>
                                  {opt.type === 'string' ? `: ${opt.choices[0]}` : `: ${opt.choices.join('/')}`}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <span className="text-zinc-400 dark:text-zinc-600">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {p.is_18_plus ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-bold bg-red-100 text-red-750 dark:bg-red-950/30 dark:text-red-400 border border-red-200 dark:border-red-900/30">
                          18+
                        </span>
                      ) : (
                        <span className="text-xs text-zinc-405">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        p.status === 'AVAILABLE'
                          ? 'bg-green-50 text-green-700 dark:bg-green-950/20 dark:text-green-405 border border-green-100'
                          : 'bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-405 border border-red-100'
                      }`}>
                        {p.status === 'AVAILABLE' ? 'Beschikbaar' : 'Op/Uit verkocht'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2 whitespace-nowrap">
                      <button
                        onClick={() => handleEdit(p)}
                        className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 px-3 py-1.5 rounded-lg border border-zinc-250 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-850 transition-all duration-200"
                      >
                        Bewerken
                      </button>
                      <button
                        onClick={() => toggleStatus(p)}
                        className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all duration-200 ${
                          p.status === 'AVAILABLE'
                            ? 'bg-white hover:bg-zinc-100 text-zinc-750 dark:bg-zinc-900 dark:hover:bg-zinc-850 dark:text-zinc-300 border-zinc-200'
                            : 'bg-black text-white hover:bg-zinc-900 dark:bg-white dark:text-black dark:hover:bg-zinc-100 border-transparent shadow-sm'
                        }`}
                      >
                        Zet op {p.status === 'AVAILABLE' ? 'Op' : 'Beschikbaar'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {createPortal(
        <>
          {/* Slide-over Drawer Backdrop overlay */}
          <div 
            onClick={handleCloseDrawer}
            className={`fixed inset-0 bg-black/40 backdrop-blur-sm z-50 transition-opacity duration-300 ${
              isDrawerOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
            }`}
          />

          {/* Slide-over Drawer container */}
          <div className={`fixed right-0 top-0 bottom-0 w-full max-w-md bg-surface z-50 shadow-2xl flex flex-col justify-between transition-transform duration-300 ease-out transform ${
            isDrawerOpen ? 'translate-x-0' : 'translate-x-full'
          }`}>
            {/* Drawer Header */}
            <div className="p-6 border-b border-border flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                  {editingProductId ? 'Product Bewerken' : 'Nieuw Product'}
                </h2>
                <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">
                  {editingProductId ? 'Pas productdetails en custom velden aan' : 'Voeg een nieuw item toe aan het assortiment'}
                </p>
              </div>
              <button 
                onClick={handleCloseDrawer}
                className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-500 dark:text-zinc-400 flex items-center justify-center transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Drawer Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <form id="drawer-product-form" onSubmit={handleSubmit} className="space-y-6">
                
                {/* Section 1: Algemeen */}
                <div className="space-y-4">
                  <span className="text-[10px] font-extrabold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block border-b border-zinc-100 dark:border-zinc-900 pb-1">Basisgegevens</span>
                  
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-zinc-650 dark:text-zinc-400">
                      Productnaam
                    </label>
                    <input 
                      type="text" 
                      placeholder="Bijv. Coca-Cola, Friet met Mayo"
                      value={formData.name} 
                      onChange={e => setFormData({...formData, name: e.target.value})} 
                      className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:bg-white dark:focus:bg-zinc-900 transition-all text-xs"
                      required 
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-zinc-655 dark:text-zinc-400">
                      Categorie
                    </label>
                    <input 
                      type="text" 
                      placeholder="Bijv. Frisdrank, Snacks, Bier"
                      value={formData.category} 
                      onChange={e => setFormData({...formData, category: e.target.value})} 
                      className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:bg-white dark:focus:bg-zinc-900 transition-all text-xs"
                      required 
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-zinc-655 dark:text-zinc-400">
                      Beschrijving / Detail
                    </label>
                    <textarea 
                      placeholder="Bijv. 33cl blikje, glutenvrij"
                      value={formData.description} 
                      onChange={e => setFormData({...formData, description: e.target.value})} 
                      className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:bg-white dark:focus:bg-zinc-900 transition-all text-xs h-16 resize-none"
                    />
                  </div>
                </div>

                {/* Section 2: Afbeelding & Extra */}
                <div className="space-y-4">
                  <span className="text-[10px] font-extrabold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block border-b border-zinc-100 dark:border-zinc-900 pb-1">Media & restricties</span>
                  
                  {/* Premium Drag-and-drop Image Uploader */}
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-zinc-655 dark:text-zinc-400">
                      Productfoto
                    </label>
                    
                    <div 
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={triggerFileInput}
                      className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all duration-200 ${
                        dragOver 
                          ? 'border-black bg-zinc-50 dark:border-white dark:bg-zinc-900' 
                          : 'border-zinc-200 hover:border-zinc-350 dark:border-zinc-800 dark:hover:border-zinc-700'
                      }`}
                    >
                      <input 
                        type="file" 
                        id="product-image-file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                      <div className="flex flex-col items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-8 h-8 text-zinc-400">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.233-2.33 3 3 0 0 1 3.758 3.848A3.752 3.752 0 0 1 18 19.5H6.75Z" />
                        </svg>
                        <span className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300">
                          Sleep foto hier of <span className="underline text-black dark:text-white">blader</span>
                        </span>
                        <span className="text-[9px] text-zinc-450 dark:text-zinc-500">PNG, JPG of WEBP tot 5MB</span>
                      </div>
                    </div>

                    {uploading && (
                      <div className="text-[10px] text-zinc-400 animate-pulse">Uploaden...</div>
                    )}

                    {formData.image_url && (
                      <div className="flex items-center gap-2.5 mt-2 bg-zinc-50 dark:bg-zinc-900/30 p-2.5 rounded-xl border border-border">
                        <img 
                          src={`http://localhost:8000/uploads/${formData.image_url}`} 
                          alt="Preview" 
                          className="w-12 h-12 object-cover rounded-lg border border-border"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 truncate">{formData.image_url}</div>
                          <div className="text-[9px] text-green-500 mt-0.5 font-semibold">Foto geüpload</div>
                        </div>
                        <button 
                          type="button" 
                          onClick={() => setFormData(p => ({ ...p, image_url: '' }))}
                          className="text-red-500 hover:text-red-650 text-[10px] font-bold hover:underline px-2 py-1 bg-red-50 dark:bg-red-950/20 rounded-lg"
                        >
                          Verwijder
                        </button>
                      </div>
                    )}
                  </div>

                  {/* 18+ Checkbox */}
                  <div className="flex items-center gap-3 py-2 px-3 bg-zinc-50 dark:bg-zinc-900/30 rounded-xl border border-border">
                    <input 
                      type="checkbox" 
                      id="is_18_plus"
                      checked={formData.is_18_plus} 
                      onChange={e => setFormData({...formData, is_18_plus: e.target.checked})} 
                      className="w-4 h-4 rounded border-zinc-300 dark:border-zinc-800 text-black focus:ring-black dark:focus:ring-white focus:ring-offset-0 cursor-pointer"
                    />
                    <label htmlFor="is_18_plus" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 cursor-pointer select-none">
                      🔞 18+ Product (Leeftijdscontrole verplicht)
                    </label>
                  </div>
                </div>

                {/* Section 3: Custom Fields */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center border-b border-zinc-100 dark:border-zinc-900 pb-1">
                    <span className="text-[10px] font-extrabold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block">Custom velden ({formData.options.length})</span>
                    <button
                      type="button"
                      onClick={handleAddOption}
                      className="flex items-center gap-1 text-[10px] font-bold text-black dark:text-white bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 px-2 py-1 rounded-lg border border-border shadow-sm transition-colors"
                      >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-2.5 h-2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                      </svg>
                      Veld Toevoegen
                    </button>
                  </div>

                  {formData.options.length === 0 ? (
                    <div className="text-center py-6 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl bg-zinc-50/50 dark:bg-zinc-950/20">
                      <span className="text-[10px] text-zinc-400 dark:text-zinc-550 font-semibold">Geen extra velden aangemaakt.</span>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {formData.options.map((opt, index) => (
                        <div key={index} className="p-3.5 bg-zinc-50/50 dark:bg-zinc-900/20 border border-border rounded-xl space-y-3 relative group transition-all duration-200 animate-slide-in">
                          {/* Trash Button */}
                          <button
                            type="button"
                            onClick={() => handleRemoveOption(index)}
                            className="absolute right-2.5 top-2.5 text-zinc-400 hover:text-red-500 transition-colors p-1"
                            title="Veld verwijderen"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor" className="w-3.5 h-3.5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.34 9m-4.72 0-.34-9m4.72-3.415V9c0 .415-.335.75-.75.75H9.75a.75.75 0 0 1-.75-.75V5.585c0-.415.335-.75.75-.75h4.5a.75.75 0 0 1 .75.75ZM3.172 5.585C3.393 4.195 4.57 3 6 3h12c1.43 0 2.607 1.195 2.828 2.585M4.5 9v11.25A2.25 2.25 0 0 0 6.75 22.5h10.5a2.25 2.25 0 0 0 2.25-2.25V9" />
                            </svg>
                          </button>

                          {/* Option Title */}
                          <div className="space-y-1">
                            <label className="block text-[9px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-550">
                              Veldnaam / Label
                            </label>
                            <input
                              type="text"
                              placeholder="Bijv. Inhoud, Extra heet, Smaak"
                              value={opt.name}
                              onChange={e => handleOptionChange(index, 'name', e.target.value)}
                              className="w-[calc(100%-24px)] px-3 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs font-semibold focus:bg-white dark:focus:bg-zinc-900 transition-colors"
                              required
                            />
                          </div>

                          {/* Option Type Buttons */}
                          <div className="space-y-1">
                            <label className="block text-[9px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-550">
                              Type Veld
                            </label>
                            <div className="grid grid-cols-3 gap-1 p-0.5 bg-zinc-100 dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
                              {[
                                { id: 'string', label: 'Tekst (Spec)' },
                                { id: 'toggle', label: 'Toggle' },
                                { id: 'select', label: 'Keuzelijst' }
                              ].map(t => {
                                const isSelected = opt.type === t.id;
                                return (
                                  <button
                                    type="button"
                                    key={t.id}
                                    onClick={() => handleOptionChange(index, 'type', t.id)}
                                    className={`py-1 rounded text-[9px] font-bold transition-all duration-200 ${
                                      isSelected
                                        ? 'bg-white text-black dark:bg-zinc-800 dark:text-white shadow-sm'
                                        : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700'
                                    }`}
                                  >
                                    {t.label}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Type-Specific Value Inputs */}
                          <div className="space-y-1 mt-2">
                            {opt.type === 'string' && (
                              <div className="space-y-1">
                                <label className="block text-[9px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-555">
                                  Waarde (Statisch)
                                </label>
                                <input
                                  type="text"
                                  placeholder="Bijv. 33cl of 5.2%"
                                  value={opt.choices[0] || ''}
                                  onChange={e => handleStringValueChange(index, e.target.value)}
                                  className="w-full px-3 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs"
                                  required
                                />
                              </div>
                            )}

                            {opt.type === 'toggle' && (
                              <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                  <label className="block text-[9px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-555">
                                    Optie A
                                  </label>
                                  <input
                                    type="text"
                                    placeholder="Bijv. Ja"
                                    value={opt.choices[0] || ''}
                                    onChange={e => handleToggleValueChange(index, 0, e.target.value)}
                                    className="w-full px-3 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs"
                                    required
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="block text-[9px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-555">
                                    Optie B
                                  </label>
                                  <input
                                    type="text"
                                    placeholder="Bijv. Nee"
                                    value={opt.choices[1] || ''}
                                    onChange={e => handleToggleValueChange(index, 1, e.target.value)}
                                    className="w-full px-3 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs"
                                    required
                                  />
                                </div>
                              </div>
                            )}

                            {opt.type === 'select' && (
                              <div className="space-y-1">
                                <label className="block text-[9px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-555">
                                  Opties (komma-gescheiden)
                                </label>
                                <input
                                  type="text"
                                  placeholder="Bijv. Mayo, Ketchup, Curry"
                                  value={opt.choices.join(', ')}
                                  onChange={e => handleSelectChoicesChange(index, e.target.value)}
                                  className="w-full px-3 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs"
                                  required
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </form>
            </div>

            {/* Drawer Sticky Footer with action buttons */}
            <div className="p-6 border-t border-border flex gap-3 bg-zinc-50 dark:bg-zinc-950">
              <button
                type="button"
                onClick={handleCloseDrawer}
                className="flex-1 bg-white hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-850 text-zinc-700 dark:text-zinc-350 py-3 rounded-xl font-bold text-xs border border-zinc-200 dark:border-zinc-800 shadow-sm transition-colors text-center"
              >
                Annuleren
              </button>
              <button
                type="submit"
                form="drawer-product-form"
                disabled={loading || uploading}
                className="flex-1 bg-black hover:bg-zinc-900 dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-black py-3 rounded-xl font-bold text-xs shadow-md transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 text-center"
              >
                {loading ? 'Opslaan...' : editingProductId ? 'Opslaan' : 'Toevoegen'}
              </button>
            </div>
          </div>
        </>,
        document.body
      )}

    </div>
  );
}

export default AdminProducts;
