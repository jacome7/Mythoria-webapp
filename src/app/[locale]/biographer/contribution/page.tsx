import GuestStudio from '@/components/biographer/GuestStudio';
export const metadata = {
  robots: { index: false, follow: false },
  referrer: 'no-referrer' as const,
};
export default function ContributionPage() {
  return <GuestStudio />;
}
