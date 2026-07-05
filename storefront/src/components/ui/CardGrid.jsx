import React from 'react';
import './Page.css';

/**
 * Strips margin utility classes to enforce layout contracts.
 */
const sanitizeClassName = (className) => {
  if (!className || typeof className !== 'string') return '';

  const marginRegex = /\b-?m[trblxy]?-(?:[a-zA-Z0-9.-]+|\[[^\]]+\])\b/g;

  if (marginRegex.test(className)) {
    console.warn(
      `Layout restriction enforced: Margin utilities are prohibited on CardGrid components. Stripped from: "${className}"`
    );
  }

  return className.replace(marginRegex, '').replace(/\s+/g, ' ').trim();
};

/* ─── CardGrid ──────────────────────────────────────────────────────
 * A thin layout-only grid wrapper for Card components (or any items).
 *
 * Responsibilities:
 * - Owns gap between items (via tokens from Page.css).
 * - Owns grid-template-columns.
 * - Nothing else — no padding, no margin, no overflow.
 *
 * Must always live inside a Page.Section or Page.HorizontalScroller.
 * Never introduces external spacing of its own.
 *
 * @param {string}        gap      - 'tight' | 'default' | 'loose'. Default: 'default'
 * @param {2|3|4|'auto'}  columns  - Fixed column count or fluid 'auto'. Default: 'auto'
 * @param {string}        className - Additional classes
 * @param {node}          children - Card (or any) items
 * ─────────────────────────────────────────────────────────────────── */
const CardGrid = ({
  gap = 'default',
  columns = 'auto',
  mobileColumns = 'auto',
  className = '',
  children,
  ...props
}) => {
  const safeClassName = sanitizeClassName(className);

  const classes = [
    'card-grid',
    gap !== 'default' ? `card-grid--${gap}` : '',
    columns !== 'auto' ? `card-grid--${columns}col` : '',
    mobileColumns !== 'auto' ? `card-grid--m-${mobileColumns}col` : '',
    safeClassName,
  ].filter(Boolean).join(' ').trim();

  return (
    <div className={classes} style={{ margin: 0, ...props.style }} {...props}>
      {children}
    </div>
  );
};

export default CardGrid;