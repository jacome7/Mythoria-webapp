import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAuthor } from '@/lib/auth';
import { paymentService } from '@/db/services';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    // Get current user
    const author = await getCurrentAuthor();
    if (!author) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    // Parse request body
    const { creditPackages } = await request.json();

    // Validate request
    if (!creditPackages || !Array.isArray(creditPackages) || creditPackages.length === 0) {
      return NextResponse.json(
        { error: 'Credit packages are required' },
        { status: 400 }
      );
    }

    // Validate each package
    for (const pkg of creditPackages) {
      if (!pkg.packageId || !pkg.quantity || pkg.quantity <= 0) {
        return NextResponse.json(
          { error: 'Invalid package data' },
          { status: 400 }
        );
      }

      // Check if package exists
      const creditPackage = await paymentService.getCreditPackage(pkg.packageId);
      if (!creditPackage) {
        return NextResponse.json(
          { error: `Invalid package ID: ${pkg.packageId}` },
          { status: 400 }
        );
      }
    }

    // Generate idempotency key for this request
    const idempotencyKey = uuidv4();

    // Create order
    const { order, revolutOrder } = await paymentService.createRevolutOrder({
      userId: author.authorId,
      creditPackages,
      idempotencyKey,
    });

    // Return order token for frontend
    return NextResponse.json({
      success: true,
      orderToken: revolutOrder.token,
      orderId: order.orderId,
      revolutOrderId: revolutOrder.id,
      amount: order.amount,
      currency: order.currency,
      credits: (order.creditBundle as { credits: number }).credits,
    });

  } catch (error) {
    console.error('Error creating payment order:', error);
    
    // Check if it's a Revolut API error
    if (error instanceof Error && error.message.includes('Revolut API error')) {
      return NextResponse.json(
        { error: 'Payment service unavailable. Please try again later.' },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create payment order' },
      { status: 500 }
    );
  }
}
