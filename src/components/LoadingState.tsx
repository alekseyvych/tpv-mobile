import { StyleSheet, View } from 'react-native';

import { Spinner } from '@/components/Spinner';
import { BodyText, TitleText } from '@/components/Typography';
import { theme } from '@/components/theme/theme';

type Props = {
  title: string;
  description?: string;
};

export function LoadingState({ title, description }: Props) {
  return (
    <View style={styles.container}>
      <Spinner />
      <TitleText style={styles.title}>{title}</TitleText>
      {description ? <BodyText style={styles.description}>{description}</BodyText> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 160,
    padding: theme.spacing.s3,
  },
  title: {
    marginBottom: theme.spacing.s1,
    marginTop: theme.spacing.s2,
    textAlign: 'center',
  },
  description: {
    marginBottom: 0,
    textAlign: 'center',
  },
});
