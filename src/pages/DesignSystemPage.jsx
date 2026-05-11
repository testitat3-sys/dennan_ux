import React, { useState } from 'react';
import './DesignSystemPage.css';
import Button from '../components/ui/Button';
import ProductCard from '../components/ui/ProductCard';
import ProductCardSkeleton from '../components/ui/ProductCardSkeleton';
import TierCard from '../components/ui/TierCard';
import StageTile from '../components/ui/StageTile';
import QuickViewModal from '../components/ui/QuickViewModal';
import { useCart } from '../context/CartContext';

// Import Assets
import essentialsImg from '../assets/design_system/essentials_tier.png';
import newbornImg from '../assets/design_system/newborn_journey.png';
import productImg from '../assets/design_system/product_sample.png';

const DesignSystemPage = () => {
  const { setIsCartOpen } = useCart();
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  const paletteA = [
    { name: 'Brand Primary', var: '--color-brand-primary', hex: '#D35097', desc: 'Hero highlights, key interactive accents.' },
    { name: 'Brand Primary Dark', var: '--color-brand-primary-dark', hex: '#A63E74', desc: 'Hover and active pressed states.' },
    { name: 'Brand Primary Light', var: '--color-brand-primary-light', hex: '#F07FB8', desc: 'Badge background shades.' },
    { name: 'Brand Secondary', var: '--color-brand-secondary', hex: '#832C7A', desc: 'Footer background tones.' },
    { name: 'Brand Accent', var: '--color-brand-accent', hex: '#E1D328', desc: 'Alert badges and sale listings.' },
    { name: 'Anchor', var: '--color-anchor', hex: '#111111', desc: 'Active high contrast titles.' },
    { name: 'On Primary', var: '--color-on-primary', hex: '#FFFFFF', desc: 'Icon and text overlays.' },
    { name: 'Gallery White', var: '--color-gallery-white', hex: '#FFFFFF', desc: 'Backdrop base canvas.' },
    { name: 'Text Primary', var: '--text-primary', hex: 'var(--color-anchor)', desc: 'Primary reading body text (Variable).' },
    { name: 'Text Secondary', var: '--text-secondary', hex: '#555555', desc: 'Muted body descriptions.' },
    { name: 'Text Tertiary', var: '--text-tertiary', hex: '#888888', desc: 'Subtle caption labels.' },
    { name: 'Support Blue', var: '--color-support-blue', hex: '#4DBEE3', desc: 'Informational states, Newborn stage theming.' },
    { name: 'Support Green', var: '--color-support-green', hex: '#7FA93E', desc: 'Success states, Essentials tier theming.' },
    { name: 'Support Red', var: '--color-support-red', hex: '#E53E3E', desc: 'Error panels and alerts.' },
    { name: 'Surface Base', var: '--surface', hex: '#FFFFFF', desc: 'Primary paper container level.' },
    { name: 'Surface Container Low', var: '--surface-container-low', hex: '#FAF9F8', desc: 'Underlying drawer elevations.' },
    { name: 'Surface Container', var: '--surface-container', hex: '#F4F2F0', desc: 'Default content frame wrapper.' },
    { name: 'Surface Container High', var: '--surface-container-high', hex: '#EDE9E5', desc: 'Dividers and border offsets.' },
    { name: 'Surface Container Highest', var: '--surface-container-highest', hex: '#E5E0DB', desc: 'Deep border contrast lines.' }
  ];

  const paletteB = [
    { name: 'Brand Primary', var: '--color-brand-primary', hex: '#d35097', desc: 'Hero highlights, key interactive accents.' },
    { name: 'Brand Primary Dark', var: '--color-brand-primary-dark', hex: '#a63e74', desc: 'Hover and active pressed states.' },
    { name: 'Brand Primary Light', var: '--color-brand-primary-light', hex: '#f07fb8', desc: 'Badge background shades.' },
    { name: 'Brand Secondary', var: '--color-brand-secondary', hex: '#832c7a', desc: 'Footer background tones.' },
    { name: 'Brand Accent', var: '--color-brand-accent', hex: '#e1d328', desc: 'Alert badges and sale listings.' },
    { name: 'Anchor', var: '--color-anchor', hex: '#111111', desc: 'Active high contrast titles.' },
    { name: 'On Primary', var: '--color-on-primary', hex: '#ffffff', desc: 'Icon and text overlays.' },
    { name: 'Gallery White', var: null, hex: null, desc: 'Not specified in this palette configuration.' },
    { name: 'Text Primary', var: '--text-primary', hex: '#111111', desc: 'Primary reading body text (Direct Hex).' },
    { name: 'Text Secondary', var: '--text-secondary', hex: '#555555', desc: 'Muted body descriptions.' },
    { name: 'Text Tertiary', var: '--text-tertiary', hex: '#888888', desc: 'Subtle caption labels.' },
    { name: 'Support Blue', var: null, hex: null, desc: 'Not specified in this palette configuration.' },
    { name: 'Support Green', var: '--color-support-green', hex: '#7fa93e', desc: 'Success states, Essentials tier theming.' },
    { name: 'Support Red', var: '--color-support-red', hex: '#e53e3e', desc: 'Error panels and alerts.' },
    { name: 'Surface Base', var: '--surface', hex: '#ffffff', desc: 'Primary paper container level.' },
    { name: 'Surface Container Low', var: '--surface-container-low', hex: '#faf9f8', desc: 'Underlying drawer elevations.' },
    { name: 'Surface Container', var: '--surface-container', hex: '#f4f2f0', desc: 'Default content frame wrapper.' },
    { name: 'Surface Container High', var: '--surface-container-high', hex: '#ede9e5', desc: 'Dividers and border offsets.' },
    { name: 'Surface Container Highest', var: '--surface-container-highest', hex: '#e5e0db', desc: 'Deep border contrast lines.' }
  ];

  const typography = [
    { role: 'Display-LG', font: 'Newsreader', size: '5rem', class: 'display-lg-demo' },
    { role: 'Display-SM', font: 'Newsreader', size: '3.5rem', class: 'display-sm-demo' },
    { role: 'Headline-LG', font: 'Newsreader', size: '2.25rem', class: 'headline-lg-demo' },
    { role: 'Headline-MD', font: 'Newsreader', size: '1.75rem', class: 'headline-md-demo' },
    { role: 'Headline-SM', font: 'Newsreader', size: '1.5rem', class: 'headline-sm-demo' },
    { role: 'Title-LG', font: 'Plus Jakarta Sans', size: '1.25rem', class: 'title-lg-demo' },
    { role: 'Title-SM', font: 'Plus Jakarta Sans', size: '1.125rem', class: 'title-sm-demo' },
    { role: 'Body-LG', font: 'Plus Jakarta Sans', size: '1rem', class: 'body-lg-demo' },
    { role: 'Body-SM', font: 'Plus Jakarta Sans', size: '0.875rem', class: 'body-sm-demo' },
    { role: 'Label-MD', font: 'Plus Jakarta Sans', size: '0.75rem', class: 'label-md-demo' },
    { role: 'Label-SM', font: 'Plus Jakarta Sans', size: '0.625rem', class: 'label-sm-demo' },
  ];

  const mockProduct = {
    id: 'ds-1',
    name: 'Luxury Botanical Skincare',
    price: 'UGX 85,000',
    image: productImg,
    tier: 'Must-Haves',
    badge: 'Limited Edition',
    tags: [{ type: 'primary', text: 'Natural' }]
  };

  const mockTier = {
    id: 'essentials',
    title: 'The Essentials',
    badge: 'Daily Staples',
    copy: 'Curated everyday staples designed for comfort and quality throughout every journey stage.',
    image: essentialsImg,
    type: 'essentials',
    href: '#'
  };

  const mockStage = {
    id: 'newborn',
    title: 'Newborn Journey',
    description: 'Nurturing the first 100 days with clinical precision and botanical warmth.',
    image: newbornImg,
    type: 'newborn'
  };

  const productTags = [
    {
      name: 'Sales Velocity Tag (Special)',
      className: 'tag tag--sales',
      varName: 'var(--color-brand-primary-dark)',
      desc: 'Builds quick social proof showing items sold to inspire buyer trust and immediate interest. Features a premium deep brand hue.',
      exampleText: '1k+ sold'
    },
    {
      name: 'Brand Primary Tag',
      className: 'tag tag--primary',
      varName: 'var(--color-brand-primary)',
      desc: 'For top-priority community accolades or product tier labels such as active best sellers.',
      exampleText: 'Best Seller'
    },
    {
      name: 'Brand Secondary Tag',
      className: 'tag tag--secondary',
      varName: 'var(--color-brand-secondary)',
      desc: 'Used for secondary awards or alternative status badges.',
      exampleText: 'Top Rated'
    },
    {
      name: 'Support Green Tag',
      className: 'tag tag--support-green',
      varName: 'var(--color-support-green)',
      desc: 'Suggests pure organic origins, natural material properties, eco-certifications, or sustainability.',
      exampleText: 'Organic'
    },
    {
      name: 'Support Blue Tag',
      className: 'tag tag--support-blue',
      varName: 'var(--color-support-blue)',
      desc: 'Used for clinical or soft technical attributes such as dermatological testing or anatomical shape.',
      exampleText: 'Natural'
    },
    {
      name: 'Support Red Tag',
      className: 'tag tag--support-red',
      varName: 'var(--color-support-red)',
      desc: 'Denotes out-of-stock items, immediate urgency warnings, low stock pressure, or limited edition drops.',
      exampleText: 'Out of Stock'
    },
    {
      name: 'Value & Promo Tag',
      className: 'tag tag--accent',
      varName: 'var(--color-brand-accent)',
      desc: 'Highlights active customer savings, specific discounts, percent reductions, or limited promo deals.',
      exampleText: '25% OFF'
    }
  ];

  return (
    <div className="ds-page">
      <header className="ds-header">
        <span className="label-md">System Documentation</span>
        <h1 className="ds-title">Editorial Soft-Modernism</h1>
        <p className="ds-subtitle">
          The Tactile Curator philosophy: A digital experience that feels like a physical lookbook. 
          Bespoke, premium, and alive.
        </p>
      </header>

      {/* 1. COLORS */}
      <section className="ds-section">
        <div className="ds-section__header">
          <h2 className="ds-section__title">Color Palette Showcase</h2>
          <p className="ds-section__desc">Compare the active production theme with the minimalist alternative layout side-by-side.</p>
        </div>

        <div className="ds-palette-compare">
          {/* Palette A Column */}
          <div className="ds-palette-column">
            <h3 className="ds-palette-col-title">Palette A: Current Production</h3>
            <p className="ds-palette-col-desc">Active application configuration featuring Blue theme accents and dynamic variables fallback.</p>
            <div className="ds-color-grid" style={{ display: 'grid' }}>
              {paletteA.map((color) => (
                <div key={color.name} className="ds-color-card">
                  <div className="ds-color-swatch" style={{ backgroundColor: `var(${color.var})` }}></div>
                  <div className="ds-color-info">
                    <span className="ds-color-name">{color.name}</span>
                    <code className="ds-color-var">{color.var}</code>
                    <span className="ds-color-hex">{color.hex}</span>
                    <p className="ds-color-desc">{color.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Palette B Column */}
          <div className="ds-palette-column">
            <h3 className="ds-palette-col-title">Palette B: Minimalist Alternative</h3>
            <p className="ds-palette-col-desc">Streamlined configuration omitting Gallery White and Support Blue, with Text Primary mapped directly to Hex.</p>
            <div className="ds-color-grid" style={{ display: 'grid' }}>
              {paletteB.map((color) => (
                <div key={color.name} className="ds-color-card">
                  {color.hex ? (
                    <div className="ds-color-swatch" style={{ backgroundColor: color.hex }}></div>
                  ) : (
                    <div className="ds-color-swatch ds-color-swatch--empty"></div>
                  )}
                  <div className="ds-color-info">
                    <span className="ds-color-name">{color.name}</span>
                    <code className="ds-color-var" style={{ color: color.var ? 'var(--color-brand-primary)' : 'var(--text-tertiary)' }}>
                      {color.var || 'N/A'}
                    </code>
                    <span className="ds-color-hex">{color.hex || 'Omitted'}</span>
                    <p className="ds-color-desc">{color.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 2. TYPOGRAPHY */}
      <section className="ds-section">
        <div className="ds-section__header">
          <h2 className="ds-section__title">Typography</h2>
          <p className="ds-section__desc">A balance of heritage authority and modern functionality.</p>
        </div>
        <div className="ds-typo-stack">
          {typography.map((typo) => (
            <div key={typo.role} className="ds-typo-item">
              <div className="ds-typo-meta">
                <span className="ds-typo-role">{typo.role}</span>
                <span className="ds-typo-spec">{typo.font} • {typo.size}</span>
              </div>
              <div className={`ds-typo-preview ${typo.class}`}>
                The quick brown fox jumps over the lazy dog
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 3. SURFACES */}
      <section className="ds-section">
        <div className="ds-section__header">
          <h2 className="ds-section__title">Surface Hierarchy</h2>
          <p className="ds-section__desc">Treating the UI as a series of physical paper layers.</p>
        </div>
        <div className="ds-surface-demo">
          <div className="ds-surface-base">
            <span className="ds-surface-label">Base (Gallery White)</span>
            <div className="ds-surface-l1">
              <span className="ds-surface-label">Layer 1 (Container Low)</span>
              <div className="ds-surface-l2">
                <span className="ds-surface-label">Layer 2 (Container)</span>
                <div className="ds-surface-l3">
                  <span className="ds-surface-label">Layer 3 (Container High)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. MODALS & OVERLAYS */}
      <section className="ds-section">
        <div className="ds-section__header">
          <h2 className="ds-section__title">Modals & Overlays</h2>
          <p className="ds-section__desc">Deep immersion through blurry backdrops and tonal layering.</p>
        </div>
        <div className="ds-modal-demo-grid">
          <div className="ds-modal-card">
            <h3 className="ds-label">Cart Drawer</h3>
            <p className="ds-modal-desc">A right-aligned drawer with a blurry backdrop and urgency elements.</p>
            <Button onClick={() => setIsCartOpen(true)}>Trigger Cart Drawer</Button>
          </div>
          <div className="ds-modal-card">
            <h3 className="ds-label">Quick View Modal</h3>
            <p className="ds-modal-desc">Central focus on product details with seamless transition to success state.</p>
            <Button variant="secondary" onClick={() => setIsPreviewModalOpen(true)}>Trigger Quick View</Button>
          </div>
        </div>
      </section>

      {/* 5. INTERACTIVE ELEMENTS */}
      <section className="ds-section">
        <div className="ds-section__header">
          <h2 className="ds-section__title">Interactive Elements</h2>
          <p className="ds-section__desc">Functional anchors with sophisticated states.</p>
        </div>
        <div className="ds-interactive-grid">
          <div className="ds-interactive-col">
            <h3 className="ds-sub-title">Buttons</h3>
            <div className="ds-button-list">
              <div className="ds-button-group">
                <span className="ds-label">Primary</span>
                <Button>Primary Action</Button>
              </div>
              <div className="ds-button-group">
                <span className="ds-label">Secondary / Ghost</span>
                <Button variant="secondary">Secondary Action</Button>
              </div>
            </div>
          </div>
          <div className="ds-interactive-col">
            <h3 className="ds-sub-title">Input Fields</h3>
            <div className="ds-input-demo">
              <label className="ds-label">Standard Input</label>
              <div className="ds-input-wrap">
                <input type="text" placeholder="Start typing..." />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. PRODUCT TAGS & BADGES SHOWCASE */}
      <section className="ds-section">
        <div className="ds-section__header">
          <h2 className="ds-section__title">Product Tags & Badges</h2>
          <p className="ds-section__desc">
            Clean, high-contrast, rounded label markers with solid colored backgrounds and absolutely no icons. Each tag is mapped directly to a CSS variable name.
          </p>
        </div>

        <div className="ds-tags-grid">
          {productTags.map((tag) => (
            <div key={tag.name} className="ds-tag-card">
              <div className="ds-tag-preview-wrap">
                <span className={tag.className}>{tag.exampleText}</span>
              </div>
              <div className="ds-tag-meta-info">
                <span className="ds-tag-title">{tag.name}</span>
                <code className="ds-tag-class-label">.{tag.className.split(' ').join('.')}</code>
                <span className="ds-tag-variable-label">{tag.varName}</span>
                <p className="ds-tag-desc">{tag.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 7. COMPONENTS */}
      <section className="ds-section">
        <div className="ds-section__header">
          <h2 className="ds-section__title">UI Components</h2>
          <p className="ds-section__desc">High-fidelity cards and containers.</p>
        </div>
        <div className="ds-component-grid">
          <div className="ds-component-item">
            <h3 className="ds-label">Product Card</h3>
            <div className="ds-card-preview" style={{ maxWidth: '300px' }}>
              <ProductCard product={mockProduct} />
            </div>
          </div>
          <div className="ds-component-item">
            <h3 className="ds-label">Product Card Skeleton</h3>
            <div className="ds-card-preview" style={{ maxWidth: '300px' }}>
              <ProductCardSkeleton />
            </div>
          </div>
          <div className="ds-component-item">
            <h3 className="ds-label">Tier Card</h3>
            <div className="ds-card-preview">
              <TierCard tier={mockTier} />
            </div>
          </div>
          <div className="ds-component-item">
            <h3 className="ds-label">Journey Stage Tile</h3>
            <div className="ds-card-preview" style={{ maxWidth: '350px' }}>
              <StageTile stage={mockStage} />
            </div>
          </div>
        </div>
      </section>

      <QuickViewModal 
        product={mockProduct} 
        isOpen={isPreviewModalOpen} 
        onClose={() => setIsPreviewModalOpen(false)} 
      />
    </div>
  );
};

export default DesignSystemPage;

