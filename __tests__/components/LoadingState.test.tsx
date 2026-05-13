import { render } from '@testing-library/react-native';
import { I18nextProvider } from 'react-i18next';

import { LoadingState } from '@/components/LoadingState';
import i18n from '@/i18n/config';

// Spinner mock — its internals aren't relevant to this test
jest.mock('@/components/Spinner', () => ({
  Spinner: () => null,
}));

describe('LoadingState', () => {
  function wrap(ui: React.ReactElement) {
    return render(<I18nextProvider i18n={i18n}>{ui}</I18nextProvider>);
  }

  it('renders the title', () => {
    const { getByText } = wrap(<LoadingState title="Loading items" />);
    expect(getByText('Loading items')).toBeTruthy();
  });

  it('renders the description when provided', () => {
    const { getByText } = wrap(<LoadingState title="Loading" description="Please wait…" />);
    expect(getByText('Please wait…')).toBeTruthy();
  });

  it('does not render a description when omitted', () => {
    const { queryByText } = wrap(<LoadingState title="Loading" />);
    expect(queryByText('Please wait…')).toBeNull();
  });
});
