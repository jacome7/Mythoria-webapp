import { NextResponse } from 'next/server';
import { pricingService } from '@/db/services';

export async function GET() {
  try {
    const pricingData = await pricingService.getDeliveryOptionsPricing();

    // Format the response to match the expected structure
    const formattedPricing = {
      ebook: {
        name: 'Digital (eBook)',
        credits: pricingData.ebook?.credits || 5,
        description: 'Receive your story as a digital eBook',
        mandatory: true,
        default: true,
      },
      printed: {
        name: 'Printed Book',
        credits: pricingData.printed?.credits || 15,
        description: 'Receive a beautifully printed physical copy of your story',
        mandatory: false,
        default: false,
      },
      audiobook: {
        name: 'Audiobook',
        credits: pricingData.audiobook?.credits || 3,
        description: 'Receive your story as a narrated audiobook',
        mandatory: false,
        default: false,
      },
    };

    return NextResponse.json({
      success: true,
      deliveryOptions: formattedPricing,
    });
  } catch (error) {
    console.error('Error fetching pricing:', error);
    return NextResponse.json({ error: 'Failed to fetch pricing data' }, { status: 500 });
  }
}
