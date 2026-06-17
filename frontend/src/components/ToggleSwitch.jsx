import React from 'react';

export default function ToggleSwitch({ checked, onChange, label, description }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer group">
      <div 
        className={`w-10 h-6 flex items-center rounded-full p-1 transition-colors duration-200 ${
          checked ? 'bg-primary' : 'bg-zinc-300 dark:bg-zinc-600'
        }`}
      >
        <div 
          className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
            checked ? 'translate-x-4' : 'translate-x-0'
          }`} 
        />
      </div>
      {(label || description) && (
        <div>
          {label && (
            <span className="text-sm font-semibold text-primary group-hover:text-primary-hover transition-colors block">
              {label}
            </span>
          )}
          {description && (
            <span className="text-xs text-muted">
              {description}
            </span>
          )}
        </div>
      )}
      <input 
        type="checkbox" 
        checked={checked} 
        onChange={onChange} 
        className="hidden" 
      />
    </label>
  );
}
