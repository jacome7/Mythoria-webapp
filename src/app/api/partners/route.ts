import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getEnvironmentConfig } from '@/config/environment';

// Partnership application validation schema
const PartnershipApplicationSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  companyName: z.string().min(1, 'Company name is required').max(200, 'Company name too long'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  website: z.string().url('Invalid URL').optional().or(z.literal('')),
  primaryLocation: z.string().min(1, 'Primary location is required'),
  partnershipType: z.enum(['printing_service', 'attraction_venue', 'retail_brand', 'other'], {
    message: 'Invalid partnership type',
  }),
  businessDescription: z.string().max(2000, 'Description too long').optional(),
});

// Get configuration
const config = getEnvironmentConfig();

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validationResult = PartnershipApplicationSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: validationResult.error.issues,
        },
        { status: 400 },
      );
    }

    const {
      name,
      companyName,
      email,
      phone,
      website,
      primaryLocation,
      partnershipType,
      businessDescription,
    } = validationResult.data;

    // Map partnership type to human-readable format
    const partnershipTypeMapping: Record<string, string> = {
      printing_service: 'Printing Service',
      attraction_venue: 'Attraction / Venue',
      retail_brand: 'Retail / Brand',
      other: 'Other',
    };

    const partnershipTypeLabel = partnershipTypeMapping[partnershipType];
    const subject = `Partnership application: ${companyName}`;
    const description = [
      `Contact name: ${name}`,
      `Company: ${companyName}`,
      `Email: ${email}`,
      phone ? `Phone: ${phone}` : null,
      website ? `Website: ${website}` : null,
      `Primary location: ${primaryLocation}`,
      `Partnership type: ${partnershipTypeLabel}`,
      businessDescription ? `Business description: ${businessDescription}` : null,
    ]
      .filter(Boolean)
      .join('\n');

    // Create ticket in admin system with API key authentication
    const ticketResponse = await fetch(`${config.admin.apiUrl}/api/tickets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': config.admin.apiKey,
      },
      body: JSON.stringify({
        category: 'partnership_application',
        subject,
        description,
        email: email,
        name: name,
        companyName: companyName,
        phone: phone || null,
        website: website || null,
        primaryLocation: primaryLocation,
        partnershipType: partnershipTypeLabel,
        businessDescription: businessDescription || null,
        metadata: {
          name,
          email,
          companyName,
          phone: phone || null,
          website: website || null,
          primaryLocation,
          partnershipType: partnershipTypeLabel,
          businessDescription: businessDescription || null,
        },
      }),
    });

    if (!ticketResponse.ok) {
      const errorText = await ticketResponse.text();
      console.error('Failed to create partnership ticket:', errorText);

      return NextResponse.json(
        {
          success: false,
          error: 'Failed to submit partnership application',
          details: `Ticket creation error: ${ticketResponse.status}`,
        },
        { status: 500 },
      );
    }

    const ticketData = await ticketResponse.json();
    console.log('Partnership application ticket created successfully:', ticketData.id);

    return NextResponse.json({
      success: true,
      message: 'Partnership application submitted successfully',
      ticketId: ticketData.id,
    });
  } catch (error) {
    console.error('Partnership application API error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
