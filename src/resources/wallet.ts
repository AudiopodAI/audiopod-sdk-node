/**
 * Wallet Service - API Wallet & Billing
 */

import type AudioPod from '../client';
import type { WalletBalance, UsageHistory, PricingInfo, CostEstimate } from '../types';

export class Wallet {
  constructor(private client: AudioPod) {}

  /**
   * Get current wallet balance
   * 
   * @example
   * ```typescript
   * const balance = await client.wallet.getBalance();
   * console.log(`Balance: ${balance.balance_usd}`);
   * ```
   */
  async getBalance(): Promise<WalletBalance> {
    return this.client.get('/api/v1/api-wallet/balance');
  }

  /**
   * Get usage history
   */
  async getUsage(params: { page?: number; limit?: number; apiKeyId?: string } = {}): Promise<UsageHistory> {
    return this.client.get('/api/v1/api-wallet/usage', {
      page: params.page ?? 1,
      limit: params.limit ?? 50,
      api_key_id: params.apiKeyId,
    });
  }

  /**
   * Get pricing information for all services
   */
  async getPricing(): Promise<PricingInfo> {
    return this.client.get('/api/v1/api-wallet/pricing');
  }

  /**
   * Estimate cost for an operation
   * 
   * @example
   * ```typescript
   * const estimate = await client.wallet.estimateCost({
   *   serviceType: 'stem_extraction',
   *   durationSeconds: 300,
   * });
   * console.log(`Estimated cost: ${estimate.cost_usd}`);
   * ```
   */
  async estimateCost(params: { serviceType: string; durationSeconds: number }): Promise<CostEstimate> {
    return this.client.post('/api/v1/api-wallet/estimate', {
      service_type: params.serviceType,
      duration_seconds: params.durationSeconds,
    });
  }

  /**
   * Check if balance is sufficient for an operation
   */
  async checkBalance(params: { serviceType: string; durationSeconds: number }): Promise<{ sufficient: boolean; cost: CostEstimate }> {
    return this.client.post('/api/v1/api-wallet/check-balance', {
      service_type: params.serviceType,
      duration_seconds: params.durationSeconds,
    });
  }
}




