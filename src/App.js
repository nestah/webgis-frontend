import React, { useState, useEffect, useRef, useMemo } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import axios from 'axios';
import './App.css';
// import './FilterComponent.css';
import './RadiusComponent.css';
import './LoadComponent.css';
import './viewport.css';
import Navbar from './Navbar';
// import FilterComponent from './FilterComponent';
import SearchInput from './SearchInput';
import UploadPopup from './UploadPopup';
import RadiusComponent from './RadiusComponent';
import LoadComponent from './LoadComponent';
import { LoadingProvider, useLoading } from './LoadingContext';

// Constants
const MAP_CONSTANTS = {
  EARTH_RADIUS_KM: 6371,
  DEGREES_TO_RADIANS: Math.PI / 180,
  RADIANS_TO_DEGREES: 180 / Math.PI,
  INITIAL_VIEWPORT: {
    latitude: -1.286389,
    longitude: 36.817223,
    zoom: 10,
  },
  API_BASE_URL: process.env.REACT_APP_API_BASE_URL,
  MAPTILER_KEY: process.env.REACT_APP_MAPTILER_KEY,
  LONG_PRESS_DURATION: 1100,
  SEARCH_DEBOUNCE_MS: 300, // Added debounce constant for search
};

// Utility functions
const radiusToZoom = (radiusKm) => {
  const fovDeg = (radiusKm / MAP_CONSTANTS.EARTH_RADIUS_KM) * MAP_CONSTANTS.RADIANS_TO_DEGREES * 2;
  const zoom = Math.log2(360 / fovDeg) - 1;
  return Math.min(Math.max(zoom, 1), 20);
};

const drawRadiusCircle = (map, center, radiusKm) => {
  ['radius-circle-fill', 'radius-circle-outline'].forEach(layerId => {
    if (map.getLayer(layerId)) map.removeLayer(layerId);
  });
  if (map.getSource('radius-circle')) map.removeSource('radius-circle');

  const points = 64;
  const coords = Array.from({ length: points }, (_, i) => {
    const angle = (i / points) * (2 * Math.PI);
    const latOffset = (radiusKm / MAP_CONSTANTS.EARTH_RADIUS_KM) * Math.cos(angle);
    const lngOffset = (radiusKm / MAP_CONSTANTS.EARTH_RADIUS_KM) * Math.sin(angle) / 
      Math.cos(center.lat * MAP_CONSTANTS.DEGREES_TO_RADIANS);
    
    return [
      center.lng + (lngOffset * MAP_CONSTANTS.RADIANS_TO_DEGREES),
      center.lat + (latOffset * MAP_CONSTANTS.RADIANS_TO_DEGREES)
    ];
  });
  coords.push(coords[0]);

  map.addSource('radius-circle', {
    type: 'geojson',
    data: {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'Polygon',
        coordinates: [coords]
      }
    }
  });

  map.addLayer({
    id: 'radius-circle-fill',
    type: 'fill',
    source: 'radius-circle',
    paint: {
      'fill-color': '#007cbf',
      'fill-opacity': 0.1
    }
  });

  map.addLayer({
    id: 'radius-circle-outline',
    type: 'line',
    source: 'radius-circle',
    paint: {
      'line-color': '#007cbf',
      'line-width': 2
    }
  });
};

// Enhanced fetch data function with error handling and retries
const fetchData = async (endpoint, retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await axios.get(`${MAP_CONSTANTS.API_BASE_URL}/${endpoint}`);
      return response.data;
    } catch (error) {
      if (i === retries - 1) {
        console.error(`Error fetching ${endpoint}:`, error);
        return [];
      }
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
};

// Debounce utility
const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

