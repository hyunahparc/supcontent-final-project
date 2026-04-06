import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function OAuthCallbackPage() {
    const navigate = useNavigate();
    const { login } = useAuth();

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const token = params.get('token');
        const userParam = params.get('user');

        if (token && userParam) {
            try {
                const user = JSON.parse(decodeURIComponent(userParam));
                login(user, token);
            } catch {
                // invalid user data, redirect anyway
            }
        }

        navigate('/', { replace: true });
    }, [navigate, login]);

    return <p style={{ textAlign: 'center', marginTop: '40px' }}>Connexion en cours...</p>;
}
