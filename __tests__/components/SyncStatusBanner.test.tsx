/**
 * Tests for SyncStatusBanner component.
 *
 * Verifies:
 * - Renders nothing when online, empty queue, not syncing
 * - Shows "Offline" label when not online
 * - Shows queued count label when queue is non-empty and online
 * - Shows syncing label when isSyncing is true
 * - Shows failed count label when failedCount > 0
 */
import { render } from '@testing-library/react-native';
import { I18nextProvider } from 'react-i18next';

import i18n from '@/i18n/config';
import { SyncStatusBanner } from '@/components/SyncStatusBanner';

let mockSyncState: {
  isOnline: boolean;
  isSyncing: boolean;
  queue: unknown[];
  failedCount: number;
};

jest.mock('@/store/sync.store', () => ({
  useSyncStore: (selector: (s: typeof mockSyncState) => unknown) => selector(mockSyncState),
}));

function renderBanner() {
  return render(
    <I18nextProvider i18n={i18n}>
      <SyncStatusBanner />
    </I18nextProvider>,
  );
}

describe('SyncStatusBanner', () => {
  beforeEach(() => {
    mockSyncState = {
      isOnline: true,
      isSyncing: false,
      queue: [],
      failedCount: 0,
    };
  });

  it('renders nothing when online with empty queue', () => {
    const { queryByTestId } = renderBanner();
    expect(queryByTestId('sync-status-banner')).toBeNull();
  });

  it('shows Offline label when not online', () => {
    mockSyncState.isOnline = false;
    const { getByTestId, getByText } = renderBanner();
    expect(getByTestId('sync-status-banner')).toBeTruthy();
    expect(getByText('Offline')).toBeTruthy();
  });

  it('shows queued count when online with queued items', () => {
    mockSyncState.queue = [{}, {}];
    const { getByTestId, getByText } = renderBanner();
    expect(getByTestId('sync-status-banner')).toBeTruthy();
    expect(getByText('Queued: 2')).toBeTruthy();
  });

  it('shows Syncing label when isSyncing is true', () => {
    mockSyncState.isSyncing = true;
    mockSyncState.queue = [{}];
    const { getByText } = renderBanner();
    expect(getByText('Syncing...')).toBeTruthy();
  });

  it('shows failed count label when failedCount > 0', () => {
    mockSyncState.failedCount = 3;
    mockSyncState.queue = [{}, {}, {}];
    const { getByText } = renderBanner();
    expect(getByText('Failed: 3')).toBeTruthy();
  });
});
