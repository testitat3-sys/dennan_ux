import React, { useState, useRef, useEffect } from 'react';
import './SmartAddressSearch.css';
import Button from '../ui/Button';

const SmartAddressSearch = ({ onSelectAddress, landmarks = [], history = [] }) => {
  const [isFocused, setIsFocused] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [status, setStatus] = useState('IDLE'); // IDLE, LOADING, OK, ZERO_RESULTS, ERROR
  const searchRef = useRef(null);
  
  const sessionTokenRef = useRef(null);

  // Initialize Maps Library & Session Token
  useEffect(() => {
    // Make sure Google Maps is loaded
    if (window.google && window.google.maps && window.google.maps.places) {
      if (!sessionTokenRef.current) {
        sessionTokenRef.current = new window.google.maps.places.AutocompleteSessionToken();
      }
    }
  }, []);

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

  // Debounced Search Effect
  useEffect(() => {
    if (!query || query.length <= 1) {
      setSuggestions([]);
      setStatus('IDLE');
      return;
    }

    const fetchSuggestions = async () => {
      setStatus('LOADING');
      if (!window.google || !window.google.maps || !window.google.maps.places) {
        setStatus('ERROR');
        return;
      }
      try {
        if (!sessionTokenRef.current) {
          sessionTokenRef.current = new window.google.maps.places.AutocompleteSessionToken();
        }

        const request = {
          input: query,
          sessionToken: sessionTokenRef.current,
          region: 'ug',
        };

        const { suggestions } = await window.google.maps.places.AutocompleteSuggestion.fetchAutocompleteSuggestions(request);
        
        if (suggestions && suggestions.length > 0) {
          setSuggestions(suggestions);
          setStatus('OK');
        } else {
          setSuggestions([]);
          setStatus('ZERO_RESULTS');
        }
      } catch (error) {
        console.error("Error fetching autocomplete suggestions:", error);
        setSuggestions([]);
        setStatus('ERROR');
      }
    };

    const debounceTimer = setTimeout(() => {
      fetchSuggestions();
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [query]);

  const handleSelect = async (suggestionObj) => {
    // If it's from history/popular hubs (has name property)
    if (suggestionObj.name && !suggestionObj.placePrediction) {
      setQuery(suggestionObj.name);
      setIsFocused(false);
      setSuggestions([]);
      onSelectAddress(suggestionObj);
      return;
    }

    // It's an AutocompleteSuggestion
    const prediction = suggestionObj.placePrediction;
    setQuery(prediction.text.text);
    setIsFocused(false);
    setSuggestions([]);

    try {
      const place = prediction.toPlace();
      await place.fetchFields({ fields: ['displayName', 'formattedAddress', 'location'] });
      
      const lat = place.location.lat();
      const lng = place.location.lng();

      onSelectAddress({
        name: prediction.text.text.split(',')[0], // Approximation of main_text
        sub: prediction.text.text.split(',').slice(1).join(',').trim() || 'Kampala', // Approximation of secondary_text
        address: place.formattedAddress,
        lat,
        lng,
        zone: 'Default' // Keep default for ETA logic
      });

      // Reset the session token after a successful selection
      sessionTokenRef.current = new window.google.maps.places.AutocompleteSessionToken();
    } catch (error) {
      console.error("Error getting place details:", error);
    }
  };

  const handleGetCurrentLocation = () => {
    setIsLocating(true);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition((position) => {
        // In a real app, we'd reverse geocode here
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

  const popularHubs = landmarks.slice(2, 5); // Village, Acacia, Garden City

  return (
    <div className="smart-search-container" ref={searchRef}>
      <div className={`search-input-wrapper ${isFocused ? 'is-active' : ''}`}>
        <input
          type="text"
          className="smart-search-input"
          placeholder="Search delivery location (e.g. Kiruddu...)"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!isFocused) setIsFocused(true);
          }}
          onFocus={() => setIsFocused(true)}
        />
        <Button 
          variant="ghost"
          className={`gps-btn ${isLocating ? 'is-loading' : ''}`} 
          onClick={handleGetCurrentLocation}
          title="Use current location"
          loading={isLocating}
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z"/><circle cx="12" cy="10" r="3"/></svg>}
        />
      </div>

      {isFocused && (
        <div className="suggestions-dropdown">
          {query.length <= 1 ? (
            <div className="search-initial-state">
              <div className="suggestion-group">
                <h4 className="group-label">Recent</h4>
                {history.map((item, idx) => (
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
              {status === "OK" ? suggestions.map((suggestion) => {
                const prediction = suggestion.placePrediction;
                const placeId = prediction.placeId;
                const mainText = prediction.text.text.split(',')[0];
                const secondaryText = prediction.text.text.split(',').slice(1).join(',').trim() || '';

                return (
                  <div key={placeId} className="suggestion-item" onClick={() => handleSelect(suggestion)}>
                    <svg className="item-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                    <div className="item-details">
                      <span className="item-name">{mainText}</span>
                      <span className="item-sub">{secondaryText}</span>
                    </div>
                  </div>
                );
              }) : (
                <div className="no-results">
                  {status === "ZERO_RESULTS" && "No locations found."}
                  {status === "ERROR" && "Error fetching results."}
                  {status === "LOADING" && (
                    <div className="search-loading-container">
                      <div className="search-loading-spinner"></div>
                      <span>Searching Google Maps...</span>
                    </div>
                  )}
                  {status === "IDLE" && "Typing..."}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SmartAddressSearch;


