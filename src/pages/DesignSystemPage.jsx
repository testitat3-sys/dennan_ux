import React, { useState } from 'react';
import { ShoppingBag, ArrowRight, Mail, Phone, ExternalLink, Info, CheckCircle, Trash2, Plus } from 'lucide-react';
import './DesignSystemPage.css';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Text from '../components/ui/Text';
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
          <p className="ds-section__desc">Active production theme configuration featuring brand color system and variables.</p>
        </div>

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

      {/* 5. BUTTON COMPONENT SHOWCASE */}
      <section className="ds-section">
        <div className="ds-section__header">
          <h2 className="ds-section__title">Button Component</h2>
          <p className="ds-section__desc">The core interactive primitive. Supports multiple variants, sizes, states, and smart element switching.</p>
        </div>

        <div className="ds-button-showcase">
          {/* Variants Row */}
          {/* Core Variants Row */}
          <div className="ds-showcase-group">
            <h3 className="ds-label">Core Variants</h3>
            <div className="ds-button-row">
              <div className="ds-button-example">
                <Button variant="primary">Primary</Button>
                <code>variant="primary"</code>
              </div>
              <div className="ds-button-example">
                <Button variant="secondary">Secondary</Button>
                <code>variant="secondary"</code>
              </div>
              <div className="ds-button-example">
                <Button variant="outline">Outline</Button>
                <code>variant="outline"</code>
              </div>
              <div className="ds-button-example">
                <Button variant="ghost">Ghost</Button>
                <code>variant="ghost"</code>
              </div>
              <div className="ds-button-example">
                <Button variant="danger">Danger</Button>
                <code>variant="danger"</code>
              </div>
            </div>
          </div>

          {/* Extended Design Variants */}
          <div className="ds-showcase-group">
            <h3 className="ds-label">Extended & Semantic Styles</h3>
            <div className="ds-button-row">
              <div className="ds-button-example">
                <Button variant="hero">Hero (Empty States)</Button>
                <code>variant="hero"</code>
              </div>
              <div className="ds-button-example">
                <Button variant="action">Action (Primary CTA)</Button>
                <code>variant="action"</code>
              </div>
              <div className="ds-button-example">
                <Button variant="soft">Soft (Secondary)</Button>
                <code>variant="soft"</code>
              </div>
              <div className="ds-button-example">
                <Button variant="outline-brand">Outline Brand</Button>
                <code>variant="outline-brand"</code>
              </div>
              <div className="ds-button-example">
                <Button variant="pill">Pill Shape</Button>
                <code>variant="pill"</code>
              </div>
              <div className="ds-button-example" style={{ background: 'var(--color-anchor)', padding: '10px', borderRadius: '4px' }}>
                <Button variant="white">White Button</Button>
                <code>variant="white"</code>
              </div>
            </div>
          </div>

          {/* Specialized & Contextual Variants */}
          <div className="ds-showcase-group">
            <h3 className="ds-label">Specialized & Contextual</h3>
            <div className="ds-button-row">
              <div className="ds-button-example" style={{ background: 'var(--surface-container-low)', padding: '10px', borderRadius: '4px' }}>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <Button variant="segment-active">Active</Button>
                  <Button variant="segment">Inactive</Button>
                </div>
                <code>variant="segment(-active)"</code>
              </div>
              <div className="ds-button-example">
                <Button variant="remove" icon={<Trash2 size={16} />} />
                <code>variant="remove"</code>
              </div>
              <div className="ds-button-example" style={{ flex: '1', minWidth: '200px' }}>
                <Button variant="add-dashed" fullWidth icon={<Plus size={16} />}>Add Another Item</Button>
                <code>variant="add-dashed"</code>
              </div>
              <div className="ds-button-example" style={{ background: 'var(--surface-container-low)', padding: '10px', borderRadius: '4px' }}>
                <Button variant="nav-icon" icon={<ShoppingBag size={18} />} />
                <code>variant="nav-icon"</code>
              </div>
              <div className="ds-button-example">
                <Button variant="search-submit">Search</Button>
                <code>variant="search-submit"</code>
              </div>
              <div className="ds-button-example" style={{ position: 'relative', width: '150px', height: '60px', border: '1px solid #ddd' }}>
                <div className="product-card" style={{ height: '100%' }}>
                  <Button variant="card-add" style={{ opacity: 1, transform: 'none' }}>Add to Cart</Button>
                </div>
                <code>variant="card-add"</code>
              </div>
            </div>
          </div>

          {/* Icon Action & Stepper Variants */}
          <div className="ds-showcase-group">
            <h3 className="ds-label">Icon Action & Controls</h3>
            <div className="ds-button-row">
              <div className="ds-button-example">
                <Button variant="icon-action" icon={<Mail size={18} />} aria-label="Save to wishlist" />
                <code>variant="icon-action"</code>
              </div>
              <div className="ds-button-example">
                <Button variant="icon-action-delete" icon={<Trash2 size={18} />} aria-label="Remove item" />
                <code>variant="icon-action-delete"</code>
              </div>
              <div className="ds-button-example" style={{ background: 'var(--surface-container)', padding: '8px 16px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Button variant="stepper">—</Button>
                <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>2</span>
                <Button variant="stepper">+</Button>
                <code>variant="stepper"</code>
              </div>
              <div className="ds-button-example">
                <Button variant="nav-logout" icon={<Info size={18} />}>Sign Out</Button>
                <code>variant="nav-logout"</code>
              </div>
            </div>
          </div>

          {/* Text-based & Utility Links */}
          <div className="ds-showcase-group">
            <h3 className="ds-label">Utility & Text Links</h3>
            <div className="ds-button-row">
              <div className="ds-button-example">
                <Button variant="link">Link Style</Button>
                <code>variant="link"</code>
              </div>
              <div className="ds-button-example">
                <Button variant="text-link">Text Link</Button>
                <code>variant="text-link"</code>
              </div>
              <div className="ds-button-example">
                <Button variant="skip">Skip Link</Button>
                <code>variant="skip"</code>
              </div>
            </div>
          </div>

          {/* Sizes Row */}
          <div className="ds-showcase-group">
            <h3 className="ds-label">Scale & Sizing</h3>
            <div className="ds-button-row" style={{ alignItems: 'flex-end' }}>
              <div className="ds-button-example">
                <Button size="sm">Small</Button>
                <code>size="sm"</code>
              </div>
              <div className="ds-button-example">
                <Button size="md">Medium (Default)</Button>
                <code>size="md"</code>
              </div>
              <div className="ds-button-example">
                <Button size="lg">Large</Button>
                <code>size="lg"</code>
              </div>
            </div>
          </div>

          {/* States Row */}
          <div className="ds-showcase-group">
            <h3 className="ds-label">Behavioral States</h3>
            <div className="ds-button-row">
              <div className="ds-button-example">
                <Button loading>Loading State</Button>
                <code>loading=&#123;true&#125;</code>
              </div>
              <div className="ds-button-example">
                <Button disabled>Disabled State</Button>
                <code>disabled=&#123;true&#125;</code>
              </div>
              <div className="ds-button-example" style={{ flex: 1 }}>
                <Button fullWidth>Full Width Block</Button>
                <code>fullWidth=&#123;true&#125;</code>
              </div>
            </div>
          </div>

          {/* Icons Row */}
          <div className="ds-showcase-group">
            <h3 className="ds-label">Icon Integration</h3>
            <div className="ds-button-row">
              <div className="ds-button-example">
                <Button icon={<ShoppingBag size={18} />}>Add to Cart</Button>
                <code>icon=&#123;&lt;ShoppingBag /&gt;&#125;</code>
              </div>
              <div className="ds-button-example">
                <Button variant="secondary" icon={<ArrowRight size={18} />} iconPosition="right">
                  Next Step
                </Button>
                <code>iconPosition="right"</code>
              </div>
              <div className="ds-button-example">
                <Button variant="ghost" icon={<Trash2 size={18} />} aria-label="Delete" />
                <code>Icon Only (Ghost)</code>
              </div>
            </div>
          </div>

          {/* Element Types Row */}
          <div className="ds-showcase-group">
            <h3 className="ds-label">Smart Element Switching</h3>
            <div className="ds-button-row">
              <div className="ds-button-example">
                <Button onClick={() => alert('Clicked!')}>Standard Button</Button>
                <code>Element: &lt;button&gt;</code>
              </div>
              <div className="ds-button-example">
                <Button to="/category/all">Internal Route</Button>
                <code>to="/category/all" (&lt;Link&gt;)</code>
              </div>
              <div className="ds-button-example">
                <Button href="https://convex.dev" icon={<ExternalLink size={14} />} iconPosition="right">
                  External Link
                </Button>
                <code>href="https://..." (&lt;a&gt;)</code>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. INPUT FIELDS */}
      <section className="ds-section">
        <div className="ds-section__header">
          <h2 className="ds-section__title">Form Controls</h2>
          <p className="ds-section__desc">Minimalist inputs with focused states.</p>
        </div>
        <div className="ds-interactive-grid">
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
        
        <div className="ds-component-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--space-8)' }}>
          {/* Card Component Upgrades Showcases */}
          <div className="ds-component-item" style={{ gridColumn: 'span 2' }}>
            <h3 className="ds-label">Split Column Card (Default Settings, columns=2)</h3>
            <div className="ds-card-preview">
              <Card columns={2}>
                <div>
                  <img 
                    src={essentialsImg} 
                    alt="Newborn essentials" 
                    className="ds-split-image"
                  />
                </div>
                <Card hasShadow={false} hasBorder={false} hasBackground={false} style={{ padding: 0 }}>
                  <Card.Header>
                    <Text role="headline-sm">Split Column Card</Text>
                  </Card.Header>
                  <Card.Body>
                    <Text role="body-sm">
                      Using the <code>columns={2}</code> prop, this card splits its layout into two elegant columns on tablet/desktop viewports and cleanly stacks on mobile devices.
                    </Text>
                  </Card.Body>
                </Card>
              </Card>
            </div>
          </div>

          <div className="ds-component-item">
            <h3 className="ds-label">Default Card (No Hover Glow)</h3>
            <div className="ds-card-preview">
              <Card>
                <Card.Header>
                  <h4 style={{ margin: 0, fontSize: 'var(--title-sm)', fontWeight: 600 }}>Default Static Card</h4>
                </Card.Header>
                <Card.Body>
                  <p style={{ margin: 0, fontSize: 'var(--body-sm)' }}>
                    By default, nothing happens when you hover over this card. The border doesn't glow, preserving visual stillness unless interaction is requested.
                  </p>
                </Card.Body>
              </Card>
            </div>
          </div>

          <div className="ds-component-item">
            <h3 className="ds-label">Hoverable Card (Opt-in Glow)</h3>
            <div className="ds-card-preview">
              <Card isHoverable={true}>
                <Card.Header>
                  <h4 style={{ margin: 0, fontSize: 'var(--title-sm)', fontWeight: 600, color: 'var(--color-brand-primary)' }}>Interactive Glow Card</h4>
                </Card.Header>
                <Card.Body>
                  <p style={{ margin: 0, fontSize: 'var(--body-sm)' }}>
                    This card has <code>isHoverable={"{true}"}</code> set. Hover over it to see the premium brand-glow border and elegant ambient shadow elevation.
                  </p>
                </Card.Body>
              </Card>
            </div>
          </div>

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

