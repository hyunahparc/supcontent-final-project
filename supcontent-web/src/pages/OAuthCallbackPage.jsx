import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { exchangeOAuthCode } from '../api/auth';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

export default function OAuthCallbackPage() {
    const navigate = useNavigate();
    const { login } = useAuth();
    const { t } = useLanguage();

    useEffect(() => {
        let isMounted = true;

        async function finishOAuth() {
            const params = new URLSearchParams(window.location.search);
            const code = params.get('code');

            if (!code) {
                navigate('/', { replace: true });
                return;
            }

            try {
                const data = await exchangeOAuthCode(code);
                if (isMounted) {
                    login(data.user, data.token, data.refreshToken);
                    navigate(data.user.is_admin ? '/admin/moderation' : '/', { replace: true });
                }
            } catch {
                // Invalid or expired code, redirect anyway.
                if (isMounted) {
                    navigate('/', { replace: true });
                }
            }
        }

        finishOAuth();

        return () => {
            isMounted = false;
        };
    }, [navigate, login]);

    return <p style={{ textAlign: 'center', marginTop: '40px' }}>{t('oauth_loading')}</p>;
}
