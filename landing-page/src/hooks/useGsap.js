import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger);

export let lenisInstance = null;
let isScrollLocked = true; // Initially locked on app load

function preventDefaultScroll(e) {
  if (isScrollLocked) {
    e.preventDefault();
  }
}

function preventScrollKeys(e) {
  if (isScrollLocked) {
    const keys = ['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Space', ' ', 'Home', 'End'];
    if (keys.includes(e.key) || keys.includes(e.code)) {
      e.preventDefault();
    }
  }
}

/**
 * Initialize Lenis smooth scrolling + GSAP ScrollTrigger integration.
 * Call this once in the root App component.
 */
export function useLenisScroll() {
  const lenisRef = useRef(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'scrollRestoration' in history) {
      history.scrollRestoration = 'manual';
    }

    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });

    lenisRef.current = lenis;
    lenisInstance = lenis;

    // If scroll was locked before Lenis mounted, stop Lenis immediately
    if (isScrollLocked) {
      lenis.stop();
      if (typeof window !== 'undefined') {
        window.scrollTo(0, 0);
      }
    }

    // Connect Lenis scroll position to GSAP ScrollTrigger
    lenis.on('scroll', ScrollTrigger.update);

    gsap.ticker.add((time) => {
      lenis.raf(time * 1000);
    });
    gsap.ticker.lagSmoothing(0);

    return () => {
      lenisInstance = null;
      lenis.destroy();
      gsap.ticker.remove(lenis.raf);
    };
  }, []);

  return lenisRef;
}

export function stopScroll() {
  isScrollLocked = true;
  lenisInstance?.stop();
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    window.scrollTo(0, 0);
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';
    window.addEventListener('wheel', preventDefaultScroll, { passive: false });
    window.addEventListener('touchmove', preventDefaultScroll, { passive: false });
    window.addEventListener('keydown', preventScrollKeys, { passive: false });
  }
}

export function startScroll() {
  isScrollLocked = false;
  lenisInstance?.start();
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    document.documentElement.style.overflow = '';
    document.body.style.overflow = '';
    document.body.style.touchAction = '';
    window.removeEventListener('wheel', preventDefaultScroll);
    window.removeEventListener('touchmove', preventDefaultScroll);
    window.removeEventListener('keydown', preventScrollKeys);
    ScrollTrigger.refresh();
  }
}

/**
 * Helper: create a ScrollTrigger-powered AOS entrance animation.
 * Re-triggers and resets on scrolling back up.
 */
export function scrollReveal(element, options = {}) {
  const {
    y = 50,
    x = 0,
    opacity = 0,
    duration = 0.8,
    ease = 'power3.out',
    delay = 0,
    start = 'top 85%',
    scale = 1,
    toggleActions = 'play none none reverse',
  } = options;

  return gsap.from(element, {
    y,
    x,
    opacity,
    scale,
    duration,
    ease,
    delay,
    scrollTrigger: {
      trigger: element,
      start,
      toggleActions,
    },
  });
}

/**
 * Helper: simple fade in from bottom via ScrollTrigger that resets on scroll back up
 */
export function scrollBounce(element, options = {}) {
  const {
    y = 40,
    x = 0,
    opacity = 0,
    duration = 0.7,
    delay = 0,
    start = 'top 85%',
    scale = 1,
    toggleActions = 'play none none reverse',
  } = options;

  return gsap.from(element, {
    y,
    x,
    opacity,
    scale,
    duration,
    delay,
    ease: 'power2.out',
    scrollTrigger: {
      trigger: element,
      start,
      toggleActions,
    },
  });
}

export { gsap, ScrollTrigger };
