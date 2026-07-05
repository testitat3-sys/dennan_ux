import React from 'react';
import './Page.css';

/**
 * Strips margin utility classes to enforce layout contracts.
 * Matches formats like m-4, -mt-2, my-[20px], ml-auto.
 */
const sanitizeClassName = (className) => {
  if (!className || typeof className !== 'string') return '';

  const marginRegex = /\b-?m[trblxy]?-(?:[a-zA-Z0-9.-]+|\[[^\]]+\])\b/g;

  if (marginRegex.test(className)) {
    console.warn(
      `Layout restriction enforced: Margin utilities are strictly prohibited on Page components. Stripped from: "${className}"`
    );
  }

  return className.replace(marginRegex, '').replace(/\s+/g, ' ').trim();
};

/* ─── Page ────────────────────────────────────────────────────────── */
export const Page = ({
  as: Tag = 'div',
  noPaddingTop = false,
  padding = 'default',
  bottomSpacing = 'default',
  maxWidth = 'full',
  className = '',
  children,
  ...props
}) => {
  const safeClassName = sanitizeClassName(className);

  const classes = [
    'page',
    noPaddingTop ? 'page--no-padding-top' : '',
    padding !== 'default' ? `page--padding-${padding}` : '',
    bottomSpacing !== 'default' ? `page--bottom-${bottomSpacing}` : '',
    maxWidth !== 'full' ? `page--max-width-${maxWidth}` : '',
    safeClassName
  ].filter(Boolean).join(' ');

  return (
    <Tag className={classes} {...props}>
      {children}
    </Tag>
  );
};

/* ─── Page.Section ────────────────────────────────────────────────── */
export const PageSection = ({
  fullBleed = false,
  noPadding = false,
  spacing = 'default',
  title,
  titleAs: TitleTag = 'h2',
  titleClassName = '',
  as: Tag = 'section',
  className = '',
  children,
  ...props
}) => {
  const safeClassName = sanitizeClassName(className);
  const safeTitleClassName = sanitizeClassName(titleClassName);

  const classes = [
    'page-section',
    fullBleed ? 'page-section--full-bleed' : '',
    noPadding ? 'page-section--no-padding' : '',
    spacing !== 'default' ? `page-section--${spacing}` : '',
    safeClassName,
  ].filter(Boolean).join(' ');

  const content = (
    <>
      {title && (
        <TitleTag className={`page-section__title ${safeTitleClassName}`.trim()}>
          {title}
        </TitleTag>
      )}
      {children}
    </>
  );

  return (
    <Tag className={classes} {...props}>
      {fullBleed && !noPadding ? (
        <div className="page-section__inner">
          {content}
        </div>
      ) : content}
    </Tag>
  );
};

/* ─── Page.HorizontalScroller ─────────────────────────────────────── */
export const PageHorizontalScroller = ({
  gap = 'default',
  className = '',
  children,
  ...props
}) => {
  const safeClassName = sanitizeClassName(className);

  const classes = [
    'page-hscroller',
    gap !== 'default' ? `page-hscroller--${gap}` : '',
    safeClassName,
  ].filter(Boolean).join(' ');

  return (
    <div className={classes} {...props}>
      {children}
    </div>
  );
};

Page.Section = PageSection;
Page.HorizontalScroller = PageHorizontalScroller;

export default Page;