import React from 'react';
import { Link } from 'react-router-dom';
import './Button.css';

/**
 * Robust Button component that handles actions (button), internal navigation (Link),
 * and external navigation (a).
 */
const Button = ({ 
  children, 
  variant = 'primary', 
  size = 'md',
  fullWidth = false,
  loading = false,
  disabled = false,
  to,
  href,
  onClick,
  icon,
  iconPosition = 'left',
  ...props 
}) => {
  // Combine classes
  const classes = [
    'btn',
    `btn--${variant}`,
    `btn--${size}`,
    fullWidth ? 'btn--full-width' : '',
    loading ? 'is-loading' : '',
  ].filter(Boolean).join(' ');

  const content = (
    <>
      {loading && <span className="btn-spinner"></span>}
      {!loading && icon && iconPosition === 'left' && <span className="btn-icon btn-icon--left">{icon}</span>}
      <span className="btn-text">{children}</span>
      {!loading && icon && iconPosition === 'right' && <span className="btn-icon btn-icon--right">{icon}</span>}
    </>
  );

  // Intelligent element selection
  if (to) {
    return (
      <Link to={to} className={classes} {...props}>
        {content}
      </Link>
    );
  }

  if (href) {
    return (
      <a href={href} className={classes} target="_blank" rel="noopener noreferrer" {...props}>
        {content}
      </a>
    );
  }

  return (
    <button 
      className={classes} 
      onClick={onClick} 
      disabled={disabled || loading} 
      {...props}
    >
      {content}
    </button>
  );
};

export default Button;


