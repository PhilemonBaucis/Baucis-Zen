'use client';

import { useState, useCallback, useEffect } from 'react';

// Slide configuration - placeholder images to be replaced with Cloudflare URLs later
const slides = [
  {
    id: 1,
    type: 'image',
    src: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80',
    alt: 'Serene mountain landscape representing inner peace',
  },
  {
    id: 2,
    type: 'image',
    src: 'https://images.unsplash.com/photo-1518241353330-0f7941c2d9b5?w=800&q=80',
    alt: 'Zen stones balanced in harmony',
  },
  {
    id: 3,
    type: 'image',
    src: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&q=80',
    alt: 'Peaceful meditation and wellness',
  },
];

export default function HeroCarousel() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [imagesLoaded, setImagesLoaded] = useState(0);

  // Track when all images are loaded
  const isLoading = imagesLoaded < slides.length;

  // Preload images
  useEffect(() => {
    slides.forEach((slide) => {
      const img = new Image();
      img.onload = () => setImagesLoaded(prev => prev + 1);
      img.onerror = () => setImagesLoaded(prev => prev + 1);
      img.src = slide.src;
    });
  }, []);

  const goToSlide = useCallback((index) => {
    setCurrentSlide(index);
  }, []);

  const nextSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  }, []);

  const prevSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  }, []);

  // Get slide position relative to current slide
  const getSlidePosition = (index) => {
    const diff = index - currentSlide;
    const total = slides.length;
    
    // Normalize to handle wrap-around
    let normalizedDiff = diff;
    if (diff > total / 2) normalizedDiff = diff - total;
    if (diff < -total / 2) normalizedDiff = diff + total;
    
    return normalizedDiff;
  };

  const renderSlide = (slide, index) => {
    const position = getSlidePosition(index);
    const isCenter = position === 0;
    const isLeft = position === -1 || (position === slides.length - 1 && currentSlide === 0);
    const isRight = position === 1 || (position === -(slides.length - 1) && currentSlide === slides.length - 1);
    const isVisible = Math.abs(position) <= 1;

    if (!isVisible) return null;

    // Calculate transforms for 3D carousel effect
    // Center is big, left/right peek only ~20% from edges
    let translateX = '0%';
    let scale = 1;
    let zIndex = 30;
    let opacity = 1;
    let blur = 0;
    let width = '75%'; // Center image sized to show fully

    if (isLeft) {
      translateX = '-95%'; // Push far left - only small peek visible
      scale = 0.5;
      zIndex = 20;
      opacity = 0.4;
      blur = 3;
      width = '45%';
    } else if (isRight) {
      translateX = '95%'; // Push far right - only small peek visible
      scale = 0.5;
      zIndex = 20;
      opacity = 0.4;
      blur = 3;
      width = '45%';
    }

    return (
      <div
        key={slide.id}
        onClick={() => !isCenter && goToSlide(index)}
        className={`absolute left-1/2 top-1/2 transition-all duration-700 ease-out ${!isCenter ? 'cursor-pointer' : ''}`}
        style={{
          transform: `translateX(-50%) translateY(-50%) translateX(${translateX}) scale(${scale})`,
          zIndex,
          opacity,
          filter: blur > 0 ? `blur(${blur}px)` : 'none',
          width,
          maxWidth: isCenter ? '1100px' : '600px',
        }}
      >
        {/* Elegant frame container */}
        <div className="relative p-[3px] rounded-2xl bg-gradient-to-br from-baucis-green-300/40 via-white/60 to-baucis-pink-300/40">
          {/* Inner shadow frame */}
          <div className="relative rounded-[14px] overflow-hidden shadow-[0_25px_60px_-15px_rgba(0,0,0,0.25),0_10px_20px_-10px_rgba(0,0,0,0.15),inset_0_1px_0_rgba(255,255,255,0.4)]">
            {/* Subtle inner border glow */}
            <div className="absolute inset-0 rounded-[14px] ring-1 ring-white/30 pointer-events-none z-10"></div>
            
            <div className="relative aspect-[4/3]">
              <img
                src={slide.src}
                alt={slide.alt}
                className="w-full h-full object-cover object-center"
              />
              {/* Dark green overlay - only on non-highlighted slides */}
              {!isCenter && (
                <div className="absolute inset-0 bg-baucis-green-800/60"></div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* White spacer section for header distance */}
      <div className="h-24 bg-white" />
      
      <section className="relative bg-white">
        {/* Loading state - zen mascot */}
        {isLoading && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-white to-baucis-green-50/50">
            <div className="text-center">
              {/* Mascot waving */}
              <div className="relative w-24 h-24 mx-auto mb-4">
                {/* White background circle */}
                <div className="absolute inset-2 bg-white rounded-full shadow-lg" />
                {/* Mascot body */}
                <img 
                  src="/Chat/1.png" 
                  alt="" 
                  className="absolute inset-0 w-full h-full object-contain z-10"
                />
                {/* Mascot eyes */}
                <img 
                  src="/Chat/3.png" 
                  alt="" 
                  className="absolute inset-0 w-full h-full object-contain z-10"
                />
                {/* Waving arm with animation */}
                <img 
                  src="/Chat/2.png" 
                  alt="" 
                  className="absolute inset-0 w-full h-full object-contain z-10 animate-[wave_0.5s_ease-in-out_infinite] origin-[60%_70%]"
                />
              </div>
              <p 
                className="text-baucis-green-700 text-sm tracking-wide"
                style={{ fontFamily: 'Libre Baskerville, serif' }}
              >
                Finding your zen...
              </p>
              <p 
                className="text-baucis-green-500 text-xs mt-1"
                style={{ fontFamily: 'Crimson Text, serif' }}
              >
                One moment of peace
              </p>
            </div>
          </div>
        )}

        {/* 3D Carousel - clipped to prevent overflow */}
        <div className="max-w-7xl mx-auto px-8 sm:px-12 lg:px-16 overflow-hidden">
        <div className="relative h-[100dvh] sm:h-[86vh]">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative w-full h-full">
              {slides.map(renderSlide)}
            </div>
          </div>
        
          {/* Navigation Arrows */}
          <button
            onClick={prevSlide}
            className="absolute left-0 md:-left-4 top-1/2 -translate-y-1/2 z-40 w-10 h-10 bg-white/80 hover:bg-white rounded-full shadow-lg flex items-center justify-center transition-all duration-300 hover:scale-110"
            aria-label="Previous slide"
          >
            <svg className="w-5 h-5 text-baucis-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={nextSlide}
            className="absolute right-0 md:-right-4 top-1/2 -translate-y-1/2 z-40 w-10 h-10 bg-white/80 hover:bg-white rounded-full shadow-lg flex items-center justify-center transition-all duration-300 hover:scale-110"
            aria-label="Next slide"
          >
            <svg className="w-5 h-5 text-baucis-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </section>
    </>
  );
}
