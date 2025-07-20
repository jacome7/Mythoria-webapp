import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAuthor } from '@/lib/auth';
import { getEnvironmentConfig } from '../../../../config/environment';

interface PrintOrderRequest {
  storyId: string;
  selectedAddress: {
    addressId: string;
    line1: string;
    line2?: string;
    city: string;
    postalCode: string;
    country: string;
  };
  selectedPrintingOption: {
    serviceCode: string;
    credits: number;
    title: string;
  };
  totalCost: number;
}

export async function POST(request: NextRequest) {
  try {
    // Get current user
    const author = await getCurrentAuthor();
    if (!author) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const {
      storyId,
      selectedAddress,
      selectedPrintingOption,
      totalCost
    }: PrintOrderRequest = await request.json();

    // Validate request
    if (!storyId || !selectedAddress || !selectedPrintingOption || !totalCost) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get environment configuration (this is safe on server-side)
    const config = getEnvironmentConfig();

    // Create ticket in admin system for print request
    const ticketResponse = await fetch(`${config.admin.apiUrl}/api/tickets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        category: 'print_request',
        storyId: storyId,
        userId: author.authorId,
        shippingAddress: {
          addressId: selectedAddress.addressId,
          line1: selectedAddress.line1,
          line2: selectedAddress.line2,
          city: selectedAddress.city,
          postalCode: selectedAddress.postalCode,
          country: selectedAddress.country,
        },
        printingOption: {
          serviceCode: selectedPrintingOption.serviceCode,
          title: selectedPrintingOption.title,
          credits: selectedPrintingOption.credits,
        },
        totalCost: totalCost,
        orderDetails: {
          requestedAt: new Date().toISOString(),
          status: 'pending_processing',
        }
      }),
    });

    if (!ticketResponse.ok) {
      console.error('Failed to create admin ticket:', ticketResponse.statusText);
      return NextResponse.json(
        { error: 'Failed to create print order ticket' },
        { status: 500 }
      );
    }

    const ticketData = await ticketResponse.json();

    // TODO: Here you should also:
    // 1. Deduct credits from user's account
    // 2. Create a print_orders record in your database
    // 3. Send confirmation email to user
    // 4. Update story status if needed

    return NextResponse.json({
      success: true,
      ticketId: ticketData.ticketId,
      message: 'Print order placed successfully'
    });

  } catch (error) {
    console.error('Error placing print order:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
