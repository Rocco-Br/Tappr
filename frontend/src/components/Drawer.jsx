import React from 'react';
import { createPortal } from 'react-dom';

function Drawer({ isOpen, onClose, title, description, children, footer }) {
  if (typeof document === 'undefined') return null;

  return createPortal(
    <>
      {/* Slide-over Drawer Backdrop overlay */}
      <div 
        onClick={onClose}
        className={`fixed inset-0 bg-black/40 backdrop-blur-sm z-50 transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* Slide-over Drawer container */}
      <div className={`fixed right-0 top-0 bottom-0 w-full max-w-md bg-surface z-50 shadow-2xl flex flex-col justify-between transition-transform duration-300 ease-out transform ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}>
        {/* Drawer Header */}
        <div className="p-6 border-b border-border flex justify-between items-center">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-primary">
              {title}
            </h2>
            {description && (
              <p className="text-xs text-muted mt-0.5">
                {description}
              </p>
            )}
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-surface text-muted flex items-center justify-center transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Drawer Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {children}
        </div>
        
        {/* Drawer Footer */}
        {footer && (
          <div className="p-6 border-t border-border bg-zinc-50">
            {footer}
          </div>
        )}
      </div>
    </>,
    document.body
  );
}

export default Drawer;