function AppContent() {
  // Refs
  const mapContainer = useRef(null);
  const map = useRef(null);
  const longPressTimeout = useRef(null);
  const touchStartTime = useRef(null);
  const markersRef = useRef([]); // Added ref for markers management

  // State
  const [viewport, setViewport] = useState(MAP_CONSTANTS.INITIAL_VIEWPORT);
  const { setIsLoading } = useLoading();
  const [contentLoaded, setContentLoaded] = useState(false);
  const [facilities, setFacilities] = useState([]);
  const [uploadedFacilities, setUploadedFacilities] = useState([]);
  const [facilityTypes, setFacilityTypes] = useState([]);
  const [selectedFacilityType, setSelectedFacilityType] = useState("");
  const [showPopup, setShowPopup] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [showRadiusPopup, setShowRadiusPopup] = useState(false);
  const [radiusCenter, setRadiusCenter] = useState(null);
  const [tempMarker, setTempMarker] = useState(null);
  const [isSearching, setIsSearching] = useState(false); // Added search state

  // Enhanced memoized filtered facilities
  const filteredFacilities = useMemo(() => {
    const allFacilities = facilities.concat(uploadedFacilities.map(f => ({
      ...f,
      isUploaded: true
    })));
    
    return selectedFacilityType === "" 
      ? allFacilities 
      : allFacilities.filter(facility => facility.facility_type === selectedFacilityType);
  }, [facilities, uploadedFacilities, selectedFacilityType]);

  // Touch event handlers
  const handleTouchStart = (e) => {
    if (e.touches.length !== 1) return;
    
    const touch = e.touches[0];
    touchStartTime.current = Date.now();
    
    longPressTimeout.current = setTimeout(() => {
      const rect = mapContainer.current.getBoundingClientRect();
      const point = map.current.unproject([
        touch.clientX - rect.left,
        touch.clientY - rect.top
      ]);
      
      handleContextMenu(point);
    }, MAP_CONSTANTS.LONG_PRESS_DURATION);
  };

  const handleTouchEnd = () => {
    if (longPressTimeout.current) {
      clearTimeout(longPressTimeout.current);
    }
  };

  const handleContextMenu = (lngLat) => {
    if (!lngLat) return;
    
    if (tempMarker) {
      tempMarker.remove();
    }

    const newMarker = new maplibregl.Marker({ color: 'red' })
      .setLngLat([lngLat.lng, lngLat.lat])
      .addTo(map.current);
    
    setTempMarker(newMarker);
    setRadiusCenter(lngLat);
    setShowRadiusPopup(true);
  };

  // Initialize map
  useEffect(() => {
    if (map.current) return;

    const initialLoader = document.getElementById('initial-loader');
    if (initialLoader) {
      initialLoader.remove();
    }

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: `https://api.maptiler.com/maps/streets/style.json?key=${MAP_CONSTANTS.MAPTILER_KEY}`,
      center: [viewport.longitude, viewport.latitude],
      zoom: viewport.zoom,
    });

    map.current.addControl(new maplibregl.NavigationControl(), 'top-right');
    map.current.addControl(new maplibregl.GeolocateControl({
      positionOptions: { enableHighAccuracy: true },
      trackUserLocation: true,
    }));

    map.current.on('contextmenu', (e) => handleContextMenu(e.lngLat));
    map.current.on('load', () => {
      setMapLoaded(true);
      setContentLoaded(true);
    });

    mapContainer.current.addEventListener('touchstart', handleTouchStart);
    mapContainer.current.addEventListener('touchend', handleTouchEnd);
    mapContainer.current.addEventListener('touchcancel', handleTouchEnd);

    return () => {
      map.current.remove();
      if (mapContainer.current) {
        mapContainer.current.removeEventListener('touchstart', handleTouchStart);
        mapContainer.current.removeEventListener('touchend', handleTouchEnd);
        mapContainer.current.removeEventListener('touchcancel', handleTouchEnd);
      }
    };
  }, []);

  // Enhanced data fetching
  useEffect(() => {
    if (mapLoaded) {
      setIsLoading(true);
      Promise.all([
        fetchData('facilities'),
        fetchData('facility-types'),
        fetchData('uploaded-facilities')
      ]).then(([facilitiesData, typesData, uploadedData]) => {
        setFacilities(facilitiesData || []);
        setFacilityTypes((typesData || []).map(type => type.facility_type));
        setUploadedFacilities(uploadedData || []);
      }).finally(() => {
        setIsLoading(false);
      });
    }
  }, [mapLoaded, setIsLoading]);

  // Enhanced markers update
  useEffect(() => {
    if (!map.current?.isStyleLoaded()) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Remove existing layers and sources
    ['facilities'].forEach(layer => {
      if (map.current.getLayer(layer)) map.current.removeLayer(layer);
      if (map.current.getSource(layer)) map.current.removeSource(layer);
    });

    // Add facilities source and layer
    map.current.addSource('facilities', {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: filteredFacilities.map(facility => ({
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [facility.longitude, facility.latitude],
          },
          properties: {
            id: facility.id,
            name: facility.name,
            type: facility.facility_type,
            ownership: facility.ownership,
            isUploaded: facility.isUploaded || false,
          },
        })),
      },
    });

    map.current.addLayer({
      id: 'facilities',
      type: 'circle',
      source: 'facilities',
      paint: {
        // 'circle-radius': 10,
        // 'circle-color': [
        //   'case',
        //   ['==', ['get', 'isUploaded'], true],
        //   '#00bf7c',
        //   '#007cbf'
        // ],
         // Circle radius interpolates based on zoom level
    'circle-radius': [
      'interpolate',
      ['linear'],
      ['zoom'],
      8,  5,  // At zoom level 8, circles are tiny (0.5px)
      10, 10,   // At zoom level 10, circles are 2px
      12, 15,   // At zoom level 12, circles are 4px
      14, 20,   // At zoom level 14, circles are 8px
      16, 25   // At zoom level 16+, circles are 10px
    ],
     // Circle opacity fades based on zoom level
     'circle-opacity': [
      'interpolate',
      ['linear'],
      ['zoom'],
      6, 0.1,
      8, 0.3,  // At zoom level 8, circles are 30% visible
      10, 0.5, // At zoom level 10, circles are 50% visible
      12, 0.8, // At zoom level 12, circles are 80% visible
      14, 1    // At zoom level 14+, circles are fully visible
    ],
    // Circle color remains the same as before
    'circle-color': [
      'case',
      ['==', ['get', 'isUploaded'], true],
      '#00bf7c',
      '#007cbf'
    ],
     // Added stroke for better visibility at smaller sizes
     'circle-stroke-width': [
      'interpolate',
      ['linear'],
      ['zoom'],
      8, 0,    // No stroke at low zoom
      12, 0.5, // 0.5px stroke at medium zoom
      14, 1    // 1px stroke at high zoom
    ],
    'circle-stroke-color': '#ffffff'
      },
    });

    // Enhanced popup handling
    const popup = new maplibregl.Popup({
      closeButton: true,
      closeOnClick: true,
    });

    map.current.on('click', 'facilities', (e) => {
      const coordinates = e.features[0].geometry.coordinates.slice();
      const { name, type, ownership } = e.features[0].properties;

      popup
        .setLngLat(coordinates)
        .setHTML(`
          <div class="popup-content">
            <h4>${name}</h4>
            <p><strong>Type:</strong> ${type}</p>
            <p><strong>Ownership:</strong> ${ownership}</p>
          </div>
        `)
        .addTo(map.current);
    });

    // Hover effect
    map.current.on('mouseenter', 'facilities', () => {
      map.current.getCanvas().style.cursor = 'pointer';
    });

    map.current.on('mouseleave', 'facilities', () => {
      map.current.getCanvas().style.cursor = '';
    });

  }, [filteredFacilities]);

  // Enhanced search functionality
  const handleSearch = async (query) => {
    if (!query.trim()) return;
    
    setIsSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`
      );
      const data = await response.json();
      
      if (data && data.length > 0) {
        const { lat, lon } = data[0];
        const newLat = parseFloat(lat);
        const newLon = parseFloat(lon);
        
        setViewport({ latitude: newLat, longitude: newLon, zoom: 10 });
        
        map.current.flyTo({
          center: [newLon, newLat],
          zoom: 10,
          essential: true,
          duration: 4000,
          curve: 1.5,
        });
      } else {
        alert('Location not found. Please try a different search term.');
      }
    } catch (error) {
      console.error('Search error:', error);
      alert('Error performing search. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  // Debounced search handler
  const debouncedSearch = useMemo(
    () => debounce(handleSearch, MAP_CONSTANTS.SEARCH_DEBOUNCE_MS),
    []
  );
  


  const handleRadiusSubmit = (radius) => {
    if (!radiusCenter || !radius) return;

    const newZoom = radiusToZoom(radius);
    setViewport({
      latitude: radiusCenter.lat,
      longitude: radiusCenter.lng,
      zoom: newZoom,
    });

    map.current.flyTo({
      center: [radiusCenter.lng, radiusCenter.lat],
      zoom: newZoom,
      essential: true,
      duration: 3000
    });

    drawRadiusCircle(map.current, radiusCenter, radius);
  };

  const handleRadiusPopupClose = () => {
    setShowRadiusPopup(false);
    if (tempMarker) {
      tempMarker.remove();
      setTempMarker(null);
    }
  };

 // Loading effect
 useEffect(() => {
    if (contentLoaded) {
      const timer = setTimeout(() => setIsLoading(false), 500);
      return () => clearTimeout(timer);
    }
  }, [contentLoaded, setIsLoading]);

  // Effect to handle uploaded facilities updates
  useEffect(() => {
    const pollUploadedFacilities = async () => {
      try {
        const uploadedData = await fetchData('uploaded-facilities');
        if (uploadedData && Array.isArray(uploadedData)) {
          setUploadedFacilities(uploadedData.map(facility => ({
            ...facility,
            isUploaded: true
          })));
        }
      } catch (error) {
        console.error('Error polling uploaded facilities:', error);
      }
    };

    // Poll for updates every 30 seconds
    const intervalId = setInterval(pollUploadedFacilities, 30000);

    return () => clearInterval(intervalId);
  }, []);

  return (
    <div className="App">
      <Navbar setShowUploadPopup={setShowPopup} />
      {showPopup && (
        <UploadPopup 
          onClose={() => setShowPopup(false)} 
          onUploadSuccess={() => {
            // Refresh uploaded facilities immediately after successful upload
            fetchData('uploaded-facilities').then(data => {
              if (data) {
                setUploadedFacilities(data.map(facility => ({
                  ...facility,
                  isUploaded: true
                })));
              }
            });
          }}
        />
      )}
      
      <div className="filter-section">
        <SearchInput 
          onSearch={debouncedSearch} 
          isSearching={isSearching}
          placeholder="Search for a location..."
          className={`search-input ${isSearching ? 'searching' : ''}`}
        />
        <div className="facility-type-filter-wrapper">
            <select
          value={selectedFacilityType}
          onChange={(e) => setSelectedFacilityType(e.target.value)}
          className="facility-type-filter"
        >
          <option value="">All Facility Types</option>
          {facilityTypes.map((type) => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>
        </div>
      
        {/* <FilterComponent onRadiusChange={handleRadiusChange} /> */}
        {showRadiusPopup && (
          <RadiusComponent
            onRadiusSubmit={handleRadiusSubmit}
            handleClose={handleRadiusPopupClose}
          />
        )}
      </div>
      
      <main className="main-section">
        <div 
          ref={mapContainer} 
          style={{ height: '100vh', width: '100%' }} 
          className={`map-container ${isSearching ? 'searching' : ''}`}
        />
      </main>

      {/* Status indicator for facilities */}
      <div className="facilities-status">
        <div className="status-item">
          <span className="status-dot standard"></span>
          Standard Facilities: {facilities.length}
        </div>
        <div className="status-item">
          <span className="status-dot uploaded"></span>
          Uploaded Facilities: {uploadedFacilities.length}
        </div>
      </div>

      <footer className="footer">
        &copy; GTL-Afya <span>{new Date().getFullYear()}</span>
      </footer>
    </div>
  );
}

function App() {
  return (
    <LoadingProvider>
      <LoadComponent />
      <AppContent />
    </LoadingProvider>
  );
}

export default App;