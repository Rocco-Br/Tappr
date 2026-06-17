import React, { useState } from 'react';
import axios from 'axios';

function StoreLogin({ setToken, setIsValidUser }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await axios.post('http://localhost:8000/api/auth/login', {
        username,
        password
      });
      // Allow both ADMIN and GUEST roles to log in to the store (admins can test the store, too)
      localStorage.setItem('storeToken', res.data.token);
      setToken(res.data.token);
      setIsValidUser(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Inloggen mislukt. Controleer je gegevens.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-background px-4 py-8 transition-colors duration-200">
      {/* Top spacing */}
      <div className="flex-1 flex items-center justify-center">
        <div className="bg-surface border border-border rounded-2xl shadow-xl p-8 max-w-sm w-full animate-fade-in">
          
          <div className="flex flex-col items-center mb-8">
            <div className="w-14 h-14 bg-black dark:bg-white rounded-2xl flex items-center justify-center mb-4 shadow-md">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-7 h-7 text-white dark:text-black">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
              </svg>
            </div>
            
            <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              Welkom!
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1 text-center">
              Meld je aan om drinken of eten te bestellen
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="text-red-500 bg-red-50 dark:bg-red-950/20 dark:text-red-400 p-3 rounded-xl text-xs border border-red-100 dark:border-red-900/30 animate-pulse-border">
                {error}
              </div>
            )}

            <div className="space-y-1">
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Gebruikersnaam / Tafel
              </label>
              <input 
                type="text" 
                placeholder="Bijv. Tafel 3"
                value={username} 
                onChange={e => setUsername(e.target.value)} 
                className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:bg-white dark:focus:bg-zinc-900 transition-all duration-200 text-sm"
                required 
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Wachtwoord
              </label>
              <input 
                type="password" 
                placeholder="Wachtwoord invoeren"
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:bg-white dark:focus:bg-zinc-900 transition-all duration-200 text-sm"
                required 
              />
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-black hover:bg-zinc-900 dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-black py-3 rounded-xl font-medium shadow-md hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 text-sm mt-2"
            >
              {loading ? 'Inloggen...' : 'Inloggen & Bestellen'}
            </button>
          </form>

        </div>
      </div>
      
      {/* Bottom note */}
      <div className="text-center text-xs text-zinc-400 dark:text-zinc-600">
        Vraag de bar/beheerder om een account en wachtwoord.
      </div>
    </div>
  );
}

export default StoreLogin;
