import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getEnvironmentConfig } from '../../../../config/environment';

// Contact form validation schema
const ContactFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  email: z.string().email('Invalid email address'),
  category: z.string().optional(),
  message: z.string().min(1, 'Message is required').max(2000, 'Message too long')
});

// Get configuration
const config = getEnvironmentConfig();

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validationResult = ContactFormSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: validationResult.error.errors
        },
        { status: 400 }
      );
    }

    const { name, email, category, message } = validationResult.data;

    // Prepare data for notification engine
    const workflowData = {
      data: {
        type: 'email',
        recipients: ['rodrigovieirajacome@gmail.com', 'andrejacomesilva@hotmail.com'],
        template: 'contact-form',
        variables: {
          userName: name,
          userEmail: email,
          category: category || 'general',
          message: message,
          submissionTime: new Date().toISOString()
        },
        subject: `New Contact Form Submission from ${name}`,
        correlationId: `contact-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      }
    };

    console.log('Sending contact form to notification engine:', {
      url: `${config.notification.engineUrl}/test/workflow-direct`,
      recipients: workflowData.data.recipients,
      from: email
    });

    // Call notification engine directly
    const response = await fetch(`${config.notification.engineUrl}/test/workflow-direct`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(workflowData)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Notification engine error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });

      return NextResponse.json(
        {
          success: false,
          error: 'Failed to send email notification',
          details: `Notification service error: ${response.status}`
        },
        { status: 500 }
      );
    }

    const result = await response.json();
    console.log('Notification engine response:', result);

    return NextResponse.json({
      success: true,
      message: 'Contact form submitted successfully',
      correlationId: workflowData.data.correlationId
    });

  } catch (error) {
    console.error('Contact form API error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
