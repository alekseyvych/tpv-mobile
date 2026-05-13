import { ConnectBusinessScreen } from '@/screens/context/ConnectBusinessScreen';

type Props = {
  onGoLogin: () => void;
  onConnected: () => void;
  onStartPairing: () => void;
};

export function SetupScreen({ onGoLogin, onConnected, onStartPairing }: Props) {
  return <ConnectBusinessScreen onCancel={onGoLogin} onConnected={onConnected} onStartPairing={onStartPairing} />;
}
