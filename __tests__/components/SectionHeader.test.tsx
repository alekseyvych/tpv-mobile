import { render } from '@testing-library/react-native';

import { SectionHeader } from '@/components/SectionHeader';

describe('SectionHeader', () => {
  it('renders the title', () => {
    const { getByText } = render(<SectionHeader title="My Section" />);
    expect(getByText('My Section')).toBeTruthy();
  });

  it('renders the subtitle when provided', () => {
    const { getByText } = render(<SectionHeader title="Title" subtitle="Helpful hint" />);
    expect(getByText('Title')).toBeTruthy();
    expect(getByText('Helpful hint')).toBeTruthy();
  });

  it('does not render a subtitle element when omitted', () => {
    const { queryByText } = render(<SectionHeader title="Title only" />);
    expect(queryByText('Helpful hint')).toBeNull();
  });
});
