import { fireEvent, render } from '@testing-library/react-native';

import { ErrorState } from '@/components/ErrorState';

describe('ErrorState', () => {
  it('renders the title and description', () => {
    const { getByText } = render(
      <ErrorState title="Something went wrong" description="Please try again." />,
    );
    expect(getByText('Something went wrong')).toBeTruthy();
    expect(getByText('Please try again.')).toBeTruthy();
  });

  it('renders the retry action button when actionLabel and onAction are provided', () => {
    const onAction = jest.fn();
    const { getByText } = render(
      <ErrorState
        title="Error"
        description="Failed."
        actionLabel="Retry"
        onAction={onAction}
      />,
    );
    expect(getByText('Retry')).toBeTruthy();
  });

  it('calls onAction when the retry button is pressed', () => {
    const onAction = jest.fn();
    const { getByText } = render(
      <ErrorState
        title="Error"
        description="Failed."
        actionLabel="Retry"
        onAction={onAction}
      />,
    );
    fireEvent.press(getByText('Retry'));
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it('does not render an action button when actionLabel is omitted', () => {
    const { queryByRole } = render(
      <ErrorState title="Error" description="Failed." />,
    );
    expect(queryByRole('button')).toBeNull();
  });
});
