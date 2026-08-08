import React, { useState, useEffect, useRef, useMemo } from 'react';
import './SearchStrip.css';
import { useNavigate } from 'react-router-dom';
import Button from '../ui/Button';
import { useQuery } from 'convex/react';
import { api } from "@convex/_generated/api";
import { useTrackedQuery } from '../../hooks/useTrackedQuery';
import { getProductSearchSuggestions } from '../../utils/productSearch';

const suggestions = [
  { text: 'Newborn essentials checklist', sub: '18 curated products', type: 'checklist' },
  { text: 'Hospital bag for C-section', sub: 'Complete guide + 12 picks', type: 'guide' },
  { text: 'Breast pumps for returning to work', sub: '5 top-rated picks', type: 'products' },
  { text: 'Maternity nightdresses', sub: 'Comfort picks for late pregnancy', type: 'apparel' }
];

const popularChips = [
  { text: 'Newborn starter kit', accent: true },
  { text: 'Hospital bag essentials' },
  { text: 'Safe sleep setup' },
  { text: 'Best baby monitors' },
  { text: 'Feeding & nursing' },
  { text: 'Postpartum recovery' }
];

const SEARCH_SHORTCUTS = {
  'design system': '/design-system',
  'design-system': '/design-system',
  'dashboard': '/dashboard',
  'account': '/dashboard',
  'profile': '/dashboard',
  'circle-of-love': '/circle-of-love',
  'circle of love': '/circle-of-love',
  'gifting': '/circle-of-love',
  'registry': '/circle-of-love',
  'wishlist': '/circle-of-love',
  'checkout': '/checkout',
  'pay': '/checkout',
  'mother': '/category/mother',
  'newborn': '/category/newborn',
  'toddler': '/category/kid',
  'brands': '/brands',
  'about': '/about',
};

