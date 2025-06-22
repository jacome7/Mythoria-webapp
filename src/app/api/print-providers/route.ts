import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { printProviders } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {    const { searchParams } = new URL(request.url);
    const country = searchParams.get('country');

    const query = db.select().from(printProviders).where(eq(printProviders.isActive, true));

    const providers = await query;

    // Filter by country if provided
    let filteredProviders = providers;
    if (country) {
      filteredProviders = providers.filter(provider => {
        const availableCountries = provider.availableCountries as string[];
        return availableCountries.includes(country.toUpperCase());
      });
    }

    return NextResponse.json({
      success: true,
      providers: filteredProviders
    });
  } catch (error) {
    console.error('Error fetching print providers:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch print providers' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const newProvider = await db.insert(printProviders).values({
      name: body.name,
      companyName: body.companyName,
      vatNumber: body.vatNumber,
      emailAddress: body.emailAddress,
      phoneNumber: body.phoneNumber,
      address: body.address,
      postalCode: body.postalCode,
      city: body.city,
      country: body.country,
      prices: body.prices,
      integration: body.integration || 'email',
      availableCountries: body.availableCountries,
      isActive: body.isActive ?? true,
    }).returning();

    return NextResponse.json({
      success: true,
      provider: newProvider[0]
    });
  } catch (error) {
    console.error('Error creating print provider:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create print provider' },
      { status: 500 }
    );
  }
}
