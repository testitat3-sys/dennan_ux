import React, { useState, useEffect, useRef } from 'react';

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

const SearchStrip = () => {
  const [query, setQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const containerRef = useRef(null);

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
    setIsDropdownOpen(val.trim().length > 1);
  };

  const handleChipClick = (text) => {
    setQuery(text);
    setIsDropdownOpen(true);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (query.trim()) {
      window.location.href = `/search?q=${encodeURIComponent(query)}`;
    }
  };

  return (
    <div className="search-strip" aria-label="AI-powered product search">
      <span className="search-strip__label">Find exactly what you need</span>

      <div className="search-pill-wrap" ref={containerRef}>
        <form className="search-pill" role="search" onSubmit={handleSearch}>
          <span className="search-pill__icon" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
          </span>

          <input
            type="search"
            value={query}
            onChange={handleInput}
            placeholder="Ask anything… 'hospital bag for C-section', 'pumps for returning to work'"
            autoComplete="off"
            aria-label="Search products"
          />

          <button type="submit" className="search-pill__submit">Search</button>
        </form>

        {isDropdownOpen && (
          <div className="search-dropdown is-active" role="listbox" aria-label="Search suggestions">
            {suggestions.map((item, i) => (
              <div key={i} className="search-dropdown__item" role="option" onClick={() => { setQuery(item.text); setIsDropdownOpen(false); }}>
                <div className="search-dropdown__icon">
                  {/* Dynamic icons based on type could go here */}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <circle cx="12" cy="12" r="10"/><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3z"/>
                  </svg>
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

      <div className="search-suggestions" aria-label="Popular searches">
        {popularChips.map((chip, i) => (
          <button 
            key={i} 
            className={`suggestion-chip ${chip.accent ? 'suggestion-chip--accent' : ''}`}
            onClick={() => handleChipClick(chip.text)}
          >
            {chip.accent && (
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3z"/>
              </svg>
            )}
            {chip.text}
          </button>
        ))}
      </div>
    </div>
  );
};

export default SearchStrip;
