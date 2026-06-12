import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { register } from '../api/auth';
import { useLanguage } from '../context/LanguageContext';
import { authStyles as s, inputStyle } from '../styles/authStyles';

export default function RegisterPage() {
    const navigate = useNavigate();
    const { t } = useLanguage();
    const [form, setForm] = useState({ email: '', username: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [focused, setFocused] = useState('');
    const [pwFocused, setPwFocused] = useState(false);

    const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

    const rules = [
        { labelKey: 'register_pw_min',   test: (p) => p.length >= 8 },
        { labelKey: 'register_pw_upper', test: (p) => /[A-Z]/.test(p) },
        { labelKey: 'register_pw_lower', test: (p) => /[a-z]/.test(p) },
        { labelKey: 'register_pw_number',test: (p) => /\d/.test(p) },
    ];

    const passwordValid = rules.every((r) => r.test(form.password));

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!passwordValid) return;
        setError('');
        setLoading(true);
        try {
            await register(form);
            navigate('/login');
        } catch (err) {
            setError(err.response?.data?.message || "Échec de l'inscription.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={s.page}>
            <div style={s.card}>
                <div style={s.brand}>
                    <span style={s.brandName}>moviemovie</span>
                </div>

                <h1 style={s.title}>{t('register_title')}</h1>
                <p style={s.subtitle}>{t('register_subtitle')}</p>

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
                        <label style={s.label}>{t('register_username')}</label>
                        <input
                            type="text"
                            name="username"
                            value={form.username}
                            onChange={handleChange}
                            onFocus={() => setFocused('username')}
                            onBlur={() => setFocused('')}
                            required
                            style={inputStyle(focused, 'username')}
                            placeholder="Votre nom"
                        />
                    </div>

                    <div style={s.field}>
                        <label style={s.label}>{t('login_password')}</label>
                        <input
                            type="password"
                            name="password"
                            value={form.password}
                            onChange={handleChange}
                            onFocus={() => { setFocused('password'); setPwFocused(true); }}
                            onBlur={() => setFocused('')}
                            required
                            style={inputStyle(focused, 'password')}
                            placeholder="••••••••"
                        />
                        {pwFocused && (
                            <div style={ruleStyles.box}>
                                {rules.map((r) => {
                                    const ok = r.test(form.password);
                                    return (
                                        <div key={r.labelKey} style={{ ...ruleStyles.item, color: ok ? 'var(--accent)' : 'var(--text-muted)' }}>
                                            <span>{ok ? '✓' : '○'}</span>
                                            {t(r.labelKey)}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {error && <div style={s.errorBox}>{error}</div>}

                    <button
                        type="submit"
                        disabled={loading || !passwordValid}
                        style={{ ...s.button, opacity: passwordValid ? 1 : 0.45, cursor: passwordValid ? 'pointer' : 'not-allowed' }}
                    >
                        {loading ? t('register_creating') : t('register_submit')}
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
                    {t('register_already')}{' '}
                    <Link to="/login" style={s.link}>{t('register_sign_in')}</Link>
                </p>
            </div>
        </div>
    );
}

const ruleStyles = {
    box: {
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        padding: '10px 12px',
        backgroundColor: 'var(--bg-secondary)',
        border: '1px solid var(--border)',
        borderRadius: '8px',
    },
    item: {
        display: 'flex',
        alignItems: 'center',
        gap: '7px',
        fontSize: '12px',
        transition: 'color 0.2s',
    },
};
