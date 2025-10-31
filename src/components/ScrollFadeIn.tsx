'use client';

import { useEffect, useRef, ReactNode, CSSProperties } from 'react';

interface ScrollFadeInProps {
  children: ReactNode;
  delay?: number;
  className?: string;
  threshold?: number;
  rootMargin?: string;
}

/**
 * ScrollFadeIn - A reusable component that fades in elements when they scroll into view.
 *
 * Uses the Intersection Observer API with inline styles to ensure cross-browser compatibility.
 * Inline styles are used instead of CSS classes to avoid specificity conflicts with Tailwind/DaisyUI
 * and guarantee that styles are applied regardless of CSS load order.
 *
 * SSR-safe: Starts with full opacity on server render to avoid hydration mismatches,
 * then applies fade-in animation on client side only for elements not in viewport.
 *
 * @param threshold - Percentage of element visibility to trigger (0.0 to 1.0). Default: 0.15
 * @param rootMargin - Margin around root. Use negative bottom margin to trigger earlier. Default: '0px 0px -80px 0px'
 */
const ScrollFadeIn = ({
  children,
  delay = 0,
  className = '',
  threshold = 0.15,
  rootMargin = '0px 0px -80px 0px',
}: ScrollFadeInProps) => {
  const elementRef = useRef<HTMLDivElement>(null);

  // Start with full opacity for SSR to avoid hydration mismatch
  const initialStyle: CSSProperties = {
    opacity: 1,
    transform: 'translateY(0)',
    transition: 'opacity 1s ease-out, transform 1s ease-out',
    willChange: 'opacity, transform',
  };

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const isElementVisible = (el: HTMLElement) => {
      const rect = el.getBoundingClientRect();
      const windowHeight = window.innerHeight || document.documentElement.clientHeight;
      // Consider element visible if its top is within or above the viewport
      // (we use a generous threshold to catch elements that are mostly visible)
      return rect.top < windowHeight * 0.75;
    };

    // If element is already visible on page load, keep it visible
    if (isElementVisible(element)) {
      element.style.opacity = '1';
      element.style.transform = 'translateY(0)';
      return;
    }

    // Otherwise, set up fade-in animation for when it scrolls into view
    element.style.opacity = '0';
    element.style.transform = 'translateY(40px)';

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setTimeout(() => {
              const el = entry.target as HTMLElement;
              el.style.opacity = '1';
              el.style.transform = 'translateY(0)';
            }, delay);
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: threshold,
        rootMargin: rootMargin,
      },
    );

    observer.observe(element);

    return () => {
      if (element) {
        observer.unobserve(element);
      }
    };
  }, [delay, threshold, rootMargin]);

  return (
    <div ref={elementRef} className={className} style={initialStyle}>
      {children}
    </div>
  );
};

export default ScrollFadeIn;
