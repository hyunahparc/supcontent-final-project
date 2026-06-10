import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { login as loginApi } from '../api/auth';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { authStyles as s, inputStyle } from '../styles/authStyles';

export default function LoginPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { login } = useAuth();
    const { t } = useLanguage();
    // Shown when the user was auto-logged-out by the API client (expired/invalid token).
    const sessionExpired = searchParams.get('session') === 'expired';
    const [form, setForm] = useState({ email: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [focused, setFocused] = useState('');

    const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const data = await loginApi(form);
            login(data.user, data.token);
            navigate('/');
        } catch (err) {
            setError(err.response?.data?.message || t('login_submit') + ' failed.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={s.page}>
            <div style={s.card}>
                <div style={s.brand}>
                    <div style={s.logo}>S</div>
                    <span style={s.brandName}>SupContent</span>
                </div>

                <h1 style={s.title}>{t('login_welcome_back')}</h1>
                <p style={s.subtitle}>{t('login_subtitle')}</p>

                {sessionExpired && <div style={s.errorBox}>{t('login_session_expired')}</div>}

                <form onSubmit={handleSubmit} style={s.form}>
                    <div style={s.field}>
                        <label style={s.label}>{t('login_email')}</label>
                        <input
                            type="email"
                            name="email"
                            value={form.email}
                            onChange={handleChange}
                            onFocus={() => setFocused('email')}
                            onBlur={() => setFocused('')}
                            required
                            style={inputStyle(focused, 'email')}
                            placeholder="email@example.com"
                        />
                    </div>

                    <div style={s.field}>
                        <label style={s.label}>{t('login_password')}</label>
                        <input
                            type="password"
                            name="password"
                            value={form.password}
                            onChange={handleChange}
                            onFocus={() => setFocused('password')}
                            onBlur={() => setFocused('')}
                            required
                            style={inputStyle(focused, 'password')}
                            placeholder="••••••••"
                        />
                    </div>

                    {error && <div style={s.errorBox}>{error}</div>}

                    <button type="submit" disabled={loading} style={s.button}>
                        {loading ? t('login_signing_in') : t('login_submit')}
                    </button>
                </form>

                <div style={s.divider}>
                    <div style={s.dividerLine} />
                    <span style={s.dividerText}>{t('login_or')}</span>
                    <div style={s.dividerLine} />
                </div>

                <a href="/api/auth/google" style={s.googleButton}>
                    <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" style={{ width: 18, height: 18 }} />
                    {t('login_google')}
                </a>

                <p style={s.footer}>
                    {t('login_no_account')}{' '}
                    <Link to="/register" style={s.link}>{t('login_sign_up')}</Link>
                </p>
            </div>
        </div>
    );
}
