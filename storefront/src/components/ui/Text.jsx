import React from 'react';

/**
 * Reusable and responsive typography component that enforces style guide consistency.
 * Supports the 11 core roles defined in the Design System and maps them to semantic,
 * accessible HTML tags with fluid mobile responsiveness built-in.
 */
const Text = ({ 
  variant = 'body-lg', 
  role, 
  as, 
  color,
  className = '', 
  children, 
  style,
  ...props 
}) => {
  // Define default mapping of roles to semantic HTML tags and CSS utility classes
  const variantMap = {
    'display-lg': { tag: 'h1', className: 'display-lg' },
    'display-sm': { tag: 'h2', className: 'display-sm' },
    'headline-lg': { tag: 'h2', className: 'headline-lg' },
    'headline-md': { tag: 'h3', className: 'headline-md' },
    'headline-sm': { tag: 'h4', className: 'headline-sm' },
    'title-lg': { tag: 'h5', className: 'title-lg' },
    'title-sm': { tag: 'h6', className: 'title-sm' },
    'body-lg': { tag: 'p', className: 'body-lg' },
    'body-sm': { tag: 'p', className: 'body-sm' },
    'label-md': { tag: 'span', className: 'label-md' },
    'label-sm': { tag: 'span', className: 'label-sm' },
  };

  // Predefined color keyword resolution map
  const colorMap = {
    'brand-primary': 'var(--color-brand-primary)',
    'brand-primary-dark': 'var(--color-brand-primary-dark)',
    'brand-primary-light': 'var(--color-brand-primary-light)',
    'brand-secondary': 'var(--color-brand-secondary)',
    'brand-accent': 'var(--color-brand-accent)',
    'anchor': 'var(--color-anchor)',
    'primary': 'var(--text-primary)',
    'secondary': 'var(--text-secondary)',
    'tertiary': 'var(--text-tertiary)',
    'support-blue': 'var(--color-support-blue)',
    'support-green': 'var(--color-support-green)',
    'support-red': 'var(--color-support-red)',
  };

  // Standardize input role/variant (e.g. "Display-LG" -> "display-lg", "headline_md" -> "headline-md")
  const rawVariant = role || variant;
  const cleanVariant = String(rawVariant).toLowerCase().replace('_', '-');
  
  // Resolve configuration (fallback to 'body-lg' if undefined)
  const config = variantMap[cleanVariant] || variantMap['body-lg'];

  // Determine element type: custom override 'as' prop, or semantic default
  const Component = as || config.tag;

  // Build merged classNames list
  const classes = [config.className, className].filter(Boolean).join(' ');

  // Resolve custom prop color or standard value mappings
  const resolvedColor = color && (colorMap[color] || color);
  const mergedStyle = resolvedColor ? { color: resolvedColor, ...style } : style;

  return (
    <Component className={classes} style={mergedStyle} {...props}>
      {children}
    </Component>
  );
};

export default Text;
