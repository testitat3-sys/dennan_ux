import React, { useState, useRef, useEffect } from 'react';
import { kampalaLandmarks, userHistory } from '../../utils/deliveryUtils';
import './SmartAddressSearch.css';

const SmartAddressSearch = ({ onSelectAddress }) => {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [isLocating, setIsLocating] = useState(false);
  const searchRef = useRef(null);

  useEffect(() => {
    if (query.length > 1) {
      const filtered = kampalaLandmarks.filter(item => 
        item.name.toLowerCase().includes(query.toLowerCase()) ||
        item.sub.toLowerCase().includes(query.toLowerCase())
      );
      setSuggestions(filtered);
    } else {
      setSuggestions([]);
    }
  }, [query]);

  // Handle clicking outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (item) => {
    setQuery(item.name);
    setIsFocused(false);
    onSelectAddress(item);
  };

  const handleGetCurrentLocation = () => {
    setIsLocating(true);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition((position) => {
        // In a real app, we'd reverse geocode here
        // For demo, we'll mock finding "Current Location (Kololo)"
        const mockLocation = { name: "Current Location (Kololo)", zone: "Kololo" };
        setQuery(mockLocation.name);
        onSelectAddress(mockLocation);
        setIsLocating(false);
        setIsFocused(false);
      }, (error) => {
        console.error("Error getting location:", error);
        setIsLocating(false);
      });
    } else {
      alert("Geolocation is not supported by your browser.");
      setIsLocating(false);
    }
  };

  const popularHubs = kampalaLandmarks.slice(2, 5); // Village, Acacia, Garden City

  return (
    <div className="smart-search-container" ref={searchRef}>
      <div className={`search-input-wrapper ${isFocused ? 'is-active' : ''}`}>
        <input
          type="text"
          className="smart-search-input"
          placeholder="Search delivery location (e.g. Kiruddu...)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
        />
        <button 
          className={`gps-btn ${isLocating ? 'is-loading' : ''}`} 
          onClick={handleGetCurrentLocation}
          title="Use current location"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
        </button>
      </div>

      {isFocused && (
        <div className="suggestions-dropdown">
          {query.length <= 1 ? (
            <div className="search-initial-state">
              <div className="suggestion-group">
                <h4 className="group-label">Recent</h4>
                {userHistory.map((item, idx) => (
                  <div key={idx} className="suggestion-item" onClick={() => handleSelect(item)}>
                    <svg className="item-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="12 8 12 12 14 14" />
                      <path d="M3.05 11a9 9 0 1 1 .5 4m-.5 5v-5h5" />
                    </svg>
                    <span>{item.name}</span>
                  </div>
                ))}
              </div>
              <div className="suggestion-group">
                <h4 className="group-label">Popular Hubs</h4>
                {popularHubs.map((item, idx) => (
                  <div key={idx} className="suggestion-item" onClick={() => handleSelect(item)}>
                    <svg className="item-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <circle cx="12" cy="12" r="2" />
                    </svg>
                    <div className="item-details">
                      <span className="item-name">{item.name}</span>
                      <span className="item-sub">{item.sub}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="search-results">
              {suggestions.length > 0 ? suggestions.map((item, idx) => (
                <div key={idx} className="suggestion-item" onClick={() => handleSelect(item)}>
                  <svg className="item-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  <div className="item-details">
                    <span className="item-name">{item.name}</span>
                    <span className="item-sub">{item.sub}</span>
                  </div>
                </div>
              )) : (
                <div className="no-results">No landmarks found nearby.</div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SmartAddressSearch;
