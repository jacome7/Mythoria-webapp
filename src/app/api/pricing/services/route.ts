import { NextResponse } from 'next/server';
import { pricingService } from '@/db/services';

export async function GET() {
    try {
        const activePricing = await pricingService.getActivePricing();

        // Transform the database pricing into the format expected by the pricing page
        const services = activePricing.map(pricing => {
            let name: string;
            let icon: string;

            switch (pricing.serviceCode) {
                case 'eBookGeneration':
                    name = 'Generate a digital book (eBook)';
                    icon = 'FaBookOpen';
                    break;
                case 'printOrder':
                    name = 'Order a printed & shipped hardcover book';
                    icon = 'FaPrint';
                    break;
                case 'audioBookGeneration':
                    name = 'Generate an audiobook';
                    icon = 'FaVolumeUp';
                    break;
                default:
                    name = `Service: ${pricing.serviceCode}`;
                    icon = 'FaQuestionCircle';
            }

            return {
                id: pricing.id,
                name,
                cost: pricing.credits,
                icon,
                serviceCode: pricing.serviceCode,
                isActive: pricing.isActive,
                isMandatory: pricing.isMandatory,
                isDefault: pricing.isDefault,
            };
        });

        return NextResponse.json({
            success: true,
            services
        });

    } catch (error) {
        console.error('Error fetching pricing for services:', error);
        return NextResponse.json(
            { error: 'Failed to fetch pricing data' },
            { status: 500 }
        );
    }
}
