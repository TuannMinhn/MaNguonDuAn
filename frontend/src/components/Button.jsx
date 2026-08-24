import React from 'react';
import './Button.css';

/**
 * Unified Button component — Lab Manage Design System
 * 
 * Variants (semantic role):
 *   primary   — main CTA (Add, Save, Confirm, Submit)
 *   secondary — supporting actions (Export, Filter, Close)
 *   danger    — destructive (Delete, Cancel booking, Reject)
 *   ghost     — low-emphasis table actions (Edit icon, Detail, View)
 * 
 * Legacy variants (passthrough for backward compat):
 *   danger-primary | danger-tertiary | danger-ghost | tertiary
 */
const Button = ({
  variant = 'primary',
  size = 'md',           // sm (32px) | md (40px) | lg (44px)
  icon: Icon,
  iconPosition = 'right', // 'left' | 'right'
  hasIcon = false,
  disabled = false,
  loading = false,
  type = 'button',
  children,
  className = '',
  onClick,
  ...props
}) => {
  const isExpressive = size === 'lg';
  const iconSize = isExpressive ? 20 : 16;

  // Map 4 semantic variants → CSS class names
  const variantMap = {
    primary: 'primary',
    secondary: 'secondary',
    danger: 'danger-primary',
    ghost: 'ghost',
    // legacy passthrough
    'danger-primary': 'danger-primary',
    'danger-tertiary': 'danger-tertiary',
    'danger-ghost': 'danger-ghost',
    tertiary: 'tertiary',
  };
  const resolvedVariant = variantMap[variant] || variant;

  const hasIconResolved = !!(Icon || hasIcon) || loading;

  const classes = [
    'carbon-btn',
    `carbon-btn--${resolvedVariant}`,
    `carbon-btn--${size}`,
    hasIconResolved ? 'carbon-btn--has-icon' : 'carbon-btn--no-icon',
    (resolvedVariant === 'ghost' || resolvedVariant === 'danger-ghost') && hasIconResolved
      ? 'carbon-btn--ghost-icon'
      : '',
    loading ? 'carbon-btn--loading' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const iconEl = Icon && !loading ? (
    <span className="carbon-btn__icon-wrapper">
      <Icon size={iconSize} />
    </span>
  ) : null;

  const spinnerEl = loading ? (
    <span className="carbon-btn__icon-wrapper carbon-btn__spinner">
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        style={{ animation: 'carbon-spin 0.75s linear infinite' }}
      >
        <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
        <path d="M12 2a10 10 0 0 1 10 10" />
      </svg>
    </span>
  ) : null;

  return (
    <button
      type={type}
      className={classes}
      disabled={disabled || loading}
      onClick={onClick}
      {...props}
    >
      {iconPosition === 'left' && (iconEl || spinnerEl)}
      {children && <span className="carbon-btn__label">{children}</span>}
      {iconPosition === 'right' && (iconEl || spinnerEl)}
    </button>
  );
};

export default Button;
