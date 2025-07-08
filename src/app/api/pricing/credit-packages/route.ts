import { NextResponse } from 'next/server';
import { creditPackagesService } from '@/db/services';

export async function GET() {
  try {
    const packages = await creditPackagesService.getActiveCreditPackages();
    
    // Transform the data to match the frontend expectations
    const formattedPackages = packages.map((pkg, index) => ({
      id: index + 1, // Use incremental ID for frontend compatibility
      credits: pkg.credits,
      price: parseFloat(pkg.price),
      popular: pkg.popular,
      bestValue: pkg.bestValue,
      icon: pkg.icon,
      key: pkg.key,
      dbId: pkg.id, // Keep the database ID for reference
    }));

    return NextResponse.json({ 
      success: true,
      packages: formattedPackages 
    });

  } catch (error) {
    console.error('Error fetching credit packages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch credit packages' },
      { status: 500 }
    );
  }
}
