import { SELF_PRINTING_SERVICE_CODE } from '@/constants/pricing';

interface SelfPrintPricingSuccess {
  success: true;
  serviceCode: typeof SELF_PRINTING_SERVICE_CODE;
  credits: number;
}

interface SelfPrintPricingError {
  success: false;
  error: string;
}

type SelfPrintPricingResponse = SelfPrintPricingSuccess | SelfPrintPricingError;

export async function fetchSelfPrintPricing(init?: RequestInit): Promise<SelfPrintPricingSuccess> {
  const response = await fetch('/api/pricing/self-print', {
    method: 'GET',
    ...init,
  });

  const data = (await response.json()) as SelfPrintPricingResponse;

  if (!response.ok || !data.success) {
    const errorMessage = (!data.success && 'error' in data && data.error) || 'Unable to load self-print pricing';
    throw new Error(errorMessage);
  }

  return data;
}
