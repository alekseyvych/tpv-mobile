import { useContextStore } from '@/store/context.store';

describe('context store', () => {
  afterEach(() => {
    useContextStore.setState({ localContext: null, setupRequired: true, isCheckingContext: true });
  });

  it('marks setup required when context is missing', () => {
    useContextStore.getState().setLocalContext(null);

    expect(useContextStore.getState().setupRequired).toBe(true);
  });

  it('marks setup completed when context exists', () => {
    useContextStore.getState().setLocalContext({ tenantId: 'tenant-1', installationId: 'dev-1' });

    const state = useContextStore.getState();
    expect(state.setupRequired).toBe(false);
    expect(state.localContext?.installationId).toBe('dev-1');
  });
});
