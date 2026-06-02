import { StyleSheet, Text, View } from 'react-native';

export default function HomeScreen() {
  return (
    <View style={styles.screen}>
      <Text style={styles.eyebrow}>SUPCONTENT MOBILE</Text>
      <Text style={styles.title}>Discover movies and series.</Text>
      <Text style={styles.body}>
        The mobile app shell is ready. Next, we will add navigation, theme tokens, and backend API access.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#121212',
  },
  eyebrow: {
    color: '#1ed760',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.4,
    marginBottom: 12,
  },
  title: {
    color: '#ffffff',
    fontSize: 34,
    fontWeight: '800',
    lineHeight: 40,
    marginBottom: 16,
  },
  body: {
    color: '#b3b3b3',
    fontSize: 15,
    lineHeight: 22,
  },
});
