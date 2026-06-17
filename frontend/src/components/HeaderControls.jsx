import React, { useState } from 'react';

function HeaderControls({ onLogout, children }) {
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

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={toggleDarkMode}
        className="w-8 h-8 rounded-xl flex items-center justify-center bg-surface hover:bg-surface-hover transition-colors text-muted"
        title={isDark ? "Lichte modus" : "Donkere modus"}
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
      {children}
      <button 
        onClick={onLogout} 
        className="text-xs bg-surface border border-border hover:bg-surface-hover text-secondary font-semibold px-3 py-1.5 rounded-lg transition-all duration-200"
      >
        Uitloggen
      </button>
    </div>
  );
}

export default HeaderControls;
