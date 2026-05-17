import Stripe from 'stripe';
import { and, desc, eq, ne } from 'drizzle-orm';

import { db } from '../index';
import {
  authors,
  paymentEvents,
  paymentMethods,
  paymentOrders,
  type PaymentOrder,
} from '../schema';
import { ga4Service } from '../../lib/analytics/ga4';
import { notificationClient } from '../../lib/notifications/client';
import { creditPackagesService } from './credit-packages';

type StripeClientConfig = NonNullable<ConstructorParameters<typeof Stripe>[1]>;
type PaymentSource = 'stripe';
type StripeLineItem = NonNullable<Stripe.Checkout.SessionCreateParams['line_items']>[number];
type StripeCheckoutLocale = NonNullable<Stripe.Checkout.SessionCreateParams['locale']>;

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

export interface CreateStripeCheckoutRequest extends CreateOrderRequest {
  email: string;
  displayName: string;
  phone?: string | null;
  locale?: string;
  successUrl: string;
  cancelUrl: string;
  clientId?: string;
  sessionId?: string;
}

export interface CalculatedOrderTotals {
  totalCredits: number;
  totalAmount: number;
  itemsBreakdown: Array<{
    packageId: number;
    quantity: number;
    credits: number;
    unitPrice: number;
    totalPrice: number;
  }>;
}

interface StripeCheckoutMetadata {
  stripe?: {
    checkoutSessionId?: string;
    checkoutUrl?: string | null;
    customerId?: string | null;
    paymentIntentId?: string | null;
    invoiceId?: string | null;
    invoiceHostedUrl?: string | null;
    invoicePdf?: string | null;
    paymentMethodType?: string | null;
    paymentStatus?: string | null;
    customerDetails?: unknown;
  };
  orderTotals?: CalculatedOrderTotals;
  creditPackages?: CreateOrderRequest['creditPackages'];
  analytics?: {
    client_id?: string;
    session_id?: string;
  };
  [key: string]: unknown;
}

let stripeClient: Stripe | null = null;

function getStripeClient(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY environment variable is not set');
  }

  if (!stripeClient) {
    const config: StripeClientConfig = {};
    if (process.env.STRIPE_API_VERSION) {
      config.apiVersion = process.env.STRIPE_API_VERSION as StripeClientConfig['apiVersion'];
    }
    stripeClient = new Stripe(secretKey, config);
  }

  return stripeClient;
}

function getStripeId(value: string | { id: string } | null | undefined): string | null {
  if (!value) return null;
  return typeof value === 'string' ? value : value.id;
}

function getStripeCreditTaxCode(): string | undefined {
  const taxCode = process.env.STRIPE_CREDIT_TAX_CODE?.trim();
  return taxCode || undefined;
}

export function mapToStripeCheckoutLocale(locale?: string): StripeCheckoutLocale {
  switch (locale?.toLowerCase()) {
    case 'en':
    case 'en-us':
      return 'en';
    case 'pt':
    case 'pt-pt':
      return 'pt';
    case 'es':
    case 'es-es':
      return 'es';
    case 'fr':
    case 'fr-fr':
      return 'fr';
    case 'de':
    case 'de-de':
      return 'de';
    default:
      return 'auto';
  }
}

function mergeMetadata(
  current: PaymentOrder['metadata'],
  updates: StripeCheckoutMetadata,
): StripeCheckoutMetadata {
  const base =
    current && typeof current === 'object' && !Array.isArray(current)
      ? (current as StripeCheckoutMetadata)
      : {};

  return {
    ...base,
    ...updates,
    stripe: {
      ...(base.stripe || {}),
      ...(updates.stripe || {}),
    },
    analytics: {
      ...(base.analytics || {}),
      ...(updates.analytics || {}),
    },
  };
}

export function buildStripeCheckoutLineItems(
  itemsBreakdown: CalculatedOrderTotals['itemsBreakdown'],
): StripeLineItem[] {
  const taxCode = getStripeCreditTaxCode();

  return itemsBreakdown.map((item) => {
    const productData: {
      name: string;
      metadata: Record<string, string>;
      tax_code?: string;
    } = {
      name: `${item.credits} Mythoria Credits`,
      metadata: {
        mythoriaPackageId: String(item.packageId),
      },
    };

    if (taxCode) {
      productData.tax_code = taxCode;
    }

    return {
      quantity: item.quantity,
      price_data: {
        currency: 'eur',
        unit_amount: Math.round(item.unitPrice * 100),
        tax_behavior: 'inclusive',
        product_data: productData,
      },
    };
  });
}

