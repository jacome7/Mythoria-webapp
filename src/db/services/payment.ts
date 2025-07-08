import { db } from "../index";
import { paymentOrders, paymentEvents, paymentMethods, type PaymentOrder } from "../schema";
import { eq, and, desc } from "drizzle-orm";

export interface CreditPackage {
  id: number;
  credits: number;
  price: number;
  popular?: boolean;
  bestValue?: boolean;
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
  amount: {
    value: number;
    currency: string;
  };
}

export interface WebhookPayload {
  event: string;
  timestamp: string;
  data: {
    id: string;
    state: string;
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
  };
}

// Credit packages from the buy-credits page
export const CREDIT_PACKAGES: CreditPackage[] = [
  { id: 1, credits: 5, price: 5, popular: false, bestValue: false },
  { id: 2, credits: 10, price: 9, popular: false, bestValue: false },
  { id: 3, credits: 30, price: 25, popular: false, bestValue: false },
  { id: 4, credits: 100, price: 79, popular: false, bestValue: false },
];

export const paymentService = {
  // Get credit package by ID
  getCreditPackage(id: number): CreditPackage | undefined {
    return CREDIT_PACKAGES.find(pkg => pkg.id === id);
  },

  // Calculate total for order
  calculateOrderTotal(packages: Array<{ packageId: number; quantity: number }>): {
    totalCredits: number;
    totalAmount: number;
    itemsBreakdown: Array<{ packageId: number; quantity: number; credits: number; unitPrice: number; totalPrice: number }>;
  } {
    let totalCredits = 0;
    let totalAmount = 0;
    const itemsBreakdown = [];

    for (const item of packages) {
      const pkg = this.getCreditPackage(item.packageId);
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
    const orderTotals = this.calculateOrderTotal(orderData.creditPackages);
    
    // Debug logging
    console.log('PaymentService: Order totals calculated:', {
      totalCredits: orderTotals.totalCredits,
      totalAmount: orderTotals.totalAmount, // This should be in euros (e.g., 5.00)
      totalAmountInCents: Math.round(orderTotals.totalAmount * 100), // This should be in cents (e.g., 500)
    });

    // Determine API base URL based on environment
    const apiBaseUrl = process.env.NODE_ENV === 'production' 
      ? 'https://merchant.revolut.com' 
      : 'https://sandbox-merchant.revolut.com';
    
    console.log('PaymentService: Using API base URL:', apiBaseUrl);

    // Create order in Revolut
    const revolutOrderPayload = {
      amount: Math.round(orderTotals.totalAmount * 100), // Convert to cents
      currency: 'EUR',
      description: `Mythoria Credits Purchase - ${orderTotals.totalCredits} credits`,
      merchant_order_ext_ref: `mythoria-${Date.now()}`,
      ...(orderData.idempotencyKey && { idempotency_key: orderData.idempotencyKey }),
    };
    
    console.log('PaymentService: Revolut order payload:', revolutOrderPayload);

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
      throw new Error(`Revolut API error: ${revolutResponse.status} - ${errorText}`);
    }

    const revolutOrder: RevolutOrderResponse = await revolutResponse.json();

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
      const order = await this.getOrderByRevolutId(payload.data.id);
      
      if (!order) {
        return { success: false, message: `Order not found: ${payload.data.id}` };
      }

      // Create event record
      await db.insert(paymentEvents).values({
        orderId: order.orderId,
        eventType: 'webhook_received',
        data: payload,
        createdAt: new Date()
      });

      // Process the event based on type
      switch (payload.event) {
        case 'order.cancelled':
          await this.updateOrderStatus(order.orderId, 'cancelled');
          break;
        case 'order.failed':
          await this.updateOrderStatus(order.orderId, 'failed');
          break;
        case 'payment.failed':
          await this.updateOrderStatus(order.orderId, 'failed');
          break;
        case 'dispute.opened':
          // Handle dispute - could send notification to admin
          console.log(`Dispute opened for order ${order.orderId}`);
          break;
        default:
          console.log(`Unhandled webhook event: ${payload.event}`);
      }

      return { success: true, message: 'Webhook processed successfully' };
    } catch (error) {
      console.error('Webhook processing error:', error);
      return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  // Handle completed order
  async handleOrderCompleted(order: PaymentOrder, payload: WebhookPayload) {
    // Update order status
    await this.updateOrderStatus(order.orderId, 'completed');

    // Add credits to user's balance
    const creditBundle = order.creditBundle as { credits: number; price: number };
    const { creditService } = await import('../services');
    await creditService.addCredits(order.authorId, creditBundle.credits, 'creditPurchase', order.orderId);

    // Save payment method if it's a new card
    if (payload.data.payment_method && payload.data.payment_method.type === 'card') {
      await this.savePaymentMethod(order.authorId, payload.data.payment_method);
    }

    console.log(`Order ${order.orderId} completed - ${creditBundle.credits} credits added to user ${order.authorId}`);
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
  verifyWebhookSignature(payload: string, signature: string): boolean {
    // In production, you would verify the signature using your webhook secret
    // For now, we'll just check that both exist
    return !!(payload && signature);
  },
};
