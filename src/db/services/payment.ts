import { db } from "../index";
import { paymentOrders, paymentEvents, paymentMethods, type PaymentOrder } from "../schema";
import { eq, and, desc } from "drizzle-orm";
import { creditPackagesService } from "./credit-packages";

export interface CreditPackage {
  id: number;
  credits: number;
  price: number;
  popular?: boolean;
  bestValue?: boolean;
  key?: string;
  dbId?: string;
}

export interface CreateOrderRequest {
  userId: string;
  creditPackages: Array<{
    packageId: number;
    quantity: number;
  }>;
  idempotencyKey?: string;
}

export interface RevolutOrderResponse {
  id: string;
  token: string;
  state: string;
  amount: number; // ✅ Updated: amount is a direct number, not an object
  currency: string; // ✅ Updated: currency is at the top level
}

export interface WebhookPayload {
  event: string;
  order_id: string;
  timestamp?: string;
  state?: string;
  amount?: {
    value: number;
    currency: string;
  };
  payment_method?: {
    type: string;
    brand?: string;
    last4?: string;
    exp_month?: string;
    exp_year?: string;
  };
}

export const paymentService = {
  // Get credit packages from database with frontend-compatible IDs
  async getCreditPackages(): Promise<CreditPackage[]> {
    const dbPackages = await creditPackagesService.getActiveCreditPackages();
    
    // Transform the data to match the frontend expectations (same as in API)
    return dbPackages.map((pkg, index) => ({
      id: index + 1, // Use incremental ID for frontend compatibility
      credits: pkg.credits,
      price: parseFloat(pkg.price),
      popular: pkg.popular,
      bestValue: pkg.bestValue,
      key: pkg.key,
      dbId: pkg.id, // Keep the database ID for reference
    }));
  },

  // Get credit package by frontend ID
  async getCreditPackage(id: number): Promise<CreditPackage | undefined> {
    const packages = await this.getCreditPackages();
    return packages.find(pkg => pkg.id === id);
  },

  // Calculate total for order
  async calculateOrderTotal(packages: Array<{ packageId: number; quantity: number }>): Promise<{
    totalCredits: number;
    totalAmount: number;
    itemsBreakdown: Array<{ packageId: number; quantity: number; credits: number; unitPrice: number; totalPrice: number }>;
  }> {
    let totalCredits = 0;
    let totalAmount = 0;
    const itemsBreakdown = [];

    for (const item of packages) {
      const pkg = await this.getCreditPackage(item.packageId);
      if (!pkg) {
        throw new Error(`Invalid package ID: ${item.packageId}`);
      }

      const itemTotalPrice = pkg.price * item.quantity;
      const itemTotalCredits = pkg.credits * item.quantity;

      totalCredits += itemTotalCredits;
      totalAmount += itemTotalPrice;

      itemsBreakdown.push({
        packageId: item.packageId,
        quantity: item.quantity,
        credits: pkg.credits,
        unitPrice: pkg.price,
        totalPrice: itemTotalPrice,
      });
    }

    return {
      totalCredits,
      totalAmount,
      itemsBreakdown,
    };
  },

  // Create Revolut order
  async createRevolutOrder(orderData: CreateOrderRequest): Promise<{ order: PaymentOrder; revolutOrder: RevolutOrderResponse }> {
    // Calculate order totals
    const orderTotals = await this.calculateOrderTotal(orderData.creditPackages);
    
    // Determine API base URL based on environment
    const apiBaseUrl = process.env.REVOLUT_API_URL || 
      (process.env.NODE_ENV === 'production' 
        ? 'https://merchant.revolut.com' 
        : 'https://sandbox-merchant.revolut.com');

    // Create order in Revolut
    const revolutOrderPayload = {
      amount: Math.round(orderTotals.totalAmount * 100), // Convert to cents
      currency: 'EUR',
      description: `Mythoria Credits Purchase - ${orderTotals.totalCredits} credits`,
      merchant_order_ext_ref: `mythoria-${Date.now()}`,
      ...(orderData.idempotencyKey && { idempotency_key: orderData.idempotencyKey }),
    };
    
    const revolutResponse = await fetch(`${apiBaseUrl}/api/orders`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.REVOLUT_API_SECRET_KEY}`,
        'Content-Type': 'application/json',
        'Revolut-Api-Version': '2024-09-01',
        ...(orderData.idempotencyKey && { 'Idempotency-Key': orderData.idempotencyKey }),
      },
      body: JSON.stringify(revolutOrderPayload),
    });

    if (!revolutResponse.ok) {
      const errorText = await revolutResponse.text();
      console.error('PaymentService: Revolut API error:', {
        status: revolutResponse.status,
        statusText: revolutResponse.statusText,
        errorText,
        requestPayload: revolutOrderPayload,
      });
      throw new Error(`Revolut API error: ${revolutResponse.status} - ${errorText}`);
    }

    const revolutOrder: RevolutOrderResponse = await revolutResponse.json();
    
    // Verify the order amount matches what we requested
    const returnedAmount = revolutOrder.amount;
    const requestedAmount = Math.round(orderTotals.totalAmount * 100);
    
    if (returnedAmount !== requestedAmount) {
      console.warn('PaymentService: Amount mismatch detected:', {
        requestedAmount: requestedAmount,
        returnedAmount: returnedAmount,
        requestedCurrency: 'EUR',
        returnedCurrency: revolutOrder.currency,
      });
    }

    // Save order to database
    const [order] = await db.insert(paymentOrders).values({
      authorId: orderData.userId,
      amount: Math.round(orderTotals.totalAmount * 100), // Convert to cents
      currency: 'EUR',
      status: 'pending',
      provider: 'revolut',
      providerOrderId: revolutOrder.id,
      providerPublicId: revolutOrder.token,
      creditBundle: {
        credits: orderTotals.totalCredits,
        price: orderTotals.totalAmount,
      },
    }).returning();

    // Create order created event
    await db.insert(paymentEvents).values({
      orderId: order.orderId,
      eventType: 'order_created',
      data: {
        revolutOrder,
        orderTotals,
        creditPackages: orderData.creditPackages,
      },
    });

    return { order, revolutOrder };
  },

  // Get order by Revolut order ID
  async getOrderByRevolutId(revolutOrderId: string) {
    const [order] = await db
      .select()
      .from(paymentOrders)
      .where(eq(paymentOrders.providerOrderId, revolutOrderId));
    
    return order;
  },

  // Get order by token
  async getOrderByToken(token: string) {
    const [order] = await db
      .select()
      .from(paymentOrders)
      .where(eq(paymentOrders.providerPublicId, token));
    
    return order;
  },

  // Update order status
  async updateOrderStatus(orderId: string, status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled') {
    const updateData: Partial<PaymentOrder> = {
      status: status as 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled',
      updatedAt: new Date(),
    };

    const [updatedOrder] = await db
      .update(paymentOrders)
      .set(updateData)
      .where(eq(paymentOrders.orderId, orderId))
      .returning();

    return updatedOrder;
  },

  // Process webhook
  async processWebhook(payload: WebhookPayload): Promise<{ success: boolean; message: string }> {
    try {
      // Find order by Revolut order ID
      const order = await this.getOrderByRevolutId(payload.order_id);
      
      if (!order) {
        return { success: false, message: `Order not found: ${payload.order_id}` };
      }

      // Create event record (idempotent - will help prevent duplicate processing)
      await db.insert(paymentEvents).values({
        orderId: order.orderId,
        eventType: 'webhook_received',
        data: payload,
        createdAt: new Date()
      });

      // Process the event based on type
      switch (payload.event) {
        case 'ORDER_COMPLETED':
          // This is the main event we care about - payment successful
          await this.handleOrderCompleted(order, payload);
          return { success: true, message: `Order ${order.orderId} completed successfully` };
          
        case 'order.cancelled':
          await this.updateOrderStatus(order.orderId, 'cancelled');
          return { success: true, message: `Order ${order.orderId} cancelled` };
          
        case 'order.failed':
        case 'ORDER_PAYMENT_FAILED':
          await this.updateOrderStatus(order.orderId, 'failed');
          return { success: true, message: `Order ${order.orderId} failed` };
          
        case 'dispute.opened':
          // Handle dispute - could send notification to admin
          console.log(`Dispute opened for order ${order.orderId}`);
          return { success: true, message: `Dispute opened for order ${order.orderId}` };
          
        default:
          console.log(`Unhandled webhook event: ${payload.event}`);
          return { success: true, message: `Unhandled event: ${payload.event}` };
      }

    } catch (error) {
      console.error('Webhook processing error:', error);
      return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  // Handle completed order
  async handleOrderCompleted(order: PaymentOrder, payload: WebhookPayload) {
    // Check if order is already completed to prevent duplicate processing
    if (order.status === 'completed') {
      console.log(`Order ${order.orderId} already completed, skipping duplicate processing`);
      return;
    }

    // Use database transaction to ensure atomicity
    await db.transaction(async (tx) => {
      // Update order status
      await tx.update(paymentOrders)
        .set({ 
          status: 'completed',
          updatedAt: new Date()
        })
        .where(eq(paymentOrders.orderId, order.orderId));

      // Add credits to user's balance
      const creditBundle = order.creditBundle as { credits: number; price: number };
      const { creditService } = await import('../services');
      
      // Add credits using the credit service
      await creditService.addCredits(order.authorId, creditBundle.credits, 'creditPurchase', order.orderId);

      console.log(`Order ${order.orderId} completed - ${creditBundle.credits} credits added to user ${order.authorId}`);
    });

    // Save payment method if it's a new card (outside transaction - not critical)
    if (payload.payment_method && payload.payment_method.type === 'card') {
      try {
        await this.savePaymentMethod(order.authorId, payload.payment_method);
      } catch (error) {
        console.error('Error saving payment method:', error);
        // Don't fail the whole process if payment method saving fails
      }
    }
  },

  // Save payment method for future use
  async savePaymentMethod(userId: string, paymentMethodData: Record<string, unknown>) {
    try {
      // Check if this payment method already exists
      const existingMethods = await db
        .select()
        .from(paymentMethods)
        .where(and(
          eq(paymentMethods.authorId, userId),
          eq(paymentMethods.provider, 'revolut'),
          eq(paymentMethods.last4, (paymentMethodData.last4 as string) || ''),
        ));

      if (existingMethods.length === 0) {
        // Save new payment method
        await db.insert(paymentMethods).values({
          authorId: userId,
          provider: 'revolut',
          providerRef: 'revolut-saved-method', // Revolut doesn't provide a specific ID for saved methods
          brand: (paymentMethodData.brand as string) || null,
          last4: (paymentMethodData.last4 as string) || null,
          expMonth: paymentMethodData.exp_month ? parseInt(paymentMethodData.exp_month as string) : null,
          expYear: paymentMethodData.exp_year ? parseInt(paymentMethodData.exp_year as string) : null,
          isDefault: false, // User can set default later
        });
      }
    } catch (error) {
      console.error('Error saving payment method:', error);
      // Don't throw error - payment was successful, this is just nice-to-have
    }
  },

  // Get user's payment history
  async getUserPaymentHistory(userId: string, limit: number = 20) {
    return await db
      .select({
        id: paymentOrders.orderId,
        revolutOrderId: paymentOrders.providerOrderId,
        creditBundle: paymentOrders.creditBundle,
        amount: paymentOrders.amount,
        currency: paymentOrders.currency,
        status: paymentOrders.status,
        provider: paymentOrders.provider,
        createdAt: paymentOrders.createdAt,
        updatedAt: paymentOrders.updatedAt,
      })
      .from(paymentOrders)
      .where(eq(paymentOrders.authorId, userId))
      .orderBy(desc(paymentOrders.createdAt))
      .limit(limit);
  },

  // Verify webhook signature (Revolut sends this in the header)
  async verifyWebhookSignature(payload: string, signature: string, timestamp: string): Promise<boolean> {
    // Check if signature and timestamp exist
    if (!payload || !signature || !timestamp) {
      console.error('Missing required parameters for signature verification');
      return false;
    }
    
    // Check timestamp to prevent replay attacks (5 minute window)
    const now = Math.floor(Date.now() / 1000); // Current time in seconds
    
    // Revolut sends timestamp in milliseconds, convert to seconds
    const requestTime = Math.floor(parseInt(timestamp) / 1000);
    const timeWindow = 5 * 60; // 5 minutes in seconds
    const timeDiff = Math.abs(now - requestTime);
    
    if (timeDiff > timeWindow) {
      return false;
    }
    
    // Get webhook secret from environment
    const webhookSecret = process.env.REVOLUT_WEBHOOK_SECRET;
    
    if (!webhookSecret) {
      console.error('REVOLUT_WEBHOOK_SECRET not found in environment variables');
      return false;
    }
    
    try {
      const crypto = await import('crypto');
      
      // According to Revolut docs, the payload to sign is: v1.<timestamp>.<rawPayload>
      const payloadToSign = `v1.${timestamp}.${payload}`;
      
      // Compute HMAC-SHA256, hex-encoded
      const digest = crypto
        .createHmac('sha256', webhookSecret)
        .update(payloadToSign, 'utf8')
        .digest('hex');
      
      // The expected signature format is: v1=<hex_digest>
      const expectedSignature = `v1=${digest}`;
      
      // Support signature rotation by checking every comma-separated value
      const signatureValues = signature.split(',').map(sig => sig.trim());
      
      // Constant-time comparison against any signature in the header
      for (const sig of signatureValues) {
        try {
          const isMatch = crypto.timingSafeEqual(
            Buffer.from(sig, 'utf8'),
            Buffer.from(expectedSignature, 'utf8')
          );
          
          if (isMatch) {
            return true;
          }
        } catch {
          // Continue checking other signatures
        }
      }
      
      console.error('Webhook signature verification failed');
      return false;
      
    } catch (error) {
      console.error('Error verifying webhook signature:', error);
      return false;
    }
  },
};
