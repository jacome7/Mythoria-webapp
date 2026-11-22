import { handle } from '@/lib/biographer/http';
import { contributionDetail } from '@/lib/biographer/collaboration';
export const GET = () => handle(contributionDetail);
