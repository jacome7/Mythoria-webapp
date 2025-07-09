import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const publicKey = process.env.REVOLUT_API_PUBLIC_KEY;
    
    if (!publicKey) {
      console.error('REVOLUT_API_PUBLIC_KEY environment variable is not set');
      return NextResponse.json(
        { error: 'Revolut public key not configured' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      publicKey,
      environment: process.env.NODE_ENV === 'production' ? 'prod' : 'sandbox'
    });
  } catch (error) {
    console.error('Error fetching Revolut configuration:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
