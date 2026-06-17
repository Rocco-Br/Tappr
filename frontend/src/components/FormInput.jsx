import React from 'react';

function FormInput({ label, id, as = 'input', className = '', ...props }) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
  
  const baseClassName = "w-full px-4 py-3 bg-background border border-border rounded-xl focus:bg-surface transition-all duration-200 text-sm";
  
  return (
    <div className={`space-y-1 ${className}`}>
      {label && (
        <label htmlFor={inputId} className="block text-xs font-semibold uppercase tracking-wider text-muted">
          {label}
        </label>
      )}
      
      {as === 'textarea' ? (
        <textarea 
          id={inputId}
          className={`${baseClassName} min-h-[100px] resize-y`}
          {...props}
        />
      ) : as === 'select' ? (
        <select
          id={inputId}
          className={baseClassName}
          {...props}
        >
          {props.children}
        </select>
      ) : (
        <input 
          id={inputId}
          type={props.type || 'text'}
          className={baseClassName}
          {...props}
        />
      )}
    </div>
  );
}

export default FormInput;
