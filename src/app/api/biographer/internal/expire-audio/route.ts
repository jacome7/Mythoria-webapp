import { handle, internal } from '@/lib/biographer/http';
import { sweepRecoveryAudio } from '@/lib/biographer/audio-retention';
import { verifySchedulerRequest } from '@/lib/scheduler-auth';

export const POST = (request: Request) =>
  handle(async () => {
    if (!(await verifySchedulerRequest(request))) internal(request);
    return sweepRecoveryAudio();
  });
