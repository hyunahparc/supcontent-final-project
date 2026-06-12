import { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { getUserProfile, updateMyProfile, uploadAvatar, deleteMyAccount, exportUserData, updateLanguage } from '../api/users';

const font    = "'CircularSp', 'Helvetica Neue', helvetica, arial, sans-serif";
const MAX_BIO = 500;

export default function ProfileSettingsPage() {
    const { user, updateUser, logout } = useAuth();
    const { isDark, toggleTheme }      = useTheme();
    const { language, setLanguage, t } = useLanguage();
    const navigate = useNavigate();

    const [username, setUsername] = useState('');
    const [bio, setBio]           = useState('');
    const [link, setLink]         = useState('');
    const [avatarUrl, setAvatarUrl] = useState('');
    const [avatarFile, setAvatarFile] = useState(null);
    const [preview, setPreview]   = useState(null);
    const [saving, setSaving]     = useState(false);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [savingLang, setSavingLang] = useState(false);
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
            setErrorMsg(t('settings_unsupported_format'));
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            setErrorMsg(t('settings_too_large'));
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
            setSuccessMsg(t('settings_avatar_updated'));
            setTimeout(() => setSuccessMsg(''), 3000);
        } catch {
            setErrorMsg(t('settings_upload_failed'));
        } finally {
            setUploadingAvatar(false);
        }
    }

    async function handleSaveProfile(e) {
        e.preventDefault();
        setErrorMsg('');
        setSuccessMsg('');

        if (username.trim().length < 3) {
            setErrorMsg(t('settings_username_min'));
            return;
        }
        if (bio.length > MAX_BIO) {
            setErrorMsg(`${t('settings_bio_max')} ${MAX_BIO} ${t('settings_bio_max_chars')}`);
            return;
        }

        setSaving(true);
        try {
            const updated = await updateMyProfile({ username: username.trim(), bio, link: link.trim() || null });
            updateUser({ username: updated.username, bio: updated.bio });
            setSuccessMsg(t('settings_saved'));
            setTimeout(() => setSuccessMsg(''), 3000);
        } catch (err) {
            setErrorMsg(err.response?.data?.message || t('settings_failed_save'));
        } finally {
            setSaving(false);
        }
    }

    async function handleLanguageChange(lang) {
        if (lang === language || savingLang) return;
        const prev = language;
        setLanguage(lang);
        setSavingLang(true);
        try {
            await updateLanguage(lang);
            updateUser({ preferred_language: lang });
        } catch {
            setLanguage(prev);
        } finally {
            setSavingLang(false);
        }
    }

    async function handleExport(format) {
        setExporting(true);
        try {
            await exportUserData(format);
        } catch {
            setErrorMsg(t('settings_failed_export'));
        } finally {
            setExporting(false);
        }
    }

    async function handleDeleteAccount() {
        try {
            await deleteMyAccount();
            logout();
            navigate('/', { replace: true });
        } catch {
            setErrorMsg(t('settings_failed_delete'));
            setShowDeleteModal(false);
        }
    }

    if (!user) return null;

    const displayedAvatar = preview || avatarUrl;

    return (
        <div style={s.page}>
            <div style={s.header}>
                <Link to={`/users/${user.user_id}/profile`} style={s.backLink}>{t('settings_back')}</Link>
                <h1 style={s.pageTitle}>{t('settings_title')}</h1>
            </div>

            {successMsg && <div style={s.successBanner}>{successMsg}</div>}
            {errorMsg   && <div style={s.errorBanner}>{errorMsg}</div>}

            <section style={s.card}>
                <h2 style={s.cardTitle}>{t('settings_profile_picture')}</h2>

                <div style={s.avatarSection}>
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        style={s.avatarBtn}
                        title={t('settings_choose_image')}
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
                            {t('settings_choose_image')}
                        </button>
                        {avatarFile && (
                            <button
                                type="button"
                                onClick={handleAvatarUpload}
                                disabled={uploadingAvatar}
                                style={s.primaryBtn}
                            >
                                {uploadingAvatar ? t('settings_uploading') : t('settings_confirm_upload')}
                            </button>
                        )}
                        <p style={s.avatarHint}>{t('settings_image_hint')}</p>
                    </div>
                </div>
            </section>

            <section style={s.card}>
                <h2 style={s.cardTitle}>{t('settings_info')}</h2>

                <form onSubmit={handleSaveProfile} style={s.form}>
                    <div style={s.field}>
                        <label style={s.label}>{t('settings_username')}</label>
                        <input
                            type="text"
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                            onFocus={() => setFocusedField('username')}
                            onBlur={() => setFocusedField('')}
                            maxLength={50}
                            required
                            style={inputStyle(focusedField === 'username')}
                            placeholder={t('settings_username_placeholder')}
                        />
                        <span style={s.charCount}>{username.length} / 50</span>
                    </div>

                    <div style={s.field}>
                        <label style={s.label}>{t('settings_bio')}</label>
                        <textarea
                            value={bio}
                            onChange={e => setBio(e.target.value)}
                            onFocus={() => setFocusedField('bio')}
                            onBlur={() => setFocusedField('')}
                            rows={4}
                            maxLength={MAX_BIO}
                            placeholder={t('settings_bio_placeholder')}
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

                    <div style={s.field}>
                        <label style={s.label}>{t('settings_website')}</label>
                        <input
                            type="url"
                            value={link}
                            onChange={e => setLink(e.target.value)}
                            onFocus={() => setFocusedField('link')}
                            onBlur={() => setFocusedField('')}
                            placeholder={t('settings_website_placeholder')}
                            style={inputStyle(focusedField === 'link')}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={saving}
                        style={{ ...s.primaryBtn, alignSelf: 'flex-start' }}
                    >
                        {saving ? t('settings_saving') : t('settings_save')}
                    </button>
                </form>
            </section>

            <section style={s.card}>
                <h2 style={s.cardTitle}>{t('settings_preferences')}</h2>

                <div style={s.prefRow}>
                    <div>
                        <p style={s.prefLabel}>{t('settings_theme')}</p>
                        <p style={s.prefDesc}>{isDark ? t('settings_theme_dark') : t('settings_theme_light')}</p>
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

                <div style={{ ...s.prefRow, marginTop: '20px' }}>
                    <div>
                        <p style={s.prefLabel}>{t('settings_language')}</p>
                        {savingLang && <p style={s.prefDesc}>{t('settings_language_saving')}</p>}
                    </div>
                    <div style={s.langToggle}>
                        <button
                            type="button"
                            onClick={() => handleLanguageChange('fr')}
                            style={langBtnStyle(language === 'fr')}
                        >
                            FR
                        </button>
                        <button
                            type="button"
                            onClick={() => handleLanguageChange('en')}
                            style={langBtnStyle(language === 'en')}
                        >
                            EN
                        </button>
                    </div>
                </div>
            </section>

            <section style={s.card}>
                <h2 style={s.cardTitle}>{t('settings_data_title')}</h2>
                <p style={s.dangerText}>{t('settings_data_desc')}</p>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    <button
                        type="button"
                        onClick={() => handleExport('csv')}
                        disabled={exporting}
                        style={s.secondaryBtn}
                    >
                        {exporting ? t('settings_exporting') : t('settings_export_csv')}
                    </button>
                    <button
                        type="button"
                        onClick={() => handleExport('json')}
                        disabled={exporting}
                        style={s.secondaryBtn}
                    >
                        {exporting ? t('settings_exporting') : t('settings_export_json')}
                    </button>
                </div>
            </section>

            <section style={{ ...s.card, borderColor: '#3a1a1a' }}>
                <h2 style={{ ...s.cardTitle, color: '#f3727f' }}>{t('settings_danger_zone')}</h2>
                <p style={s.dangerText}>{t('settings_delete_desc')}</p>
                <button
                    type="button"
                    onClick={() => setShowDeleteModal(true)}
                    style={s.dangerBtn}
                >
                    {t('settings_delete_account')}
                </button>
            </section>

            {showDeleteModal && (
                <div style={s.modalBackdrop}>
                    <div style={s.modal}>
                        <h3 style={s.modalTitle}>{t('settings_confirm_deletion')}</h3>
                        <p style={s.modalText}>{t('settings_confirm_deletion_msg')}</p>
                        <div style={s.modalActions}>
                            <button
                                type="button"
                                onClick={() => setShowDeleteModal(false)}
                                style={s.secondaryBtn}
                            >
                                {t('settings_cancel')}
                            </button>
                            <button
                                type="button"
                                onClick={handleDeleteAccount}
                                style={s.dangerBtn}
                            >
                                {t('settings_yes_delete')}
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

function langBtnStyle(active) {
    return {
        padding: '6px 18px',
        fontSize: '13px',
        fontWeight: '700',
        fontFamily: font,
        cursor: 'pointer',
        border: `1px solid ${active ? 'var(--accent)' : 'var(--border-visible)'}`,
        borderRadius: '9999px',
        backgroundColor: active ? 'var(--accent)' : 'transparent',
        color: active ? 'var(--text-inverse)' : 'var(--text-secondary)',
        transition: 'all 0.15s',
        letterSpacing: '0.5px',
    };
}

const s = {
    page: {
        maxWidth: '680px',
        margin: '0 auto',
        padding: 'clamp(28px, 6vw, 48px) clamp(16px, 5vw, 32px) 80px',
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
        letterSpacing: '0',
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
        padding: 'clamp(20px, 5vw, 28px) clamp(18px, 5vw, 32px)',
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
        minWidth: 0,
        flex: '1 1 220px',
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
        flexWrap: 'wrap',
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
    langToggle: {
        display: 'flex',
        gap: '8px',
        flexShrink: 0,
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
        padding: '16px',
    },
    modal: {
        backgroundColor: 'var(--bg-secondary)',
        border: '1px solid var(--border-subtle)',
        borderRadius: '16px',
        padding: 'clamp(24px, 6vw, 36px)',
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
        flexWrap: 'wrap',
    },
};