const SearchStrip = ({ 
  initialQuery = '', 
  placeholder = "Ask anything… 'hospital bag for C-section', 'pumps for returning to work'",
  showLabel = true,
  showSuggestions = true,
  isMinimal = false,
  onChange = null,
  onSubmit = null,
  className = '',
  products = null
}) => {
  const [query, setQuery] = useState(initialQuery);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [localSuggestions, setLocalSuggestions] = useState(suggestions);
  const containerRef = useRef(null);
  const navigate = useNavigate();

  // getProducts is defined with trackedQuery (convex/lib/ioTracking.ts), which
  // returns { _io, data } to piggyback its read-count tally on the response;
  // useTrackedQuery reports that tally and unwraps back to the plain array.
  // This fallback only fires when no `products` prop is supplied.
  const fetchedProducts = useTrackedQuery(api.data.getProducts, {}, 20);
  const allBrands = useQuery(api.data.getBrands) || [];

  const availableProducts = useMemo(() => {
    if (products && Array.isArray(products) && products.length > 0) {
      return products;
    }
    return fetchedProducts || [];
  }, [products, fetchedProducts]);

  const navigateToTag = (tagText) => {
    const textLower = tagText.toLowerCase().trim();

    // 1. Check if it matches a brand name or slug
    const matchedBrand = allBrands.find(b => 
      b.name.toLowerCase() === textLower || 
      b.slug.toLowerCase() === textLower
    );
    if (matchedBrand) {
      navigate(`/brand/${matchedBrand.slug}`);
      return;
    }

    // 2. Check if it matches a stage/category
    if (textLower === 'mother' || textLower === 'expectant' || textLower === 'expecting' || textLower === 'pregnancy' || textLower === 'expecting mother') {
      navigate('/category/mother');
      return;
    }
    if (textLower === 'newborn' || textLower === 'baby') {
      navigate('/category/newborn');
      return;
    }
    if (textLower === 'toddler' || textLower === 'kid' || textLower === 'kids' || textLower === 'child') {
      navigate('/category/kid');
      return;
    }

    // 3. Check if it matches a collection
    if (textLower === 'essentials') {
      navigate('/collection/essentials');
      return;
    }
    if (textLower === 'musthaves' || textLower === 'must-haves' || textLower === 'must haves') {
      navigate('/collection/must-haves');
      return;
    }
    if (textLower === 'luxuries' || textLower === 'luxury') {
      navigate('/collection/luxuries');
      return;
    }
    if (textLower === 'most loved' || textLower === 'most-loved') {
      navigate('/collection/most-loved');
      return;
    }
    if (textLower === 'curated' || textLower === 'curated picks' || textLower === 'curated-picks') {
      navigate('/collection/curated-picks');
      return;
    }

    // 4. Default to search/filter page
    navigate(`/category/all?q=${encodeURIComponent(tagText)}`);
  };

  const chipsToDisplay = useMemo(() => {
    const sourceProducts = availableProducts;
    if (!sourceProducts || !Array.isArray(sourceProducts) || sourceProducts.length === 0) {
      return popularChips;
    }

    const counts = {};
    sourceProducts.forEach(p => {
      if (p && p.tags && Array.isArray(p.tags)) {
        p.tags.forEach(t => {
          if (t && typeof t === 'object' && t.text) {
            const text = t.text.trim();
            if (text) {
              counts[text] = (counts[text] || 0) + 1;
            }
          }
        });
      }
    });

    const sortedTags = Object.keys(counts)
      .sort((a, b) => counts[b] - counts[a]);

    if (sortedTags.length === 0) {
      return popularChips;
    }

    return sortedTags.slice(0, 6).map((tag, index) => ({
      text: tag,
      accent: index === 0
    }));
  }, [availableProducts]);

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInput = (e) => {
    const val = e.target.value;
    setQuery(val);
    if (onChange) {
      onChange(val);
    }
    
    // Only show dynamic suggestions if suggestions are enabled and not minimal
    if (showSuggestions && !isMinimal) {
      const normalizedVal = val.toLowerCase().trim();

      if (normalizedVal.length > 0) {
        const finalSuggestions = getProductSearchSuggestions(availableProducts, normalizedVal, 6);

        if (finalSuggestions.length > 0) {
          setLocalSuggestions(finalSuggestions);
          setIsDropdownOpen(true);
        } else {
          setLocalSuggestions(suggestions);
          setIsDropdownOpen(false);
        }
      } else {
        setLocalSuggestions(suggestions);
        setIsDropdownOpen(false);
      }
    }
  };

  const handleChipClick = (text) => {
    setQuery(text);
    if (onChange) {
      onChange(text);
    }
    if (onSubmit) {
      onSubmit(text);
      return;
    }
    navigateToTag(text);
  };

  const isDeveloperQuery = (q) => {
    const norm = q.toLowerCase().trim();
    return ['500', 'developer', 'dev', 'dev-product', 'developer-product', 'developer product'].includes(norm);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (onSubmit) {
      onSubmit(query);
      return;
    }

    const normalizedQuery = query.toLowerCase().trim();
    if (isDeveloperQuery(normalizedQuery)) {
      navigate('/product/developer-product');
      setIsDropdownOpen(false);
      return;
    }

    if (SEARCH_SHORTCUTS[normalizedQuery]) {
      navigate(SEARCH_SHORTCUTS[normalizedQuery]);
      setIsDropdownOpen(false);
      return;
    }

    if (query.trim()) {
      navigate(`/category/all?q=${encodeURIComponent(query.trim())}`);
      setIsDropdownOpen(false);
    }
  };

  const handleSuggestionClick = (item) => {
    if (item.route) {
      navigate(item.route);
    } else if (item.product) {
      navigate(`/product/${item.product.slug || item.product._id}`);
    } else {
      setQuery(item.text);
      if (onChange) {
        onChange(item.text);
      }
      if (onSubmit) {
        onSubmit(item.text);
      } else {
        if (isDeveloperQuery(item.text)) {
          navigate('/product/developer-product');
        } else {
          navigate(`/category/all?q=${encodeURIComponent(item.text)}`);
        }
      }
    }
    setIsDropdownOpen(false);
  };


  return (
    <div className={`search-strip ${className} ${isMinimal ? 'search-strip--minimal' : ''}`} aria-label="AI-powered product search" style={isMinimal ? { padding: 0, animation: 'none', opacity: 1 } : {}}>
      {showLabel && !isMinimal && (
        <span className="search-strip__label">Find exactly what you need</span>
      )}

      <div className="search-pill-wrap" ref={containerRef} style={isMinimal ? { maxWidth: '100%' } : {}}>
        <form className="search-pill" role="search" onSubmit={handleSearch}>
          <span className="search-pill__icon" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3z"/>
            </svg>
          </span>

          <input
            type="search"
            value={query}
            onChange={handleInput}
            placeholder={placeholder}
            autoComplete="off"
            aria-label="Search products"
          />

          <Button 
            type="submit" 
            variant="primary-icon" 
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/>
                <path d="m21 21-4.35-4.35"/>
              </svg>
            }
            aria-label="Search"
          />
        </form>

        {showSuggestions && !isMinimal && isDropdownOpen && (
          <div className="search-dropdown is-active" role="listbox" aria-label="Search suggestions">
            {localSuggestions.map((item, i) => (
              <div 
                key={i} 
                className="search-dropdown__item" 
                role="option" 
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSuggestionClick(item);
                }}
                onClick={() => handleSuggestionClick(item)}
              >
                <div className="search-dropdown__icon">
                  {item.type === 'product' && item.image ? (
                    <img 
                      src={item.image} 
                      alt="" 
                      style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'var(--radius-sm)' }} 
                    />
                  ) : item.type === 'shortcut' ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M5 12h14M12 5l7 7-7 7"/>
                    </svg>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <circle cx="12" cy="12" r="10"/><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3z"/>
                    </svg>
                  )}
                </div>
                <div>
                  <div className="search-dropdown__text">{item.text}</div>
                  <div className="search-dropdown__sub">{item.sub}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showSuggestions && !isMinimal && (
        <div className="search-suggestions" aria-label="Popular searches">
          {chipsToDisplay.map((chip, i) => (
            <Button 
              key={i} 
              variant="secondary"
              size="sm"
              className={`suggestion-chip ${chip.accent ? 'suggestion-chip--accent' : ''}`}
              onClick={() => handleChipClick(chip.text)}
              icon={chip.accent ? (
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3z"/>
                </svg>
              ) : null}
              iconPosition="left"
            >
              {chip.text}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
};

export default SearchStrip;

