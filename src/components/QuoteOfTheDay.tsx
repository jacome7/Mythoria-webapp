'use client';

import Image from 'next/image';
import { useState, useEffect } from 'react';
import styles from './QuoteOfTheDay.module.css';

const QUOTE_REFRESH_INTERVAL_MS = 10_000;
const QUOTE_FADE_DURATION_MS = 450;

const quotes = [
  {
    text: "Those who don't believe in magic will never find it.",
    author: 'Roald Dahl',
  },
  {
    text: 'Stories are light. Light is precious in a world so dark.',
    author: 'Kate DiCamillo',
  },
  {
    text: 'The universe is made of stories, not of atoms.',
    author: 'Muriel Rukeyser',
  },
  {
    text: 'A reader lives a thousand lives before he dies.',
    author: 'George R.R. Martin',
  },
  {
    text: 'No story lives unless someone wants to listen.',
    author: 'J.K. Rowling',
  },
  {
    text: "Fantasy is hardly an escape from reality. It's a way of understanding it.",
    author: 'Lloyd Alexander',
  },
  {
    text: 'Some day you will be old enough to start reading fairy tales again.',
    author: 'C.S. Lewis',
  },
  {
    text: 'We tell ourselves stories in order to live.',
    author: 'Joan Didion',
  },
  {
    text: 'There have been great societies that did not use the wheel, but there have been no societies that did not tell stories.',
    author: 'Ursula K. Le Guin',
  },
  {
    text: 'The purpose of a storyteller is not to tell you how to think, but to give you questions to think upon.',
    author: 'Brandon Sanderson',
  },
];

const getRandomQuoteIndex = (currentIndex?: number) => {
  if (quotes.length <= 1) {
    return 0;
  }

  let nextIndex = Math.floor(Math.random() * quotes.length);

  while (nextIndex === currentIndex) {
    nextIndex = Math.floor(Math.random() * quotes.length);
  }

  return nextIndex;
};

export default function QuoteOfTheDay() {
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [isCardVisible, setIsCardVisible] = useState(false);
  const [isQuoteVisible, setIsQuoteVisible] = useState(false);
  const currentQuote = quotes[quoteIndex];

  useEffect(() => {
    setQuoteIndex(getRandomQuoteIndex());

    const revealTimeout = window.setTimeout(() => {
      setIsCardVisible(true);
      setIsQuoteVisible(true);
    }, 50);

    return () => window.clearTimeout(revealTimeout);
  }, []);

  useEffect(() => {
    let fadeTimeout: number | undefined;

    const interval = window.setInterval(() => {
      setIsQuoteVisible(false);

      fadeTimeout = window.setTimeout(() => {
        setQuoteIndex((currentIndex) => getRandomQuoteIndex(currentIndex));
        setIsQuoteVisible(true);
      }, QUOTE_FADE_DURATION_MS);
    }, QUOTE_REFRESH_INTERVAL_MS);

    return () => {
      window.clearInterval(interval);

      if (fadeTimeout) {
        window.clearTimeout(fadeTimeout);
      }
    };
  }, []);

  return (
    <section className="my-16">
      <div className="container mx-auto px-4">
        <div className={`${styles.card} ${isCardVisible ? styles.visible : styles.hidden}`}>
          <Image
            src="/homepage/kids_fantasy/white_cloud_1.webp"
            alt=""
            width={200}
            height={135}
            sizes="130px"
            className={styles.cloudLeft}
            aria-hidden="true"
          />
          <Image
            src="/homepage/kids_fantasy/white_cloud_1.webp"
            alt=""
            width={200}
            height={135}
            sizes="130px"
            className={styles.cloudRight}
            aria-hidden="true"
          />
          <Image
            src="/homepage/kids_fantasy/yellow_star.webp"
            alt=""
            width={128}
            height={134}
            sizes="36px"
            className={styles.starLeft}
            aria-hidden="true"
          />
          <Image
            src="/homepage/kids_fantasy/yellow_star_2.webp"
            alt=""
            width={128}
            height={127}
            sizes="34px"
            className={styles.starRight}
            aria-hidden="true"
          />
          <blockquote
            className={`${styles.quote} ${isQuoteVisible ? styles.quoteVisible : styles.quoteHidden}`}
          >
            <p className="font-display text-2xl italic leading-relaxed text-[color:var(--pc-navy)] md:text-3xl">
              &ldquo;{currentQuote.text}&rdquo;
            </p>
            <footer className="mt-6 font-display text-xl font-bold text-[color:var(--pc-navy)]">
              — {currentQuote.author}
            </footer>
          </blockquote>
        </div>
      </div>
    </section>
  );
}
