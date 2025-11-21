import { NextResponse } from 'next/server';
import { pricingService } from '@/db/services';
import { SELF_PRINTING_SERVICE_CODE } from '@/constants/pricing';

export async function GET() {
  try {
    const pricing = await pricingService.getPricingByServiceCode(SELF_PRINTING_SERVICE_CODE);

    if (!pricing) {
      return NextResponse.json(
        {
          success: false,
          error: 'Self-print pricing not configured',
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      serviceCode: SELF_PRINTING_SERVICE_CODE,
      credits: pricing.credits,
      pricing,
    });
  } catch (error) {
    console.error('Error fetching self-print pricing:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch self-print pricing',
      },
      { status: 500 },
    );
  }
}
