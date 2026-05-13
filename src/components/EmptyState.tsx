import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { BodyText, MetaText, TitleText } from '@/components/Typography';
import { theme } from '@/components/theme/theme';

type Props = {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function EmptyState({ title, description, actionLabel, onAction }: Props) {
  return (
    <View style={styles.container}>
      <MetaText style={styles.icon}>o</MetaText>
      <TitleText style={styles.title}>{title}</TitleText>
      <BodyText style={styles.description}>{description}</BodyText>
      {actionLabel && onAction ? (
        <View style={styles.actionWrap}>
          <Button title={actionLabel} onPress={onAction} variant="secondary" fullWidth />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 180,
    padding: theme.spacing.s3,
  },
  icon: {
    fontSize: theme.typography.size2xl,
    marginBottom: theme.spacing.s1,
  },
  title: {
    textAlign: 'center',
  },
  description: {
    marginBottom: 0,
    textAlign: 'center',
  },
  actionWrap: {
    marginTop: theme.spacing.s3,
    width: '100%',
  },
});
