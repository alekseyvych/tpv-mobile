import { fireEvent, render } from '@testing-library/react-native';

import { EmptyState } from '@/components/EmptyState';

describe('EmptyState', () => {
  it('renders the title and description', () => {
    const { getByText } = render(
      <EmptyState title="Nothing here" description="Create something to get started." />,
    );
    expect(getByText('Nothing here')).toBeTruthy();
    expect(getByText('Create something to get started.')).toBeTruthy();
  });

  it('renders the action button when actionLabel and onAction are provided', () => {
    const onAction = jest.fn();
    const { getByText } = render(
      <EmptyState title="Empty" description="No items." actionLabel="Add item" onAction={onAction} />,
    );
    expect(getByText('Add item')).toBeTruthy();
  });

  it('calls onAction when the action button is pressed', () => {
    const onAction = jest.fn();
    const { getByText } = render(
      <EmptyState title="Empty" description="No items." actionLabel="Add item" onAction={onAction} />,
    );
    fireEvent.press(getByText('Add item'));
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it('does not render an action button when actionLabel is omitted', () => {
    const { queryByRole } = render(
      <EmptyState title="Empty" description="No items." />,
    );
    expect(queryByRole('button')).toBeNull();
  });
});
