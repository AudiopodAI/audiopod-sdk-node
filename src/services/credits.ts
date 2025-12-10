/**
 * Credits Service - Subscription credits management
 */

import { AudioPodClient } from '../client';
import { CreditInfo } from '../types';

export class CreditService {
  constructor(private client: AudioPodClient) {}

  /**
   * Get subscription credit balance
   */
  async getBalance(): Promise<CreditInfo> {
    return this.client.request('GET', '/api/v1/credits');
  }

  /**
   * Get credit usage history
   */
  async getUsageHistory(): Promise<any[]> {
    return this.client.request('GET', '/api/v1/credits/usage');
  }

  /**
   * Get credit multipliers for services
   */
  async getMultipliers(): Promise<Record<string, number>> {
    return this.client.request('GET', '/api/v1/credits/multipliers');
  }
}

