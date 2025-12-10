/**
 * API Wallet Service - Manage API billing and balance
 */

import { AudioPodClient } from '../client';
import {
  WalletBalance,
  PricingTable,
  CostEstimate,
  CheckoutSession,
  UsageLog,
  TopupRecord,
} from '../types';

export class WalletService {
  constructor(private client: AudioPodClient) {}

  /**
   * Get current API wallet balance
   */
  async getBalance(): Promise<WalletBalance> {
    return this.client.request('GET', '/api/v1/api-wallet/balance');
  }

  /**
   * Get pricing table for all services
   */
  async getPricing(): Promise<PricingTable> {
    return this.client.request('GET', '/api/v1/api-wallet/pricing');
  }

  /**
   * Estimate cost for a service operation
   */
  async estimateCost(serviceType: string, durationSeconds: number): Promise<CostEstimate> {
    return this.client.request('POST', '/api/v1/api-wallet/estimate', {
      data: {
        service_type: serviceType,
        duration_seconds: durationSeconds,
      },
    });
  }

  /**
   * Check if balance is sufficient for an operation
   * @throws InsufficientBalanceError if balance is insufficient
   */
  async checkBalance(
    serviceType: string,
    durationSeconds: number
  ): Promise<{ can_proceed: boolean; cost_cents: number; current_balance_cents: number }> {
    return this.client.request('POST', '/api/v1/api-wallet/check-balance', {
      data: {
        service_type: serviceType,
        duration_seconds: durationSeconds,
      },
    });
  }

  /**
   * Create a Stripe checkout session to top up wallet
   * @param amountCents Amount in cents (min 100 = $1.00, max 1000000 = $10,000)
   */
  async createTopupCheckout(amountCents: number): Promise<CheckoutSession> {
    return this.client.request('POST', '/api/v1/api-wallet/topup/checkout', {
      data: { amount_cents: amountCents },
    });
  }

  /**
   * Create a Stripe PaymentIntent for custom payment flows
   */
  async createTopupPaymentIntent(
    amountCents: number
  ): Promise<{ client_secret: string; payment_intent_id: string; amount_cents: number }> {
    return this.client.request('POST', '/api/v1/api-wallet/topup/payment-intent', {
      data: { amount_cents: amountCents },
    });
  }

  /**
   * Get API usage history
   */
  async getUsageHistory(
    page: number = 1,
    limit: number = 50
  ): Promise<{ page: number; limit: number; logs: UsageLog[] }> {
    return this.client.request('GET', '/api/v1/api-wallet/usage', {
      params: { page, limit },
    });
  }

  /**
   * Get wallet top-up history
   */
  async getTopupHistory(
    page: number = 1,
    limit: number = 20
  ): Promise<{ page: number; limit: number; topups: TopupRecord[] }> {
    return this.client.request('GET', '/api/v1/api-wallet/topups', {
      params: { page, limit },
    });
  }

  /**
   * Get list of available service types
   */
  async getServiceTypes(): Promise<string[]> {
    return this.client.request('GET', '/api/v1/api-wallet/service-types');
  }
}

