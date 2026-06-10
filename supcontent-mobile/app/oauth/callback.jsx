import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { exchangeOAuthCode } from '../../src/api/auth';
import { useAuth } from '../../src/context/AuthContext';
import { useLanguage } from '../../src/context/LanguageContext';
import { colors } from '../../src/theme/colors';

export default function OAuthCallbackScreen() {
  const { code } = useLocalSearchParams();
  const { completeOAuth } = useAuth();
  const { t } = useLanguage();
  const [error, setError] = useState('');

  useEffect(() => {
    async function finishOAuth() {
      try {
        if (!code || Array.isArray(code)) {
          throw new Error(t('mob_login_error'));
        }

        const data = await exchangeOAuthCode(code);
        await completeOAuth(data.user, data.token);
        router.replace('/home');
      } catch (err) {
        setError(err.message || t('mob_login_error'));
      }
    }

    finishOAuth();
  }, [code, completeOAuth, t]);

  return (
    <View style={styles.screen}>
      {error ? (
        <Text style={styles.error}>{error}</Text>
      ) : (
        <>
          <ActivityIndicator color={colors.accent} />
          <Text style={styles.text}>{t('login_signing_in')}</Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 24,
    backgroundColor: colors.background,
  },
  text: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  error: {
    color: colors.danger,
    fontSize: 14,
    textAlign: 'center',
  },
});
