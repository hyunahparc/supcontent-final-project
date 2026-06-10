import { Link, router } from 'expo-router';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
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
import { exchangeOAuthCode } from '../src/api/auth';
import { getApiUrl } from '../src/api/client';
import { colors } from '../src/theme/colors';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const { completeOAuth, signIn } = useAuth();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);

  async function handleSubmit() {
    setError('');

    if (!email.trim() || !password) {
      setError(t('mob_login_required'));
      return;
    }

    setIsSubmitting(true);

    try {
      await signIn({ email: email.trim(), password });
      router.replace('/home');
    } catch (err) {
      setError(err.message || t('mob_login_error'));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleGoogleSignIn() {
    setError('');
    setIsGoogleSubmitting(true);

    try {
      const redirectUri = Linking.createURL('oauth/callback');
      const authUrl = `${getApiUrl('/auth/google')}?client=mobile&redirect_uri=${encodeURIComponent(redirectUri)}`;
      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);

      if (result.type !== 'success' || !result.url) return;

      await completeOAuthFromUrl(result.url);
      router.replace('/home');
    } catch (err) {
      setError(err.message || t('mob_login_error'));
    } finally {
      setIsGoogleSubmitting(false);
    }
  }

  async function completeOAuthFromUrl(url) {
    const parsed = Linking.parse(url);
    const code = parsed.queryParams?.code;

    if (!code || Array.isArray(code)) {
      throw new Error(t('mob_login_error'));
    }

    const data = await exchangeOAuthCode(code);
    await completeOAuth(data.user, data.token);
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
          <Text style={styles.eyebrow}>SUPCONTENT</Text>
          <Text style={styles.title}>{t('mob_login_title')}</Text>
          <Text style={styles.body}>{t('mob_login_subtitle')}</Text>
        </View>

        <View style={styles.form}>
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
            autoComplete="password"
            secureTextEntry
            placeholder={t('login_password')}
            placeholderTextColor={colors.textMuted}
            style={styles.input}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable
            onPress={handleSubmit}
            disabled={isSubmitting || isGoogleSubmitting}
            style={({ pressed }) => [
              styles.button,
              (pressed || isSubmitting) && styles.buttonPressed,
            ]}
          >
            {isSubmitting ? (
              <ActivityIndicator color={colors.accentText} />
            ) : (
              <Text style={styles.buttonText}>{t('login_submit')}</Text>
            )}
          </Pressable>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>{t('login_or')}</Text>
            <View style={styles.dividerLine} />
          </View>

          <Pressable
            onPress={handleGoogleSignIn}
            disabled={isSubmitting || isGoogleSubmitting}
            style={({ pressed }) => [
              styles.googleButton,
              (pressed || isGoogleSubmitting) && styles.buttonPressed,
            ]}
          >
            {isGoogleSubmitting ? (
              <ActivityIndicator color={colors.text} />
            ) : (
              <>
                <Text style={styles.googleMark}>G</Text>
                <Text style={styles.googleButtonText}>{t('login_google')}</Text>
              </>
            )}
          </Pressable>
        </View>

        <Text style={styles.footerText}>
          {t('mob_login_new')}{' '}
          <Link href="/register" style={styles.footerLink}>
            {t('mob_login_create')}
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
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 4,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  googleButton: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: 999,
    backgroundColor: colors.elevated,
    borderWidth: 1,
    borderColor: colors.borderVisible,
  },
  googleMark: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '900',
  },
  googleButtonText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
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
