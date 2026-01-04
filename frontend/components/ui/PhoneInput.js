'use client';

import { useState, useRef, useEffect } from 'react';

// All European countries with dial codes
const EUROPEAN_COUNTRIES = [
  { code: 'AL', name: 'Albania', dial: '+355' },
  { code: 'AD', name: 'Andorra', dial: '+376' },
  { code: 'AT', name: 'Austria', dial: '+43' },
  { code: 'BY', name: 'Belarus', dial: '+375' },
  { code: 'BE', name: 'Belgium', dial: '+32' },
  { code: 'BA', name: 'Bosnia and Herzegovina', dial: '+387' },
  { code: 'BG', name: 'Bulgaria', dial: '+359' },
  { code: 'HR', name: 'Croatia', dial: '+385' },
  { code: 'CY', name: 'Cyprus', dial: '+357' },
  { code: 'CZ', name: 'Czech Republic', dial: '+420' },
  { code: 'DK', name: 'Denmark', dial: '+45' },
  { code: 'EE', name: 'Estonia', dial: '+372' },
  { code: 'FI', name: 'Finland', dial: '+358' },
  { code: 'FR', name: 'France', dial: '+33' },
  { code: 'DE', name: 'Germany', dial: '+49' },
  { code: 'GR', name: 'Greece', dial: '+30' },
  { code: 'HU', name: 'Hungary', dial: '+36' },
  { code: 'IS', name: 'Iceland', dial: '+354' },
  { code: 'IE', name: 'Ireland', dial: '+353' },
  { code: 'IT', name: 'Italy', dial: '+39' },
  { code: 'XK', name: 'Kosovo', dial: '+383' },
  { code: 'LV', name: 'Latvia', dial: '+371' },
  { code: 'LI', name: 'Liechtenstein', dial: '+423' },
  { code: 'LT', name: 'Lithuania', dial: '+370' },
  { code: 'LU', name: 'Luxembourg', dial: '+352' },
  { code: 'MT', name: 'Malta', dial: '+356' },
  { code: 'MD', name: 'Moldova', dial: '+373' },
  { code: 'MC', name: 'Monaco', dial: '+377' },
  { code: 'ME', name: 'Montenegro', dial: '+382' },
  { code: 'NL', name: 'Netherlands', dial: '+31' },
  { code: 'MK', name: 'North Macedonia', dial: '+389' },
  { code: 'NO', name: 'Norway', dial: '+47' },
  { code: 'PL', name: 'Poland', dial: '+48' },
  { code: 'PT', name: 'Portugal', dial: '+351' },
  { code: 'RO', name: 'Romania', dial: '+40' },
  { code: 'RU', name: 'Russia', dial: '+7' },
  { code: 'SM', name: 'San Marino', dial: '+378' },
  { code: 'RS', name: 'Serbia', dial: '+381' },
  { code: 'SK', name: 'Slovakia', dial: '+421' },
  { code: 'SI', name: 'Slovenia', dial: '+386' },
  { code: 'ES', name: 'Spain', dial: '+34' },
  { code: 'SE', name: 'Sweden', dial: '+46' },
  { code: 'CH', name: 'Switzerland', dial: '+41' },
  { code: 'TR', name: 'Turkey', dial: '+90' },
  { code: 'UA', name: 'Ukraine', dial: '+380' },
  { code: 'GB', name: 'United Kingdom', dial: '+44' },
  { code: 'VA', name: 'Vatican City', dial: '+39' },
];

// Flag image component using flagcdn.com
const FlagImage = ({ countryCode, className = '' }) => (
  <img
    src={`https://flagcdn.com/w40/${countryCode.toLowerCase()}.png`}
    srcSet={`https://flagcdn.com/w80/${countryCode.toLowerCase()}.png 2x`}
    alt={countryCode}
    className={`inline-block object-cover ${className}`}
    style={{ width: '24px', height: '16px', borderRadius: '2px' }}
    loading="lazy"
  />
);

// Parse phone value to extract country and number
function parsePhoneValue(value) {
  // If no value, return null country and empty number (keep everything empty)
  if (!value || value.trim() === '') return { country: null, number: '' };
  
  // Try to find matching country by dial code
  const sortedByLength = [...EUROPEAN_COUNTRIES].sort((a, b) => b.dial.length - a.dial.length);
  
  for (const country of sortedByLength) {
    if (value.startsWith(country.dial)) {
      return {
        country,
        number: value.slice(country.dial.length).trim(),
      };
    }
  }
  
  // Default to Albania if no match but value exists
  return { country: EUROPEAN_COUNTRIES[0], number: value.replace(/^\+\d+\s*/, '') };
}

