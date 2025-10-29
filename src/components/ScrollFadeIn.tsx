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

  const initialStyle: CSSProperties = {
    opacity: 0,
    transform: 'translateY(40px)',
    transition: 'opacity 1s ease-out, transform 1s ease-out',
    willChange: 'opacity, transform',
  };

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

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
