import React, { useState, useEffect } from 'react';
import axios from 'axios';

function AdminEvents({ token, activeEvent, fetchActiveEvent }) {
 const [events, setEvents] = useState([]);
 const [newEventName, setNewEventName] = useState('');
 const [loading, setLoading] = useState(false);
 // Announcement states
 const [announcement, setAnnouncement] = useState('');

 // Archive Detail States
 const [selectedEventId, setSelectedEventId] = useState(null);
 const [eventDetails, setEventDetails] = useState(null);
 const [loadingDetails, setLoadingDetails] = useState(false);

 useEffect(() => {
 fetchEvents();
 }, []);

 useEffect(() => {
 if (activeEvent) {
 setAnnouncement(activeEvent.announcement || '');
 } else {
 setAnnouncement('');
 }
 }, [activeEvent]);

 const fetchEvents = async () => {
 try {
 const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/admin/events`, {
 headers: { Authorization: `Bearer ${token}` }
 });
 setEvents(res.data);
 } catch (err) {
 console.error(err);
 }
 };

 const handleStartNew = async (e) => {
 e.preventDefault();
 if (!newEventName.trim()) return;
 setLoading(true);
 try {
 await axios.post(`${import.meta.env.VITE_API_URL}/api/admin/events`, { name: newEventName }, {
 headers: { Authorization: `Bearer ${token}` }
 });
 setNewEventName('');
 fetchEvents();
 fetchActiveEvent();
 } catch (err) {
 console.error(err);
 } finally {
 setLoading(false);
 }
 };

 const handleArchiveCurrent = async () => {
 if (!window.confirm('Weet je zeker dat je het huidige evenement wilt afsluiten en archiveren?')) return;
 try {
 await axios.post(`${import.meta.env.VITE_API_URL}/api/admin/events/archive`, {}, {
 headers: { Authorization: `Bearer ${token}` }
 });
 fetchEvents();
 fetchActiveEvent();
 } catch (err) {
 console.error(err);
 }
 };

 const handleUpdateAnnouncement = async (e) => {
 e.preventDefault();
 try {
 await axios.post(`${import.meta.env.VITE_API_URL}/api/admin/events/announcement`, {
 announcement: announcement.trim()
 }, {
 headers: { Authorization: `Bearer ${token}` }
 });
 alert('Mededeling uitgezonden!');
 fetchActiveEvent();
 } catch (err) {
 console.error(err);
 alert('Mededeling bijwerken mislukt.');
 }
 };

 const handleClearAnnouncement = async () => {
 try {
 await axios.post(`${import.meta.env.VITE_API_URL}/api/admin/events/announcement`, {
 announcement: ''
 }, {
 headers: { Authorization: `Bearer ${token}` }
 });
 setAnnouncement('');
 fetchActiveEvent();
 } catch (err) {
 console.error(err);
 alert('Mededeling wissen mislukt.');
 }
 };

 const handleInspectEvent = async (eventId) => {
 setSelectedEventId(eventId);
 setLoadingDetails(true);
 setEventDetails(null);
 try {
 const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/admin/events/${eventId}/details`, {
 headers: { Authorization: `Bearer ${token}` }
 });
 setEventDetails(res.data);
 } catch (err) {
 console.error('Fout bij ophalen event details:', err);
 alert('Kon details van evenement niet inladen.');
 setSelectedEventId(null);
 } finally {
 setLoadingDetails(false);
 }
 };

 const handleBackToList = () => {
 setSelectedEventId(null);
 setEventDetails(null);
 };

 // Render detail view if an event is selected
 if (selectedEventId) {
 return (
 <div className="space-y-6 animate-fade-in">
 {/* Back button & title */}
 <div className="flex justify-between items-center bg-surface border border-border px-6 py-4 rounded-2xl shadow-sm">
 <div>
 <button
 onClick={handleBackToList}
 className="inline-flex items-center gap-1 text-xs font-semibold text-muted hover:text-secondary mb-1"
 >
 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5">
 <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
 </svg>
 Terug naar overzicht
 </button>
 <h2 className="text-xl font-bold tracking-tight">
 Rapport: {eventDetails?.event?.name || 'Laden...'}
 </h2>
 </div>
 {eventDetails?.event && (
 <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
 eventDetails.event.status === 'ACTIVE'
 ? 'bg-success-bg text-success border border-green-100'
 : 'bg-zinc-100 text-zinc-600 border border-zinc-200/50'
 }`}>
 {eventDetails.event.status === 'ACTIVE' ? 'Actief' : 'Gearchiveerd'}
 </span>
 )}
 </div>

 {loadingDetails && (
 <div className="bg-surface border border-border p-12 rounded-2xl text-center">
 <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
 <span className="text-sm font-medium text-zinc-500">Gegevens verzamelen...</span>
 </div>
 )}

 {eventDetails && (
 <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
 {/* Column 1: Order Statistics & Event Info */}
 <div className="lg:col-span-1 space-y-6">
 {/* Metadata */}
 <div className="bg-surface border border-border rounded-2xl p-5 shadow-sm space-y-3">
 <h3 className="font-bold text-sm text-muted uppercase tracking-wider">Details</h3>
 <div className="text-xs space-y-2 text-secondary">
 <div>
 <span className="font-bold block text-zinc-850">Starttijd:</span>
 {new Date(eventDetails.event.created_at).toLocaleString()}
 </div>
 {eventDetails.event.archived_at && (
 <div>
 <span className="font-bold block text-zinc-850">Eindtijd:</span>
 {new Date(eventDetails.event.archived_at).toLocaleString()}
 </div>
 )}
 </div>
 </div>

 {/* Product Quantities Stats */}
 <div className="bg-surface border border-border rounded-2xl p-5 shadow-sm">
 <h3 className="font-bold text-sm text-muted uppercase tracking-wider mb-4">
 Bestelde Drankjes & Snacks
 </h3>
 {eventDetails.stats.length === 0 ? (
 <p className="text-xs text-muted text-center py-4">
 Geen voltooide bestellingen geregistreerd.
 </p>
 ) : (
 <div className="space-y-2.5">
 {eventDetails.stats.map(stat => (
 <div key={stat.name} className="flex justify-between items-center text-xs py-1.5 border-b border-border-subtle last:border-0">
 <div>
 <span className="font-bold text-zinc-900">{stat.name}</span>
 <span className="text-[10px] text-muted ml-2">({stat.category})</span>
 </div>
 <span className="font-mono font-bold bg-surface px-2 py-0.5 rounded text-secondary">
 {stat.quantity}x
 </span>
 </div>
 ))}
 </div>
 )}
 </div>
 </div>

 {/* Column 2: Guests and Orders */}
 <div className="lg:col-span-2 space-y-6">
 {/* Unique Guests present */}
 <div className="bg-surface border border-border rounded-2xl p-5 shadow-sm">
 <h3 className="font-bold text-sm text-muted uppercase tracking-wider mb-4">
 Aanwezige Gasten ({eventDetails.guests.length})
 </h3>
 {eventDetails.guests.length === 0 ? (
 <p className="text-xs text-muted text-center py-2">
 Geen actieve gasten geregistreerd.
 </p>
 ) : (
 <div className="flex flex-wrap gap-2">
 {eventDetails.guests.map(g => (
 <span key={g.id} className="bg-muted text-secondary text-xs font-semibold px-3 py-1.5 rounded-xl border border-border">
 {g.username}
 </span>
 ))}
 </div>
 )}
 </div>

 {/* Complete Orders History */}
 <div className="bg-surface border border-border rounded-2xl p-5 shadow-sm">
 <h3 className="font-bold text-sm text-muted uppercase tracking-wider mb-4">
 Bestellingenlog ({eventDetails.orders.length})
 </h3>
 <div className="max-h-[400px] overflow-y-auto space-y-3 pr-1">
 {eventDetails.orders.length === 0 ? (
 <p className="text-xs text-muted text-center py-8">
 Geen bestellingen gevonden.
 </p>
 ) : (
 eventDetails.orders.map(order => (
 <div key={order.id} className="bg-background border border-border rounded-xl p-3 text-xs flex flex-col sm:flex-row sm:justify-between gap-3">
 <div className="space-y-1.5">
 <div className="flex items-center gap-2">
 <span className="font-bold text-zinc-900">{order.guest_name}</span>
 <span className="text-[10px] text-zinc-400">
 {new Date(order.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
 </span>
 </div>
 {/* Items details */}
 <div className="space-y-1 pl-2 border-l border-border">
 {order.items.map((it, idx) => (
 <div key={idx}>
 <span className="font-semibold">{it.product_name}</span>
 {Object.keys(it.selected_options || {}).length > 0 && (
 <span className="text-[10px] text-zinc-500 ml-1">
 ({Object.entries(it.selected_options).map(([k, v]) => `${v}`).join(', ')})
 </span>
 )}
 {it.remark && (
 <span className="text-[10px] text-amber-600 block italic">
 Opmerking:"{it.remark}"
 </span>
 )}
 </div>
 ))}
 </div>
 </div>

 <div className="flex items-center justify-between sm:justify-end gap-2">
 <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
 order.status === 'PENDING'
 ? 'bg-warning-bg text-warning border border-amber-100'
 : order.status === 'COMPLETED'
 ? 'bg-success-bg text-success border border-green-100'
 : 'bg-zinc-100 text-zinc-400 0 border border-zinc-200/50'
 }`}>
 {order.status === 'PENDING' ? 'In bar-rij' : order.status === 'COMPLETED' ? 'Afgerond' : 'Geannuleerd'}
 </span>
 </div>
 </div>
 ))
 )}
 </div>
 </div>

 </div>

 </div>
 )}
 </div>
 );
 }

 return (
 <div className="space-y-8 animate-fade-in">
 <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
 {/* Active Event Card */}
 <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm flex flex-col justify-between">
 <div>
 <h2 className="text-xl font-bold tracking-tight text-primary mb-1">
 Huidig Actief Evenement
 </h2>
 <p className="text-sm text-muted mb-6">
 Het evenement dat nu openstaat voor bestellingen
 </p>
 {activeEvent ? (
 <div className="bg-background border border-border rounded-xl p-5 mb-6">
 <div className="flex items-center gap-2 mb-2">
 <span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-ping"></span>
 <span className="text-xs font-semibold uppercase tracking-wider text-success">
 Live / Actief
 </span>
 </div>
 <h3 className="text-lg font-bold text-primary mb-1">
 {activeEvent.name}
 </h3>
 <p className="text-xs text-muted">
 Gestart op: {new Date(activeEvent.created_at).toLocaleString()}
 </p>
 </div>
 ) : (
 <div className="bg-background border border-dashed border-zinc-300 rounded-xl p-8 text-center mb-6">
 <p className="text-sm text-muted">
 Er is momenteel geen actief evenement gestart.
 </p>
 </div>
 )}
 </div>

 {activeEvent && (
 <button onClick={handleArchiveCurrent}
 className="w-full bg-red-500 hover:bg-danger text-white py-3 rounded-xl font-medium shadow-sm transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 text-sm"
 >
 Huidig Evenement Archiveren (Schoonmaken)
 </button>
 )}
 </div>

 {/* Live Announcement Card */}
 {activeEvent && (
 <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm flex flex-col justify-between">
 <div>
 <h2 className="text-xl font-bold tracking-tight text-primary mb-1">
 Live Mededeling Uitzenden
 </h2>
 <p className="text-sm text-muted mb-6">
 Stuur een realtime bericht naar alle verbonden gasten
 </p>

 <form onSubmit={handleUpdateAnnouncement} className="space-y-4">
 <div className="space-y-1">
 <label className="block text-xs font-semibold uppercase tracking-wider text-muted">
 Berichttekst
 </label>
 <textarea placeholder="Bijv. Laatste ronde! 🍻 of De snacks zijn nu klaar..."
 value={announcement}
 onChange={e => setAnnouncement(e.target.value)}
 className="w-full px-4 py-2 bg-background border border-border rounded-xl focus:bg-surface transition-all duration-200 text-sm h-16 resize-none"
 maxLength={150}
 />
 </div>

 <div className="flex gap-2">
 <button type="submit"
 className="flex-1 bg-primary hover:bg-primary-hover text-primary-text text-primary-text py-2 rounded-xl font-semibold shadow-md transition-all text-xs"
 >
 Uitzenden
 </button>
 {activeEvent.announcement && (
 <button type="button" onClick={handleClearAnnouncement}
 className="bg-zinc-150 hover:bg-surface-hover text-red-500 px-3 py-2 rounded-xl font-semibold border border-border transition-all text-xs"
 >
 Wis
 </button>
 )}
 </div>
 </form>
 </div>
 </div>
 )}

 {/* Start New Event Card */}
 <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm">
 <h2 className="text-xl font-bold tracking-tight text-primary mb-1">
 Nieuw Evenement Starten
 </h2>
 <p className="text-sm text-muted mb-6">
 Hiermee wordt het huidige actieve evenement direct gearchiveerd.
 </p>

 <form onSubmit={handleStartNew} className="space-y-4">
 <div className="space-y-1">
 <label className="block text-xs font-semibold uppercase tracking-wider text-muted">
 Evenement Naam
 </label>
 <input type="text" placeholder="Bijv. Zomerfeest 2026, Clubavond Vrijdag" value={newEventName} onChange={e => setNewEventName(e.target.value)} className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:bg-surface transition-all duration-200 text-sm"
 required />
 </div>

 <button type="submit"
 disabled={loading || !newEventName.trim()}
 className="w-full bg-primary hover:bg-primary-hover text-primary-text text-primary-text py-3 rounded-xl font-medium shadow-md transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
 >
 {loading ? 'Starten...' : 'Start Nieuw Evenement'}
 </button>
 </form>
 </div>

 </div>

 {/* Event History Section */}
 <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm">
 <h2 className="text-xl font-bold tracking-tight text-primary mb-1">
 Evenementen Geschiedenis
 </h2>
 <p className="text-sm text-muted mb-6">
 Klik op een evenement om het rapport, statistieken en bestellingen in te zien
 </p>

 <div className="overflow-x-auto -mx-6 sm:mx-0">
 <table className="w-full text-left border-collapse">
 <thead>
 <tr className="border-b border-border text-muted text-xs font-semibold uppercase tracking-wider">
 <th className="px-6 py-4">Naam</th>
 <th className="px-6 py-4">Status</th>
 <th className="px-6 py-4">Gestart</th>
 <th className="px-6 py-4">Gearchiveerd</th>
 <th className="px-6 py-4 text-right">Rapport</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-border text-sm">
 {events.length === 0 ? (
 <tr>
 <td colSpan="5" className="px-6 py-8 text-center text-muted">
 Geen eerdere evenementen gevonden.
 </td>
 </tr>
 ) : (
 events.map(ev => (
 <tr key={ev.id} className="hover:bg-surface-hover transition-colors">
 <td className="px-6 py-4 font-medium text-zinc-900">{ev.name}</td>
 <td className="px-6 py-4">
 <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
 ev.status === 'ACTIVE' ? 'bg-success-bg text-success border border-success-border'
 : 'bg-zinc-100 text-zinc-600 border border-border'
 }`}>
 {ev.status === 'ACTIVE' ? 'Actief' : 'Gearchiveerd'}
 </span>
 </td>
 <td className="px-6 py-4 text-muted">
 {new Date(ev.created_at).toLocaleString()}
 </td>
 <td className="px-6 py-4 text-muted">
 {ev.archived_at ? new Date(ev.archived_at).toLocaleString() : '-'}
 </td>
 <td className="px-6 py-4 text-right">
 <button
 onClick={() => handleInspectEvent(ev.id)}
 className="text-xs bg-zinc-100 hover:bg-surface-hover px-3 py-1.5 rounded-xl border border-border font-semibold text-secondary transition-colors"
 >
 Inzien
 </button>
 </td>
 </tr>
 ))
 )}
 </tbody>
 </table>
 </div>
 </div>
 </div>
 );
}

export default AdminEvents;
