'use client';

import { useEffect, useRef, useState } from 'react';

export default function AboutSection() {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <section 
      ref={sectionRef}
      className="pt-24 md:pt-32 pb-12 md:pb-14 bg-white relative overflow-hidden"
    >
      {/* Soft background accents */}
      <div className="absolute top-0 left-1/4 w-48 h-48 bg-baucis-green-100/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-48 h-48 bg-baucis-pink-100/10 rounded-full blur-3xl" />
      
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Compact Header */}
        <div className={`text-center mb-10 md:mb-12 transition-all duration-1000 ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}>
          <span 
            className="text-baucis-green-500 text-xs tracking-[0.3em] uppercase mb-3 block"
            style={{ fontFamily: 'Libre Baskerville, serif' }}
          >
            Our Philosophy
          </span>
          <h2 
            className="text-2xl md:text-3xl lg:text-4xl text-baucis-green-800 mb-4"
            style={{ fontFamily: 'Libre Baskerville, serif' }}
          >
            Wellness is a Journey
          </h2>
        </div>

        {/* Yin-Yang Zen Container - wider */}
        <div className={`relative max-w-5xl mx-auto transition-all duration-1000 delay-200 ${
          isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
        }`}>
          
          {/* Center Logo + Yin-Yang Symbol */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 flex flex-col items-center">
            {/* Small Logo above */}
            <img 
              src="/Baucis Zen - Logo.png" 
              alt="Baucis Zen" 
              className="h-6 md:h-8 w-auto mb-2 opacity-80"
            />
            {/* Yin-Yang in Pink & Green */}
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-white shadow-lg shadow-baucis-green-100/50 flex items-center justify-center border border-baucis-green-100/30">
              <svg className="w-12 h-12 md:w-16 md:h-16" viewBox="0 0 48 48" fill="none">
                {/* Pink half (background) */}
                <circle cx="24" cy="24" r="22" className="fill-baucis-pink-200" />
                {/* Green half (S-curve) */}
                <path 
                  d="M24 2a22 22 0 0 1 0 44 11 11 0 0 1 0-22 11 11 0 0 0 0-22z" 
                  className="fill-baucis-green-500"
                />
                {/* Small circles - opposite colors */}
                <circle cx="24" cy="13" r="4" className="fill-baucis-pink-300" />
                <circle cx="24" cy="35" r="4" className="fill-baucis-green-500" />
              </svg>
            </div>
          </div>

          {/* Two Halves Container */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-0">
            
            {/* Left Half - World/Outer */}
            <div className="md:pr-16 md:border-r md:border-baucis-green-100">
              <div className="bg-white rounded-2xl p-8 md:rounded-r-none md:rounded-l-3xl border border-baucis-green-100/50 md:border-r-0 h-full">
                <div className="flex items-start gap-5">
                  <div className="w-14 h-14 rounded-xl bg-baucis-green-500/10 flex items-center justify-center flex-shrink-0">
                    <svg className="w-7 h-7 text-baucis-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <circle cx="12" cy="12" r="9" />
                      <path d="M12 3c-2 3-2 6 0 9 2-3 2-6 0-9" fill="currentColor" opacity="0.3" strokeWidth="0" />
                      <path d="M3 12h18" opacity="0.5" />
                      <ellipse cx="12" cy="12" rx="4" ry="9" opacity="0.5" />
                    </svg>
                  </div>
                  <div>
                    <h3 
                      className="text-xl md:text-2xl text-baucis-green-800 mb-3"
                      style={{ fontFamily: 'Libre Baskerville, serif' }}
                    >
                      To the World
                    </h3>
                    <p 
                      className="text-baucis-green-600 text-base md:text-lg leading-relaxed"
                      style={{ fontFamily: 'Crimson Text, serif' }}
                    >
                      Bridging ancient wisdom with modern life. From distant tea gardens to your home, we make authentic well-being accessible everywhere.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Right Half - Moments/Inner */}
            <div className="md:pl-16">
              <div className="bg-white rounded-2xl p-8 md:rounded-l-none md:rounded-r-3xl border border-baucis-pink-100/50 md:border-l-0 h-full">
                <div className="flex items-start gap-5">
                  <div className="w-14 h-14 rounded-xl bg-baucis-pink-500/10 flex items-center justify-center flex-shrink-0">
                    <svg className="w-7 h-7 text-baucis-pink-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <circle cx="12" cy="12" r="3" />
                      <circle cx="12" cy="12" r="6" opacity="0.5" />
                      <circle cx="12" cy="12" r="9" opacity="0.3" />
                      <path d="M12 8c-1 2-1 4 0 6 1-2 1-4 0-6" fill="currentColor" opacity="0.4" strokeWidth="0" />
                    </svg>
                  </div>
                  <div>
                    <h3 
                      className="text-xl md:text-2xl text-baucis-green-800 mb-3"
                      style={{ fontFamily: 'Libre Baskerville, serif' }}
                    >
                      Within You
                    </h3>
                    <p 
                      className="text-baucis-green-600 text-base md:text-lg leading-relaxed"
                      style={{ fontFamily: 'Crimson Text, serif' }}
                    >
                      Small rituals that transform ordinary days. A mindful breath, a warm cup, a quiet pause—finding sacred moments in everyday life.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Compact CTA */}
        <div className={`text-center mt-10 transition-all duration-1000 delay-400 ${
          isVisible ? 'opacity-100' : 'opacity-0'
        }`}>
          <a
            href="/products"
            className="inline-flex items-center gap-2 text-sm text-baucis-green-600 hover:text-baucis-green-800 transition-colors duration-300 group"
            style={{ fontFamily: 'Libre Baskerville, serif', letterSpacing: '0.08em' }}
          >
            <span>Begin Your Journey</span>
            <svg 
              className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </a>
        </div>
      </div>
    </section>
  );
}
