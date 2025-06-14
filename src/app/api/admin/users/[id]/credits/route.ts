import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { creditService } from '@/db/services';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check if user is authenticated and authorized
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has admin access
    const publicMetadata = user.publicMetadata as { [key: string]: string } | undefined;
    if (!publicMetadata || publicMetadata['autorizaçãoDeAcesso'] !== 'Comejá') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const resolvedParams = await params;
    const authorId = resolvedParams.id;

    // Get user's credit balance and history
    const [currentBalance, creditHistory] = await Promise.all([
      creditService.getAuthorCreditBalance(authorId),
      creditService.getCreditHistory(authorId, 100) // Get last 100 entries
    ]);

    // Calculate running balance for each entry (most recent first)
    let runningBalance = currentBalance;
    const historyWithBalance = creditHistory.map((entry, index) => {
      const balanceAfter = runningBalance;
      // For the next iteration, subtract this entry's amount from running balance
      if (index < creditHistory.length - 1) {
        runningBalance -= entry.amount;
      }
      return {
        ...entry,
        balanceAfter
      };
    });

    // Reverse to show oldest first, then reverse back to newest first but with correct balances
    const correctedHistory = historyWithBalance.reverse();
    runningBalance = 0;
    const finalHistory = correctedHistory.map(entry => {
      runningBalance += entry.amount;
      return {
        ...entry,
        balanceAfter: runningBalance
      };
    }).reverse(); // Show newest first

    return NextResponse.json({
      currentBalance,
      creditHistory: finalHistory
    });
  } catch (error) {
    console.error('Error fetching user credit history:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
