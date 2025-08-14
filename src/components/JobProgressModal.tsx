'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { FiX, FiClock, FiCheckCircle, FiAlertCircle, FiLoader } from 'react-icons/fi';
import { useTranslations } from 'next-intl';

interface JobProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobId: string | null;
  jobType: 'text_edit' | 'image_edit';
  onComplete?: (result: { [key: string]: unknown }) => void;
  onError?: (error: string) => void;
}

interface JobStatus {
  id: string;
  type: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  elapsedTime: number;
  remainingTime: number;
  estimatedDuration: number;
  metadata?: {
    operationType?: string;
    chapterCount?: number;
    chapterNumber?: number;
    imageType?: string;
    [key: string]: unknown;
  };
  result?: { [key: string]: unknown };
  error?: string;
}

export default function JobProgressModal({
  isOpen,
  onClose,
  jobId,
  jobType, // eslint-disable-line @typescript-eslint/no-unused-vars
  onComplete,
  onError
}: JobProgressModalProps) {
  const tJobProgressModal = useTranslations('JobProgressModal');
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
  const [polling, setPolling] = useState(false);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);
  const completedRef = useRef(false); // Use ref to track completion state
  const processingJobIdRef = useRef<string | null>(null); // Track current job ID

  const stopPolling = useCallback(() => {
    setPolling(false);
    if (pollingInterval) {
      clearInterval(pollingInterval);
      setPollingInterval(null);
    }
  }, [pollingInterval]);

  const pollJobStatus = useCallback(async () => {
    if (!jobId || completedRef.current) return; // Don't poll if already completed

    console.log('🔄 Polling job status for:', jobId, 'completed:', completedRef.current);

    try {
      const response = await fetch(`/api/jobs/${jobId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.job) {
          setJobStatus(data.job);

          // Handle completion - only call once
          if (data.job.status === 'completed' && !completedRef.current) {
            console.log('✅ Job completed! Setting completion flag and stopping polling');
            completedRef.current = true; // Set flag first to prevent multiple calls
            stopPolling();
            if (onComplete && data.job.result) {
              onComplete(data.job.result);
            }
          } else if (data.job.status === 'failed' && !completedRef.current) {
            console.log('❌ Job failed! Setting completion flag and stopping polling');
            completedRef.current = true; // Set flag first to prevent multiple calls
            stopPolling();
            if (onError) {
              onError(data.job.error || 'Job failed');
            }
          }
        }
      } else {
        console.error('Failed to fetch job status:', response.status);
      }
    } catch (error) {
      console.error('Error polling job status:', error);
    }
  }, [jobId, onComplete, onError, stopPolling]);

  const startPolling = useCallback(() => {
    if (!jobId || completedRef.current) return; // Don't start polling if already completed

    console.log('🚀 Starting polling for job:', jobId);
    setPolling(true);
    processingJobIdRef.current = jobId;
    
    // Poll immediately
    pollJobStatus();
    
    // Then poll every 3 seconds (reduced from 2 seconds)
    const interval = setInterval(() => {
      if (!completedRef.current) {
        pollJobStatus();
      }
    }, 3000);
    
    setPollingInterval(interval);
  }, [jobId, pollJobStatus]);

  // Cleanup polling on unmount or close
  useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [pollingInterval]);

  // Reset completion flag when modal opens with new job
  useEffect(() => {
    if (isOpen && jobId) {
      completedRef.current = false;
      setJobStatus(null);
    }
  }, [isOpen, jobId]);

  // Start polling when job ID is available
  useEffect(() => {
    if (isOpen && jobId && !polling && !completedRef.current) {
      startPolling();
    } else if (!isOpen || !jobId) {
      stopPolling();
    }
  }, [isOpen, jobId, polling, startPolling, stopPolling]);

  const formatTime = (milliseconds: number): string => {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${remainingSeconds}s`;
  };

  const getStatusIcon = () => {
    if (!jobStatus) return <FiLoader className="w-5 h-5 animate-spin text-blue-600" />;

    switch (jobStatus.status) {
      case 'pending':
        return <FiClock className="w-5 h-5 text-yellow-600" />;
      case 'processing':
        return <FiLoader className="w-5 h-5 animate-spin text-blue-600" />;
      case 'completed':
        return <FiCheckCircle className="w-5 h-5 text-green-600" />;
      case 'failed':
        return <FiAlertCircle className="w-5 h-5 text-red-600" />;
      default:
        return <FiLoader className="w-5 h-5 animate-spin text-blue-600" />;
    }
  };

  const getStatusText = () => {
    if (!jobStatus) return 'Initializing...';

    switch (jobStatus.status) {
      case 'pending':
        return tJobProgressModal('status.waitingToStart');
      case 'processing':
        return tJobProgressModal('status.inProgress');
      case 'completed':
        return tJobProgressModal('status.completed');
      case 'failed':
        return jobStatus.error || tJobProgressModal('status.failed');
      default:
        return tJobProgressModal('status.inProgress');
    }
  };

  const canClose = () => {
    return !jobStatus || jobStatus.status === 'completed' || jobStatus.status === 'failed';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            {getStatusIcon()}
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {tJobProgressModal('title')}
              </h2>
              <p className="text-sm text-gray-600">
                {getStatusText()}
              </p>
            </div>
          </div>
          {canClose() && (
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors"
            >
              <FiX className="w-4 h-4 text-gray-600" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Progress Bar */}
          <div className="space-y-3">
            <div className="flex justify-between text-sm text-gray-600">
              <span>{tJobProgressModal('labels.progress')}</span>
              <span>{Math.round(jobStatus?.progress || 0)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${
                  jobStatus?.status === 'completed'
                    ? 'bg-green-500'
                    : jobStatus?.status === 'failed'
                    ? 'bg-red-500'
                    : 'bg-blue-500'
                }`}
                style={{ width: `${Math.min(100, jobStatus?.progress || 0)}%` }}
              />
            </div>
          </div>

          {/* Time Information */}
          {jobStatus && jobStatus.status === 'processing' && (
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-xs text-gray-500">
                <span>
                  {tJobProgressModal('labels.elapsed')}: {formatTime(jobStatus.elapsedTime)}
                </span>
                <span>
                  {tJobProgressModal('labels.remaining')}: ~{formatTime(
                    Math.max(0, jobStatus.remainingTime)
                  )}
                </span>
              </div>
            </div>
          )}

          {/* Error Message */}
          {jobStatus?.status === 'failed' && jobStatus.error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <FiAlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                <span className="text-sm text-red-600">{jobStatus.error}</span>
              </div>
            </div>
          )}

          {/* Success Message */}
          {jobStatus?.status === 'completed' && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <FiCheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                <span className="text-sm text-green-600">
                  {tJobProgressModal('status.completed')}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {canClose() && (
          <div className="p-4 border-tJobProgressModal border-gray-200 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              {tJobProgressModal('closeButton')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
