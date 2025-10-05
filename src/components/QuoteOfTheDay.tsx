'use client';

import { useState, useEffect } from 'react';

// Array of inspirational quotes related to storytelling, writing, and imagination
const quotes = [
  {
    text: 'There is no greater agony than bearing an untold story inside you.',
    author: 'Maya Angelou',
  },
  {
    text: 'You can make anything by writing.',
    author: 'C.S. Lewis',
  },
  {
    text: "If there's a book that you want to read, but it hasn't been written yet, then you must write it.",
    author: 'Toni Morrison',
  },
  {
    text: 'Imagination is more important than knowledge.',
    author: 'Albert Einstein',
  },
  {
    text: 'Fill your paper with the breathings of your heart.',
    author: 'William Wordsworth',
  },
  {
    text: 'The scariest moment is always just before you start.',
    author: 'Stephen King',
  },
  {
    text: 'I can shake off everything as I write; my sorrows disappear, my courage is reborn.',
    author: 'Anne Frank',
  },
  {
    text: 'Fantasy is the impossible made probable.',
    author: 'Rod Serling',
  },
  {
    text: 'Every child is an artist. The problem is how to remain an artist once we grow up.',
    author: 'Pablo Picasso',
  },
  {
    text: 'Stories are the creative conversion of life itself into a more powerful, clearer, more meaningful experience.',
    author: 'Robert McKee',
  },
  {
    text: 'You fail only if you stop writing.',
    author: 'Ray Bradbury',
  },
  {
    text: 'After nourishment, shelter and companionship, stories are the thing we need most in the world.',
    author: 'Philip Pullman',
  },
  {
    text: 'Your intuition knows what to write, so get out of the way.',
    author: 'Ray Bradbury',
  },
  {
    text: "The best stories don't come from 'good vs. bad' but from 'good vs. good.'",
    author: 'Leo Tolstoy',
  },
  {
    text: 'A word after a word after a word is power.',
    author: 'Margaret Atwood',
  },
];

export default function QuoteOfTheDay() {
  const [currentQuote, setCurrentQuote] = useState(quotes[0]);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Get a consistent quote based on the current date
    const today = new Date();
    const dayOfYear = Math.floor(
      (today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000,
    );
    const quoteIndex = dayOfYear % quotes.length;
    setCurrentQuote(quotes[quoteIndex]);

    // Trigger animation
    setIsVisible(true);
  }, []);

  return (
    <section className="my-16">
      <div className="container mx-auto px-4">
        <div
          className={`card bg-gradient-to-br from-primary/10 to-secondary/10 shadow-xl border border-primary/20 transition-all duration-1000 transform ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
        >
          <div className="card-body items-center text-center py-12 px-8">
            <blockquote className="max-w-4xl mx-auto">
              <p className="text-lg md:text-xl italic text-base-content/90 leading-relaxed mb-6 font-medium">
                &ldquo;{currentQuote.text}&rdquo;
              </p>
              <footer className="text-primary font-semibold text-lg">
                — {currentQuote.author}
              </footer>
            </blockquote>
          </div>
        </div>
      </div>
    </section>
  );
}
