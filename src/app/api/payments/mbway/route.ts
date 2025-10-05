import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAuthor } from '@/lib/auth';
import { paymentService } from '@/db/services';
import { normalizeLocale } from '@/utils/locale-utils';

interface Manager {
  email: string;
  name?: string;
}

interface MBWayRequest {
  creditPackages: Array<{
    packageId: number;
    quantity: number;
  }>;
  locale?: string;
}

// Helper function to extract ticket number from UUID
function getTicketNumber(uuid: string): string {
  // Extract second group of 4 digits: 0197e1e6-cd2d-704a-afb8-385f46c806fc -> "CD2D"
  const parts = uuid.split('-');
  if (parts.length >= 2) {
    return parts[1].toUpperCase();
  }
  // Fallback to first 4 characters if UUID format is unexpected
  return uuid.substring(0, 4).toUpperCase();
}

export async function POST(request: NextRequest) {
  try {
    // Get current user
    const author = await getCurrentAuthor();
    if (!author) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body: MBWayRequest = await request.json();
    const { creditPackages, locale } = body;

    // Validate request
    if (!creditPackages || !Array.isArray(creditPackages) || creditPackages.length === 0) {
      return NextResponse.json({ error: 'Credit packages are required' }, { status: 400 });
    }

    // Validate each package
    for (const pkg of creditPackages) {
      if (!pkg.packageId || !pkg.quantity || pkg.quantity <= 0) {
        return NextResponse.json({ error: 'Invalid package data' }, { status: 400 });
      }

      // Check if package exists
      const creditPackage = await paymentService.getCreditPackage(pkg.packageId);
      if (!creditPackage) {
        return NextResponse.json(
          { error: `Invalid package ID: ${pkg.packageId}` },
          { status: 400 },
        );
      }
    }

    // Calculate order totals
    const orderTotals = await paymentService.calculateOrderTotal(creditPackages);

    // Create ticket in admin system
    const adminApiKey = process.env.ADMIN_API_KEY;
    if (!adminApiKey) {
      throw new Error('ADMIN_API_KEY environment variable is not set');
    }

    const ticketResponse = await fetch(`${process.env.ADMIN_API_URL}/api/tickets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': adminApiKey,
      },
      body: JSON.stringify({
        userId: author.authorId,
        category: 'payment_request',
        amount: orderTotals.totalAmount, // Required field at top level for payment_request tickets
        subject: `MB Way Payment request - ${orderTotals.totalAmount}€ = ${orderTotals.totalCredits} credits - requested by ${author.mobilePhone || ''}`,
        description: `User requested MB Way payment processing for amount: €${orderTotals.totalAmount}`,
        metadata: {
          paymentMethod: 'mbway',
          amount: orderTotals.totalAmount,
          credits: orderTotals.totalCredits,
          phone: author.mobilePhone || '',
          creditPackages: orderTotals.itemsBreakdown,
          author: {
            id: author.authorId,
            name: author.displayName,
            email: author.email,
            phone: author.mobilePhone || '',
          },
        },
      }),
    });

    if (!ticketResponse.ok) {
      const ticketError = await ticketResponse.text();
      console.error('Failed to create ticket:', ticketError);
      return NextResponse.json(
        {
          error: 'Failed to create payment request. Please contact support.',
          contactUrl: `/${normalizeLocale(locale).split('-')[0]}/contact?category=bug&subject=MB Way Payment Error`,
        },
        { status: 500 },
      );
    }

    const ticket = await ticketResponse.json();
    const ticketNumber = getTicketNumber(ticket.id);

    // Send notification to managers
    try {
      // Get managers list
      const managersResponse = await fetch(`${process.env.ADMIN_API_URL}/api/admin/managers`, {
        method: 'GET',
        headers: {
          'x-api-key': adminApiKey,
        },
      });

      if (managersResponse.ok) {
        const managersData = await managersResponse.json();
        const managers = managersData.data || [];

        // Send email to all managers
        if (managers.length > 0) {
          const managerEmails = managers.map((manager: Manager) => ({
            email: manager.email,
            name: manager.name || manager.email,
          }));

          const { notificationFetch } = await import('@/lib/notification-client');
          await notificationFetch(`${process.env.NOTIFICATION_ENGINE_URL}/email`, {
            method: 'POST',
            body: JSON.stringify({
              to: managerEmails,
              subject: `MB Way Payment request (${ticketNumber}) - ${orderTotals.totalAmount}€ = ${orderTotals.totalCredits} credits - requested by ${author.mobilePhone || 'No phone'}`,
              html: `
                <h2>New MB Way Payment Request</h2>
                <p>Hi Admin,</p>
                <p>A new MB Way payment request has been placed by:</p>
                <ul>
                  <li><strong>Name:</strong> ${author.displayName}</li>
                  <li><strong>Email:</strong> ${author.email}</li>
                  <li><strong>Phone:</strong> ${author.mobilePhone || 'Not provided'}</li>
                </ul>
                <p>Package details:</p>
                <ul>
                  <li><strong>Total Amount:</strong> €${orderTotals.totalAmount}</li>
                  <li><strong>Total Credits:</strong> ${orderTotals.totalCredits}</li>
                  <li><strong>Ticket Number:</strong> ${ticketNumber}</li>
                </ul>
                <p>Please process this payment request in the admin panel.</p>
              `,
              text: `New MB Way Payment Request\n\nHi Admin,\n\nA new MB Way payment request has been placed by:\n- Name: ${author.displayName}\n- Email: ${author.email}\n- Phone: ${author.mobilePhone || 'Not provided'}\n\nPackage details:\n- Total Amount: €${orderTotals.totalAmount}\n- Total Credits: ${orderTotals.totalCredits}\n- Ticket Number: ${ticketNumber}\n\nPlease process this payment request in the admin panel.`,
            }),
          });
        }
      }
    } catch (emailError) {
      console.error('Failed to send manager notification:', emailError);
      // Don't fail the request if manager email fails
    }

    // Send email to user with payment instructions
    try {
      // Determine user's locale (kept for future localization logic but currently forcing en-US template)
      // const userLocale = normalizeLocale(author.preferredLocale || locale);
      // TEMPORARY: Only en-US template exists for 'mbway-payment-instructions'.
      // Force language to en-US to avoid template-not-found errors until localized templates are added.
      const templateLanguage = 'en-US';

      const { notificationFetch } = await import('@/lib/notification-client');
      await notificationFetch(`${process.env.NOTIFICATION_ENGINE_URL}/email/template`, {
        method: 'POST',
        body: JSON.stringify({
          templateId: 'mbway-payment-instructions',
          recipients: [
            {
              email: author.email,
              name: author.displayName,
              language: templateLanguage,
            },
          ],
          variables: {
            userName: author.displayName,
            userEmail: author.email,
            amount: orderTotals.totalAmount,
            amountFormatted: orderTotals.totalAmount.toFixed(2),
            credits: orderTotals.totalCredits,
            ticketNumber: ticketNumber,
            mbwayPhone: '918957895',
          },
        }),
      });
    } catch (emailError) {
      console.error('Failed to send user notification:', emailError);
      // Don't fail the request if user email fails
    }

    return NextResponse.json({
      success: true,
      message: 'MB Way payment request created successfully',
      ticketId: ticket.id,
      ticketNumber: ticketNumber,
      amount: orderTotals.totalAmount,
      credits: orderTotals.totalCredits,
    });
  } catch (error) {
    console.error('Error creating MB Way payment request:', error);

    return NextResponse.json(
      {
        error: 'Failed to create MB Way payment request',
        contactUrl: `/${normalizeLocale().split('-')[0]}/contact?category=bug&subject=MB Way Payment Error`,
      },
      { status: 500 },
    );
  }
}
