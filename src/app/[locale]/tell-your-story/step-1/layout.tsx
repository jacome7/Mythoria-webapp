import type { Metadata } from 'next';

export const metadata: Metadata = {
  robots: 'noindex,nofollow',
  alternates: { canonical: null },
};

export default function StepLayout({ children }: { children: React.ReactNode }) {
  return children;
}
