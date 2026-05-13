import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { StatusPill } from '@/components/StatusPill';
import { BodyText, TitleText } from '@/components/Typography';
import { theme } from '@/components/theme/theme';

type Props = {
  title: string;
  description: string;
  statusLabel: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function ModulePlaceholder({ title, description, statusLabel, actionLabel, onAction }: Props) {
  return (
    <View style={styles.container}>
      <StatusPill label={statusLabel} tone="info" />
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
    minHeight: 220,
    padding: theme.spacing.s3,
  },
  title: {
    marginTop: theme.spacing.s2,
  },
  description: {
    marginBottom: 0,
  },
  actionWrap: {
    marginTop: theme.spacing.s3,
  },
});
