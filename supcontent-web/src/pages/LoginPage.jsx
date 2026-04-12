import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { login as loginApi } from '../api/auth';
import { useAuth } from '../context/AuthContext';
import { authStyles as s, inputStyle } from '../styles/authStyles';

export default function LoginPage() {
    const navigate = useNavigate();
    const { login } = useAuth();
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
            setError(err.response?.data?.message || 'Échec de la connexion.');
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

                <h1 style={s.title}>Welcome back</h1>
                <p style={s.subtitle}>Sign in to your account</p>

                <form onSubmit={handleSubmit} style={s.form}>
                    <div style={s.field}>
                        <label style={s.label}>Email</label>
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
                        <label style={s.label}>Password</label>
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
                        {loading ? 'Signing in...' : 'Sign In'}
                    </button>
                </form>

                <div style={s.divider}>
                    <div style={s.dividerLine} />
                    <span style={s.dividerText}>or</span>
                    <div style={s.dividerLine} />
                </div>

                <a href="/api/auth/google" style={s.googleButton}>
                    <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" style={{ width: 18, height: 18 }} />
                    Continue with Google
                </a>

                <p style={s.footer}>
                    Don't have an account?{' '}
                    <Link to="/register" style={s.link}>Sign up</Link>
                </p>
            </div>
        </div>
    );
}
