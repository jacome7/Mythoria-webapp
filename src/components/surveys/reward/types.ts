export type RewardType = 'pdf' | 'audiobook';

export type RewardStatus =
  'eligible' | 'pending_story' | 'selected' | 'processing' | 'delivered' | 'failed' | 'expired';

/** Response of `GET /api/surveys/rewards/[entitlementId]`. */
export interface RewardView {
  entitlement: {
    entitlementId: string;
    status: RewardStatus;
    rewardType: RewardType | null;
    storyId: string | null;
    expiresAt: string | null;
    deliveredAt: string | null;
    hasFailed: boolean;
  };
  policy: {
    rewardTypes: RewardType[];
    allowExistingAudiobook: boolean;
  };
  stories: Array<{
    storyId: string;
    title: string;
    coverUri: string | null;
    hasAudiobook: boolean;
    audiobookGenerating: boolean;
    pdfAlreadyRedeemed: boolean;
  }>;
}
