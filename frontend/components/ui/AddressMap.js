'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Map, { Marker, NavigationControl } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

// Default center (will be overridden by geolocation if available)
const DEFAULT_CENTER = {
  lat: 41.3275,  // Albania center as fallback
  lng: 19.8187,
};

// Supported shipping countries (Balkan region only)
const SUPPORTED_COUNTRIES = [
  { code: 'al', name: 'Albania', center: { lat: 41.3275, lng: 19.8187 }, zoom: 7 },
  { code: 'xk', name: 'Kosovo', center: { lat: 42.6026, lng: 20.9030 }, zoom: 9 },
  { code: 'mk', name: 'North Macedonia', center: { lat: 41.5124, lng: 21.7465 }, zoom: 8 },
];

// Alias for backward compatibility
const EUROPEAN_COUNTRIES = SUPPORTED_COUNTRIES;

// Flag component using flagcdn.com
function Flag({ country, size = 20 }) {
  return (
    <img 
      src={`https://flagcdn.com/w40/${country.toLowerCase()}.png`}
      srcSet={`https://flagcdn.com/w80/${country.toLowerCase()}.png 2x`}
      width={size}
      height={Math.round(size * 0.75)}
      alt={country}
      className="rounded-sm object-cover"
      style={{ minWidth: size }}
    />
  );
}

// Icons
const LocationIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3A8.994 8.994 0 0013 3.06V1h-2v2.06A8.994 8.994 0 003.06 11H1v2h2.06A8.994 8.994 0 0011 20.94V23h2v-2.06A8.994 8.994 0 0020.94 13H23v-2h-2.06zM12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z" />
  </svg>
);

const SearchIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const SpinnerIcon = ({ className }) => (
  <svg className={`animate-spin ${className}`} fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
  </svg>
);

const MapPinIcon = ({ className }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
  </svg>
);

// Custom marker component with smooth animations and idle bounce
const CustomMarker = ({ isDragging, isAnimating }) => (
  <div 
    className="marker-container"
    style={{
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      cursor: isDragging ? 'grabbing' : 'grab',
      willChange: 'transform',
    }}
  >
    {/* Pin wrapper with animation - moves the visual pin up when dragging but doesn't affect anchor point */}
    <div
      className={!isDragging && !isAnimating ? 'pin-idle-bounce' : ''}
      style={{
        transform: isDragging 
          ? 'scale(1.15) translateY(-15px)' 
          : isAnimating 
            ? 'scale(1.05) translateY(-5px)' 
            : 'scale(1) translateY(0)',
        transition: isDragging || isAnimating ? 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)' : 'none',
      }}
    >
    {/* Pin shadow - more dynamic */}
    <div 
      className={!isDragging && !isAnimating ? 'shadow-idle-bounce' : ''}
      style={{ 
        position: 'absolute',
        left: '50%',
        transform: 'translateX(-50%)',
        bottom: '0px',
        width: isDragging ? '12px' : isAnimating ? '18px' : '22px',
        height: isDragging ? '3px' : isAnimating ? '5px' : '7px',
        backgroundColor: isDragging ? 'rgba(0,0,0,0.15)' : 'rgba(0,0,0,0.25)',
        borderRadius: '50%',
        filter: isDragging ? 'blur(3px)' : 'blur(2px)',
        transition: isDragging || isAnimating ? 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)' : 'none',
      }}
    />
    {/* Main pin SVG - Green color scheme matching baucis-green */}
    <svg
      width="44"
      height="56"
      viewBox="0 0 44 56"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ 
        filter: isDragging 
          ? 'drop-shadow(0 8px 16px rgba(0,0,0,0.35))' 
          : 'drop-shadow(0 4px 8px rgba(0,0,0,0.25))',
        transition: 'filter 0.3s ease',
      }}
    >
      {/* Pin body */}
      <path
        d="M22 0C9.849 0 0 9.849 0 22c0 15.4 22 34 22 34s22-18.6 22-34C44 9.849 34.151 0 22 0z"
        fill={isDragging ? '#4d7c0f' : '#65a30d'}
        style={{ transition: 'fill 0.2s ease' }}
      />
      {/* Highlight */}
      <ellipse cx="16" cy="15" rx="6" ry="7" fill="#84cc16" fillOpacity="0.4" />
      {/* Inner circle - white */}
      <circle cx="22" cy="20" r="10" fill="white" />
      {/* Center dot - pink */}
      <circle 
        cx="22" 
        cy="20" 
        r={isDragging ? '6' : '5'} 
        fill="#fecdd3"
        style={{ transition: 'r 0.2s ease' }}
      />
      {/* Pulse ring when dragging */}
      {isDragging && (
        <circle 
          cx="22" 
          cy="20" 
          r="14" 
          fill="none" 
          stroke="#65a30d" 
          strokeWidth="2"
          strokeOpacity="0.3"
          className="animate-ping"
        />
      )}
    </svg>
    </div>
  </div>
);

