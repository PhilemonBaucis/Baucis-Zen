'use client';

import { useEffect, useRef, useState } from 'react';

export default function MousePowderEffect() {
  const canvasRef = useRef(null);
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  // Detect touch devices and disable effect on mobile
  useEffect(() => {
    const checkTouch = () => {
      setIsTouchDevice(
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        window.matchMedia('(pointer: coarse)').matches
      );
    };
    checkTouch();
    window.addEventListener('resize', checkTouch);
    return () => window.removeEventListener('resize', checkTouch);
  }, []);

  useEffect(() => {
    // Don't run on touch devices to save performance and avoid issues
    if (isTouchDevice) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let particles = [];

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Particle class
    class Particle {
      constructor(x, y) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 4;
        this.vy = (Math.random() - 0.5) * 4;
        this.life = 1.0;
        this.decay = 0.015;
        this.size = Math.random() * 4 + 2; // Even smaller particles
        this.color = {
          r: 124,  // #7ca163 converted to RGB
          g: 161,
          b: 99,
        };
        this.alpha = 0.3; // Much less exposure/opacity
      }

      update() {
        this.x += this.vx;
        this.y += this.vy;
        this.life -= this.decay;
        this.alpha = this.life;
        this.vx *= 0.98;
        this.vy *= 0.98;
        this.vy += 0.1; // gravity
      }

      draw(ctx) {
        if (this.life <= 0) return;

        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, ${this.alpha})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    // Mouse move handler
    const handleMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Create particles at mouse position
      for (let i = 0; i < 5; i++) {
        particles.push(new Particle(x, y));
      }
      
      console.log('Mouse at:', x, y, 'Particles:', particles.length);
    };

    // Animation loop
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Update and draw particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const particle = particles[i];
        particle.update();
        particle.draw(ctx);

        // Remove dead particles
        if (particle.life <= 0) {
          particles.splice(i, 1);
        }
      }

      // Add some ambient particles
      if (Math.random() < 0.1) {
        particles.push(new Particle(
          Math.random() * canvas.width,
          Math.random() * canvas.height
        ));
      }

      requestAnimationFrame(animate);
    };

    // Start animation
    animate();

    // Add initial particles
    for (let i = 0; i < 10; i++) {
      particles.push(new Particle(
        Math.random() * canvas.width,
        Math.random() * canvas.height
      ));
    }

    // Add event listeners
    document.addEventListener('mousemove', handleMouseMove);

    // Cleanup
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [isTouchDevice]);

  // Don't render anything on touch devices
  if (isTouchDevice) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      zIndex: 9999,
      pointerEvents: 'none',
      overflow: 'hidden'
    }}>
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
          display: 'block'
        }}
      />
    </div>
  );
}