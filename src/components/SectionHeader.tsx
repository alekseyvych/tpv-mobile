import { StyleSheet, View } from 'react-native';

import { BodyText, TitleText } from '@/components/Typography';
import { theme } from '@/components/theme/theme';

type Props = {
  title: string;
  subtitle?: string;
};

export function SectionHeader({ title, subtitle }: Props) {
  return (
    <View style={styles.container}>
      <TitleText style={styles.title}>{title}</TitleText>
      {subtitle ? <BodyText style={styles.subtitle}>{subtitle}</BodyText> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: theme.spacing.s2,
  },
  title: {
    marginBottom: theme.spacing.s1,
  },
  subtitle: {
    marginBottom: 0,
  },
});
