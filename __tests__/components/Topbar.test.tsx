import { fireEvent, render } from '@testing-library/react-native';

import { Topbar } from '@/components/Topbar';

describe('Topbar', () => {
  it('renders title and triggers back action', () => {
    const onBack = jest.fn();

    const view = render(<Topbar title="Orders" onBack={onBack} />);

    expect(view.getByText('Orders')).toBeTruthy();
    fireEvent.press(view.getByText('<'));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('renders and triggers right action', () => {
    const onRightAction = jest.fn();

    const view = render(
      <Topbar
        title="Checkout"
        rightActionLabel="Save"
        onRightAction={onRightAction}
      />,
    );

    fireEvent.press(view.getByText('Save'));
    expect(onRightAction).toHaveBeenCalledTimes(1);
  });

  it('does not trigger disabled right action', () => {
    const onRightAction = jest.fn();

    const view = render(
      <Topbar
        title="Checkout"
        rightActionLabel="Save"
        onRightAction={onRightAction}
        rightActionDisabled
      />,
    );

    fireEvent.press(view.getByText('Save'));
    expect(onRightAction).not.toHaveBeenCalled();
  });
});
