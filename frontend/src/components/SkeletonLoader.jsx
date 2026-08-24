import React from 'react';

const SkeletonLoader = ({ type = 'dashboard', count = 4 }) => {
  if (type === 'dashboard') {
    return (
      <div className="skeleton-grid">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="glass-card skeleton-card">
            <div className="skeleton-avatar"></div>
            <div className="skeleton-body">
              <div className="skeleton-line-1"></div>
              <div className="skeleton-line-2"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Fallback for list/single items
  return (
    <div className="skeleton-loader">
      <div className="skeleton-avatar"></div>
      <div className="skeleton-body">
        <div className="skeleton-line-1"></div>
        <div className="skeleton-line-2"></div>
      </div>
    </div>
  );
};

export default SkeletonLoader;