async function retrieveExpandedCheckoutSession(
  sessionId: string,
): Promise<Stripe.Checkout.Session> {
  return getStripeClient().checkout.sessions.retrieve(sessionId, {
    expand: ['payment_intent.payment_method', 'invoice'],
  });
}

function getExpandedInvoice(session: Stripe.Checkout.Session): Stripe.Invoice | null {
  return session.invoice && typeof session.invoice !== 'string' ? session.invoice : null;
}

function getExpandedPaymentIntent(session: Stripe.Checkout.Session): Stripe.PaymentIntent | null {
  return session.payment_intent && typeof session.payment_intent !== 'string'
    ? session.payment_intent
    : null;
}

function getExpandedPaymentMethod(
  paymentIntent: Stripe.PaymentIntent | null,
): Stripe.PaymentMethod | null {
  if (!paymentIntent?.payment_method || typeof paymentIntent.payment_method === 'string') {
    return null;
  }

  if ('deleted' in paymentIntent.payment_method) {
    return null;
  }

  return paymentIntent.payment_method;
}

export const paymentService = {
  async getCreditPackages(): Promise<CreditPackage[]> {
    const dbPackages = await creditPackagesService.getActiveCreditPackages();

    return dbPackages.map((pkg, index) => ({
      id: index + 1,
      credits: pkg.credits,
      price: parseFloat(pkg.price),
      popular: pkg.popular,
      bestValue: pkg.bestValue,
      key: pkg.key,
      dbId: pkg.id,
    }));
  },

  async getCreditPackage(id: number): Promise<CreditPackage | undefined> {
    const packages = await this.getCreditPackages();
    return packages.find((pkg) => pkg.id === id);
  },

  async calculateOrderTotal(
    packages: Array<{ packageId: number; quantity: number }>,
  ): Promise<CalculatedOrderTotals> {
    let totalCredits = 0;
    let totalAmount = 0;
    const itemsBreakdown: CalculatedOrderTotals['itemsBreakdown'] = [];

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

  async findOrCreateStripeCustomer(
    stripe: Stripe,
    customerData: {
      authorId: string;
      email: string;
      displayName: string;
      phone?: string | null;
    },
  ): Promise<string> {
    const existingCustomers = await stripe.customers.list({
      email: customerData.email,
      limit: 10,
    });

    const exactCustomer = existingCustomers.data.find(
      (customer) => customer.metadata?.mythoriaAuthorId === customerData.authorId,
    );

    if (exactCustomer) {
      return exactCustomer.id;
    }

    const [sameEmailCustomer] = existingCustomers.data;
    if (sameEmailCustomer && !sameEmailCustomer.deleted) {
      await stripe.customers.update(sameEmailCustomer.id, {
        name: customerData.displayName,
        phone: customerData.phone || undefined,
        metadata: {
          ...sameEmailCustomer.metadata,
          mythoriaAuthorId: customerData.authorId,
        },
      });
      return sameEmailCustomer.id;
    }

    const customer = await stripe.customers.create({
      email: customerData.email,
      name: customerData.displayName,
      phone: customerData.phone || undefined,
      metadata: {
        mythoriaAuthorId: customerData.authorId,
      },
    });

    return customer.id;
  },

  async createStripeCheckoutSession(
    checkoutData: CreateStripeCheckoutRequest,
  ): Promise<{ order: PaymentOrder; checkoutSession: Stripe.Checkout.Session }> {
    const stripe = getStripeClient();
    const orderTotals = await this.calculateOrderTotal(checkoutData.creditPackages);
    const amountInCents = Math.round(orderTotals.totalAmount * 100);
    const customerId = await this.findOrCreateStripeCustomer(stripe, {
      authorId: checkoutData.userId,
      email: checkoutData.email,
      displayName: checkoutData.displayName,
      phone: checkoutData.phone,
    });

    const [order] = await db
      .insert(paymentOrders)
      .values({
        authorId: checkoutData.userId,
        amount: amountInCents,
        currency: 'EUR',
        status: 'pending',
        provider: 'stripe',
        creditBundle: {
          credits: orderTotals.totalCredits,
          price: orderTotals.totalAmount,
        },
        metadata: {
          orderTotals,
          creditPackages: checkoutData.creditPackages,
          analytics: {
            client_id: checkoutData.clientId,
            session_id: checkoutData.sessionId,
          },
          stripe: {
            customerId,
          },
        },
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      })
      .returning();

    await db.insert(paymentEvents).values({
      orderId: order.orderId,
      eventType: 'order_created',
      data: {
        provider: 'stripe',
        orderTotals,
        creditPackages: checkoutData.creditPackages,
      },
    });

    try {
      const checkoutSession = await stripe.checkout.sessions.create(
        {
          mode: 'payment',
          customer: customerId,
          client_reference_id: order.orderId,
          billing_address_collection: 'auto',
          customer_update: {
            address: 'auto',
            name: 'auto',
          },
          phone_number_collection: {
            enabled: true,
          },
          tax_id_collection: {
            enabled: true,
          },
          automatic_tax: {
            enabled: true,
          },
          invoice_creation: {
            enabled: true,
            invoice_data: {
              description: `Mythoria Credits Purchase - ${orderTotals.totalCredits} credits`,
              metadata: {
                mythoriaOrderId: order.orderId,
                mythoriaAuthorId: checkoutData.userId,
              },
            },
          },
          line_items: buildStripeCheckoutLineItems(orderTotals.itemsBreakdown),
          locale: mapToStripeCheckoutLocale(checkoutData.locale),
          success_url: checkoutData.successUrl,
          cancel_url: checkoutData.cancelUrl,
          metadata: {
            mythoriaOrderId: order.orderId,
            mythoriaAuthorId: checkoutData.userId,
            credits: String(orderTotals.totalCredits),
          },
          payment_intent_data: {
            metadata: {
              mythoriaOrderId: order.orderId,
              mythoriaAuthorId: checkoutData.userId,
              credits: String(orderTotals.totalCredits),
            },
          },
        },
        {
          idempotencyKey: checkoutData.idempotencyKey || `mythoria-checkout-${order.orderId}`,
        },
      );

      const metadata = mergeMetadata(order.metadata, {
        stripe: {
          checkoutSessionId: checkoutSession.id,
          checkoutUrl: checkoutSession.url,
          customerId,
          paymentStatus: checkoutSession.payment_status,
        },
      });

      const [updatedOrder] = await db
        .update(paymentOrders)
        .set({
          providerOrderId: checkoutSession.id,
          providerPublicId: checkoutSession.id,
          metadata,
          updatedAt: new Date(),
          expiresAt: checkoutSession.expires_at
            ? new Date(checkoutSession.expires_at * 1000)
            : order.expiresAt,
        })
        .where(eq(paymentOrders.orderId, order.orderId))
        .returning();

      await db.insert(paymentEvents).values({
        orderId: order.orderId,
        eventType: 'payment_initiated',
        data: {
          provider: 'stripe',
          checkoutSessionId: checkoutSession.id,
          paymentStatus: checkoutSession.payment_status,
        },
      });

      return { order: updatedOrder, checkoutSession };
    } catch (error) {
      await this.updateOrderStatus(order.orderId, 'failed');
      await db.insert(paymentEvents).values({
        orderId: order.orderId,
        eventType: 'payment_failed',
        data: {
          provider: 'stripe',
          error: error instanceof Error ? error.message : 'Unknown Stripe checkout error',
        },
      });
      throw error;
    }
  },

  async getOrderByStripeSessionId(sessionId: string) {
    const [order] = await db
      .select()
      .from(paymentOrders)
      .where(
        and(eq(paymentOrders.provider, 'stripe'), eq(paymentOrders.providerOrderId, sessionId)),
      );

    return order;
  },

  async getOrderByStripePaymentIntentId(paymentIntentId: string) {
    const [order] = await db
      .select()
      .from(paymentOrders)
      .where(
        and(
          eq(paymentOrders.provider, 'stripe'),
          eq(paymentOrders.providerPublicId, paymentIntentId),
        ),
      );

    return order;
  },

  async getOrderForAuthorByStripeSessionId(authorId: string, sessionId: string) {
    const [order] = await db
      .select()
      .from(paymentOrders)
      .where(
        and(
          eq(paymentOrders.provider, 'stripe'),
          eq(paymentOrders.authorId, authorId),
          eq(paymentOrders.providerOrderId, sessionId),
        ),
      );

    return order;
  },

  async updateOrderStatus(orderId: string, status: PaymentOrder['status']) {
    const [updatedOrder] = await db
      .update(paymentOrders)
      .set({
        status,
        updatedAt: new Date(),
      })
      .where(eq(paymentOrders.orderId, orderId))
      .returning();

    return updatedOrder;
  },

  async constructStripeWebhookEvent(
    payload: string | Buffer,
    signature: string,
  ): Promise<Stripe.Event> {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET environment variable is not set');
    }

    return getStripeClient().webhooks.constructEventAsync(payload, signature, webhookSecret);
  },

  async processStripeWebhook(event: Stripe.Event): Promise<{ success: boolean; message: string }> {
    try {
      switch (event.type) {
        case 'checkout.session.completed':
          await this.handleStripeCheckoutCompleted(
            event.data.object as Stripe.Checkout.Session,
            event.id,
          );
          return { success: true, message: 'Stripe checkout session completed' };

        case 'checkout.session.async_payment_succeeded':
          await this.handleStripeCheckoutCompleted(
            event.data.object as Stripe.Checkout.Session,
            event.id,
          );
          return { success: true, message: 'Stripe async checkout payment completed' };

        case 'checkout.session.async_payment_failed':
          await this.handleStripeCheckoutFailed(
            event.data.object as Stripe.Checkout.Session,
            'checkout.session.async_payment_failed',
            event.id,
          );
          return { success: true, message: 'Stripe async checkout payment failed' };

        case 'checkout.session.expired':
          await this.handleStripeCheckoutExpired(
            event.data.object as Stripe.Checkout.Session,
            event.id,
          );
          return { success: true, message: 'Stripe checkout session expired' };

        case 'payment_intent.succeeded':
          await this.handleStripePaymentIntentSucceeded(
            event.data.object as Stripe.PaymentIntent,
            event.id,
          );
          return { success: true, message: 'Stripe payment intent succeeded' };

        case 'payment_intent.payment_failed':
          await this.handleStripePaymentIntentFailed(
            event.data.object as Stripe.PaymentIntent,
            event.id,
          );
          return { success: true, message: 'Stripe payment intent failed' };

        case 'charge.refunded':
          await this.recordStripeChargeEvent(
            event.data.object as Stripe.Charge,
            'refund_completed',
            event.id,
          );
          return { success: true, message: 'Stripe charge refund recorded' };

        case 'charge.dispute.created':
          await this.recordStripeDisputeEvent(event.data.object as Stripe.Dispute, event.id);
          return { success: true, message: 'Stripe charge dispute recorded' };

        default:
          console.log(`Unhandled Stripe webhook event: ${event.type}`);
          return { success: true, message: `Unhandled event: ${event.type}` };
      }
    } catch (error) {
      console.error('Stripe webhook processing error:', error);
      return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  async handleStripeCheckoutCompleted(
    sessionEvent: Stripe.Checkout.Session,
    stripeEventId?: string,
  ) {
    const session = await retrieveExpandedCheckoutSession(sessionEvent.id);
    const order = await this.getOrderByStripeSessionId(session.id);
    if (!order) {
      throw new Error(`Stripe order not found: ${session.id}`);
    }

    await db.insert(paymentEvents).values({
      orderId: order.orderId,
      eventType: 'webhook_received',
      data: {
        provider: 'stripe',
        stripeEventId,
        type: 'checkout.session.completed',
        session,
      },
      createdAt: new Date(),
    });

    if (session.amount_total !== order.amount) {
      throw new Error(
        `Stripe amount mismatch for order ${order.orderId}: expected ${order.amount}, got ${session.amount_total}`,
      );
    }

    const paymentIntentId = getStripeId(session.payment_intent);
    const invoiceId = getStripeId(session.invoice);

    if (session.payment_status !== 'paid') {
      const metadata = mergeMetadata(order.metadata, {
        stripe: {
          checkoutSessionId: session.id,
          customerId: getStripeId(session.customer),
          paymentIntentId,
          invoiceId,
          paymentStatus: session.payment_status,
          customerDetails: session.customer_details,
        },
      });

      await db
        .update(paymentOrders)
        .set({
          status: 'processing',
          providerPublicId: paymentIntentId || order.providerPublicId,
          metadata,
          updatedAt: new Date(),
        })
        .where(eq(paymentOrders.orderId, order.orderId));

      return;
    }

    const expandedInvoice = getExpandedInvoice(session);
    let invoiceHostedUrl = expandedInvoice?.hosted_invoice_url || null;
    let invoicePdf = expandedInvoice?.invoice_pdf || null;

    if (invoiceId && !expandedInvoice) {
      try {
        const invoice = await getStripeClient().invoices.retrieve(invoiceId);
        invoiceHostedUrl = invoice.hosted_invoice_url || null;
        invoicePdf = invoice.invoice_pdf || null;
      } catch (error) {
        console.error('Failed to retrieve Stripe invoice:', error);
      }
    }

    const paymentIntent = getExpandedPaymentIntent(session);
    const paymentMethod = getExpandedPaymentMethod(paymentIntent);
    const paymentMethodType =
      paymentMethod?.type || paymentIntent?.payment_method_types?.[0] || null;
    const paymentMethodData =
      paymentMethod?.type === 'card' && paymentMethod.card
        ? {
            type: 'card',
            providerRef: paymentMethod.id,
            brand: paymentMethod.card.brand,
            last4: paymentMethod.card.last4,
            exp_month: String(paymentMethod.card.exp_month),
            exp_year: String(paymentMethod.card.exp_year),
            billing_details: paymentMethod.billing_details,
          }
        : undefined;

    const metadata = mergeMetadata(order.metadata, {
      stripe: {
        checkoutSessionId: session.id,
        customerId: getStripeId(session.customer),
        paymentIntentId,
        invoiceId,
        invoiceHostedUrl,
        invoicePdf,
        paymentMethodType,
        paymentStatus: session.payment_status,
        customerDetails: session.customer_details,
      },
    });

    const [updatedOrder] = await db
      .update(paymentOrders)
      .set({
        providerPublicId: paymentIntentId || order.providerPublicId,
        metadata,
        updatedAt: new Date(),
      })
      .where(eq(paymentOrders.orderId, order.orderId))
      .returning();

    await this.completeOrder(updatedOrder || order, {
      source: 'stripe',
      paymentMethodData,
    });
  },

  async handleStripeCheckoutFailed(
    session: Stripe.Checkout.Session,
    eventType: string,
    stripeEventId?: string,
  ) {
    const order = await this.getOrderByStripeSessionId(session.id);
    if (!order || order.status === 'completed') return;

    const metadata = mergeMetadata(order.metadata, {
      stripe: {
        checkoutSessionId: session.id,
        customerId: getStripeId(session.customer),
        paymentIntentId: getStripeId(session.payment_intent),
        invoiceId: getStripeId(session.invoice),
        paymentStatus: session.payment_status,
        customerDetails: session.customer_details,
      },
    });

    await db
      .update(paymentOrders)
      .set({
        status: 'failed',
        metadata,
        updatedAt: new Date(),
      })
      .where(eq(paymentOrders.orderId, order.orderId));

    await db.insert(paymentEvents).values({
      orderId: order.orderId,
      eventType: 'payment_failed',
      data: {
        provider: 'stripe',
        stripeEventId,
        type: eventType,
        session,
      },
    });
  },

  async handleStripeCheckoutExpired(session: Stripe.Checkout.Session, stripeEventId?: string) {
    const order = await this.getOrderByStripeSessionId(session.id);
    if (!order || order.status === 'completed') return;

    const metadata = mergeMetadata(order.metadata, {
      stripe: {
        checkoutSessionId: session.id,
        paymentStatus: session.payment_status,
      },
    });

    await db
      .update(paymentOrders)
      .set({
        status: 'expired',
        metadata,
        updatedAt: new Date(),
      })
      .where(eq(paymentOrders.orderId, order.orderId));

    await db.insert(paymentEvents).values({
      orderId: order.orderId,
      eventType: 'payment_cancelled',
      data: {
        provider: 'stripe',
        stripeEventId,
        type: 'checkout.session.expired',
        session,
      },
    });
  },

  async handleStripePaymentIntentSucceeded(
    paymentIntent: Stripe.PaymentIntent,
    stripeEventId?: string,
  ) {
    const orderId = paymentIntent.metadata?.mythoriaOrderId;
    let order: PaymentOrder | undefined;

    if (orderId) {
      [order] = await db.select().from(paymentOrders).where(eq(paymentOrders.orderId, orderId));
    } else {
      order = await this.getOrderByStripePaymentIntentId(paymentIntent.id);
    }

    if (!order || order.status === 'completed') return;

    if (order.providerOrderId) {
      const session = await retrieveExpandedCheckoutSession(order.providerOrderId);
      await this.handleStripeCheckoutCompleted(session, stripeEventId);
      return;
    }

    const metadata = mergeMetadata(order.metadata, {
      stripe: {
        paymentIntentId: paymentIntent.id,
        paymentStatus: paymentIntent.status,
        paymentMethodType: paymentIntent.payment_method_types?.[0] || null,
      },
    });

    const [updatedOrder] = await db
      .update(paymentOrders)
      .set({
        providerPublicId: paymentIntent.id,
        metadata,
        updatedAt: new Date(),
      })
      .where(eq(paymentOrders.orderId, order.orderId))
      .returning();

    await this.completeOrder(updatedOrder || order, {
      source: 'stripe',
    });
  },

  async handleStripePaymentIntentFailed(
    paymentIntent: Stripe.PaymentIntent,
    stripeEventId?: string,
  ) {
    const orderId = paymentIntent.metadata?.mythoriaOrderId;
    let order: PaymentOrder | undefined;

    if (orderId) {
      [order] = await db.select().from(paymentOrders).where(eq(paymentOrders.orderId, orderId));
    } else {
      order = await this.getOrderByStripePaymentIntentId(paymentIntent.id);
    }

    if (!order || order.status === 'completed') return;

    const metadata = mergeMetadata(order.metadata, {
      stripe: {
        paymentIntentId: paymentIntent.id,
        paymentStatus: paymentIntent.status,
        paymentMethodType: paymentIntent.payment_method_types?.[0] || null,
      },
    });

    await db
      .update(paymentOrders)
      .set({
        status: 'failed',
        providerPublicId: paymentIntent.id,
        metadata,
        updatedAt: new Date(),
      })
      .where(eq(paymentOrders.orderId, order.orderId));

    await db.insert(paymentEvents).values({
      orderId: order.orderId,
      eventType: 'payment_failed',
      data: {
        provider: 'stripe',
        stripeEventId,
        type: 'payment_intent.payment_failed',
        paymentIntent,
      },
    });
  },

  async recordStripeChargeEvent(
    charge: Stripe.Charge,
    eventType: 'refund_completed' | 'refund_initiated',
    stripeEventId?: string,
  ) {
    const paymentIntentId = getStripeId(charge.payment_intent);
    if (!paymentIntentId) return;

    const order = await this.getOrderByStripePaymentIntentId(paymentIntentId);
    if (!order) return;

    await db.insert(paymentEvents).values({
      orderId: order.orderId,
      eventType,
      data: {
        provider: 'stripe',
        stripeEventId,
        charge,
      },
    });
  },

  async recordStripeDisputeEvent(dispute: Stripe.Dispute, stripeEventId?: string) {
    const paymentIntentId = getStripeId(dispute.payment_intent);
    if (!paymentIntentId) return;

    const order = await this.getOrderByStripePaymentIntentId(paymentIntentId);
    if (!order) return;

    await db.insert(paymentEvents).values({
      orderId: order.orderId,
      eventType: 'refund_initiated',
      data: {
        provider: 'stripe',
        stripeEventId,
        dispute,
      },
    });
  },

  async completeOrder(
    order: PaymentOrder,
    options: {
      source: PaymentSource;
      paymentMethodData?: Record<string, unknown>;
    },
  ) {
    if (order.status === 'completed') {
      console.log(`Order ${order.orderId} already completed, skipping duplicate processing`);
      return;
    }

    let completedOrder: PaymentOrder | undefined;

    await db.transaction(async (tx) => {
      const [updatedOrder] = await tx
        .update(paymentOrders)
        .set({
          status: 'completed',
          updatedAt: new Date(),
        })
        .where(and(eq(paymentOrders.orderId, order.orderId), ne(paymentOrders.status, 'completed')))
        .returning();

      if (!updatedOrder) {
        return;
      }

      completedOrder = updatedOrder;

      const creditBundle = updatedOrder.creditBundle as { credits: number; price: number };
      const { creditService } = await import('../services');

      await creditService.addCredits(
        updatedOrder.authorId,
        creditBundle.credits,
        'creditPurchase',
        updatedOrder.orderId,
      );

      await tx.insert(paymentEvents).values([
        {
          orderId: updatedOrder.orderId,
          eventType: 'payment_completed',
          data: {
            provider: options.source,
          },
        },
        {
          orderId: updatedOrder.orderId,
          eventType: 'credits_added',
          data: {
            credits: creditBundle.credits,
            provider: options.source,
          },
        },
      ]);

      console.log(
        `Order ${updatedOrder.orderId} completed - ${creditBundle.credits} credits added to user ${updatedOrder.authorId}`,
      );
    });

    if (!completedOrder) {
      console.log(`Order ${order.orderId} was completed by another webhook worker`);
      return;
    }

    try {
      const creditBundle = completedOrder.creditBundle as { credits: number; price: number };
      const metadata = completedOrder.metadata as StripeCheckoutMetadata | null;
      await ga4Service.sendPurchaseEvent({
        client_id: metadata?.analytics?.client_id,
        session_id: metadata?.analytics?.session_id,
        user_id: completedOrder.authorId,
        transaction_id: completedOrder.orderId,
        value: creditBundle.price,
        currency: completedOrder.currency || 'EUR',
        items: [
          {
            item_id: `credits-${creditBundle.credits}`,
            item_name: `${creditBundle.credits} Credits Bundle`,
            price: creditBundle.price,
            quantity: 1,
          },
        ],
      });
    } catch (error) {
      console.error('Failed to send GA4 purchase event:', error);
    }

    try {
      const [author] = await db
        .select()
        .from(authors)
        .where(eq(authors.authorId, completedOrder.authorId));

      if (author) {
        const creditBundle = completedOrder.creditBundle as { credits: number; price: number };
        await notificationClient.sendCreditsAddedNotification({
          email: author.email,
          name: author.displayName,
          credits: creditBundle.credits,
          preferredLocale: author.preferredLocale,
          authorId: author.authorId,
          source: options.source,
          entityId: completedOrder.orderId,
        });
      }
    } catch (error) {
      console.error('Failed to send credits added notification:', error);
    }

    if (options.paymentMethodData?.type === 'card') {
      try {
        await this.savePaymentMethod(completedOrder.authorId, options.paymentMethodData);
      } catch (error) {
        console.error('Error saving payment method:', error);
      }
    }
  },

  async savePaymentMethod(
    userId: string,
    paymentMethodData: Record<string, unknown>,
    provider: PaymentSource = 'stripe',
  ) {
    const last4 = (paymentMethodData.last4 as string) || '';
    const providerRef =
      (paymentMethodData.providerRef as string | undefined) || `${provider}-${last4}`;

    const existingMethods = await db
      .select()
      .from(paymentMethods)
      .where(
        and(
          eq(paymentMethods.authorId, userId),
          eq(paymentMethods.provider, provider),
          eq(paymentMethods.providerRef, providerRef),
        ),
      );

    if (existingMethods.length > 0) {
      return;
    }

    await db.insert(paymentMethods).values({
      authorId: userId,
      provider,
      providerRef,
      brand: (paymentMethodData.brand as string) || null,
      last4: last4 || null,
      expMonth: paymentMethodData.exp_month
        ? parseInt(paymentMethodData.exp_month as string)
        : null,
      expYear: paymentMethodData.exp_year ? parseInt(paymentMethodData.exp_year as string) : null,
      billingDetails:
        (paymentMethodData.billing_details as Record<string, unknown> | undefined) || null,
      isDefault: false,
    });
  },

  async getUserPaymentHistory(userId: string, limit: number = 20) {
    const orders = await db
      .select({
        id: paymentOrders.orderId,
        providerOrderId: paymentOrders.providerOrderId,
        providerPublicId: paymentOrders.providerPublicId,
        creditBundle: paymentOrders.creditBundle,
        amount: paymentOrders.amount,
        currency: paymentOrders.currency,
        status: paymentOrders.status,
        provider: paymentOrders.provider,
        metadata: paymentOrders.metadata,
        createdAt: paymentOrders.createdAt,
        updatedAt: paymentOrders.updatedAt,
      })
      .from(paymentOrders)
      .where(eq(paymentOrders.authorId, userId))
      .orderBy(desc(paymentOrders.createdAt))
      .limit(limit);

    return orders.map((order) => {
      const metadata = order.metadata as StripeCheckoutMetadata | null;
      const stripe = metadata?.stripe;

      return {
        ...order,
        revolutOrderId: order.provider === 'revolut' ? order.providerOrderId : null,
        stripeInvoiceId: stripe?.invoiceId || null,
        stripeInvoiceHostedUrl: stripe?.invoiceHostedUrl || null,
        stripeInvoicePdf: stripe?.invoicePdf || null,
        paymentMethodType: stripe?.paymentMethodType || null,
      };
    });
  },
};
