import React from 'react';
import './Card.css';

/**
 * Card Component
 * A highly flexible, responsive, and token-driven card.
 * Defers all outer margin spacing to the parent container.
 * 
 * @param {string} variant - The visual variant of the card (default, compact, feature, section)
 * @param {string} layout - The layout flow (vertical, horizontal)
 * @param {boolean} hasBorder - Whether to show the border (default: true)
 * @param {boolean} hasShadow - Whether to show the shadow (default: true)
 * @param {boolean} hasBackground - Whether to show the background color (default: true)
 * @param {string} className - Additional custom classes
 * @param {React.ReactNode} children - Card content
 */
export const Card = ({
  variant = 'default',
  layout = 'vertical',
  hasBorder = true,
  hasShadow = true,
  hasBackground = true,
  hasRadius = true,
  isHoverable = false,
  removePadding = false,
  removePaddingHorizontal = false,
  removePaddingVertical = false,
  columns,
  className = '',
  children,
  ...props
}) => {
  const baseClass = 'card';
  const variantClass = variant !== 'default' ? `card--variant-${variant}` : '';
  const layoutClass = layout !== 'vertical' ? `card--layout-${layout}` : '';
  const hoverableClass = isHoverable ? 'card--hoverable' : '';
  const columnsClass = columns === 2 ? 'card--columns-2' : '';
  
  // Toggle classes
  const borderClass = !hasBorder ? 'card--no-border' : '';
  const shadowClass = !hasShadow ? 'card--no-shadow' : '';
  const backgroundClass = !hasBackground ? 'card--no-background' : '';
  const radiusClass = !hasRadius ? 'card--no-radius' : '';

  // Padding classes
  const paddingClass = removePadding ? 'card--no-padding' : '';
  const paddingHorizontalClass = removePaddingHorizontal ? 'card--no-padding-horizontal' : '';
  const paddingVerticalClass = removePaddingVertical ? 'card--no-padding-vertical' : '';

  const combinedClassName = [
    baseClass, 
    variantClass, 
    layoutClass, 
    hoverableClass,
    columnsClass,
    borderClass, 
    shadowClass, 
    backgroundClass, 
    radiusClass,
    paddingClass,
    paddingHorizontalClass,
    paddingVerticalClass,
    className
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <article className={combinedClassName} {...props}>
      {children}
    </article>
  );
};

export const CardHeader = ({ align = 'left', className = '', children, ...props }) => {
  return (
    <header className={`card-header card--align-${align} ${className}`} {...props}>
      {children}
    </header>
  );
};

export const CardBody = ({ align = 'left', className = '', children, ...props }) => {
  return (
    <div className={`card-body card--align-${align} ${className}`} {...props}>
      {children}
    </div>
  );
};

export const CardMeta = ({ align = 'left', className = '', children, ...props }) => {
  return (
    <aside className={`card-meta card--align-${align} ${className}`} {...props}>
      {children}
    </aside>
  );
};

export const CardActions = ({ align = 'left', className = '', children, ...props }) => {
  return (
    <footer className={`card-actions card--align-${align} ${className}`} {...props}>
      {children}
    </footer>
  );
};

// Assign sub-components for compound pattern
Card.Header = CardHeader;
Card.Body = CardBody;
Card.Meta = CardMeta;
Card.Actions = CardActions;

export default Card;
