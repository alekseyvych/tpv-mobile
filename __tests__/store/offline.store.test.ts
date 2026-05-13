import { useOfflineStore } from '@/store/offline.store';

describe('offline store', () => {
  afterEach(async () => {
    await useOfflineStore.getState().clearQueue();
  });

  it('enqueues and dequeues mutations', async () => {
    await useOfflineStore.getState().enqueueMutation({
      endpoint: '/sales',
      method: 'POST',
      payload: { id: 1 },
    });

    const queued = useOfflineStore.getState().queue;
    expect(queued.length).toBe(1);

    await useOfflineStore.getState().dequeueMutation(queued[0].id);

    expect(useOfflineStore.getState().queue.length).toBe(0);
  });
});
