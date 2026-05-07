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

  const colors = [
    { name: 'Brand Primary', var: '--color-brand-primary', hex: '#D35097', desc: 'Hero highlights, key interactive accents.' },
    { name: 'Brand Primary Dark', var: '--color-brand-primary-dark', hex: '#A63E74', desc: 'Hover/pressed states.' },
    { name: 'Brand Primary Light', var: '--color-brand-primary-light', hex: '#F07FB8', desc: 'Badge backgrounds, decorative accents.' },
    { name: 'Brand Secondary', var: '--color-brand-secondary', hex: '#832C7A', desc: 'Depth accents, footer tones.' },
    { name: 'Brand Accent', var: '--color-brand-accent', hex: '#E1D328', desc: 'Sale tags, limited-edition markers.' },
    { name: 'Anchor', var: '--color-anchor', hex: '#111111', desc: 'CTA button backgrounds, primary text.' },
    { name: 'Support Blue', var: '--color-support-blue', hex: '#4DBEE3', desc: 'Informational states, Newborn theming.' },
    { name: 'Support Green', var: '--color-support-green', hex: '#7FA93E', desc: 'Success states, Essentials tier.' },
    { name: 'Support Red', var: '--color-support-red', hex: '#E53E3E', desc: 'Error states, destructive actions.' },
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
          <h2 className="ds-section__title">Color Palette</h2>
          <p className="ds-section__desc">Botanical color moments against a gallery-white canvas.</p>
        </div>
        <div className="ds-color-grid">
          {colors.map((color) => (
            <div key={color.var} className="ds-color-card">
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

      {/* 6. COMPONENTS */}
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

