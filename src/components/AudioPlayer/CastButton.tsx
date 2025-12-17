'use client';

import { useMemo } from 'react';
import { FiCast, FiX } from 'react-icons/fi';
import { CastControlsState } from './types';

interface CastButtonProps {
  controls: CastControlsState;
  labels: {
    cast: string;
    stop: string;
    unavailable: string;
    castingTo: (device: string) => string;
  };
}

export function CastButton({ controls, labels }: CastButtonProps) {
  const isDisabled = !controls.castReady || !controls.hasDevices;
  const castStatus = useMemo(() => {
    if (controls.isCasting) {
      return labels.castingTo(controls.castingDeviceName || '');
    }
    if (!controls.hasDevices) {
      return labels.unavailable;
    }
    return '';
  }, [controls.castingDeviceName, controls.hasDevices, controls.isCasting, labels]);

  const handleClick = async () => {
    if (controls.isCasting) {
      await controls.stopCasting();
      return;
    }
    await controls.startCasting();
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
      <button
        type="button"
        onClick={handleClick}
        className={`btn btn-sm sm:btn-md ${controls.isCasting ? 'btn-secondary' : 'btn-outline'} flex items-center gap-2`}
        disabled={isDisabled}
        title={isDisabled ? labels.unavailable : controls.isCasting ? labels.stop : labels.cast}
      >
        {controls.isCasting ? <FiX className="w-4 h-4" /> : <FiCast className="w-4 h-4" />}
        <span className="hidden sm:inline">{controls.isCasting ? labels.stop : labels.cast}</span>
      </button>
      {castStatus && (
        <span className="text-xs sm:text-sm text-gray-600 sm:ml-1" data-testid="cast-status">
          {castStatus}
        </span>
      )}
    </div>
  );
}
