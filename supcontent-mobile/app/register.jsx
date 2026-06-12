import { Link, router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../src/context/AuthContext';
import { useLanguage } from '../src/context/LanguageContext';
import { colors } from '../src/theme/colors';

export default function RegisterScreen() {
  const { signUp } = useAuth();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    setError('');

    if (!username.trim() || !email.trim() || !password) {
      setError(t('mob_register_required'));
      return;
    }

    setIsSubmitting(true);

    try {
      await signUp({
        username: username.trim(),
        email: email.trim(),
        password,
      });
      router.replace('/login');
    } catch (err) {
      setError(err.message || t('mob_register_error'));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <ScrollView
      contentContainerStyle={[
        styles.screen,
        {
          paddingTop: Math.max(insets.top + 24, 48),
          paddingBottom: Math.max(insets.bottom + 24, 48),
        },
      ]}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>moviemovie</Text>
          <Text style={styles.title}>{t('mob_register_title')}</Text>
          <Text style={styles.body}>{t('mob_register_subtitle')}</Text>
        </View>

        <View style={styles.form}>
          <TextInput
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoComplete="username"
            placeholder={t('register_username')}
            placeholderTextColor={colors.textMuted}
            style={styles.input}
          />

          <TextInput
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            placeholder={t('login_email')}
            placeholderTextColor={colors.textMuted}
            style={styles.input}
          />

          <TextInput
            value={password}
            onChangeText={setPassword}
            autoCapitalize="none"
            autoComplete="password-new"
            secureTextEntry
            placeholder={t('login_password')}
            placeholderTextColor={colors.textMuted}
            style={styles.input}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable
            onPress={handleSubmit}
            disabled={isSubmitting}
            style={({ pressed }) => [
              styles.button,
              (pressed || isSubmitting) && styles.buttonPressed,
            ]}
          >
            {isSubmitting ? (
              <ActivityIndicator color={colors.accentText} />
            ) : (
              <Text style={styles.buttonText}>{t('register_submit')}</Text>
            )}
          </Pressable>
        </View>

        <Text style={styles.footerText}>
          {t('mob_register_already')}{' '}
          <Link href="/login" style={styles.footerLink}>
            {t('mob_register_sign_in')}
          </Link>
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: colors.background,
  },
  content: {
    width: '100%',
  },
  header: {
    marginBottom: 32,
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
    fontSize: 36,
    fontWeight: '800',
    marginBottom: 10,
  },
  body: {
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
  },
  form: {
    gap: 14,
  },
  input: {
    minHeight: 52,
    borderRadius: 999,
    paddingHorizontal: 18,
    backgroundColor: colors.elevated,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    fontSize: 15,
  },
  error: {
    color: colors.danger,
    fontSize: 13,
    lineHeight: 18,
  },
  button: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    backgroundColor: colors.accent,
    marginTop: 4,
  },
  buttonPressed: {
    opacity: 0.78,
  },
  buttonText: {
    color: colors.accentText,
    fontSize: 15,
    fontWeight: '800',
  },
  footerText: {
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 28,
    fontSize: 14,
  },
  footerLink: {
    color: colors.accent,
    fontWeight: '700',
  },
});
