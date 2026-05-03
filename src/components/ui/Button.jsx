import React from 'react';
import './Button.css';

const Button = ({ children, variant = 'primary', as: Component = 'a', className = '', ...props }) => {
  const baseClass = variant === 'primary' ? 'btn-primary' : 'btn-ghost';
  
  return (
    <Component className={`${baseClass} ${className}`} {...props}>
      {children}
    </Component>
  );
};

export default Button;

