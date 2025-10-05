'use client';

import { useState, useEffect, useCallback } from 'react';

interface RollableHintsProps {
  hints: string[];
  className?: string;
}

export default function RollableHints({ hints, className = '' }: RollableHintsProps) {
  const [currentHintIndex, setCurrentHintIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const rollHint = useCallback(() => {
    if (hints.length <= 1) return;

    setIsAnimating(true);

    // Wait for fade out, then change hint and fade in
    setTimeout(() => {
      setCurrentHintIndex((prev) => (prev + 1) % hints.length);
      setIsAnimating(false);
    }, 150); // Half of the transition duration
  }, [hints.length]);

  // Auto-rotate hints every 4 seconds
  useEffect(() => {
    if (hints.length <= 1) return;

    const interval = setInterval(rollHint, 4000);
    return () => clearInterval(interval);
  }, [rollHint, hints.length]);

  if (hints.length === 0) return null;

  return (
    <div className={`mt-2 ${className}`}>
      <div className="relative">
        <div
          className={`text-xs text-gray-500 italic transition-opacity duration-300 ${
            isAnimating ? 'opacity-0' : 'opacity-100'
          }`}
        >
          {hints[currentHintIndex]}
        </div>
      </div>
    </div>
  );
}
