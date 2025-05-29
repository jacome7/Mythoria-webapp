import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { leads } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    // Validate email
    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email is required and must be a string' },
        { status: 400 }
      );
    }

    // Simple email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Please enter a valid email address' },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existingLead = await db
      .select()
      .from(leads)
      .where(eq(leads.email, email.toLowerCase()))
      .limit(1);

    if (existingLead.length > 0) {
      return NextResponse.json(
        { 
          message: 'Wow, you are really eager to experiment Mythoria. Rest assured we will notify you when we launch it!',
          alreadyRegistered: true 
        },
        { status: 200 }
      );
    }

    // Insert new lead
    await db.insert(leads).values({
      email: email.toLowerCase(),
    });

    return NextResponse.json(
      { 
        message: 'Thank you for your interest! We\'ll notify you as soon as Mythoria is available.',
        success: true 
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('Error processing lead signup:', error);
    return NextResponse.json(
      { error: 'An error occurred while processing your request. Please try again.' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // Get the count of leads (for admin purposes or stats)
    const leadCount = await db
      .select({ count: leads.email })
      .from(leads);

    return NextResponse.json(
      { count: leadCount.length },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error getting lead count:', error);
    return NextResponse.json(
      { error: 'An error occurred while retrieving data' },
      { status: 500 }
    );
  }
}
