import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../../src/theme/colors';

export default function LibraryScreen() {
  return (
    <View style={styles.screen}>
      <Text style={styles.eyebrow}>COLLECTION</Text>
      <Text style={styles.title}>Library</Text>
      <Text style={styles.body}>Saved movies and series will be grouped by watch status here.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: colors.background,
  },
  eyebrow: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.4,
    marginBottom: 10,
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 8,
  },
  body: {
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
  },
});
