import React, { useState, useEffect, useRef } from 'react';
import './SearchInput.css';



function SearchInput({ onSearch }) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([])
  const suggestionsRef = useRef(null); // Ref to manage clicks outside

  // Fetch suggestions using Nominatim API
  const fetchSuggestions = async (input) => {
    if (input) {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${input}&format=json&limit=5`);
      const data = await response.json();
      const filteredLocations = data.map(location => location.display_name.split(',')[0]); // Only keep the first part of the address
      setSuggestions(filteredLocations);
    } else {
      setSuggestions([]);
    }
  };

  const handleInputChange = (e) => {
    const input = e.target.value;
    setQuery(input);
    fetchSuggestions(input);
  };

  const handleMapClick = () => {
    if (query) {
      onSearch(query); // Perform search on the entered query
      setQuery('');
      setSuggestions([]);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setQuery(suggestion);
    setSuggestions([]);
    onSearch(suggestion); // Perform search on the selected suggestion
  };

  // Handle clicks outside the component to close suggestions
  const handleClickOutside = (event) => {
    if (suggestionsRef.current && !suggestionsRef.current.contains(event.target)) {
      setSuggestions([]);
    }
  };

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="search-input" ref={suggestionsRef}>
      <input
        type="text"
        placeholder="Filter by location..."
        value={query}
        onChange={handleInputChange}
        onKeyDown={(e) => e.key === 'Enter' && handleMapClick()} // Search on Enter key
      />
      <button onClick={handleMapClick}>Search</button>
      {suggestions.length > 0 && (
        <ul className="suggestions">
          {suggestions.map((suggestion, index) => (
            <li key={index} onClick={() => handleSuggestionClick(suggestion)}>
              {suggestion}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default SearchInput;
