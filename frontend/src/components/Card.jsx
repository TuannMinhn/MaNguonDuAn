import React from 'react';
import './Card.css';

const Card = ({
  title,
  icon: Icon,
  action,
  children,
  className = '',
  ...props
}) => {
  const hasHeader = title || Icon || action;

  return (
    <div className={`system-card ${className}`} {...props}>
      {hasHeader && (
        <div className="system-card-header">
          <div className="system-card-title-group">
            {Icon && <Icon className="system-card-icon" size={18} />}
            {title && <h3 className="system-card-title">{title}</h3>}
          </div>
          {action && <div className="system-card-action">{action}</div>}
        </div>
      )}
      <div className="system-card-body">
        {children}
      </div>
    </div>
  );
};

export default Card;
