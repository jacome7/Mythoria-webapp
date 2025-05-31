interface CreditsDisplayProps {
  credits: number;
}

export default function CreditsDisplay({ credits }: CreditsDisplayProps) {
  return (
    <div className="btn btn-outline btn-secondary">
      Credits available: {credits}
    </div>
  );
}
