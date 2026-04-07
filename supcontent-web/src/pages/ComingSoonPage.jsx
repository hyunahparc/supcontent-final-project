import { Link } from 'react-router-dom';

export default function ComingSoonPage({ title, description, icon }) {
    return (
        <div style={s.page}>
            <div style={s.box}>
                <span style={s.icon}>{icon ?? '🚧'}</span>
                <h1 style={s.title}>{title ?? 'Page en cours de développement'}</h1>
                <p style={s.desc}>
                    {description ?? 'Cette section n\'est pas encore disponible. Revenez bientôt !'}
                </p>
                <Link to="/" style={s.btn}>← Retour à l'accueil</Link>
            </div>
        </div>
    );
}

const s = {
    page: {
        minHeight: '60vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 24px',
    },
    box: {
        maxWidth: '480px',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '16px',
    },
    icon: { fontSize: '56px' },
    title: {
        margin: 0,
        fontSize: '24px',
        fontWeight: '700',
        color: '#fff',
        letterSpacing: '-0.3px',
    },
    desc: {
        margin: 0,
        fontSize: '15px',
        color: 'rgba(255,255,255,0.5)',
        lineHeight: 1.7,
    },
    btn: {
        marginTop: '8px',
        padding: '10px 24px',
        background: '#e50914',
        color: '#fff',
        borderRadius: '8px',
        textDecoration: 'none',
        fontSize: '14px',
        fontWeight: '600',
    },
};