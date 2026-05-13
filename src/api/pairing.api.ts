import { apiClient } from './client';
import type { DevicePairingCompletionDto, DevicePairingCompletionResponseDto } from '@/types/api';

/**
 * Complete device pairing: submit QR token or manual code
 * POST /device-pairing-sessions/complete
 * Returns the final binding: device + tenant + context
 */
export async function completePairing(
  input: DevicePairingCompletionDto
): Promise<DevicePairingCompletionResponseDto> {
  const { data } = await apiClient.post<DevicePairingCompletionResponseDto>(
    '/device-pairing-sessions/complete',
    input
  );
  return data;
}

/**
 * Get pairing session status (check if QR session is valid)
 * GET /device-pairing-sessions/{sessionId}
 */
export async function getPairingSessionStatus(
  sessionId: string
): Promise<{ status: 'ACTIVE' | 'EXPIRED' | 'COMPLETED'; expiresAt: string }> {
  const { data } = await apiClient.get<{
    status: 'ACTIVE' | 'EXPIRED' | 'COMPLETED';
    expiresAt: string;
  }>(`/device-pairing-sessions/${sessionId}`);
  return data;
}
