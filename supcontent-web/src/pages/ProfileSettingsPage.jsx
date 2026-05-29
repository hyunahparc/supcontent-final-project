import { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { getUserProfile, updateMyProfile, uploadAvatar, deleteMyAccount } from '../api/users';

const font    = "'CircularSp', 'Helvetica Neue', helvetica, arial, sans-serif";
const MAX_BIO = 500;

export default function ProfileSettingsPage() {
    const { user, updateUser, logout } = useAuth();
    const { isDark, toggleTheme }      = useTheme();
    const navigate = useNavigate();

    const [username, setUsername] = useState('');
    const [bio, setBio]           = useState('');
    const [link, setLink]         = useState('');
    const [avatarUrl, setAvatarUrl] = useState('');
    const [avatarFile, setAvatarFile] = useState(null);
    const [preview, setPreview]   = useState(null);
    const [saving, setSaving]     = useState(false);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');
    const [errorMsg, setErrorMsg]   = useState('');
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [focusedField, setFocusedField] = useState('');

    const fileInputRef = useRef(null);

    useEffect(() => {
        if (!user) navigate('/login', { replace: true });
    }, [user, navigate]);

    useEffect(() => {
        if (!user) return;
        getUserProfile(user.user_id)
            .then(profile => {
                setUsername(profile.username ?? '');
                setBio(profile.bio ?? '');
                setLink(profile.link ?? '');
                setAvatarUrl(profile.avatar ?? '');
            })
            .catch(() => {
                setUsername(user.username ?? '');
                setAvatarUrl(user.avatar ?? '');
            });
    }, [user]);

    useEffect(() => {
        return () => {
            if (preview) URL.revokeObjectURL(preview);
        };
    }, [preview]);

    function handleFileChange(e) {
        const file = e.target.files?.[0];
        if (!file) return;

        const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        if (!ALLOWED.includes(file.type)) {
            setErrorMsg('Unsupported format. Please use JPEG, PNG, WebP or GIF.');
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            setErrorMsg('Image must not exceed 5 MB.');
            return;
        }

        setErrorMsg('');
        setAvatarFile(file);
        if (preview) URL.revokeObjectURL(preview);
        setPreview(URL.createObjectURL(file));
    }

    async function handleAvatarUpload() {
        if (!avatarFile) return;
        setUploadingAvatar(true);
        setErrorMsg('');
        try {
            const updated = await uploadAvatar(avatarFile);
            updateUser({ avatar: updated.avatar });
            setAvatarUrl(updated.avatar);
            setAvatarFile(null);
            if (preview) { URL.revokeObjectURL(preview); setPreview(null); }
            setSuccessMsg('Profile picture updated!');
            setTimeout(() => setSuccessMsg(''), 3000);
        } catch {
            setErrorMsg('Upload failed. Please try again.');
        } finally {
            setUploadingAvatar(false);
        }
    }

    async function handleSaveProfile(e) {
        e.preventDefault();
        setErrorMsg('');
        setSuccessMsg('');

        if (username.trim().length < 3) {
            setErrorMsg('Username must be at least 3 characters.');
            return;
        }
        if (bio.length > MAX_BIO) {
            setErrorMsg(`Bio cannot exceed ${MAX_BIO} characters.`);
            return;
        }

        setSaving(true);
        try {
            const updated = await updateMyProfile({ username: username.trim(), bio, link: link.trim() || null });
            updateUser({ username: updated.username, bio: updated.bio });
            setSuccessMsg('Profile saved!');
            setTimeout(() => setSuccessMsg(''), 3000);
        } catch (err) {
            setErrorMsg(err.response?.data?.message || 'Failed to save profile.');
        } finally {
            setSaving(false);
        }
    }

    async function handleDeleteAccount() {
        try {
            await deleteMyAccount();
            logout();
            navigate('/', { replace: true });
        } catch {
            setErrorMsg('Failed to delete account.');
            setShowDeleteModal(false);
        }
    }

    if (!user) return null;

    const displayedAvatar = preview || avatarUrl;

    return (
        <div style={s.page}>
            <div style={s.header}>
                <Link to={`/users/${user.user_id}/profile`} style={s.backLink}>← Back to dashboard</Link>
                <h1 style={s.pageTitle}>Profile Settings</h1>
            </div>

            {successMsg && <div style={s.successBanner}>{successMsg}</div>}
            {errorMsg   && <div style={s.errorBanner}>{errorMsg}</div>}

            <section style={s.card}>
                <h2 style={s.cardTitle}>Profile picture</h2>

                <div style={s.avatarSection}>
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        style={s.avatarBtn}
                        title="Change photo"
                        type="button"
                    >
                        {displayedAvatar ? (
                            <img src={displayedAvatar} alt="Avatar" style={s.avatar} />
                        ) : (
                            <div style={s.avatarFallback}>
                                {user.username?.charAt(0).toUpperCase() ?? '?'}
                            </div>
                        )}
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
                            Choose an image
                        </button>
                        {avatarFile && (
                            <button
                                type="button"
                                onClick={handleAvatarUpload}
                                disabled={uploadingAvatar}
                                style={s.primaryBtn}
                            >
                                {uploadingAvatar ? 'Uploading…' : '✓ Confirm upload'}
                            </button>
                        )}
                        <p style={s.avatarHint}>JPEG, PNG, WebP or GIF · max 5 MB</p>
                    </div>
                </div>
            </section>

            <section style={s.card}>
                <h2 style={s.cardTitle}>Information</h2>

                <form onSubmit={handleSaveProfile} style={s.form}>
                    <div style={s.field}>
                        <label style={s.label}>Username</label>
                        <input
                            type="text"
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                            onFocus={() => setFocusedField('username')}
                            onBlur={() => setFocusedField('')}
                            maxLength={50}
                            required
                            style={inputStyle(focusedField === 'username')}
                            placeholder="Your username"
                        />
                        <span style={s.charCount}>{username.length} / 50</span>
                    </div>

                    <div style={s.field}>
                        <label style={s.label}>Bio</label>
                        <textarea
                            value={bio}
                            onChange={e => setBio(e.target.value)}
                            onFocus={() => setFocusedField('bio')}
                            onBlur={() => setFocusedField('')}
                            rows={4}
                            maxLength={MAX_BIO}
                            placeholder="Tell us a little about yourself..."
                            style={{
                                ...inputStyle(focusedField === 'bio'),
                                resize: 'vertical',
                                minHeight: '100px',
                            }}
                        />
                        <span style={{
                            ...s.charCount,
                            color: bio.length > MAX_BIO * 0.9 ? '#f5a623' : 'var(--text-secondary)',
                        }}>
                            {bio.length} / {MAX_BIO}
                        </span>
                    </div>

                    {/* Feature 7 — Website link */}
                    <div style={s.field}>
                        <label style={s.label}>Website</label>
                        <input
                            type="url"
                            value={link}
                            onChange={e => setLink(e.target.value)}
                            onFocus={() => setFocusedField('link')}
                            onBlur={() => setFocusedField('')}
                            placeholder="https://yourwebsite.com"
                            style={inputStyle(focusedField === 'link')}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={saving}
                        style={{ ...s.primaryBtn, alignSelf: 'flex-start' }}
                    >
                        {saving ? 'Saving...' : 'Save changes'}
                    </button>
                </form>
            </section>

            {/* Feature 10 — Theme toggle */}
            <section style={s.card}>
                <h2 style={s.cardTitle}>Preferences</h2>
                <div style={s.prefRow}>
                    <div>
                        <p style={s.prefLabel}>Theme</p>
                        <p style={s.prefDesc}>{isDark ? 'Dark mode is active' : 'Light mode is active'}</p>
                    </div>
                    <button
                        type="button"
                        onClick={toggleTheme}
                        style={s.themeToggleBtn}
                        aria-label="Toggle theme"
                    >
                        <span style={{ ...s.themeToggleKnob, transform: isDark ? 'translateX(0)' : 'translateX(22px)' }} />
                    </button>
                </div>
            </section>

            <section style={{ ...s.card, borderColor: '#3a1a1a' }}>
                <h2 style={{ ...s.cardTitle, color: '#f3727f' }}>Danger zone</h2>
                <p style={s.dangerText}>
                    Deleting your account is permanent. All your data (collection, reviews, comments) will be erased.
                </p>
                <button
                    type="button"
                    onClick={() => setShowDeleteModal(true)}
                    style={s.dangerBtn}
                >
                    Delete my account
                </button>
            </section>

            {showDeleteModal && (
                <div style={s.modalBackdrop}>
                    <div style={s.modal}>
                        <h3 style={s.modalTitle}>Confirm deletion</h3>
                        <p style={s.modalText}>
                            Are you sure you want to delete your account?
                            This action is <strong>irreversible</strong>.
                        </p>
                        <div style={s.modalActions}>
                            <button
                                type="button"
                                onClick={() => setShowDeleteModal(false)}
                                style={s.secondaryBtn}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleDeleteAccount}
                                style={s.dangerBtn}
                            >
                                Yes, delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function inputStyle(focused) {
    return {
        width: '100%',
        padding: '12px 14px',
        fontSize: '14px',
        fontFamily: font,
        backgroundColor: 'var(--bg-input)',
        border: `1px solid ${focused ? 'var(--accent)' : 'var(--border-subtle)'}`,
        borderRadius: '8px',
        color: 'var(--text-primary)',
        outline: 'none',
        boxSizing: 'border-box',
        transition: 'border-color 0.15s',
    };
}

const s = {
    page: {
        maxWidth: '680px',
        margin: '0 auto',
        padding: '48px 32px 80px',
        fontFamily: font,
        color: 'var(--text-primary)',
        minHeight: '100vh',
    },
    header: {
        marginBottom: '36px',
    },
    backLink: {
        display: 'inline-block',
        fontSize: '13px',
        color: 'var(--text-secondary)',
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
    successBanner: {
        padding: '12px 16px',
        backgroundColor: '#0d2b1a',
        border: '1px solid var(--accent)',
        borderRadius: '8px',
        color: 'var(--accent)',
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
    card: {
        backgroundColor: 'var(--bg-secondary)',
        borderRadius: '12px',
        padding: '28px 32px',
        marginBottom: '24px',
        border: '1px solid var(--border)',
    },
    cardTitle: {
        margin: '0 0 24px',
        fontSize: '16px',
        fontWeight: '700',
        color: 'var(--text-primary)',
    },
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
    },
    avatar: {
        width: '96px',
        height: '96px',
        borderRadius: '50%',
        objectFit: 'cover',
        display: 'block',
        border: '3px solid var(--border)',
    },
    avatarFallback: {
        width: '96px',
        height: '96px',
        borderRadius: '50%',
        backgroundColor: 'var(--bg-elevated)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '40px',
        fontWeight: '700',
        color: 'var(--text-primary)',
        border: '3px solid var(--border)',
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
        color: 'var(--text-muted)',
    },
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
        color: 'var(--text-secondary)',
        letterSpacing: '0.5px',
        textTransform: 'uppercase',
    },
    charCount: {
        fontSize: '12px',
        color: 'var(--text-secondary)',
        textAlign: 'right',
    },
    primaryBtn: {
        padding: '11px 24px',
        backgroundColor: 'var(--accent)',
        color: 'var(--text-inverse)',
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
        color: 'var(--text-primary)',
        border: '1px solid var(--border-visible)',
        borderRadius: '9999px',
        fontSize: '14px',
        fontWeight: '700',
        cursor: 'pointer',
        fontFamily: font,
    },
    prefRow: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
    },
    prefLabel: {
        margin: '0 0 4px',
        fontSize: '14px',
        fontWeight: '700',
        color: 'var(--text-primary)',
        fontFamily: font,
    },
    prefDesc: {
        margin: 0,
        fontSize: '13px',
        color: 'var(--text-secondary)',
        fontFamily: font,
    },
    themeToggleBtn: {
        position: 'relative',
        width: '44px',
        height: '24px',
        borderRadius: '12px',
        backgroundColor: 'var(--accent)',
        border: 'none',
        cursor: 'pointer',
        flexShrink: 0,
        padding: 0,
    },
    themeToggleKnob: {
        position: 'absolute',
        top: '3px',
        left: '3px',
        width: '18px',
        height: '18px',
        borderRadius: '50%',
        backgroundColor: '#000',
        transition: 'transform 0.2s ease',
        display: 'block',
    },
    dangerText: {
        margin: '0 0 20px',
        fontSize: '14px',
        color: 'var(--text-secondary)',
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
        backgroundColor: 'var(--bg-secondary)',
        border: '1px solid var(--border-subtle)',
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
        color: 'var(--text-secondary)',
        lineHeight: 1.6,
    },
    modalActions: {
        display: 'flex',
        gap: '12px',
        justifyContent: 'flex-end',
    },
};
