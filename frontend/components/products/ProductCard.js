'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import AddToCartButton from './AddToCartButton';
import TierPrice from './TierPrice';

export default function ProductCard({ product }) {
  const t = useTranslations('common');
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
  if (!product) return null;

  // Get all images, fallback to single image
  const images = product.images?.length > 0 ? product.images : [product.image].filter(Boolean);
  const hasMultipleImages = images.length > 1;

  const goToPrevious = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentImageIndex(prev => prev === 0 ? images.length - 1 : prev - 1);
  };

  const goToNext = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentImageIndex(prev => prev === images.length - 1 ? 0 : prev + 1);
  };

  return (
    <div className="group relative flex flex-col h-full overflow-hidden bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-500 hover:scale-[1.02] border border-baucis-green-100/50">
      {/* Image Container */}
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-t-2xl bg-gradient-to-br from-baucis-pink-50 to-baucis-green-50">
        <Link href={`/products/${product.handle}`} className="block h-full w-full">
          {images.length > 0 ? (
            <img
              src={images[currentImageIndex]}
              alt={product.title}
              className="h-full w-full object-cover object-center group-hover:scale-105 transition-transform duration-700"
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center">
              <div className="text-center">
                <div className="w-14 h-14 bg-baucis-green-100 rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-7 h-7 text-baucis-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <span className="text-baucis-green-400 font-medium text-xs">{t('noImage')}</span>
              </div>
            </div>
          )}
        </Link>
        
        {/* Navigation Arrows - Only show if multiple images */}
        {hasMultipleImages && (
          <>
            {/* Left Arrow - visible on mobile, hover on desktop */}
            <button
              onClick={goToPrevious}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-md opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-300 z-10"
              aria-label="Previous image"
            >
              <svg className="w-4 h-4 text-baucis-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            {/* Right Arrow - visible on mobile, hover on desktop */}
            <button
              onClick={goToNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-md opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-300 z-10"
              aria-label="Next image"
            >
              <svg className="w-4 h-4 text-baucis-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            
            {/* Dot Indicators */}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
              {images.map((_, index) => (
                <button
                  key={index}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setCurrentImageIndex(index);
                  }}
                  className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                    index === currentImageIndex 
                      ? 'bg-white w-3' 
                      : 'bg-white/60 hover:bg-white/80'
                  }`}
                  aria-label={`Go to image ${index + 1}`}
                />
              ))}
            </div>
          </>
        )}
        
        {/* Sold Out Badge */}
        {product.isSoldOut && (
          <div className="absolute top-3 right-3 bg-baucis-green-800 text-white px-3 py-1 rounded-full text-[10px] font-medium tracking-wider z-10">
            {t('soldOut').toUpperCase()}
          </div>
        )}
      </div>
      
      {/* Content - flex-grow to push button to bottom */}
      <div className="flex flex-col flex-grow p-4">
        {/* Title */}
        <Link href={`/products/${product.handle}`}>
          <h3 
            className="text-base text-baucis-green-800 hover:text-baucis-green-600 transition-colors duration-300 line-clamp-1"
            style={{ fontFamily: 'Libre Baskerville, serif' }}
          >
            {product.title}
          </h3>
        </Link>
        
        {/* Subtitle */}
        <div className="mt-1 min-h-[1.25rem]">
          {product.subtitle && (
            <p 
              className="text-xs text-baucis-green-500 line-clamp-1"
              style={{ fontFamily: 'Crimson Text, serif' }}
            >
              {product.subtitle}
            </p>
          )}
        </div>
        
        {/* Price with Tier Discount */}
        <div className="mt-2">
          <TierPrice 
            price={product.price} 
            currency={product.currency} 
            size="small"
          />
        </div>
        
        {/* Spacer to push button to bottom */}
        <div className="flex-grow min-h-2"></div>
        
        {/* Add to Cart Button - Always at bottom */}
        <AddToCartButton product={product} className="mt-3" />
      </div>
    </div>
  );
}
