import React from 'react';

function Card({ title, description, children, className = '', headerAction }) {
  return (
    <div className={`bg-surface border border-border rounded-2xl p-6 shadow-sm ${className}`}>
      {(title || description || headerAction) && (
        <div className="flex justify-between items-start mb-6">
          <div>
            {title && (
              <h2 className="text-xl font-bold tracking-tight text-primary mb-1">
                {title}
              </h2>
            )}
            {description && (
              <p className="text-sm text-muted">
                {description}
              </p>
            )}
          </div>
          {headerAction && (
            <div>
              {headerAction}
            </div>
          )}
        </div>
      )}
      {children}
    </div>
  );
}

export default Card;
