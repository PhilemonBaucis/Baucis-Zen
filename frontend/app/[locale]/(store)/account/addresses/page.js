'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import dynamic from 'next/dynamic';
import { useAuth } from '@/lib/auth-context';

// Dynamic import for AddressMap (no SSR due to WebGL)
const AddressMap = dynamic(() => import('@/components/ui/AddressMap'), {
  ssr: false,
  loading: () => <div className="h-[250px] bg-baucis-green-50 rounded-2xl animate-pulse" />
});

// Icon components
const MapPinIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
  </svg>
);

const PlusIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
  </svg>
);

const PencilIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
  </svg>
);

const TrashIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
  </svg>
);

const LoadingSpinner = () => (
  <div className="flex justify-center py-8">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-baucis-green-600"></div>
  </div>
);

// Delete Confirmation Modal
const DeleteConfirmModal = ({ isOpen, onClose, onConfirm, loading, t }) => {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full mx-4 p-6 animate-in fade-in zoom-in duration-200">
        {/* Warning Icon */}
        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </div>
        
        {/* Title */}
        <h3 
          className="text-xl text-baucis-green-800 text-center mb-2"
          style={{ fontFamily: 'Libre Baskerville, serif' }}
        >
          {t('deleteAddress') || 'Delete Address'}
        </h3>
        
        {/* Message */}
        <p 
          className="text-baucis-green-600 text-center mb-6"
          style={{ fontFamily: 'Crimson Text, serif' }}
        >
          {t('confirmDelete') || 'Are you sure you want to delete this address? This action cannot be undone.'}
        </p>
        
        {/* Buttons */}
        <div className="flex space-x-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-3 border border-baucis-green-300 text-baucis-green-700 rounded-full hover:bg-baucis-green-50 transition-colors disabled:opacity-50"
            style={{ fontFamily: 'Libre Baskerville, serif' }}
          >
            {t('cancel')}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 px-4 py-3 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center"
            style={{ fontFamily: 'Libre Baskerville, serif' }}
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              t('delete') || 'Delete'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

const MAX_ADDRESSES = 4;

export default function AddressesPage() {
  const t = useTranslations('account');
  const { customer } = useAuth();
  const [addresses, setAddresses] = useState([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [addressToDelete, setAddressToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const emptyAddress = {
    address_name: '',  // Label like "Home", "Office", etc.
    first_name: customer?.first_name || '',
    last_name: customer?.last_name || '',
    address_1: '',
    address_2: '',
    city: '',
    postal_code: '',
    country_code: 'al', // Default to Albania
    phone: customer?.phone || '',
    coordinates: null, // { lat, lng } for map pin
  };

  const [formData, setFormData] = useState(emptyAddress);

  // Fetch addresses on mount
  useEffect(() => {
    fetchAddresses();
  }, []);

  const fetchAddresses = async () => {
    try {
      const response = await fetch('/api/addresses');
      const data = await response.json();
      setAddresses(data.addresses || []);
    } catch (err) {
      console.error('Failed to fetch addresses:', err);
    } finally {
      setInitialLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  // Supported shipping countries
  const SUPPORTED_COUNTRIES = ['al', 'xk', 'mk'];

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate that location has been selected on map
    if (!formData.city || !formData.coordinates) {
      setError(t('selectLocationOnMap') || 'Please select your location on the map');
      return;
    }

    // Validate that country is supported for shipping
    if (!SUPPORTED_COUNTRIES.includes(formData.country_code)) {
      setError(t('shippingRestriction') || 'We currently ship to:');
      return;
    }
    
    setLoading(true);
    setError(null);

    try {
      // Extract coordinates from formData for metadata
      const { coordinates, is_default_shipping, ...restFormData } = formData;
      
      // Only set as default if this is the first address being added
      const shouldBeDefault = !editingId && addresses.length === 0;
      
      const addressData = {
        ...restFormData,
        is_default_shipping: shouldBeDefault,
        is_default_billing: shouldBeDefault,
        metadata: coordinates ? { coordinates } : undefined,
      };

      let response;
      
      if (editingId) {
        // Update existing address
        response = await fetch('/api/addresses', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            address: { ...addressData, id: editingId },
          }),
        });
      } else {
        // Create new address
        response = await fetch('/api/addresses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            address: addressData,
          }),
        });
      }

      if (!response.ok) throw new Error('Failed to save address');

      const data = await response.json();
      
      // Update local state immediately
      setAddresses(data.addresses || []);
      setIsAdding(false);
      setEditingId(null);
      setFormData(emptyAddress);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (address) => {
    setFormData({
      address_name: address.address_name || '',
      first_name: address.first_name || '',
      last_name: address.last_name || '',
      address_1: address.address_1 || '',
      address_2: address.address_2 || '',
      city: address.city || '',
      postal_code: address.postal_code || '',
      country_code: address.country_code || '',
      phone: address.phone || '',
      coordinates: address.metadata?.coordinates || null,
    });
    setEditingId(address.id);
    setIsAdding(true);
  };

  // Open delete confirmation modal
  const handleDeleteClick = (addressId) => {
    setAddressToDelete(addressId);
    setDeleteModalOpen(true);
  };

  // Confirm deletion
  const handleConfirmDelete = async () => {
    if (!addressToDelete) return;
    
    setDeleting(true);
    try {
      const response = await fetch('/api/addresses', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address_id: addressToDelete }),
      });

      if (!response.ok) throw new Error('Failed to delete address');
      
      const data = await response.json();
      setAddresses(data.addresses || []);
      setDeleteModalOpen(false);
      setAddressToDelete(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleting(false);
    }
  };

  // Close delete modal
  const handleCloseDeleteModal = () => {
    setDeleteModalOpen(false);
    setAddressToDelete(null);
  };

  const handleSetDefault = async (addressId) => {
    setLoading(true);
    try {
      // Find the address and update it as default
      const address = addresses.find(a => a.id === addressId);
      if (!address) return;

      const response = await fetch('/api/addresses', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: {
            ...address,
            is_default_shipping: true,
            is_default_billing: true,
          },
        }),
      });

      if (!response.ok) throw new Error('Failed to update address');
      
      const data = await response.json();
      setAddresses(data.addresses || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full px-4 py-3 border border-baucis-green-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-baucis-green-400 focus:border-transparent transition-all text-baucis-green-800";
  const labelClass = "block text-sm text-baucis-green-700 mb-2";

  if (initialLoading) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <MapPinIcon className="w-5 h-5 text-baucis-green-600" />
            <h2 
              className="text-xl text-baucis-green-800"
              style={{ fontFamily: 'Libre Baskerville, serif' }}
            >
              {t('addresses')}
            </h2>
          </div>
          
          {!isAdding && addresses.length < MAX_ADDRESSES && (
            <button
              onClick={() => {
                setFormData(emptyAddress);
                setEditingId(null);
                setIsAdding(true);
              }}
              className="flex items-center space-x-2 bg-baucis-green-600 text-white text-sm px-4 py-2 rounded-full hover:bg-baucis-green-700 transition-colors"
              style={{ fontFamily: 'Libre Baskerville, serif' }}
            >
              <PlusIcon className="w-4 h-4" />
              <span>{t('addAddress')}</span>
            </button>
          )}
          {!isAdding && addresses.length >= MAX_ADDRESSES && (
            <div className="flex items-center space-x-2 bg-amber-50 border border-amber-200 px-3 py-2 rounded-full">
              <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
              <span className="text-sm text-amber-700" style={{ fontFamily: 'Crimson Text, serif' }}>
                {t('maxAddressesReached') || `Maximum ${MAX_ADDRESSES} addresses`}
              </span>
            </div>
          )}
        </div>

        {/* Add/Edit Form - Map-first approach */}
        {isAdding && (
          <form onSubmit={handleSubmit} className="bg-baucis-green-50 rounded-xl p-6 mb-6">
            <h3 
              className="text-lg text-baucis-green-800 mb-4"
              style={{ fontFamily: 'Libre Baskerville, serif' }}
            >
              {editingId ? t('editAddress') : t('newAddress')}
            </h3>

            <div className="space-y-4">
              {/* Address Name - Label like "Home", "Office" */}
              <div>
                <label className={labelClass} style={{ fontFamily: 'Crimson Text, serif' }}>
                  {t('addressName') || 'Address Name'}
                </label>
                <input
                  type="text"
                  name="address_name"
                  value={formData.address_name}
                  onChange={handleChange}
                  placeholder="Home, Office, etc."
                  className={inputClass}
                  style={{ fontFamily: 'Crimson Text, serif' }}
                />
              </div>

              {/* Names */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass} style={{ fontFamily: 'Crimson Text, serif' }}>
                    {t('firstName')} *
                  </label>
                  <input
                    type="text"
                    name="first_name"
                    value={formData.first_name}
                    onChange={handleChange}
                    required
                    className={inputClass}
                    style={{ fontFamily: 'Crimson Text, serif' }}
                  />
                </div>
                <div>
                  <label className={labelClass} style={{ fontFamily: 'Crimson Text, serif' }}>
                    {t('lastName')} *
                  </label>
                  <input
                    type="text"
                    name="last_name"
                    value={formData.last_name}
                    onChange={handleChange}
                    required
                    className={inputClass}
                    style={{ fontFamily: 'Crimson Text, serif' }}
                  />
                </div>
              </div>

              {/* Exact Location - Map with search (primary way to get address) */}
              <div>
                <label className={`text-sm mb-2 block ${formData.city && formData.coordinates ? 'text-baucis-green-700' : 'text-red-500 font-medium'}`} style={{ fontFamily: 'Crimson Text, serif' }}>
                  {t('pinYourLocation') || 'Find your exact location'} *
                </label>
                <AddressMap
                  coordinates={formData.coordinates}
                  selectedCountry={formData.country_code || 'al'}
                  onCountryChange={(code) => setFormData(prev => ({
                    ...prev,
                    country_code: code,
                    // Clear address when country changes
                    city: '',
                    address_1: '',
                    postal_code: '',
                    coordinates: null,
                  }))}
                  onCoordinatesChange={(coords) => setFormData(prev => ({
                    ...prev,
                    coordinates: coords
                  }))}
                  onAddressSelect={(addressData) => {
                    if (addressData) {
                      setFormData(prev => ({
                        ...prev,
                        address_1: addressData.streetAddress || '',
                        city: addressData.city || '',
                        postal_code: addressData.postalCode || '',
                        country_code: addressData.countryCode || prev.country_code,
                        coordinates: addressData.coordinates,
                      }));
                    }
                  }}
                  height="420px"
                  showSearch={true}
                  showCountrySelector={true}
                  translations={{
                    useMyLocation: t('useMyLocation') || 'Use my location',
                    locating: t('locating') || 'Finding your location...',
                    locationError: t('locationError') || 'Could not get your location',
                    searchAddress: t('searchAddress') || 'Search for your address',
                    dragPinHint: t('dragPinHint') || 'Drag the pin or tap the map to adjust',
                    shippingRestriction: t('shippingRestriction') || 'We currently ship to:',
                  }}
                />
                {/* Show selected address from map */}
                {formData.city && formData.coordinates && (
                  <div className="mt-3 p-3 bg-white rounded-xl border border-baucis-green-200">
                    <div className="flex items-start gap-2">
                      <svg className="w-5 h-5 text-baucis-green-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
                      </svg>
                      <div>
                        <p className="text-sm text-baucis-green-800 font-medium" style={{ fontFamily: 'Crimson Text, serif' }}>
                          {formData.address_1 || formData.city}
                        </p>
                        <p className="text-xs text-baucis-green-600" style={{ fontFamily: 'Crimson Text, serif' }}>
                          {formData.city}{formData.postal_code && `, ${formData.postal_code}`}{formData.country_code && ` (${formData.country_code.toUpperCase()})`}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-2 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl mt-4">
                <svg className="w-4 h-4 text-amber-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="flex items-center gap-2 flex-wrap text-sm text-amber-700" style={{ fontFamily: 'Crimson Text, serif' }}>
                  <span>{error}</span>
                  <div className="flex items-center gap-1">
                    <img src="https://flagcdn.com/w40/al.png" srcSet="https://flagcdn.com/w80/al.png 2x" width="16" height="12" alt="Albania" className="rounded-sm" />
                    <span>Albania</span>
                  </div>
                  <span>•</span>
                  <div className="flex items-center gap-1">
                    <img src="https://flagcdn.com/w40/xk.png" srcSet="https://flagcdn.com/w80/xk.png 2x" width="16" height="12" alt="Kosovo" className="rounded-sm" />
                    <span>Kosovo</span>
                  </div>
                  <span>•</span>
                  <div className="flex items-center gap-1">
                    <img src="https://flagcdn.com/w40/mk.png" srcSet="https://flagcdn.com/w80/mk.png 2x" width="16" height="12" alt="North Macedonia" className="rounded-sm" />
                    <span>North Macedonia</span>
                  </div>
                </div>
              </div>
            )}

            <div className="flex space-x-3 mt-6">
              <button
                type="submit"
                disabled={loading || !formData.city || !formData.coordinates}
                className="flex-1 bg-baucis-green-600 text-white py-3 rounded-full hover:bg-baucis-green-700 transition-colors disabled:opacity-50"
                style={{ fontFamily: 'Libre Baskerville, serif' }}
              >
                {loading ? t('saving') : t('saveAddress')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsAdding(false);
                  setEditingId(null);
                  setError(null);
                }}
                className="px-6 py-3 border border-baucis-green-300 text-baucis-green-700 rounded-full hover:bg-baucis-green-50 transition-colors"
                style={{ fontFamily: 'Libre Baskerville, serif' }}
              >
                {t('cancel')}
              </button>
            </div>
          </form>
        )}

        {/* Address List */}
        {addresses.length === 0 && !isAdding ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-baucis-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <MapPinIcon className="w-8 h-8 text-baucis-green-400" />
            </div>
            <p 
              className="text-baucis-green-600 mb-4"
              style={{ fontFamily: 'Crimson Text, serif' }}
            >
              {t('noAddressSaved')}
            </p>
            <p 
              className="text-baucis-green-500 text-sm"
              style={{ fontFamily: 'Crimson Text, serif' }}
            >
              {t('addAddressHint')}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {addresses.map((address) => (
              <div 
                key={address.id}
                className={`border rounded-xl p-4 ${
                  address.is_default_shipping 
                    ? 'border-baucis-green-400 bg-baucis-green-50' 
                    : 'border-baucis-green-200'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      {address.address_name && (
                        <span 
                          className="text-baucis-green-800 font-medium"
                          style={{ fontFamily: 'Libre Baskerville, serif' }}
                        >
                          {address.address_name}
                        </span>
                      )}
                      {address.is_default_shipping && (
                        <span className="bg-baucis-green-600 text-white text-xs px-2 py-0.5 rounded-full">
                          {t('default')}
                        </span>
                      )}
                    </div>
                    <p 
                      className="text-baucis-green-700"
                      style={{ fontFamily: 'Crimson Text, serif' }}
                    >
                      {address.first_name} {address.last_name}
                    </p>
                    <p 
                      className="text-baucis-green-600 text-sm"
                      style={{ fontFamily: 'Crimson Text, serif' }}
                    >
                      {address.address_1}
                      {address.address_2 && `, ${address.address_2}`}
                    </p>
                    <p 
                      className="text-baucis-green-600 text-sm"
                      style={{ fontFamily: 'Crimson Text, serif' }}
                    >
                      {address.city}{address.postal_code && `, ${address.postal_code}`}
                    </p>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {!address.is_default_shipping && (
                      <button
                        onClick={() => handleSetDefault(address.id)}
                        disabled={loading}
                        className="text-xs text-baucis-green-600 hover:text-baucis-green-800"
                        style={{ fontFamily: 'Crimson Text, serif' }}
                      >
                        {t('makeDefault')}
                      </button>
                    )}
                    <button
                      onClick={() => handleEdit(address)}
                      className="p-2 text-baucis-green-600 hover:text-baucis-green-800 hover:bg-baucis-green-100 rounded-lg transition-colors"
                    >
                      <PencilIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteClick(address.id)}
                      disabled={loading || deleting}
                      className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteModalOpen}
        onClose={handleCloseDeleteModal}
        onConfirm={handleConfirmDelete}
        loading={deleting}
        t={t}
      />
    </div>
  );
}
