import { render } from '@testing-library/react-native';

import { StatusPill } from '@/components/StatusPill';

describe('StatusPill', () => {
  it('renders the label text', () => {
    const { getByText } = render(<StatusPill label="Online" />);
    expect(getByText('Online')).toBeTruthy();
  });

  it('renders with each tone without crashing', () => {
    const tones = ['neutral', 'info', 'success', 'warning', 'error'] as const;
    for (const tone of tones) {
      const { getByText } = render(<StatusPill label={tone} tone={tone} />);
      expect(getByText(tone)).toBeTruthy();
    }
  });

  it('defaults to neutral tone when tone prop is omitted', () => {
    const { getByText } = render(<StatusPill label="Default" />);
    expect(getByText('Default')).toBeTruthy();
  });
});
