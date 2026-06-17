import React from 'react';
import { createPortal } from 'react-dom';

function Modal({ isOpen, onClose, children, className = '', showCloseButton = false }) {
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity duration-200 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
      {/* Backdrop click to close */}
      <div className="absolute inset-0" onClick={onClose} />
      
      {/* Modal Container */}
      <div className={`relative w-full max-w-sm bg-surface rounded-3xl shadow-2xl overflow-hidden transform transition-all duration-300 ${isOpen ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'} ${className}`}>
        {showCloseButton && (
          <button 
            onClick={onClose}
            className="absolute right-4 top-4 z-10 w-7 h-7 bg-black/10 hover:bg-black/20 rounded-full flex items-center justify-center text-zinc-700 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        )}
        {children}
      </div>
    </div>,
    document.body
  );
}

export default Modal;
