'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';

export default function NotFound() {
  const tNotFound = useTranslations('NotFound');

  return (
    <div className="min-h-screen bg-base-100 text-base-content">
      <div className="container mx-auto px-4 py-8">
        {/* Hero Section with Fun Illustration */}
        <div className="hero min-h-[60vh] bg-base-200 rounded-box my-12">
          <div className="hero-content flex-col lg:flex-row-reverse max-w-6xl w-full">
            {/* Illustration/Image */}
            <div className="lg:w-1/2 text-center">
              <div className="text-9xl mb-4">📚</div>
              <div className="text-6xl mb-4">🔍</div>
              <div className="text-4xl">❓</div>
            </div>
            
            {/* Content */}
            <div className="lg:w-1/2 text-center lg:text-left">
              <h1 className="text-5xl font-bold text-primary mb-6">
                {tNotFound('mainHeading')}
              </h1>
              <p className="py-4 text-lg">
                {tNotFound('description')}
              </p>
            </div>
          </div>
        </div>

        {/* Suggestions Section */}
        <div className="bg-base-200 rounded-box p-8 my-8">
          <h2 className="text-2xl font-bold mb-6 text-center">
            {tNotFound('suggestions.title')}
          </h2>
          <div className="grid md:grid-cols-2 gap-4 max-w-4xl mx-auto">
            {tNotFound.raw('suggestions.items').map((item: string, index: number) => (
              <div key={index} className="flex items-center p-4 bg-base-100 rounded-lg shadow-sm">
                <span className="text-2xl mr-4">{item.split(' ')[0]}</span>
                <span>{item.substring(item.indexOf(' ') + 1)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="text-center my-12">
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link href="/" className="btn btn-primary btn-lg">
              🏠 {tNotFound('actions.goHome')}
            </Link>
            <Link href="/tell-your-story" className="btn btn-secondary btn-lg">
              ✨ {tNotFound('actions.createStory')}
            </Link>
            <Link href="/my-stories" className="btn btn-outline btn-lg">
              📚 {tNotFound('actions.myStories')}
            </Link>
          </div>
        </div>

        {/* Funny Quote */}
        <div className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-box p-8 my-8">
          <blockquote className="text-center">
            <p className="text-lg italic mb-4">
              {tNotFound('quote')}
            </p>
          </blockquote>
        </div>

        {/* Animated Elements */}
        <div className="text-center my-8">
          <div className="inline-flex gap-2 text-4xl animate-bounce">
            🧙‍♂️📖✨🗺️🎭
          </div>
        </div>
      </div>
    </div>
  );
}
