import { fireEvent, render, waitFor } from '@testing-library/react-native';

import { openCashShift } from '@/api/cashShifts.api';
import { OpenShiftModal } from '@/features/terminal-selection/components/OpenShiftModal';

jest.mock('@/api/cashShifts.api', () => ({
  openCashShift: jest.fn(),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe('OpenShiftModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('reuses the same idempotency key when retrying the same open-shift intent', async () => {
    (openCashShift as jest.Mock)
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({ id: 'shift-1' });

    const onShiftOpened = jest.fn();

    const view = render(
      <OpenShiftModal
        visible
        terminalId="terminal-1"
        terminalName="Main"
        onShiftOpened={onShiftOpened}
        onCancel={jest.fn()}
      />,
    );

    fireEvent.press(view.getByText('shift.open.confirm'));
    await waitFor(() => {
      expect(openCashShift).toHaveBeenCalledTimes(1);
    });

    fireEvent.press(view.getByText('shift.open.confirm'));
    await waitFor(() => {
      expect(openCashShift).toHaveBeenCalledTimes(2);
      expect(onShiftOpened).toHaveBeenCalledWith('shift-1');
    });

    const firstKey = (openCashShift as jest.Mock).mock.calls[0][2];
    const secondKey = (openCashShift as jest.Mock).mock.calls[1][2];

    expect(firstKey).toEqual(expect.any(String));
    expect(secondKey).toBe(firstKey);
  });

  it('generates a new idempotency key for a new intent after input changes', async () => {
    (openCashShift as jest.Mock)
      .mockRejectedValueOnce(new Error('offline'))
      .mockRejectedValueOnce(new Error('offline'));

    const view = render(
      <OpenShiftModal
        visible
        terminalId="terminal-1"
        terminalName="Main"
        onShiftOpened={jest.fn()}
        onCancel={jest.fn()}
      />,
    );

    fireEvent.press(view.getByText('shift.open.confirm'));
    await waitFor(() => {
      expect(openCashShift).toHaveBeenCalledTimes(1);
    });

    fireEvent.changeText(view.getByPlaceholderText('0.00'), '15');

    fireEvent.press(view.getByText('shift.open.confirm'));
    await waitFor(() => {
      expect(openCashShift).toHaveBeenCalledTimes(2);
    });

    const firstKey = (openCashShift as jest.Mock).mock.calls[0][2];
    const secondKey = (openCashShift as jest.Mock).mock.calls[1][2];

    expect(firstKey).toEqual(expect.any(String));
    expect(secondKey).toEqual(expect.any(String));
    expect(secondKey).not.toBe(firstKey);
  });
});
