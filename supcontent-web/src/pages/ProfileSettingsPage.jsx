// Page de paramètres du profil — modification du nom, bio et photo
import { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getUserProfile, updateMyProfile, uploadAvatar, deleteMyAccount } from '../api/users';

const font = "'CircularSp', 'Helvetica Neue', helvetica, arial, sans-serif";
const MAX_BIO = 500; // caractères maximum pour la biographie

export default function ProfileSettingsPage() {
    const { user, updateUser, logout } = useAuth();
    const navigate = useNavigate();

    // ── État du formulaire ──────────────────────────────────────────────────
    const [username,   setUsername]   = useState('');
    const [bio,        setBio]        = useState('');
    const [avatarUrl,  setAvatarUrl]  = useState('');    // URL courante affichée
    const [avatarFile, setAvatarFile] = useState(null);  // fichier à uploader
    const [preview,    setPreview]    = useState(null);  // aperçu local (blob URL)

    // ── État de l'UI ───────────────────────────────────────────────────────
    const [saving,         setSaving]         = useState(false);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [successMsg,     setSuccessMsg]     = useState('');
    const [errorMsg,       setErrorMsg]       = useState('');
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [focusedField,   setFocusedField]   = useState('');

    const fileInputRef = useRef(null);

    // Redirection si non connecté
    useEffect(() => {
        if (!user) navigate('/login', { replace: true });
    }, [user, navigate]);

    // Pré-remplissage du formulaire avec les données actuelles
    useEffect(() => {
        if (!user) return;
        getUserProfile(user.user_id)
            .then(profile => {
                setUsername(profile.username ?? '');
                setBio(profile.bio ?? '');
                setAvatarUrl(profile.avatar ?? '');
            })
            .catch(() => {
                // En cas d'erreur, on utilise les données du contexte
                setUsername(user.username ?? '');
                setAvatarUrl(user.avatar ?? '');
            });
    }, [user]);

    // Nettoyage de l'URL blob à la destruction du composant
    useEffect(() => {
        return () => {
            if (preview) URL.revokeObjectURL(preview);
        };
    }, [preview]);

    // ── Sélection d'un fichier image ────────────────────────────────────────
    function handleFileChange(e) {
        const file = e.target.files?.[0];
        if (!file) return;

        // Vérification côté client du type
        const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        if (!ALLOWED.includes(file.type)) {
            setErrorMsg('Format non supporté. Utilisez JPEG, PNG, WebP ou GIF.');
            return;
        }
        // Vérification de la taille (5 Mo max)
        if (file.size > 5 * 1024 * 1024) {
            setErrorMsg("L'image ne doit pas dépasser 5 Mo.");
            return;
        }

        setErrorMsg('');
        setAvatarFile(file);
        // Génération d'un aperçu local immédiat
        if (preview) URL.revokeObjectURL(preview);
        setPreview(URL.createObjectURL(file));
    }

    // ── Upload de la photo ──────────────────────────────────────────────────
    async function handleAvatarUpload() {
        if (!avatarFile) return;
        setUploadingAvatar(true);
        setErrorMsg('');
        try {
            const updated = await uploadAvatar(avatarFile);
            // Mise à jour du contexte global et des états locaux
            updateUser({ avatar: updated.avatar });
            setAvatarUrl(updated.avatar);
            setAvatarFile(null);
            if (preview) { URL.revokeObjectURL(preview); setPreview(null); }
            setSuccessMsg('Photo de profil mise à jour !');
            setTimeout(() => setSuccessMsg(''), 3000);
        } catch {
            setErrorMsg("Erreur lors de l'upload. Veuillez réessayer.");
        } finally {
            setUploadingAvatar(false);
        }
    }

    // ── Sauvegarde du profil texte ──────────────────────────────────────────
    async function handleSaveProfile(e) {
        e.preventDefault();
        setErrorMsg('');
        setSuccessMsg('');

        // Validation minimale côté client
        if (username.trim().length < 3) {
            setErrorMsg("Le nom d'utilisateur doit contenir au moins 3 caractères.");
            return;
        }
        if (bio.length > MAX_BIO) {
            setErrorMsg(`La biographie ne peut pas dépasser ${MAX_BIO} caractères.`);
            return;
        }

        setSaving(true);
        try {
            const updated = await updateMyProfile({ username: username.trim(), bio });
            // Synchronisation du contexte d'auth
            updateUser({ username: updated.username, bio: updated.bio });
            setSuccessMsg('Profil sauvegardé !');
            setTimeout(() => setSuccessMsg(''), 3000);
        } catch (err) {
            setErrorMsg(
                err.response?.data?.message || 'Erreur lors de la sauvegarde.'
            );
        } finally {
            setSaving(false);
        }
    }

    // ── Suppression du compte ───────────────────────────────────────────────
    async function handleDeleteAccount() {
        try {
            await deleteMyAccount();
            logout();
            navigate('/', { replace: true });
        } catch {
            setErrorMsg('Erreur lors de la suppression du compte.');
            setShowDeleteModal(false);
        }
    }

    if (!user) return null;

    // Image affichée : aperçu local > URL distante > initiale
    const displayedAvatar = preview || avatarUrl;

    return (
        <div style={s.page}>

            {/* ── En-tête ── */}
            <div style={s.header}>
                <Link to="/dashboard" style={s.backLink}>← Retour au tableau de bord</Link>
                <h1 style={s.pageTitle}>Paramètres du profil</h1>
            </div>

            {/* ── Messages de feedback ── */}
            {successMsg && <div style={s.successBanner}>{successMsg}</div>}
            {errorMsg   && <div style={s.errorBanner}>{errorMsg}</div>}

            {/* ── Section photo de profil ── */}
            <section style={s.card}>
                <h2 style={s.cardTitle}>Photo de profil</h2>

                <div style={s.avatarSection}>
                    {/* Aperçu de l'avatar */}
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        style={s.avatarBtn}
                        title="Changer la photo"
                        type="button"
                    >
                        {displayedAvatar ? (
                            <img src={displayedAvatar} alt="Avatar" style={s.avatar} />
                        ) : (
                            <div style={s.avatarFallback}>
                                {user.username?.charAt(0).toUpperCase() ?? '?'}
                            </div>
                        )}
                        {/* Overlay au survol */}
                        <div style={s.avatarOverlay}>📷</div>
                    </button>

                    <div style={s.avatarActions}>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/gif"
                            onChange={handleFileChange}
                            style={{ display: 'none' }}
                        />
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            style={s.secondaryBtn}
                        >
                            Choisir une image
                        </button>
                        {/* Bouton de confirmation visible uniquement si un fichier est sélectionné */}
                        {avatarFile && (
                            <button
                                type="button"
                                onClick={handleAvatarUpload}
                                disabled={uploadingAvatar}
                                style={s.primaryBtn}
                            >
                                {uploadingAvatar ? 'Upload en cours…' : '✓ Confirmer l\'upload'}
                            </button>
                        )}
                        <p style={s.avatarHint}>JPEG, PNG, WebP ou GIF · max 5 Mo</p>
                    </div>
                </div>
            </section>

            {/* ── Section informations ── */}
            <section style={s.card}>
                <h2 style={s.cardTitle}>Informations</h2>

                <form onSubmit={handleSaveProfile} style={s.form}>
                    {/* Nom d'utilisateur */}
                    <div style={s.field}>
                        <label style={s.label}>Nom d'utilisateur</label>
                        <input
                            type="text"
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                            onFocus={() => setFocusedField('username')}
                            onBlur={() => setFocusedField('')}
                            maxLength={50}
                            required
                            style={inputStyle(focusedField === 'username')}
                            placeholder="Votre nom d'utilisateur"
                        />
                        <span style={s.charCount}>{username.length} / 50</span>
                    </div>

                    {/* Biographie */}
                    <div style={s.field}>
                        <label style={s.label}>Biographie</label>
                        <textarea
                            value={bio}
                            onChange={e => setBio(e.target.value)}
                            onFocus={() => setFocusedField('bio')}
                            onBlur={() => setFocusedField('')}
                            rows={4}
                            maxLength={MAX_BIO}
                            placeholder="Parlez de vous en quelques mots…"
                            style={{
                                ...inputStyle(focusedField === 'bio'),
                                resize: 'vertical',
                                minHeight: '100px',
                            }}
                        />
                        <span style={{
                            ...s.charCount,
                            color: bio.length > MAX_BIO * 0.9 ? '#f5a623' : '#b3b3b3',
                        }}>
                            {bio.length} / {MAX_BIO}
                        </span>
                    </div>

                    <button
                        type="submit"
                        disabled={saving}
                        style={{ ...s.primaryBtn, alignSelf: 'flex-start' }}
                    >
                        {saving ? 'Sauvegarde…' : 'Sauvegarder les modifications'}
                    </button>
                </form>
            </section>

            {/* ── Zone danger ── */}
            <section style={{ ...s.card, borderColor: '#3a1a1a' }}>
                <h2 style={{ ...s.cardTitle, color: '#f3727f' }}>Zone de danger</h2>
                <p style={s.dangerText}>
                    La suppression de votre compte est définitive. Toutes vos données (collection, avis, commentaires) seront effacées.
                </p>
                <button
                    type="button"
                    onClick={() => setShowDeleteModal(true)}
                    style={s.dangerBtn}
                >
                    Supprimer mon compte
                </button>
            </section>

            {/* ── Modal de confirmation de suppression ── */}
            {showDeleteModal && (
                <div style={s.modalBackdrop}>
                    <div style={s.modal}>
                        <h3 style={s.modalTitle}>Confirmer la suppression</h3>
                        <p style={s.modalText}>
                            Êtes-vous sûr(e) de vouloir supprimer votre compte ?
                            Cette action est <strong>irréversible</strong>.
                        </p>
                        <div style={s.modalActions}>
                            <button
                                type="button"
                                onClick={() => setShowDeleteModal(false)}
                                style={s.secondaryBtn}
                            >
                                Annuler
                            </button>
                            <button
                                type="button"
                                onClick={handleDeleteAccount}
                                style={s.dangerBtn}
                            >
                                Oui, supprimer
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Style dynamique pour les champs de formulaire ──────────────────────────
function inputStyle(focused) {
    return {
        width: '100%',
        padding: '12px 14px',
        fontSize: '14px',
        fontFamily: font,
        backgroundColor: '#1f1f1f',
        border: `1px solid ${focused ? '#1ed760' : '#3a3a3a'}`,
        borderRadius: '8px',
        color: '#fff',
        outline: 'none',
        boxSizing: 'border-box',
        transition: 'border-color 0.15s',
    };
}

// ── Styles statiques ──────────────────────────────────────────────────────
const s = {
    page: {
        maxWidth: '680px',
        margin: '0 auto',
        padding: '48px 32px 80px',
        fontFamily: font,
        color: '#fff',
        minHeight: '100vh',
    },
    header: {
        marginBottom: '36px',
    },
    backLink: {
        display: 'inline-block',
        fontSize: '13px',
        color: '#b3b3b3',
        textDecoration: 'none',
        marginBottom: '16px',
        transition: 'color 0.15s',
    },
    pageTitle: {
        margin: 0,
        fontSize: '28px',
        fontWeight: '700',
        letterSpacing: '-0.3px',
    },

    // ── Bannières feedback
    successBanner: {
        padding: '12px 16px',
        backgroundColor: '#0d2b1a',
        border: '1px solid #1ed760',
        borderRadius: '8px',
        color: '#1ed760',
        fontSize: '14px',
        marginBottom: '20px',
    },
    errorBanner: {
        padding: '12px 16px',
        backgroundColor: '#2b0d0d',
        border: '1px solid #f3727f',
        borderRadius: '8px',
        color: '#f3727f',
        fontSize: '14px',
        marginBottom: '20px',
    },

    // ── Cartes de section
    card: {
        backgroundColor: '#1e1e1e',
        borderRadius: '12px',
        padding: '28px 32px',
        marginBottom: '24px',
        border: '1px solid #2a2a2a',
    },
    cardTitle: {
        margin: '0 0 24px',
        fontSize: '16px',
        fontWeight: '700',
        color: '#fff',
    },

    // ── Section avatar
    avatarSection: {
        display: 'flex',
        alignItems: 'center',
        gap: '28px',
        flexWrap: 'wrap',
    },
    avatarBtn: {
        position: 'relative',
        background: 'none',
        border: 'none',
        padding: 0,
        cursor: 'pointer',
        borderRadius: '50%',
        overflow: 'hidden',
        flexShrink: 0,
        // Groupe CSS pour l'overlay au survol
        ':hover div': { opacity: 1 },
    },
    avatar: {
        width: '96px',
        height: '96px',
        borderRadius: '50%',
        objectFit: 'cover',
        display: 'block',
        border: '3px solid #2a2a2a',
    },
    avatarFallback: {
        width: '96px',
        height: '96px',
        borderRadius: '50%',
        backgroundColor: '#333',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '40px',
        fontWeight: '700',
        color: '#fff',
        border: '3px solid #2a2a2a',
    },
    avatarOverlay: {
        position: 'absolute',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '24px',
        borderRadius: '50%',
        opacity: 0,
        transition: 'opacity 0.2s',
        // Pas de moyen pur d'activer au survol en style-objet —
        // on utilise onMouseEnter/Leave sur le bouton parent dans le JSX
        // (géré ci-dessous via CSS global si souhaité)
    },
    avatarActions: {
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        alignItems: 'flex-start',
    },
    avatarHint: {
        margin: 0,
        fontSize: '12px',
        color: '#4d4d4d',
    },

    // ── Formulaire
    form: {
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
    },
    field: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
    },
    label: {
        fontSize: '13px',
        fontWeight: '700',
        color: '#b3b3b3',
        letterSpacing: '0.5px',
        textTransform: 'uppercase',
    },
    charCount: {
        fontSize: '12px',
        color: '#b3b3b3',
        textAlign: 'right',
    },

    // ── Boutons
    primaryBtn: {
        padding: '11px 24px',
        backgroundColor: '#1ed760',
        color: '#000',
        border: 'none',
        borderRadius: '9999px',
        fontSize: '14px',
        fontWeight: '700',
        cursor: 'pointer',
        fontFamily: font,
        letterSpacing: '0.5px',
    },
    secondaryBtn: {
        padding: '11px 24px',
        backgroundColor: 'transparent',
        color: '#fff',
        border: '1px solid #4d4d4d',
        borderRadius: '9999px',
        fontSize: '14px',
        fontWeight: '700',
        cursor: 'pointer',
        fontFamily: font,
    },

    // ── Zone danger
    dangerText: {
        margin: '0 0 20px',
        fontSize: '14px',
        color: '#b3b3b3',
        lineHeight: 1.6,
    },
    dangerBtn: {
        padding: '11px 24px',
        backgroundColor: 'transparent',
        color: '#f3727f',
        border: '1px solid #f3727f',
        borderRadius: '9999px',
        fontSize: '14px',
        fontWeight: '700',
        cursor: 'pointer',
        fontFamily: font,
    },

    // ── Modal
    modalBackdrop: {
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
    },
    modal: {
        backgroundColor: '#1e1e1e',
        border: '1px solid #3a3a3a',
        borderRadius: '16px',
        padding: '36px',
        maxWidth: '420px',
        width: '90%',
    },
    modalTitle: {
        margin: '0 0 16px',
        fontSize: '20px',
        fontWeight: '700',
        color: '#f3727f',
    },
    modalText: {
        margin: '0 0 28px',
        fontSize: '14px',
        color: '#b3b3b3',
        lineHeight: 1.6,
    },
    modalActions: {
        display: 'flex',
        gap: '12px',
        justifyContent: 'flex-end',
    },
};
