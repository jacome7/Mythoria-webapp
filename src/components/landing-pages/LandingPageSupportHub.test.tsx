/** @jest-environment jsdom */

import { fireEvent, render, screen } from '@testing-library/react';
import LandingPageSupportHub from './LandingPageSupportHub';
import type { LandingPageSupportHub as LandingPageSupportHubContent } from '@/content/landing-pages/types';

const content: LandingPageSupportHubContent = {
  title: 'Que história faz sentido?',
  intro: 'Escolha uma entrada.',
  paths: [
    {
      id: 'grow-and-change',
      title: 'Crescer e mudar',
      body: 'Mudanças do quotidiano.',
      ctaLabel: 'Preparar',
      tone: 'warm',
    },
    {
      id: 'remember-and-say-goodbye',
      title: 'Recordar e dizer adeus',
      body: 'Memórias importantes.',
      ctaLabel: 'Recordar',
      tone: 'calm',
    },
  ],
  challengesTitle: 'Escolha uma situação',
  challengesIntro: 'Sem texto livre.',
  initialVisibleCount: 1,
  showMoreLabel: 'Ver todas',
  showLessLabel: 'Mostrar menos',
  challenges: [
    {
      id: 'first-school-day',
      pathId: 'grow-and-change',
      title: 'Primeiro dia',
      ageRange: '2–8 anos',
      body: 'Preparar a escola.',
      primaryIntent: 'kids_transitions',
      priority: 1,
      iconSrc: '/Papercut_icons/fa-school-support-papercut.webp',
      iconAlt: 'Escola',
    },
    {
      id: 'remember-pet',
      pathId: 'remember-and-say-goodbye',
      title: 'Recordar um animal',
      ageRange: '3–12 anos',
      body: 'Guardar memórias.',
      primaryIntent: 'remembrance',
      priority: 2,
      iconSrc: '/Papercut_icons/fa-paw-support-papercut.webp',
      iconAlt: 'Pata',
    },
  ],
};

describe('LandingPageSupportHub', () => {
  it('shows priority challenges, expands the full catalogue, and preserves safe intent routing', () => {
    render(
      <LandingPageSupportHub locale="pt-PT" landingSlug="historias-de-apoio" content={content} />,
    );

    expect(screen.getByRole('link', { name: /Primeiro dia/ })).toHaveAttribute(
      'href',
      '/pt-PT/tell-your-story/step-1?landingSlug=historias-de-apoio&primaryIntent=kids_transitions',
    );
    expect(screen.queryByRole('link', { name: /Recordar um animal/ })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Ver todas' }));

    const remembranceLink = screen.getByRole('link', { name: /Recordar um animal/ });
    expect(remembranceLink).toHaveAttribute('data-challenge-id', 'remember-pet');
    expect(remembranceLink).toHaveAttribute('data-primary-intent', 'remembrance');
    expect(screen.getByRole('button', { name: 'Mostrar menos' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
  });
});
