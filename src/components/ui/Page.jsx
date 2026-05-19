import React from 'react';
import './Page.css';

/* ─── Page ──────────────────────────────────────────────────────────
 * Outermost layout shell.
 *
 * Responsibilities:
 *   - Applies safe-area padding-inline via tokens (scales with viewport).
 *   - Prevents horizontal overflow from any child.
 *   - Provides --current-page-padding-x to children via CSS cascade.
 *
 * Rules for children:
 *   - Must NOT set outer margin-* for alignment; use layout props instead.
 *   - Must NOT use width: 100vw or negative margins to escape padding
 *     unless wrapped in Page.Section fullBleed or Page.HorizontalScroller.
 *
 * @param {string}  as        - Root element tag. Default: 'div'
 * @param {string}  className - Additional classes
 * @param {node}    children  - Page content
 * ─────────────────────────────────────────────────────────────────── */
export const Page = ({
  as: Tag = 'div',
  noPaddingTop = false,
  className = '',
  children,
  ...props
}) => {
  const classes = [
    'page',
    noPaddingTop ? 'page--no-padding-top' : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <Tag className={classes} {...props}>
      {children}
    </Tag>
  );
};

/* ─── Page.Section ──────────────────────────────────────────────────
 * A content section within the Page.
 *
 * Default (constrained): centers content to page-max-width within
 *   the Page's padding-inline.
 *
 * fullBleed: stretches to viewport edges by compensating for the
 *   Page's padding-inline, then re-applies padding so inner content
 *   is still safe. Use .page-section__inner inside to further
 *   constrain content to page-max-width if needed.
 *
 * Vertical spacing between sections is managed by .page-section + .page-section
 * margin-top rules (via tokens), not by children.
 *
 * Any text rendered inside (including the optional title) inherits
 * normal typography from the cascade. Margin on text elements is
 * overridden to 0 — vertical rhythm is the Section's job via gap.
 *
 * @param {boolean} fullBleed - Stretch edge-to-edge. Default: false
 * @param {string}  spacing   - 'tight' | 'default' | 'loose'. Default: 'default'
 * @param {string}  title     - Optional heading text. Renders as <h2> by default,
 *                              but accepts full typography styling via titleClassName.
 *                              Margin is always overridden to 0.
 * @param {string}  titleAs   - Tag for the title element. Default: 'h2'
 * @param {string}  titleClassName - Extra classes on the title element
 * @param {string}  as        - Root element tag. Default: 'section'
 * @param {string}  className - Additional classes on the section
 * @param {node}    children  - Section content
 * ─────────────────────────────────────────────────────────────────── */
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
  const classes = [
    'page-section',
    fullBleed ? 'page-section--full-bleed' : '',
    noPadding ? 'page-section--no-padding' : '',
    spacing !== 'default' ? `page-section--${spacing}` : '',
    className,
  ].filter(Boolean).join(' ');

  const content = (
    <>
      {title && (
        /* Typography is fully styleable via titleClassName.
         * margin: 0 is enforced by .page-section__title in CSS. */
        <TitleTag className={['page-section__title', titleClassName].filter(Boolean).join(' ')}>
          {title}
        </TitleTag>
      )}
      {children}
    </>
  );

  return (
    <Tag className={classes} {...props}>
      {fullBleed && !noPadding ? (
        /* Inner wrapper constrains full-bleed section content back to page-max-width */
        <div className="page-section__inner">
          {content}
        </div>
      ) : content}
    </Tag>
  );
};

/* ─── Page.HorizontalScroller ───────────────────────────────────────
 * An explicit horizontal scroll area.
 *
 * Escapes Page's padding-inline to reach viewport edges, then
 * restores padding-inline so first/last items are still safe-padded.
 *
 * Children must have an explicit or natural width — they will not
 * stretch to fill the scroll container (flex: 0 0 auto).
 *
 * @param {string} gap       - 'tight' | 'default' | 'loose'. Default: 'default'
 * @param {string} className - Additional classes
 * @param {node}   children  - Scroll items
 * ─────────────────────────────────────────────────────────────────── */
export const PageHorizontalScroller = ({
  gap = 'default',
  className = '',
  children,
  ...props
}) => {
  const classes = [
    'page-hscroller',
    gap !== 'default' ? `page-hscroller--${gap}` : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <div className={classes} {...props}>
      {children}
    </div>
  );
};

/* ─── Compound assignment ───────────────────────────────────────────
 * Mirrors the Card compound pattern:
 *   <Page.Section />
 *   <Page.HorizontalScroller />
 * ─────────────────────────────────────────────────────────────────── */
Page.Section            = PageSection;
Page.HorizontalScroller = PageHorizontalScroller;

export default Page;
