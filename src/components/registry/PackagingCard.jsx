import React, { useState, useEffect } from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Text from '../ui/Text';
import { Check } from 'lucide-react';
import './PackagingCard.css';

const PACKAGING_COLORS = [
  { id: 'pink', name: 'Muted Pink', hex: '#d35097' },
  { id: 'blue', name: 'Support Blue', hex: '#4dbee3' },
  { id: 'green', name: 'Support Green', hex: '#7fa93e' },
  { id: 'gold', name: 'Support Gold', hex: '#e1d328' },
  { id: 'anchor', name: 'Anchor Grey', hex: '#111111' }
];

const PackagingCard = ({ name, description, price, patternType, isSelected, onSelect, initialColor }) => {
  const [color, setColor] = useState(initialColor || 'pink');

  useEffect(() => {
    if (isSelected && initialColor) {
      setColor(initialColor);
    }
  }, [isSelected, initialColor]);

  const activeColorObj = PACKAGING_COLORS.find(c => c.id === color) || PACKAGING_COLORS[0];
  const colorHex = activeColorObj.hex;

  // Render SVG pattern definitions based on patternType
  const renderPatternDef = () => {
    const patternId = `pattern-${patternType}-${color}`;
    switch (patternType) {
      case 'stripe':
        return (
          <pattern id={patternId} width="20" height="20" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="20" height="20" fill="#fdfdfd" />
            <line x1="0" y1="0" x2="0" y2="20" stroke={colorHex} strokeWidth="8" />
            <line x1="0" y1="0" x2="0" y2="20" stroke="#ffffff" strokeWidth="2" />
          </pattern>
        );
      case 'dots':
        return (
          <pattern id={patternId} width="24" height="24" patternUnits="userSpaceOnUse">
            <rect width="24" height="24" fill="#fdfdfd" />
            <circle cx="12" cy="12" r="5" fill={colorHex} />
          </pattern>
        );
      case 'grid':
        return (
          <pattern id={patternId} width="20" height="20" patternUnits="userSpaceOnUse">
            <rect width="20" height="20" fill="#fdfdfd" />
            <rect width="20" height="20" fill="none" stroke={colorHex} strokeWidth="3" />
          </pattern>
        );
      case 'chevron':
        return (
          <pattern id={patternId} width="24" height="24" patternUnits="userSpaceOnUse">
            <rect width="24" height="24" fill="#fdfdfd" />
            <path d="M0 12 L12 0 L24 12 L12 24 Z" fill="none" stroke={colorHex} strokeWidth="3" />
          </pattern>
        );
      default:
        return (
          <pattern id={patternId} width="20" height="20" patternUnits="userSpaceOnUse">
            <rect width="20" height="20" fill={colorHex} />
          </pattern>
        );
    }
  };

  const patternId = `pattern-${patternType}-${color}`;

  return (
    <Card className="packaging-card" variant="default">
      <Card.Header>
        <div className="packaging-card__preview">
          <span className="packaging-card__badge" style={{ textTransform: 'capitalize' }}>{patternType} pattern</span>
          
          {isSelected && (
            <div className="packaging-card__selected-overlay" />
          )}

          <svg viewBox="0 0 200 200" className="packaging-card__svg">
            <defs>
              {renderPatternDef()}
            </defs>
            
            {/* Box Wrapper Shape */}
            <rect 
              x="40" 
              y="40" 
              width="120" 
              height="120" 
              rx="12" 
              ry="12" 
              fill={`url(#${patternId})`} 
              stroke="rgba(0,0,0,0.08)" 
              strokeWidth="1.5" 
            />

            {/* Vertical Ribbon */}
            <rect x="93" y="40" width="14" height="120" fill="#ffffff" opacity="0.95" />
            <rect x="99" y="40" width="2" height="120" fill="var(--color-brand-accent, #e1d328)" />

            {/* Horizontal Ribbon */}
            <rect x="40" y="93" width="120" height="14" fill="#ffffff" opacity="0.95" />
            <rect x="40" y="99" width="120" height="2" fill="var(--color-brand-accent, #e1d328)" />

            {/* Ribbon Tails */}
            <path d="M95 100 L75 135 L85 133 Z" fill="#ffffff" opacity="0.95" />
            <path d="M105 100 L125 135 L115 133 Z" fill="#ffffff" opacity="0.95" />

            {/* Bow Left Loop */}
            <path d="M100 100 C70 70 50 110 100 100" fill="#ffffff" opacity="0.95" stroke="rgba(0,0,0,0.05)" strokeWidth="1" />

            {/* Bow Right Loop */}
            <path d="M100 100 C130 70 150 110 100 100" fill="#ffffff" opacity="0.95" stroke="rgba(0,0,0,0.05)" strokeWidth="1" />

            {/* Center Knot */}
            <circle cx="100" cy="100" r="7" fill="#ffffff" stroke="rgba(0,0,0,0.05)" strokeWidth="1" />
            <circle cx="100" cy="100" r="3" fill="var(--color-brand-accent, #e1d328)" />
          </svg>
        </div>

        {/* Color Swatches */}
        <div className="packaging-card__swatches">
          {PACKAGING_COLORS.map(c => (
            <button
              key={c.id}
              className={`swatch-btn ${color === c.id ? 'is-active' : ''}`}
              style={{ backgroundColor: c.hex }}
              onClick={(e) => {
                e.preventDefault();
                setColor(c.id);
                if (isSelected) {
                  onSelect(patternType, c.id);
                }
              }}
              title={c.name}
              aria-label={`Select ${c.name}`}
            />
          ))}
        </div>
      </Card.Header>

      <Card.Body>
        <div>
          <span className="product-card__tier" style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-tertiary)', letterSpacing: '0.05em' }}>
            Gift Wrapping Option
          </span>
          <h3 className="product-card__name" style={{ fontSize: '0.95rem', height: '36px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', marginTop: '2px', lineHeight: '1.2' }}>
            {name}
          </h3>
          <Text variant="body-sm" color="secondary" style={{ fontSize: '0.8rem', marginTop: 'var(--space-1)', minHeight: '32px' }}>
            {description}
          </Text>
          <div className="product-card__price-row" style={{ marginTop: 'var(--space-2)', display: 'flex', gap: 'var(--space-2)' }}>
            <span className="product-card__price" style={{ fontSize: '0.95rem', fontWeight: '700' }}>
              UGX {price.toLocaleString()}
            </span>
          </div>
        </div>
      </Card.Body>

      <Card.Actions>
        <Button
          variant={isSelected ? 'secondary' : 'primary'}
          fullWidth
          onClick={(e) => {
            e.preventDefault();
            onSelect(patternType, color);
          }}
          icon={isSelected ? <Check size={16} /> : null}
        >
          {isSelected ? 'Selected' : 'Select Wrapper'}
        </Button>
      </Card.Actions>
    </Card>
  );
};

export default PackagingCard;
