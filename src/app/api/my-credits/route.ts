import { NextResponse } from 'next/server';
import { getCurrentAuthor } from '@/lib/auth';
import { creditService } from '@/db/services';

export async function GET() {
  try {
    const author = await getCurrentAuthor();

    if (!author) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    } // Get the last 30 credit transactions
    const creditHistory = await creditService.getCreditHistory(author.authorId, 30);

    // Get current balance
    const currentBalance = await creditService.getAuthorCreditBalance(author.authorId);

    // Reverse to get oldest first for proper balance calculation
    const historyOldestFirst = creditHistory.reverse();

    // Calculate running balance from oldest to newest (starting from 0)
    let runningBalance = 0;
    const historyWithBalance = historyOldestFirst.map((entry) => {
      runningBalance += entry.amount;
      return {
        ...entry,
        balanceAfter: runningBalance,
      };
    });

    // historyWithBalance is already in ascending order (oldest first)
    const historyAscending = historyWithBalance;

    return NextResponse.json({
      creditHistory: historyAscending,
      currentBalance,
    });
  } catch (error) {
    console.error('Error fetching credit history:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
