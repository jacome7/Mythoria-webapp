import { NextResponse, NextRequest } from 'next/server';
import { pricingService } from '@/db/services';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const serviceCode = searchParams.get('serviceCode');

        if (serviceCode) {
            // Get pricing for specific service code
            const pricing = await pricingService.getPricingByServiceCode(serviceCode);
            
            if (!pricing) {
                return NextResponse.json({
                    success: false,
                    error: `Pricing not found for service code: ${serviceCode}`
                }, { status: 404 });
            }

            return NextResponse.json({
                success: true,
                pricing
            });
        }

        // Get all active pricing
        const activePricing = await pricingService.getActivePricing();        // Transform the database pricing into the format expected by the pricing page
        const services = activePricing.map(pricing => {
            let name: string;
            let icon: string;

            switch (pricing.serviceCode) {
                case 'initialAuthorCredits':
                    name = 'Initial Author Credits';
                    icon = 'FaGift';
                    break;
                case 'eBookGeneration':
                    name = 'Generate a digital book (eBook)';
                    icon = 'FaBookOpen';
                    break;
                case 'audioBookGeneration':
                    name = 'Generate an audiobook';
                    icon = 'FaVolumeUp';
                    break;
                case 'manualEditing':
                    name = 'Manual editing';
                    icon = 'FaPalette';
                    break;
                case 'printedSoftCover':
                    name = 'Printed Soft Cover';
                    icon = 'FaPrint';
                    break;
                case 'printedHardcover':
                    name = 'Printed Hard Cover';
                    icon = 'FaPrint';
                    break;
                case 'extraChapterCost':
                    name = 'Extra Chapter Cost';
                    icon = 'FaFileDownload';
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
