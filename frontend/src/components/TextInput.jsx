import React from 'react';
import { X } from 'lucide-react';
import './TextInput.css';

const TextInput = ({
  value = '',
  onChange,
  onClear,
  placeholder = '',
  icon: Icon,
  disabled = false,
  error = '',
  type = 'text',
  name = '',
  id = '',
  className = '',
  ...props
}) => {
  const showClear = onClear && value && !disabled;

  return (
    <div className={`text-input-wrapper ${error ? 'has-error' : ''} ${disabled ? 'is-disabled' : ''} ${className}`}>
      <div className="text-input-field-container">
        {Icon && <Icon className="text-input-icon" size={18} />}
        <input
          type={type}
          id={id}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          className={`text-input-field ${Icon ? 'has-icon' : ''} ${showClear ? 'has-clear' : ''}`}
          {...props}
        />
        {showClear && (
          <button
            type="button"
            onClick={onClear}
            className="text-input-clear-btn"
            aria-label="Xóa nội dung"
          >
            <X size={16} />
          </button>
        )}
      </div>
      {error && <span className="text-input-error-msg">{error}</span>}
    </div>
  );
};

export default TextInput;
