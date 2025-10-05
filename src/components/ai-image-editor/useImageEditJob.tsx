import { useState } from 'react';
import CreditConfirmationModal from '../CreditConfirmationModal';
import JobProgressModal from '../JobProgressModal';
import { createImageEditJob } from '@/utils/async-job-api';

interface CreditInfo {
  canEdit: boolean;
  requiredCredits: number;
  currentBalance: number;
  editCount: number;
  nextThreshold: number;
  isFree: boolean;
  message?: string;
}

interface JobParams {
  storyId: string;
  imageUrl: string;
  imageType: 'cover' | 'backcover' | 'chapter';
  userRequest?: string;
  chapterNumber?: number;
  graphicalStyle?: string;
  userImageUri?: string;
  convertToStyle?: boolean;
}

interface UseImageEditJobOptions {
  onComplete: (result: { newImageUrl?: string; [key: string]: unknown }) => void;
  onError: (error: string) => void;
}

export function useImageEditJob({ onComplete, onError }: UseImageEditJobOptions) {
  const [creditInfo, setCreditInfo] = useState<CreditInfo | null>(null);
  const [showCreditConfirmation, setShowCreditConfirmation] = useState(false);
  const [pendingParams, setPendingParams] = useState<JobParams | null>(null);
  const [showJobProgress, setShowJobProgress] = useState(false);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);

  const checkCredits = async (storyId: string) => {
    try {
      const response = await fetch('/api/ai-edit/check-credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'imageEdit', storyId }),
      });
      if (response.ok) {
        const data = await response.json();
        setCreditInfo(data);
        return data as CreditInfo;
      }
    } catch (err) {
      console.error('Error checking image credits:', err);
    }
    return null;
  };

  const startJob = async (params: JobParams) => {
    try {
      const jobResponse = await createImageEditJob(params);
      if (jobResponse.success && jobResponse.jobId) {
        setCurrentJobId(jobResponse.jobId);
        setShowJobProgress(true);
        setPendingParams(null);
        return null;
      }
      return 'Failed to create image edit job';
    } catch (error) {
      console.error('Error creating image edit job:', error);
      return error instanceof Error ? error.message : 'Failed to create job';
    }
  };

  const requestJob = async (params: JobParams) => {
    const credits = await checkCredits(params.storyId);
    if (!credits) {
      return 'Unable to check credits';
    }
    if (!credits.canEdit) {
      setPendingParams(params);
      setShowCreditConfirmation(true);
      return null;
    }
    return startJob(params);
  };

  const handleConfirmCredits = () => {
    if (pendingParams) {
      void startJob(pendingParams);
      setShowCreditConfirmation(false);
    }
  };

  const CreditConfirmation =
    showCreditConfirmation && creditInfo ? (
      <CreditConfirmationModal
        isOpen={showCreditConfirmation}
        onClose={() => setShowCreditConfirmation(false)}
        onConfirm={handleConfirmCredits}
        action="imageEdit"
        requiredCredits={creditInfo.requiredCredits}
        currentBalance={creditInfo.currentBalance}
        editCount={creditInfo.editCount}
        isFree={creditInfo.isFree}
      />
    ) : null;

  const JobProgress = showJobProgress ? (
    <JobProgressModal
      isOpen={showJobProgress}
      onClose={() => {
        setShowJobProgress(false);
        setCurrentJobId(null);
      }}
      jobId={currentJobId}
      jobType="image_edit"
      onComplete={(result) => {
        setShowJobProgress(false);
        setCurrentJobId(null);
        onComplete(result);
      }}
      onError={(err) => {
        setShowJobProgress(false);
        setCurrentJobId(null);
        onError(err);
      }}
    />
  ) : null;

  return { requestJob, CreditConfirmation, JobProgress };
}
