import React from 'react';
import './EmptyState.css';

const EmptyState = ({ icon: Icon, title, description }) => {
  return (
    <div className="empty-state-container">
      {Icon && (
        <Icon 
          size={40} 
          className="empty-state-icon" 
        />
      )}
      <h5 className="empty-state-title">{title}</h5>
      {description && <p className="empty-state-description">{description}</p>}
    </div>
  );
};

export default EmptyState;
