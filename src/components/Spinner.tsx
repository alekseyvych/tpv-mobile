import { ActivityIndicator } from 'react-native';

import { theme } from '@/components/theme/theme';

export function Spinner() {
  return <ActivityIndicator color={theme.colors.primary} />;
}
