import { NextRequest, NextResponse } from 'next/server';
import { auth0 } from '@/lib/auth0';
import { pricingService } from '@/db/services';

export async function GET(request: NextRequest) {
  try {
    console.log('=== Pricing API Request ===');
    console.log('Request URL:', request.url);
    console.log('Request headers:', Object.fromEntries(request.headers.entries()));
    console.log('Server time:', new Date().toISOString());
    
    // Check if user is authenticated and authorized
    const session = await auth0.getSession();
    console.log('Current session:', session ? { user: session.user } : 'null');
    
    if (!session?.user) {
      console.log('No user found - returning 401');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has admin access (check for admin role in Auth0)
    const userRoles = session.user['https://mythoria.com/roles'] || [];
    if (!userRoles.includes('admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get all pricing entries (including inactive ones for admin)
    const pricingEntries = await pricingService.getAllPricing();

    return NextResponse.json(pricingEntries);
  } catch (error) {
    console.error('Error fetching pricing:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check if user is authenticated and authorized
    const session = await auth0.getSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has admin access (check for admin role in Auth0)
    const userRoles = session.user['https://mythoria.com/roles'] || [];
    if (!userRoles.includes('admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { serviceCode, credits, isActive = true, isMandatory = false, isDefault = false } = body;

    if (!serviceCode || typeof credits !== 'number') {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const newPricing = await pricingService.createPricing({
      serviceCode,
      credits,
      isActive,
      isMandatory,
      isDefault
    });

    return NextResponse.json(newPricing, { status: 201 });
  } catch (error) {
    console.error('Error creating pricing:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
