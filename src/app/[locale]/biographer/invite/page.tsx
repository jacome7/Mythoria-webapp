import GuestFragmentLanding from '@/components/biographer/GuestFragmentLanding';
export const metadata = {
  robots: { index: false, follow: false },
  referrer: 'no-referrer' as const,
};
export default function InvitationPage() {
  return <GuestFragmentLanding mode="invite" />;
}
