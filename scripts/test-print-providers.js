/**
 * Test script to add sample print providers via API
 * Run this with: npm run test-print-providers
 */

const API_BASE = 'http://localhost:3000/api';

async function testPrintProvidersAPI() {
  console.log('Testing Print Providers API...');

  try {
    // Test GET (should return empty list initially)
    console.log('\n1. Testing GET /api/print-providers');
    const getResponse = await fetch(`${API_BASE}/print-providers`);
    const getResult = await getResponse.json();
    console.log('GET result:', getResult);

    // Test POST - Add sample provider
    console.log('\n2. Testing POST /api/print-providers');
    const sampleProvider = {
      name: 'BookPrintPro',
      companyName: 'BookPrint Professional Ltd.',
      vatNumber: 'GB123456789',
      emailAddress: 'orders@bookprintpro.com',
      phoneNumber: '+44 20 1234 5678',
      address: '123 Publishing Street',
      postalCode: 'SW1A 1AA',
      city: 'London',
      country: 'GB',
      prices: {
        paperback: {
          basePrice: 8.99,
          perPagePrice: 0.05,
          minPages: 50,
          maxPages: 500
        },
        hardcover: {
          basePrice: 15.99,
          perPagePrice: 0.08,
          minPages: 50,
          maxPages: 400
        },
        shipping: {
          standard: 4.99,
          express: 12.99,
          free_threshold: 25.00
        }
      },
      integration: 'email',
      availableCountries: ['GB', 'IE', 'FR', 'DE', 'ES', 'IT', 'NL', 'BE'],
      isActive: true
    };

    const postResponse = await fetch(`${API_BASE}/print-providers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(sampleProvider)
    });

    const postResult = await postResponse.json();
    console.log('POST result:', postResult);

    // Test GET again to see the new provider
    console.log('\n3. Testing GET /api/print-providers again');
    const getResponse2 = await fetch(`${API_BASE}/print-providers`);
    const getResult2 = await getResponse2.json();
    console.log('GET result after POST:', getResult2);

    // Test GET with country filter
    console.log('\n4. Testing GET /api/print-providers?country=GB');
    const getResponseFiltered = await fetch(`${API_BASE}/print-providers?country=GB`);
    const getResultFiltered = await getResponseFiltered.json();
    console.log('GET filtered result:', getResultFiltered);

  } catch (error) {
    console.error('Error testing API:', error);
  }
}

// Only run if this script is executed directly
if (process.argv[1].endsWith('test-print-providers.js')) {
  testPrintProvidersAPI();
}

module.exports = { testPrintProvidersAPI };
