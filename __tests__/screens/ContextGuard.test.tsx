import { act, render } from '@testing-library/react-native';
import { Text } from 'react-native';

import { ContextGuard } from '@/components/guards/ContextGuard';
import { useContextStore } from '@/store/context.store';

describe('ContextGuard', () => {
  afterEach(() => {
    act(() => {
      useContextStore.setState({ localContext: null, setupRequired: true, isCheckingContext: true });
    });
  });

  it('renders fallback when setup is required', () => {
    act(() => {
      useContextStore.setState({ localContext: null, setupRequired: true, isCheckingContext: false });
    });

    const view = render(
      <ContextGuard fallback={<Text>Need setup</Text>}>
        <Text>Protected</Text>
      </ContextGuard>
    );

    expect(view.getByText('Need setup')).toBeTruthy();
  });

  it('renders protected content when setup is completed', () => {
    act(() => {
      useContextStore.setState({
        localContext: { tenantId: 'tenant-1', installationId: 'dev-1' },
        setupRequired: false,
        isCheckingContext: false,
      });
    });

    const view = render(
      <ContextGuard fallback={<Text>Need setup</Text>}>
        <Text>Protected</Text>
      </ContextGuard>
    );

    expect(view.getByText('Protected')).toBeTruthy();
  });
});
