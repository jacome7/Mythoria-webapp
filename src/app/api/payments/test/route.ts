import { NextResponse } from 'next/server';
import { paymentService, CREDIT_PACKAGES } from '@/db/services/payment';

export async function GET() {
  try {
    // Test credit package retrieval
    const packages = CREDIT_PACKAGES;
    
    // Test order calculation
    const testPackages = [
      { packageId: 1, quantity: 2 },
      { packageId: 3, quantity: 1 }
    ];
    
    const calculation = paymentService.calculateOrderTotal(testPackages);
    
    return NextResponse.json({
      success: true,
      test: 'payment-integration',
      environment: process.env.NODE_ENV,
      revolutApiUrl: process.env.NODE_ENV === 'production' 
        ? 'https://merchant.revolut.com' 
        : 'https://sandbox-merchant.revolut.com',
      availablePackages: packages,
      testCalculation: {
        input: testPackages,
        result: calculation
      },
      envVars: {
        hasRevolutPublicKey: !!process.env.REVOLUT_API_PUBLIC_KEY,
        hasRevolutSecretKey: !!process.env.REVOLUT_API_SECRET_KEY,
      }
    });
  } catch (error) {
    console.error('Payment test error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
