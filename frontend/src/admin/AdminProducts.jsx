import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import Drawer from '../components/Drawer';
import ToggleSwitch from '../components/ToggleSwitch';

function AdminProducts({ token }) {
 const [products, setProducts] = useState([]);
 const [formData, setFormData] = useState({
 name: '',
 description: '',
 category: '',
 is_18_plus: false,
 status: 'AVAILABLE',
 image_url: '',
 options: [], // [{ name: '', type: 'select', choices: [] }]
 is_composition: false,
 ingredients: [] // [{ ingredient_id: '', amount: '' }]
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
 const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/admin/products`, {
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
 const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/admin/products/upload`, data, {
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
 is_ingredient_only: !!product.is_ingredient_only,
 status: product.status,
 image_url: product.image_url || '',
 options: product.options ? product.options.map(opt => ({
 name: opt.name,
 type: opt.type || 'select',
 choices: opt.choices || []
 })) : [],
 is_composition: product.ingredients && product.ingredients.length > 0,
 ingredients: product.ingredients ? product.ingredients.map(i => ({ ingredient_id: i.ingredient_product_id, amount: i.amount })) : []
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
 is_ingredient_only: false,
 status: 'AVAILABLE',
 image_url: '',
 options: [],
 is_composition: false,
 ingredients: []
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
 is_ingredient_only: false,
 status: 'AVAILABLE',
 image_url: '',
 options: [],
 is_composition: false,
 ingredients: []
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
 is_ingredient_only: formData.is_ingredient_only,
 status: formData.status,
 image_url: formData.image_url,
 options: optionsArray,
 is_composition: formData.is_composition,
 ingredients: formData.is_composition ? formData.ingredients.filter(i => i.ingredient_id && i.amount) : []
 };

 if (editingProductId) {
 await axios.put(`${import.meta.env.VITE_API_URL}/api/admin/products/${editingProductId}`, payload, {
 headers: { Authorization: `Bearer ${token}` }
 });
 } else {
 await axios.post(`${import.meta.env.VITE_API_URL}/api/admin/products`, payload, {
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
 await axios.put(`${import.meta.env.VITE_API_URL}/api/admin/products/${product.id}`, { ...product, status: newStatus }, {
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
 <h1 className="text-2xl font-bold tracking-tight text-primary">Menukaart Beheer</h1>
 <p className="text-xs text-muted mt-1">
 Beheer producten en hun opties. Totaal: <strong className="text-zinc-900">{products.length}</strong> | Beschikbaar: <strong className="text-success">{products.filter(p => p.status === 'AVAILABLE').length}</strong>
 </p>
 </div>
 <button
 onClick={handleNewProduct}
 className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-primary-text text-primary-text font-semibold text-xs px-5 py-3 rounded-xl transition-all duration-200 hover:-translate-y-0.5 shadow-md active:translate-y-0"
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
 className="w-full pl-10 pr-4 py-2.5 bg-surface border border-border rounded-xl text-xs font-medium focus:bg-surface focus:ring-1 focus:ring-primary transition-all shadow-sm"
 />
 </div>

 {/* View Toggles */}
 <div className="flex items-center gap-1 bg-surface border border-border p-0.5 rounded-xl self-end sm:self-auto shadow-sm">
 <button
 onClick={() => setViewMode('grid')}
 className={`p-2 rounded-lg transition-all duration-200 ${
 viewMode === 'grid' ? 'bg-surface text-primary shadow-sm' : 'text-zinc-400 hover:text-zinc-650 0'
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
 viewMode === 'list' ? 'bg-surface text-primary shadow-sm' : 'text-zinc-400 hover:text-zinc-650 0'
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
 isSelected ? 'bg-primary text-primary-text' : 'bg-surface text-muted hover:text-secondary border-border'
 }`}
 >
 <span>{cat}</span>
 <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-bold ${
 isSelected ? 'bg-zinc-800 text-zinc-200 ' : 'bg-zinc-100 text-zinc-500 '
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
 <div className="bg-surface border border-dashed border-border rounded-2xl p-12 text-center shadow-sm">
 <div className="w-12 h-12 rounded-full border border-dashed border-zinc-300 flex items-center justify-center mx-auto mb-4 text-zinc-400">
 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-6 h-6">
 <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.604 10.604Z" />
 </svg>
 </div>
 <h3 className="font-bold text-zinc-900">Geen producten gevonden</h3>
 <p className="text-xs text-secondary mt-1.5">
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
 <div className="h-44 overflow-hidden relative bg-white dark:bg-white/5 border-b border-border-subtle flex items-center justify-center">
 {p.image_url ? (
 <img src={`${import.meta.env.VITE_API_URL}/uploads/${p.image_url}`} alt={p.name}
 className="max-w-full max-h-full object-contain p-2 group-hover:scale-102 transition-transform duration-300"
 />
 ) : (
 <div className="w-full h-full flex flex-col items-center justify-center text-secondary">
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
 ? 'bg-green-50 text-green-700 border-success-border shadow-sm'
 : 'bg-red-50 text-red-750 border-danger-border'
 }`}>
 {p.status === 'AVAILABLE' ? 'Beschikbaar' : 'Uitverkocht'}
 </span>
 </div>

 {/* Age restriction badge */}
 {p.is_18_plus && (
 <div className="absolute top-3 right-3 z-10">
 <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-extrabold bg-red-100 text-red-700 border border-danger-border shadow-sm">
 18+
 </span>
 </div>
 )}
 {p.is_ingredient_only && (
 <div className={`absolute top-3 ${p.is_18_plus ? 'right-12' : 'right-3'} z-10`}>
 <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-extrabold bg-blue-100 text-blue-700 border border-blue-200 shadow-sm">
 Ingrediënt
 </span>
 </div>
 )}
 </div>

 {/* Card Body */}
 <div className="p-4 space-y-2">
 <span className="text-[9px] font-bold uppercase tracking-wider text-muted block">
 {p.category}
 </span>
 <div>
 <h3 className="font-bold text-base text-primary leading-snug">{p.name}</h3>
 {p.description && (
 <p className="text-xs text-muted mt-1 line-clamp-2">{p.description}</p>
 )}
 </div>

 {/* Custom Fields Tags */}
 {p.options && p.options.length > 0 && (
 <div className="pt-2.5 border-t border-border-subtle flex flex-wrap gap-1.5">
 {p.options.map(opt => {
 let badgeStyle;
 if (opt.type === 'string') {
 badgeStyle = 'bg-background text-zinc-650 border-border';
 } else if (opt.type === 'toggle') {
 badgeStyle = 'bg-blue-50/40 text-blue-600 border-blue-100/30 ';
 } else {
 badgeStyle = 'bg-indigo-50/40 text-indigo-600 border-indigo-100/30 ';
 }
 return (
 <div key={opt.id} className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold border ${badgeStyle}`}
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
 <div className="px-4 pb-4 pt-2 border-t border-zinc-50 flex gap-2">
 <button
 onClick={() => handleEdit(p)}
 className="flex-1 text-center font-semibold text-xs text-secondary bg-surface hover:bg-surface-hover border border-border py-2 rounded-xl transition-all shadow-sm"
 >
 Bewerken
 </button>
 <button
 onClick={() => toggleStatus(p)}
 className={`flex-1 text-center font-bold text-xs py-2 rounded-xl border transition-all ${
 p.status === 'AVAILABLE'
 ? 'bg-surface text-secondary hover:bg-background border-border shadow-sm'
 : 'bg-primary text-primary-text hover:bg-primary-hover border-transparent shadow-md'
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
 <tr className="border-b border-border bg-background text-muted text-xs font-semibold uppercase tracking-wider">
 <th className="px-6 py-4">Product</th>
 <th className="px-6 py-4">Categorie</th>
 <th className="px-6 py-4">Custom Velden</th>
 <th className="px-6 py-4">Kenmerken</th>
 <th className="px-6 py-4">Status</th>
 <th className="px-6 py-4 text-right">Acties</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-border text-sm">
 {filteredProducts.map(p => (
 <tr key={p.id} className="hover:bg-surface-hover transition-colors">
 <td className="px-6 py-4">
 <div className="flex items-center gap-3">
 {p.image_url ? (
 <img src={`${import.meta.env.VITE_API_URL}/uploads/${p.image_url}`} alt={p.name}
 className="w-10 h-10 object-cover rounded-lg border border-border"
 />
 ) : (
 <div className="w-10 h-10 bg-surface border border-border rounded-lg flex items-center justify-center text-[10px] font-bold text-zinc-400 font-mono">
 GEEN
 </div>
 )}
 <div>
 <div className="font-semibold text-zinc-900 leading-snug">{p.name}</div>
 {p.description && (
 <div className="text-xs text-muted mt-0.5 line-clamp-1">{p.description}</div>
 )}
 </div>
 </div>
 </td>
 <td className="px-6 py-4 text-secondary font-medium">
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
 typeClass = 'bg-zinc-100 text-zinc-700 border border-border';
 } else if (opt.type === 'toggle') {
 typeLabel = 'toggle';
 typeClass = 'bg-blue-50 text-blue-700 border border-blue-100/30 ';
 } else {
 typeLabel = 'lijst';
 typeClass = 'bg-indigo-50 text-indigo-700 border border-indigo-100/30 ';
 }
 return (
 <div key={opt.id} className="flex items-center gap-1.5 text-secondary">
 <span className={`px-1.5 py-0.2 rounded text-[8px] font-extrabold uppercase tracking-wider ${typeClass}`}>
 {typeLabel}
 </span>
 <span>
 <strong className="text-primary">{opt.name}</strong>
 {opt.type === 'string' ? `: ${opt.choices[0]}` : `: ${opt.choices.join('/')}`}
 </span>
 </div>
 );
 })}
 </div>
 ) : (
 <span className="text-secondary">-</span>
 )}
 </td>
 <td className="px-6 py-4">
 {p.is_18_plus ? (
 <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-bold bg-red-100 text-red-750 border border-danger-border mr-2">
 18+
 </span>
 ) : null}
 {p.is_ingredient_only ? (
 <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-bold bg-blue-100 text-blue-750 border border-blue-200">
 Ingrediënt
 </span>
 ) : null}
 {!p.is_18_plus && !p.is_ingredient_only && (
 <span className="text-xs text-zinc-405">-</span>
 )}
 </td>
 <td className="px-6 py-4">
 <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
 p.status === 'AVAILABLE'
 ? 'bg-green-50 text-green-700 border border-green-100'
 : 'bg-red-50 text-red-700 border border-red-100'
 }`}>
 {p.status === 'AVAILABLE' ? 'Beschikbaar' : 'Op/Uit verkocht'}
 </span>
 </td>
 <td className="px-6 py-4 text-right space-x-2 whitespace-nowrap">
 <button
 onClick={() => handleEdit(p)}
 className="text-xs font-semibold text-secondary px-3 py-1.5 rounded-lg border border-zinc-250 hover:bg-surface-hover transition-all duration-200"
 >
 Bewerken
 </button>
 <button
 onClick={() => toggleStatus(p)}
 className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all duration-200 ${
 p.status === 'AVAILABLE'
 ? 'bg-white hover:bg-zinc-100 text-zinc-750 border-zinc-200'
 : 'bg-black text-white hover:bg-zinc-900 border-transparent shadow-sm'
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

  <Drawer
    isOpen={isDrawerOpen}
    onClose={handleCloseDrawer}
    title={editingProductId ? 'Product Bewerken' : 'Nieuw Product'}
    description={editingProductId ? 'Pas productdetails en custom velden aan' : 'Voeg een nieuw item toe aan het assortiment'}
    footer={
      <div className="flex gap-3 w-full">
        <button
          type="button"
          onClick={handleCloseDrawer}
          className="flex-1 bg-surface hover:bg-surface-hover text-secondary py-3 rounded-xl font-bold text-xs border border-border shadow-sm transition-colors text-center"
        >
          Annuleren
        </button>
        <button
          type="submit"
          form="drawer-product-form"
          disabled={loading || uploading}
          className="flex-1 bg-primary hover:bg-primary-hover text-primary-text py-3 rounded-xl font-bold text-xs shadow-md transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 text-center"
        >
          {loading ? 'Opslaan...' : editingProductId ? 'Opslaan' : 'Toevoegen'}
        </button>
      </div>
    }
  >
 <form id="drawer-product-form" onSubmit={handleSubmit} className="space-y-6">
 {/* Section 1: Algemeen */}
 <div className="space-y-4">
 <span className="text-[10px] font-extrabold text-muted uppercase tracking-wider block border-b border-border-subtle pb-1">Basisgegevens</span>
 <div className="space-y-1">
 <label className="block text-xs font-semibold text-zinc-650">
 Productnaam
 </label>
 <input type="text" placeholder="Bijv. Coca-Cola, Friet met Mayo"
 value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl focus:bg-surface transition-all text-xs"
 required />
 </div>

 <div className="space-y-1">
 <label className="block text-xs font-semibold text-zinc-655">
 Categorie
 </label>
 <input type="text" placeholder="Bijv. Frisdrank, Snacks, Bier"
 value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl focus:bg-surface transition-all text-xs"
 required />
 </div>

 <div className="space-y-1">
 <label className="block text-xs font-semibold text-zinc-655">
 Beschrijving / Detail
 </label>
 <textarea placeholder="Bijv. 33cl blikje, glutenvrij"
 value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl focus:bg-surface transition-all text-xs h-16 resize-none"
 />
 </div>
 </div>

 {/* Section: Receptuur / Samenstelling */}
  <div className="space-y-4 pt-2 border-t border-border">
    <ToggleSwitch 
      checked={formData.is_composition} 
      onChange={e => setFormData({...formData, is_composition: e.target.checked})} 
      label="Dit is een samenstelling (Cocktail / Mix)" 
      description="Dit product trekt voorraad af van andere ingrediënten." 
    />

    {formData.is_composition && (
      <div className="p-4 bg-background border border-border rounded-xl space-y-3 animate-slide-in">
        <div className="flex justify-between items-center mb-2">
          <span className="text-[10px] font-extrabold text-muted uppercase tracking-wider">Ingrediëntenlijst</span>
          <button 
            type="button" 
            onClick={() => setFormData({...formData, ingredients: [...formData.ingredients, { ingredient_id: '', amount: '' }]})}
            className="text-[10px] font-bold text-primary hover:text-primary-hover flex items-center gap-1"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3 h-3"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
            Toevoegen
          </button>
        </div>
        
        {formData.ingredients.length === 0 ? (
          <div className="text-center py-4 border border-dashed border-border rounded-lg"><span className="text-[10px] text-secondary font-semibold">Voeg ingrediënten toe die afgeschreven moeten worden.</span></div>
        ) : (
          formData.ingredients.map((ing, i) => (
            <div key={i} className="flex gap-2 items-center">
              <select 
                value={ing.ingredient_id} 
                onChange={e => {
                  const newIngs = [...formData.ingredients];
                  newIngs[i].ingredient_id = e.target.value;
                  setFormData({...formData, ingredients: newIngs});
                }}
                className="flex-1 bg-surface border border-border rounded-lg px-2 py-1.5 text-xs text-primary focus:outline-none focus:border-primary"
                required={formData.is_composition}
              >
                <option value="">Selecteer product...</option>
                {products.filter(p => !p.is_composition && p.id !== editingProductId).map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <input 
                type="number" 
                placeholder="Aantal/ml" 
                value={ing.amount}
                onChange={e => {
                  const newIngs = [...formData.ingredients];
                  newIngs[i].amount = e.target.value;
                  setFormData({...formData, ingredients: newIngs});
                }}
                className="w-20 bg-surface border border-border rounded-lg px-2 py-1.5 text-xs text-primary focus:outline-none focus:border-primary"
                required={formData.is_composition}
              />
              <button 
                type="button" 
                onClick={() => {
                  const newIngs = formData.ingredients.filter((_, idx) => idx !== i);
                  setFormData({...formData, ingredients: newIngs});
                }}
                className="text-muted hover:text-danger p-1"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          ))
        )}
      </div>
    )}
  </div>

  {/* Section 2: Afbeelding & Extra */}
 <div className="space-y-4">
 <span className="text-[10px] font-extrabold text-muted uppercase tracking-wider block border-b border-border-subtle pb-1">Media & restricties</span>
 {/* Premium Drag-and-drop Image Uploader */}
 <div className="space-y-2">
 <label className="block text-xs font-semibold text-zinc-655">
 Productfoto
 </label>
 <div onDragOver={handleDragOver}
 onDragLeave={handleDragLeave}
 onDrop={handleDrop}
 onClick={triggerFileInput}
 className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all duration-200 ${
 dragOver ? 'border-black bg-zinc-50 ' : 'border-zinc-200 hover:border-zinc-350 '
 }`}
 >
 <input type="file" id="product-image-file"
 accept="image/*"
 onChange={handleFileChange}
 className="hidden"
 />
 <div className="flex flex-col items-center gap-2">
 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-8 h-8 text-zinc-400">
 <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.233-2.33 3 3 0 0 1 3.758 3.848A3.752 3.752 0 0 1 18 19.5H6.75Z" />
 </svg>
 <span className="text-[11px] font-bold text-secondary">
 Sleep foto hier of <span className="underline text-primary">blader</span>
 </span>
 <span className="text-[9px] text-zinc-450 0">PNG, JPG of WEBP tot 5MB</span>
 </div>
 </div>

 {uploading && (
 <div className="text-[10px] text-zinc-400 animate-pulse">Uploaden...</div>
 )}

 {formData.image_url && (
 <div className="flex items-center gap-2.5 mt-2 bg-background p-2.5 rounded-xl border border-border">
 <img src={`${import.meta.env.VITE_API_URL}/uploads/${formData.image_url}`} alt="Preview" className="w-12 h-12 object-cover rounded-lg border border-border"
 />
 <div className="flex-1 min-w-0">
 <div className="text-[10px] font-bold text-muted truncate">{formData.image_url}</div>
 <div className="text-[9px] text-green-500 mt-0.5 font-semibold">Foto geüpload</div>
 </div>
 <button type="button" onClick={() => setFormData(p => ({ ...p, image_url: '' }))}
 className="text-red-500 hover:text-red-650 text-[10px] font-bold hover:underline px-2 py-1 bg-danger-bg rounded-lg"
 >
 Verwijder
 </button>
 </div>
 )}
 </div>

 {/* 18+ Checkbox */}
 <div className="flex items-center gap-3 py-2 px-3 bg-background rounded-xl border border-border">
 <input type="checkbox" id="is_18_plus"
 checked={formData.is_18_plus} onChange={e => setFormData({...formData, is_18_plus: e.target.checked})} className="w-4 h-4 rounded border-zinc-300 text-black focus:ring-black focus:ring-offset-0 cursor-pointer"
 />
 <label htmlFor="is_18_plus" className="text-xs font-semibold text-secondary cursor-pointer select-none">
 🔞 18+ Product (Leeftijdscontrole verplicht)
 </label>
 </div>

 {/* Ingredient Only Checkbox */}
 <div className="flex items-center gap-3 py-2 px-3 bg-background rounded-xl border border-border mt-2">
 <input type="checkbox" id="is_ingredient_only"
 checked={formData.is_ingredient_only} onChange={e => setFormData({...formData, is_ingredient_only: e.target.checked})} className="w-4 h-4 rounded border-zinc-300 text-black focus:ring-black focus:ring-offset-0 cursor-pointer"
 />
 <label htmlFor="is_ingredient_only" className="text-xs font-semibold text-secondary cursor-pointer select-none">
 🧑‍🍳 Alleen als ingrediënt (niet zichtbaar voor klanten)
 </label>
 </div>
 </div>

 {/* Section 3: Custom Fields */}
 <div className="space-y-4">
 <div className="flex justify-between items-center border-b border-border-subtle pb-1">
 <span className="text-[10px] font-extrabold text-muted uppercase tracking-wider block">Custom velden ({formData.options.length})</span>
 <button
 type="button"
 onClick={handleAddOption}
 className="flex items-center gap-1 text-[10px] font-bold text-primary bg-surface hover:bg-surface-hover px-2 py-1 rounded-lg border border-border shadow-sm transition-colors"
 >
 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-2.5 h-2.5">
 <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
 </svg>
 Veld Toevoegen
 </button>
 </div>

 {formData.options.length === 0 ? (
 <div className="text-center py-6 border border-dashed border-border rounded-xl bg-zinc-50/50 /20">
 <span className="text-[10px] text-secondary font-semibold">Geen extra velden aangemaakt.</span>
 </div>
 ) : (
 <div className="space-y-3">
 {formData.options.map((opt, index) => (
 <div key={index} className="p-3.5 bg-background border border-border rounded-xl space-y-3 relative group transition-all duration-200 animate-slide-in">
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
 <label className="block text-[9px] font-bold uppercase tracking-wider text-secondary">
 Veldnaam / Label
 </label>
 <input
 type="text"
 placeholder="Bijv. Inhoud, Extra heet, Smaak"
 value={opt.name}
 onChange={e => handleOptionChange(index, 'name', e.target.value)}
 className="w-[calc(100%-24px)] px-3 py-1.5 bg-background border border-border rounded-lg text-xs font-semibold focus:bg-surface transition-colors"
 required
 />
 </div>

 {/* Option Type Buttons */}
 <div className="space-y-1">
 <label className="block text-[9px] font-bold uppercase tracking-wider text-secondary">
 Type Veld
 </label>
 <div className="grid grid-cols-3 gap-1 p-0.5 bg-surface rounded-lg border border-border">
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
 ? 'bg-background text-primary shadow-sm border border-border'
 : 'text-muted hover:text-primary'
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
 <label className="block text-[9px] font-bold uppercase tracking-wider text-secondary">
 Waarde (Statisch)
 </label>
 <input
 type="text"
 placeholder="Bijv. 33cl of 5.2%"
 value={opt.choices[0] || ''}
 onChange={e => handleStringValueChange(index, e.target.value)}
 className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-xs focus:bg-surface"
 required
 />
 </div>
 )}

 {opt.type === 'toggle' && (
 <div className="grid grid-cols-2 gap-2">
 <div className="space-y-1">
 <label className="block text-[9px] font-bold uppercase tracking-wider text-secondary">
 Optie A
 </label>
 <input
 type="text"
 placeholder="Bijv. Ja"
 value={opt.choices[0] || ''}
 onChange={e => handleToggleValueChange(index, 0, e.target.value)}
 className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-xs focus:bg-surface"
 required
 />
 </div>
 <div className="space-y-1">
 <label className="block text-[9px] font-bold uppercase tracking-wider text-secondary">
 Optie B
 </label>
 <input
 type="text"
 placeholder="Bijv. Nee"
 value={opt.choices[1] || ''}
 onChange={e => handleToggleValueChange(index, 1, e.target.value)}
 className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-xs focus:bg-surface"
 required
 />
 </div>
 </div>
 )}

 {opt.type === 'select' && (
 <div className="space-y-1">
 <label className="block text-[9px] font-bold uppercase tracking-wider text-secondary">
 Opties (komma-gescheiden)
 </label>
 <input
 type="text"
 placeholder="Bijv. Mayo, Ketchup, Curry"
 value={opt.choices.join(', ')}
 onChange={e => handleSelectChoicesChange(index, e.target.value)}
 className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-xs focus:bg-surface"
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


      </Drawer>

 </div>
 );
}

export default AdminProducts;
