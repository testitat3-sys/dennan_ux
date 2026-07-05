import React from 'react';
import './Card.css';

/**
 * Strips margin utility classes to enforce layout contracts.
 * Matches formats like m-4, -mt-2, my-[20px], ml-auto.
 */
const sanitizeClassName = (className) => {
  if (!className || typeof className !== 'string') return '';

  const marginRegex = /\b-?m[trblxy]?-(?:[a-zA-Z0-9.-]+|\[[^\]]+\])\b/g;

  if (marginRegex.test(className)) {
    console.warn(
      `Layout restriction enforced: Margin utilities are prohibited on Card components. Stripped from: "${className}"`
    );
  }

  return className.replace(marginRegex, '').replace(/\s+/g, ' ').trim();
};

/**
 * Card Component
 * A highly flexible, responsive, and token-driven card.
 * Defers all outer margin spacing to the parent container.
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
  const safeClassName = sanitizeClassName(className);

  const baseClass = 'card';
  const variantClass = variant !== 'default' ? `card--variant-${variant}` : '';
  const layoutClass = layout !== 'vertical' ? `card--layout-${layout}` : '';
  const hoverableClass = isHoverable ? 'card--hoverable' : '';
  const columnsClass = columns ? `card--columns-${columns}` : '';

  const borderClass = !hasBorder ? 'card--no-border' : '';
  const shadowClass = !hasShadow ? 'card--no-shadow' : '';
  const backgroundClass = !hasBackground ? 'card--no-background' : '';
  const radiusClass = !hasRadius ? 'card--no-radius' : '';

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
    safeClassName
  ]
    .filter(Boolean)
    .join(' ')
    .trim();

  return (
    <article className={combinedClassName} {...props}>
      {children}
    </article>
  );
};

export const CardHeader = ({ align = 'left', className = '', children, ...props }) => {
  const safeClassName = sanitizeClassName(className);
  return (
    <header className={`card-header card--align-${align} ${safeClassName}`.trim()} {...props}>
      {children}
    </header>
  );
};

export const CardBody = ({ align = 'left', className = '', children, ...props }) => {
  const safeClassName = sanitizeClassName(className);
  return (
    <div className={`card-body card--align-${align} ${safeClassName}`.trim()} {...props}>
      {children}
    </div>
  );
};

export const CardMeta = ({ align = 'left', className = '', children, ...props }) => {
  const safeClassName = sanitizeClassName(className);
  return (
    <aside className={`card-meta card--align-${align} ${safeClassName}`.trim()} {...props}>
      {children}
    </aside>
  );
};

export const CardActions = ({ align = 'left', className = '', children, ...props }) => {
  const safeClassName = sanitizeClassName(className);
  return (
    <footer className={`card-actions card--align-${align} ${safeClassName}`.trim()} {...props}>
      {children}
    </footer>
  );
};

Card.Header = CardHeader;
Card.Body = CardBody;
Card.Meta = CardMeta;
Card.Actions = CardActions;

export default Card;