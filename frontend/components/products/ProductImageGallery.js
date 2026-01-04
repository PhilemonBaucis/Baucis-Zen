'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

export default function ProductImageGallery({ images, title }) {
  const tProducts = useTranslations('products');
  const tCommon = useTranslations('common');
  const [selectedImage, setSelectedImage] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);
  
  // If no images array, use empty array
  const imageList = images && images.length > 0 ? images : [];
  
  if (imageList.length === 0) {
    return (
      <div className="aspect-[3/2] bg-gradient-to-br from-baucis-green-50 to-baucis-green-100 rounded-2xl overflow-hidden shadow-lg flex items-center justify-center">
        <div className="text-center text-baucis-green-400">
          <svg className="w-16 h-16 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} 
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="text-sm" style={{ fontFamily: 'Crimson Text, serif' }}>
            {tProducts('noImageAvailable') || tCommon('noImage') || 'No Image Available'}
          </span>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {/* Main Image */}
        <div className="relative aspect-[3/2] bg-gradient-to-br from-baucis-green-50 to-baucis-green-100 rounded-2xl overflow-hidden shadow-lg group">
          <img
            src={imageList[selectedImage]}
            alt={`${title} - View ${selectedImage + 1}`}
            className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
          />
          {/* Stylish Zoom Button */}
          <button
            onClick={() => setIsZoomed(true)}
            className="absolute bottom-4 right-4 px-4 py-2 bg-baucis-green-800/80 hover:bg-baucis-green-800 backdrop-blur-sm rounded-full shadow-lg flex items-center space-x-2 transition-all duration-300 hover:scale-105 opacity-0 group-hover:opacity-100"
            aria-label={tProducts('viewImage') || 'Zoom image'}
          >
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
            </svg>
            <span className="text-white text-xs tracking-wider" style={{ fontFamily: 'Crimson Text, serif' }}>
              {tProducts('viewImage') || 'View'}
            </span>
          </button>
        </div>
        
        {/* Thumbnail Images */}
        {imageList.length > 1 && (
          <div className="flex gap-2">
            {imageList.map((img, index) => (
              <button
                key={index}
                onClick={() => setSelectedImage(index)}
                className={`relative w-16 h-16 rounded-lg overflow-hidden transition-all duration-300 ${
                  selectedImage === index 
                    ? 'ring-2 ring-baucis-green-500 ring-offset-1' 
                    : 'opacity-50 hover:opacity-100'
                }`}
              >
                <img
                  src={img}
                  alt={`${title} - Thumbnail ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Stylish Zoom Modal */}
      {isZoomed && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center"
          onClick={() => setIsZoomed(false)}
        >
          {/* Backdrop with blur */}
          <div className="absolute inset-0 bg-baucis-green-900/95 backdrop-blur-md"></div>
          
          {/* Close Button */}
          <button
            onClick={() => setIsZoomed(false)}
            className="absolute top-6 right-6 z-10 w-12 h-12 bg-white/10 hover:bg-white/20 border border-white/20 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110 hover:rotate-90"
            aria-label="Close zoom"
          >
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Product Title in Modal */}
          <div className="absolute top-6 left-6 z-10 max-w-[200px]">
            <p className="text-white/60 text-xs tracking-widest uppercase mb-1" style={{ fontFamily: 'Libre Baskerville, serif' }}>
              Baucis Zen
            </p>
            <h3 className="text-white text-base leading-tight" style={{ fontFamily: 'Libre Baskerville, serif' }}>
              {title}
            </h3>
          </div>
          
          {/* Main Content - Image and Thumbnails side by side */}
          <div className="relative z-10 flex items-center justify-center gap-4 px-8 mt-4">
            {/* Main Zoomed Image */}
            <div className="max-w-[80vw]">
              <img
                src={imageList[selectedImage]}
                alt={`${title} - Zoomed view`}
                className="max-w-full max-h-[88vh] object-contain rounded-2xl shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              />
            </div>

            {/* Thumbnail navigation on the right */}
            {imageList.length > 1 && (
              <div className="flex flex-col gap-2 bg-white/10 backdrop-blur-md p-2 rounded-xl border border-white/10">
                {imageList.map((img, index) => (
                  <button
                    key={index}
                    onClick={(e) => { e.stopPropagation(); setSelectedImage(index); }}
                    className={`w-12 h-12 rounded-lg overflow-hidden transition-all duration-300 ${
                      selectedImage === index 
                        ? 'ring-2 ring-white' 
                        : 'opacity-40 hover:opacity-80'
                    }`}
                  >
                    <img
                      src={img}
                      alt={`${title} - Thumbnail ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Image Counter */}
          <div className="absolute bottom-4 right-6 z-10 text-white/50 text-sm" style={{ fontFamily: 'Crimson Text, serif' }}>
            {selectedImage + 1} / {imageList.length}
          </div>
        </div>
      )}
    </>
  );
}

