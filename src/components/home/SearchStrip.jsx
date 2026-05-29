import React, { useState, useEffect, useRef } from 'react';
import './SearchStrip.css';
import { useNavigate } from 'react-router-dom';
import Button from '../ui/Button';

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
  'registry': '/registry',
  'wishlist': '/registry',
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
  onSubmit = null
}) => {
  const [query, setQuery] = useState(initialQuery);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [localSuggestions, setLocalSuggestions] = useState(suggestions);
  const containerRef = useRef(null);
  const navigate = useNavigate();

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
      if (normalizedVal.length > 1) {
        const matchedShortcuts = Object.keys(SEARCH_SHORTCUTS)
          .filter(key => key.includes(normalizedVal))
          .map(key => ({
            text: key.charAt(0).toUpperCase() + key.slice(1),
            sub: `Go to ${key} page`,
            type: 'shortcut',
            route: SEARCH_SHORTCUTS[key]
          }));
        
        setLocalSuggestions([...matchedShortcuts, ...suggestions].slice(0, 5));
        setIsDropdownOpen(true);
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
    setIsDropdownOpen(true);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (onSubmit) {
      onSubmit(query);
      return;
    }

    const normalizedQuery = query.toLowerCase().trim();
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
    } else {
      setQuery(item.text);
      if (onChange) {
        onChange(item.text);
      }
      if (onSubmit) {
        onSubmit(item.text);
      } else {
        navigate(`/category/all?q=${encodeURIComponent(item.text)}`);
      }
    }
    setIsDropdownOpen(false);
  };

  return (
    <div className={`search-strip ${isMinimal ? 'search-strip--minimal' : ''}`} aria-label="AI-powered product search" style={isMinimal ? { padding: 0, animation: 'none', opacity: 1 } : {}}>
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
              <div key={i} className="search-dropdown__item" role="option" onClick={() => handleSuggestionClick(item)}>
                <div className="search-dropdown__icon">
                  {item.type === 'shortcut' ? (
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
          {popularChips.map((chip, i) => (
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