// Address suggestion item - light theme
const SuggestionItem = ({ suggestion, onSelect, isHighlighted }) => (
  <button
    type="button"
    onClick={() => onSelect(suggestion)}
    className={`w-full px-4 py-3 text-left flex items-start gap-3 transition-colors border-b border-baucis-green-100 last:border-0 ${
      isHighlighted 
        ? 'bg-baucis-green-50' 
        : 'hover:bg-baucis-green-50/50'
    }`}
  >
    <MapPinIcon className="w-5 h-5 text-baucis-green-500 flex-shrink-0 mt-0.5" />
    <div className="flex-1 min-w-0">
      <p className="text-sm text-baucis-green-800 font-medium" style={{ fontFamily: 'Crimson Text, serif' }}>
        {suggestion.text || suggestion.place_name?.split(',')[0]}
      </p>
      <p className="text-xs text-baucis-green-500 truncate" style={{ fontFamily: 'Crimson Text, serif' }}>
        {suggestion.place_name || ''}
      </p>
    </div>
  </button>
);

export default function AddressMap({
  coordinates = null,
  selectedCountry = 'al',
  onCountryChange,
  onCoordinatesChange,
  onAddressSelect,
  height = '400px',
  showSearch = true,
  showCountrySelector = true,
  translations = {},
}) {
  // Translations with defaults
  const t = {
    useMyLocation: translations.useMyLocation || 'Use my location',
    locating: translations.locating || 'Finding your location...',
    locationError: translations.locationError || 'Could not get your location',
    searchAddress: translations.searchAddress || 'Search for your address',
    dragPinHint: translations.dragPinHint || 'Drag the pin or tap the map to adjust',
    selectCountry: translations.selectCountry || 'Select country',
    shippingRestriction: translations.shippingRestriction || 'We currently ship to:',
  };

  const [countryCode, setCountryCode] = useState(selectedCountry);
  const [viewState, setViewState] = useState(() => {
    // Initialize with country center if no coordinates
    const country = EUROPEAN_COUNTRIES.find(c => c.code === selectedCountry);
    return {
      longitude: coordinates?.lng || country?.center.lng || DEFAULT_CENTER.lng,
      latitude: coordinates?.lat || country?.center.lat || DEFAULT_CENTER.lat,
      zoom: coordinates ? 16 : (country?.zoom || 7),
    };
  });
  const [markerPosition, setMarkerPosition] = useState(() => {
    const country = EUROPEAN_COUNTRIES.find(c => c.code === selectedCountry);
    return coordinates || country?.center || DEFAULT_CENTER;
  });
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [initialLocationSet, setInitialLocationSet] = useState(false);
  
  // Geolocation state
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState(null);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [isSearching, setIsSearching] = useState(false);

  // Country selector dropdown state
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
  const countryDropdownRef = useRef(null);
  
  const searchTimeoutRef = useRef(null);
  const searchInputRef = useRef(null);
  const suggestionsRef = useRef(null);
  const mapRef = useRef(null);

  // Update country code when prop changes
  useEffect(() => {
    if (selectedCountry && selectedCountry !== countryCode) {
      setCountryCode(selectedCountry);
    }
  }, [selectedCountry]);

  // Close country dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (countryDropdownRef.current && !countryDropdownRef.current.contains(event.target)) {
        setIsCountryDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Try to get user's location on mount if no coordinates provided
  useEffect(() => {
    if (!coordinates && !initialLocationSet && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setViewState(prev => ({
            ...prev,
            longitude,
            latitude,
            zoom: 14,
          }));
          setMarkerPosition({ lat: latitude, lng: longitude });
          setInitialLocationSet(true);
          // Reverse geocode to detect country
          reverseGeocode(latitude, longitude);
        },
        () => {
          // Silently fail - will use default center
          setInitialLocationSet(true);
        },
        { enableHighAccuracy: false, timeout: 5000, maximumAge: 300000 }
      );
    }
  }, [coordinates, initialLocationSet]);

  // Handle click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        suggestionsRef.current && 
        !suggestionsRef.current.contains(event.target) &&
        searchInputRef.current &&
        !searchInputRef.current.contains(event.target)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Extract address components from Mapbox feature
  const extractAddressComponents = (feature) => {
    const context = feature.context || [];
    
    let city = '';
    let postalCode = '';
    let extractedCountryCode = countryCode;
    
    for (const ctx of context) {
      if (ctx.id?.startsWith('place.') || ctx.id?.startsWith('locality.')) {
        city = ctx.text;
      }
      if (ctx.id?.startsWith('postcode.')) {
        postalCode = ctx.text;
      }
      if (ctx.id?.startsWith('country.')) {
        extractedCountryCode = ctx.short_code?.toLowerCase() || countryCode;
      }
    }
    
    // If feature itself is a place
    if (!city && (feature.place_type?.includes('place') || feature.place_type?.includes('locality'))) {
      city = feature.text;
    }
    
    return {
      streetAddress: feature.text || feature.place_name?.split(',')[0] || '',
      fullAddress: feature.place_name || '',
      city,
      postalCode,
      countryCode: extractedCountryCode,
      coordinates: {
        lng: feature.center[0],
        lat: feature.center[1],
      },
    };
  };

  // Search for addresses using Mapbox Geocoding API directly
  const searchAddresses = useCallback(async (query) => {
    if (!MAPBOX_TOKEN || !query || query.length < 2) {
      setSuggestions([]);
      return;
    }

    setIsSearching(true);

    try {
      // Build search URL with country restriction
      let url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?`;
      url += `access_token=${MAPBOX_TOKEN}&`;
      url += `country=${countryCode}&`;
      url += `limit=6&`;
      url += `types=address,poi,place,locality,neighborhood&`;
      url += `language=en`;
      url += `&proximity=${viewState.longitude},${viewState.latitude}`;

      const response = await fetch(url);
      if (!response.ok) throw new Error('Search failed');

      const data = await response.json();
      setSuggestions(data.features || []);
      setShowSuggestions(true);
      setHighlightedIndex(-1);
    } catch (error) {
      console.error('Search error:', error);
      setSuggestions([]);
    } finally {
      setIsSearching(false);
    }
  }, [countryCode, viewState.longitude, viewState.latitude]);

  // Debounced search
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (value.length >= 2) {
      searchTimeoutRef.current = setTimeout(() => {
        searchAddresses(value);
      }, 300);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  // Animate marker when selecting location
  const animateMarker = () => {
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 400);
  };

  // Handle suggestion selection
  const handleSelectSuggestion = (suggestion) => {
    const [lng, lat] = suggestion.center;
    const newCoords = { lat, lng };

    animateMarker();
    
    setViewState((prev) => ({
      ...prev,
      longitude: lng,
      latitude: lat,
      zoom: 17,
    }));
    setMarkerPosition(newCoords);

    const streetName = suggestion.text || suggestion.place_name?.split(',')[0] || '';
    setSearchQuery(streetName);
    setSuggestions([]);
    setShowSuggestions(false);

    const addressData = extractAddressComponents(suggestion);
    
    onCoordinatesChange?.(newCoords);
    onAddressSelect?.(addressData);
  };

  // Handle keyboard navigation
  const handleSearchKeyDown = (e) => {
    if (!showSuggestions || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => 
        prev < suggestions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === 'Enter' && highlightedIndex >= 0) {
      e.preventDefault();
      handleSelectSuggestion(suggestions[highlightedIndex]);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  // Handle country change - center map on selected country
  const handleCountrySelect = (newCountryCode) => {
    const country = EUROPEAN_COUNTRIES.find(c => c.code === newCountryCode);
    if (country) {
      setCountryCode(newCountryCode);
      onCountryChange?.(newCountryCode);
      
      // Center map on the selected country
      setViewState({
        longitude: country.center.lng,
        latitude: country.center.lat,
        zoom: country.zoom,
      });
      setMarkerPosition(country.center);
      
      // Clear search when country changes
      setSearchQuery('');
      setSuggestions([]);
    }
    setIsCountryDropdownOpen(false);
  };

  // Use browser geolocation
  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation not supported');
      setTimeout(() => setLocationError(null), 3000);
      return;
    }

    setIsLocating(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const newCoords = { lat: latitude, lng: longitude };

        animateMarker();
        
        setViewState((prev) => ({
          ...prev,
          longitude,
          latitude,
          zoom: 17,
        }));
        setMarkerPosition(newCoords);
        setIsLocating(false);
        onCoordinatesChange?.(newCoords);

        // Reverse geocode to get address and update country
        reverseGeocode(latitude, longitude);
      },
      (error) => {
        setIsLocating(false);
        let errorMessage = t.locationError;
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location permission denied';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location unavailable';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out';
            break;
        }
        
        setLocationError(errorMessage);
        setTimeout(() => setLocationError(null), 4000);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  };

  // Reverse geocode coordinates to address using Mapbox API directly
  const reverseGeocode = async (lat, lng) => {
    if (!MAPBOX_TOKEN) return;
    
    setIsGeocoding(true);
    
    try {
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?` +
        `access_token=${MAPBOX_TOKEN}&` +
        `types=address,poi,place,locality&` +
        `limit=1&` +
        `language=en`;

      const response = await fetch(url);
      if (!response.ok) throw new Error('Reverse geocoding failed');

      const data = await response.json();

      if (data.features && data.features.length > 0) {
        const feature = data.features[0];
        const addressData = extractAddressComponents(feature);
        
        setSearchQuery(addressData.streetAddress || '');
        
        // Update country if detected from reverse geocode (auto-adapt country to pin)
        if (addressData.countryCode && addressData.countryCode !== countryCode) {
          const countryExists = EUROPEAN_COUNTRIES.find(c => c.code === addressData.countryCode);
          if (countryExists) {
            setCountryCode(addressData.countryCode);
            onCountryChange?.(addressData.countryCode);
          }
        }

        onAddressSelect?.({
          ...addressData,
          coordinates: { lat, lng },
        });
      }
    } catch (error) {
      console.error('Reverse geocoding error:', error);
    } finally {
      setIsGeocoding(false);
    }
  };

  // Update marker when coordinates prop changes
  useEffect(() => {
    if (coordinates?.lat && coordinates?.lng) {
      setMarkerPosition(coordinates);
      setViewState((prev) => ({
        ...prev,
        longitude: coordinates.lng,
        latitude: coordinates.lat,
      }));
    }
  }, [coordinates?.lat, coordinates?.lng]);

  // Handle map click
  const handleMapClick = useCallback((event) => {
    const { lngLat } = event;
    const newCoords = { lat: lngLat.lat, lng: lngLat.lng };

    animateMarker();
    setMarkerPosition(newCoords);
    onCoordinatesChange?.(newCoords);
    
    // Reverse geocode to get address (will also auto-detect country)
    reverseGeocode(lngLat.lat, lngLat.lng);
  }, [onCoordinatesChange]);

  // Handle marker drag
  const handleMarkerDragStart = useCallback(() => {
    setIsDragging(true);
  }, []);

  const handleMarkerDrag = useCallback((event) => {
    const { lngLat } = event;
    setMarkerPosition({ lat: lngLat.lat, lng: lngLat.lng });
  }, []);

  const handleMarkerDragEnd = useCallback((event) => {
    setIsDragging(false);
    const { lngLat } = event;
    const newCoords = { lat: lngLat.lat, lng: lngLat.lng };

    animateMarker();
    setMarkerPosition(newCoords);
    onCoordinatesChange?.(newCoords);
    
    // Reverse geocode the new position (will also auto-detect country)
    reverseGeocode(lngLat.lat, lngLat.lng);
  }, [onCoordinatesChange]);

  // Get current country
  const currentCountry = EUROPEAN_COUNTRIES.find(c => c.code === countryCode);
  const currentCountryName = currentCountry?.name || 'Country';

  if (!MAPBOX_TOKEN) {
    return (
      <div 
        className="rounded-2xl border border-baucis-green-200 bg-baucis-green-50 flex items-center justify-center"
        style={{ height }}
      >
        <p className="text-baucis-green-600 text-sm" style={{ fontFamily: 'Crimson Text, serif' }}>
          Map not available - Missing API token
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Country Selector with Flags */}
      {showCountrySelector && (
        <div className="relative" ref={countryDropdownRef}>
          <button
            type="button"
            onClick={() => setIsCountryDropdownOpen(!isCountryDropdownOpen)}
            className="w-full flex items-center gap-3 px-4 py-3 bg-white border border-baucis-green-200 rounded-xl text-baucis-green-800 focus:outline-none focus:ring-2 focus:ring-baucis-green-400 focus:border-transparent transition-all text-sm cursor-pointer hover:bg-baucis-green-50/50"
            style={{ fontFamily: 'Crimson Text, serif' }}
          >
            <Flag country={countryCode} size={20} />
            <span className="flex-1 text-left">{currentCountryName}</span>
            <svg 
              className={`w-4 h-4 text-baucis-green-500 transition-transform duration-200 ${isCountryDropdownOpen ? 'rotate-180' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          {/* Country Dropdown */}
          {isCountryDropdownOpen && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-baucis-green-200 rounded-xl shadow-lg overflow-hidden z-40 max-h-64 overflow-y-auto">
              {EUROPEAN_COUNTRIES.map((country) => (
                <button
                  key={country.code}
                  type="button"
                  onClick={() => handleCountrySelect(country.code)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 transition-all duration-150 ${
                    country.code === countryCode 
                      ? 'bg-baucis-green-50 text-baucis-green-700' 
                      : 'text-baucis-green-800 hover:bg-baucis-green-50/50'
                  }`}
                >
                  <Flag country={country.code} size={18} />
                  <span 
                    className="flex-1 text-left text-sm"
                    style={{ fontFamily: 'Crimson Text, serif' }}
                  >
                    {country.name}
                  </span>
                  {country.code === countryCode && (
                    <svg className="w-4 h-4 text-baucis-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Search Input - White background */}
      {showSearch && (
        <div className="relative">
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10">
              {isSearching ? (
                <SpinnerIcon className="w-5 h-5 text-baucis-green-400" />
              ) : (
                <SearchIcon className="w-5 h-5 text-baucis-green-400" />
              )}
            </div>
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              onKeyDown={handleSearchKeyDown}
              onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
              placeholder={`${t.searchAddress} in ${currentCountryName}...`}
              className="w-full pl-12 pr-4 py-3.5 bg-white border border-baucis-green-200 rounded-xl text-baucis-green-800 placeholder-baucis-green-400 focus:outline-none focus:ring-2 focus:ring-baucis-green-400 focus:border-transparent transition-all text-sm"
              style={{ fontFamily: 'Crimson Text, serif' }}
            />
          </div>

          {/* Suggestions Dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div 
              ref={suggestionsRef}
              className="absolute top-full left-0 right-0 mt-2 bg-white border border-baucis-green-200 rounded-xl shadow-lg overflow-hidden z-30 max-h-72 overflow-y-auto"
            >
              {suggestions.map((suggestion, index) => (
                <SuggestionItem
                  key={suggestion.id || index}
                  suggestion={suggestion}
                  onSelect={handleSelectSuggestion}
                  isHighlighted={index === highlightedIndex}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Map Container */}
      <div 
        className="relative rounded-2xl overflow-hidden border border-baucis-green-200"
        style={{ height }}
      >
        {/* Loading overlay - only show for initial map load or location finding */}
        {(isLocating || !mapLoaded) && (
          <div className="absolute inset-0 bg-baucis-green-50/90 backdrop-blur-sm flex items-center justify-center z-10">
            <div className="flex flex-col items-center gap-3">
              <SpinnerIcon className="w-8 h-8 text-baucis-green-600" />
              <span className="text-sm text-baucis-green-700 font-medium" style={{ fontFamily: 'Crimson Text, serif' }}>
                {isLocating ? t.locating : 'Loading map...'}
              </span>
            </div>
          </div>
        )}

        {/* Location Error Toast */}
        {locationError && (
          <div className="absolute top-4 left-4 right-4 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl flex items-center gap-3 z-20">
            <svg className="w-5 h-5 flex-shrink-0 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span style={{ fontFamily: 'Crimson Text, serif' }}>{locationError}</span>
          </div>
        )}

        <Map
          ref={mapRef}
          {...viewState}
          onMove={(evt) => setViewState(evt.viewState)}
          onClick={handleMapClick}
          onLoad={() => setMapLoaded(true)}
          mapStyle="mapbox://styles/bauciszen/cmj63ba5q000x01s8bb2v4rey"
          mapboxAccessToken={MAPBOX_TOKEN}
          style={{ width: '100%', height: '100%' }}
          cursor={isDragging ? 'grabbing' : 'pointer'}
        >
          {/* Navigation controls */}
          <NavigationControl position="top-right" showCompass={false} />

          {/* Draggable marker - only render when map is loaded */}
          {mapLoaded && (
            <Marker
              longitude={markerPosition.lng}
              latitude={markerPosition.lat}
              anchor="bottom"
              draggable
              onDragStart={handleMarkerDragStart}
              onDrag={handleMarkerDrag}
              onDragEnd={handleMarkerDragEnd}
            >
              <CustomMarker isDragging={isDragging} isAnimating={isAnimating} />
            </Marker>
          )}
        </Map>

        {/* Floating location button */}
        <button
          type="button"
          onClick={handleUseMyLocation}
          disabled={isLocating}
          className="absolute bottom-4 right-4 w-11 h-11 bg-white hover:bg-baucis-green-50 border border-baucis-green-200 rounded-full shadow-md flex items-center justify-center transition-all z-10 active:scale-95"
          title={t.useMyLocation}
        >
          {isLocating ? (
            <SpinnerIcon className="w-5 h-5 text-baucis-green-600" />
          ) : (
            <LocationIcon className="w-5 h-5 text-baucis-green-600" />
          )}
        </button>

        {/* Country indicator badge with flag */}
        <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-sm text-baucis-green-700 text-xs px-3 py-1.5 rounded-full border border-baucis-green-200 z-10 flex items-center gap-2">
          <Flag country={countryCode} size={16} />
          <span style={{ fontFamily: 'Crimson Text, serif' }}>{currentCountryName}</span>
        </div>
      </div>

      {/* Helper text */}
      <p className="text-xs text-baucis-green-500 text-center" style={{ fontFamily: 'Crimson Text, serif' }}>
        {t.dragPinHint}
      </p>

      {/* Marker animation styles */}
      <style jsx global>{`
        @keyframes ping {
          75%, 100% {
            transform: scale(1.5);
            opacity: 0;
          }
        }
        .animate-ping {
          animation: ping 1s cubic-bezier(0, 0, 0.2, 1) infinite;
        }
        @keyframes idleBounce {
          0%, 100% {
            transform: translateY(0) scale(1);
          }
          50% {
            transform: translateY(-8px) scale(1.05);
          }
        }
        @keyframes shadowBounce {
          0%, 100% {
            transform: translateX(-50%) scale(1);
            opacity: 0.25;
          }
          50% {
            transform: translateX(-50%) scale(0.7);
            opacity: 0.1;
          }
        }
        .pin-idle-bounce {
          animation: idleBounce 1.2s ease-in-out infinite;
        }
        .shadow-idle-bounce {
          animation: shadowBounce 1.2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

// Export the countries list for use in other components
export { EUROPEAN_COUNTRIES };
