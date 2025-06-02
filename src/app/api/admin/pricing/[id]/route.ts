import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { pricingService } from '@/db/services';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // Check if user is authenticated and authorized
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has admin access
    const publicMetadata = user.publicMetadata as { [key: string]: string } | undefined;
    if (!publicMetadata || publicMetadata['autorizaçãoDeAcesso'] !== 'Comejá') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }    const body = await request.json();
    const { isActive, isMandatory, isDefault, credits } = body;

    // Only allow updating these specific fields
    const updateData: {
      isActive?: boolean;
      isMandatory?: boolean;
      isDefault?: boolean;
      credits?: number;
    } = {};
    if (typeof isActive === 'boolean') updateData.isActive = isActive;
    if (typeof isMandatory === 'boolean') updateData.isMandatory = isMandatory;
    if (typeof isDefault === 'boolean') updateData.isDefault = isDefault;
    if (typeof credits === 'number') updateData.credits = credits;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const updatedPricing = await pricingService.updatePricing(id, updateData);

    if (!updatedPricing) {
      return NextResponse.json({ error: 'Pricing entry not found' }, { status: 404 });
    }

    return NextResponse.json(updatedPricing);
  } catch (error) {
    console.error('Error updating pricing:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
