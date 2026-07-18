'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { LandingPageSupportHub as LandingPageSupportHubContent } from '@/content/landing-pages/types';

interface LandingPageSupportHubProps {
  locale: string;
  landingSlug: string;
  content: LandingPageSupportHubContent;
}

export default function LandingPageSupportHub({
  locale,
  landingSlug,
  content,
}: LandingPageSupportHubProps) {
  const [expanded, setExpanded] = useState(false);
  const orderedChallenges = [...content.challenges].sort(
    (left, right) => left.priority - right.priority,
  );
  const visibleChallenges = expanded
    ? orderedChallenges
    : orderedChallenges.slice(0, content.initialVisibleCount);

  return (
    <section id="situacoes" className="my-16 scroll-mt-24" aria-labelledby="support-hub-title">
      <div className="mx-auto max-w-3xl text-center">
        <h2
          id="support-hub-title"
          className="font-display text-3xl font-bold text-[#33251c] md:text-4xl"
        >
          {content.title}
        </h2>
        <p className="mt-4 text-lg leading-relaxed text-base-content/75">{content.intro}</p>
      </div>

      <div className="mt-8 grid gap-5 lg:grid-cols-2">
        {content.paths.map((path) => {
          const isCalm = path.tone === 'calm';
          return (
            <a
              key={path.id}
              href={`#${path.id}`}
              className={`group rounded-[1.5rem] border p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                isCalm ? 'border-[#7d9d94]/30 bg-[#edf4f1]' : 'border-[#d8965b]/25 bg-[#fff0dc]'
              }`}
            >
              <p className="text-sm font-semibold uppercase tracking-wide text-primary">
                {path.ctaLabel}
              </p>
              <h3 className="font-display mt-2 text-2xl font-bold text-[#33251c]">{path.title}</h3>
              <p className="mt-3 leading-relaxed text-base-content/75">{path.body}</p>
            </a>
          );
        })}
      </div>

      <div className="mt-14">
        <h3 className="font-display text-2xl font-bold text-[#33251c] md:text-3xl">
          {content.challengesTitle}
        </h3>
        <p className="mt-3 max-w-3xl leading-relaxed text-base-content/75">
          {content.challengesIntro}
        </p>
      </div>

      <div id="support-challenge-list" className="mt-8 space-y-12">
        {content.paths.map((path) => {
          const challenges = visibleChallenges.filter((challenge) => challenge.pathId === path.id);
          if (!challenges.length) return null;

          return (
            <div key={path.id} id={path.id} className="scroll-mt-24">
              <h4 className="font-display text-xl font-bold text-[#33251c]">{path.title}</h4>
              <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {challenges.map((challenge) => {
                  const href = `/${locale}/tell-your-story/step-1?landingSlug=${landingSlug}&primaryIntent=${challenge.primaryIntent}`;
                  return (
                    <Link
                      key={challenge.id}
                      href={href}
                      data-cta-placement="challenge_card"
                      data-capture-attribution="true"
                      data-challenge-id={challenge.id}
                      data-route-tone={path.id}
                      data-primary-intent={challenge.primaryIntent}
                      className="group flex min-h-44 gap-4 rounded-2xl border border-primary/10 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                    >
                      <Image
                        src={challenge.iconSrc}
                        alt={challenge.iconAlt}
                        width={64}
                        height={64}
                        className="h-16 w-16 shrink-0 rounded-xl object-contain"
                      />
                      <span className="min-w-0">
                        <span className="text-xs font-semibold uppercase tracking-wide text-primary">
                          {challenge.ageRange}
                        </span>
                        <span className="font-display mt-1 block text-lg font-bold leading-tight text-[#33251c]">
                          {challenge.title}
                        </span>
                        <span className="mt-2 block text-sm leading-relaxed text-base-content/70">
                          {challenge.body}
                        </span>
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {orderedChallenges.length > content.initialVisibleCount && (
        <div className="mt-8 text-center">
          <button
            type="button"
            className="btn btn-outline btn-primary min-h-11 gap-2"
            aria-expanded={expanded}
            aria-controls="support-challenge-list"
            onClick={() => setExpanded((current) => !current)}
          >
            {expanded ? content.showLessLabel : content.showMoreLabel}
            {expanded ? (
              <ChevronUp className="h-4 w-4" aria-hidden="true" />
            ) : (
              <ChevronDown className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        </div>
      )}
    </section>
  );
}