export default function PhoneInput({ 
  value = '', 
  onChange, 
  placeholder = '',
  disabled = false,
  className = '',
  hasError = false,
}) {
  const parsed = parsePhoneValue(value);
  const [selectedCountry, setSelectedCountry] = useState(parsed.country);
  const [phoneNumber, setPhoneNumber] = useState(parsed.number);
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef(null);
  const searchInputRef = useRef(null);

  // Update internal state when value prop changes (e.g., when customer data loads)
  useEffect(() => {
    const newParsed = parsePhoneValue(value);
    setSelectedCountry(newParsed.country);
    setPhoneNumber(newParsed.number);
  }, [value]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  // Update parent when country or number changes
  const handleChange = (country, number) => {
    // Only include the dial code if there's an actual phone number and country selected
    const trimmedNumber = (number || '').trim();
    const fullValue = (country && trimmedNumber) ? `${country.dial} ${trimmedNumber}` : '';
    onChange?.(fullValue);
  };

  const handleCountrySelect = (country) => {
    setSelectedCountry(country);
    setIsOpen(false);
    setSearchQuery('');
    handleChange(country, phoneNumber);
  };

  const handleNumberChange = (e) => {
    const newNumber = e.target.value;
    setPhoneNumber(newNumber);
    // If no country selected yet and user starts typing, default to Albania
    const countryToUse = selectedCountry || EUROPEAN_COUNTRIES[0];
    if (!selectedCountry && newNumber.trim()) {
      setSelectedCountry(countryToUse);
    }
    handleChange(countryToUse, newNumber);
  };

  // Filter countries by search
  const filteredCountries = searchQuery
    ? EUROPEAN_COUNTRIES.filter(c => 
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.dial.includes(searchQuery)
      )
    : EUROPEAN_COUNTRIES;

  const borderClass = hasError 
    ? 'border-2 border-red-400 bg-red-50/50 focus-within:ring-red-400' 
    : 'border border-baucis-green-200 focus-within:ring-baucis-green-400';

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <div className={`flex rounded-xl focus-within:ring-2 focus-within:border-transparent transition-all ${borderClass}`}>
        {/* Country Selector */}
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className={`flex items-center space-x-2 px-3 ${hasError ? 'bg-red-50/50 border-r border-red-300' : 'bg-baucis-green-50 border-r border-baucis-green-200'} hover:bg-opacity-80 transition-colors rounded-l-xl ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          {selectedCountry ? (
            <>
              <FlagImage countryCode={selectedCountry.code} />
              <span 
                className="text-sm text-baucis-green-700"
                style={{ fontFamily: 'Crimson Text, serif' }}
              >
                {selectedCountry.dial}
              </span>
            </>
          ) : (
            <span 
              className="text-sm text-baucis-green-400"
              style={{ fontFamily: 'Crimson Text, serif' }}
            >
              +--
            </span>
          )}
          <svg className={`w-4 h-4 text-baucis-green-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </button>

        {/* Phone Number Input */}
        <input
          type="tel"
          value={phoneNumber}
          onChange={handleNumberChange}
          placeholder={placeholder}
          disabled={disabled}
          className={`flex-1 px-4 py-3 focus:outline-none rounded-r-xl ${disabled ? 'bg-baucis-green-50 text-baucis-green-600 cursor-not-allowed' : hasError ? 'bg-red-50/50 text-baucis-green-800' : 'bg-white text-baucis-green-800'}`}
          style={{ fontFamily: 'Crimson Text, serif' }}
        />
      </div>

      {/* Dropdown - Outside the flex container to avoid clipping */}
      {isOpen && (
        <div 
          className="absolute left-0 top-full mt-1 w-72 bg-white rounded-xl shadow-xl border border-baucis-green-100 z-50"
          style={{ animation: 'fadeIn 0.15s ease-out' }}
        >
          {/* Search */}
          <div className="p-2 border-b border-baucis-green-100">
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search country..."
              className="w-full px-3 py-2 text-sm border border-baucis-green-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-baucis-green-400 focus:border-transparent"
              style={{ fontFamily: 'Crimson Text, serif' }}
            />
          </div>

          {/* Countries List */}
          <div className="max-h-60 overflow-y-auto">
            {filteredCountries.length === 0 ? (
              <div className="px-4 py-3 text-sm text-baucis-green-500" style={{ fontFamily: 'Crimson Text, serif' }}>
                No countries found
              </div>
            ) : (
              filteredCountries.map((country) => (
                <button
                  key={country.code}
                  type="button"
                  onClick={() => handleCountrySelect(country)}
                  className={`w-full flex items-center space-x-3 px-4 py-2.5 text-left hover:bg-baucis-green-50 transition-colors ${
                    selectedCountry?.code === country.code ? 'bg-baucis-green-50' : ''
                  }`}
                >
                  <FlagImage countryCode={country.code} />
                  <span 
                    className="flex-1 text-sm text-baucis-green-800"
                    style={{ fontFamily: 'Crimson Text, serif' }}
                  >
                    {country.name}
                  </span>
                  <span 
                    className="text-sm text-baucis-green-500"
                    style={{ fontFamily: 'Crimson Text, serif' }}
                  >
                    {country.dial}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

export { EUROPEAN_COUNTRIES };
