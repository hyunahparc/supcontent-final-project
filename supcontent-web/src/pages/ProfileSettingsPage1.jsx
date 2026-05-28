import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProfileEditPage = () => {
    const { token } = useAuth();
    const navigate = useNavigate();
    const fileInputRef = useRef(null);

    // Correct API URLs
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
    const BACKEND_URL = API_URL.replace('/api', '');
    
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    
    const [formData, setFormData] = useState({
        display_name: '',
        biography: '',
        website_url: '',
        theme_preference: 'light',
        language_preference: 'fr'
    });
    
    const [avatarUrl, setAvatarUrl] = useState('');
    const [avatarPreview, setAvatarPreview] = useState('');

    useEffect(() => {
        if (!token) {
            navigate('/login');
            return;
        }

        const fetchProfile = async () => {
            try {
                const response = await fetch(`${API_URL}/profile/me`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (!response.ok) {
                    throw new Error('Failed to fetch profile');
                }

                const data = await response.json();
                setFormData({
                    display_name: data.user.display_name || '',
                    biography: data.user.biography || '',
                    website_url: data.user.website_url || '',
                    theme_preference: data.user.theme_preference || 'light',
                    language_preference: data.user.language_preference || 'fr'
                });
                setAvatarUrl(data.user.avatar_url || '');
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, [token, navigate, API_URL]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        setError('');
        setSuccess('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError('');
        setSuccess('');

        try {
            const response = await fetch(`${API_URL}/profile/me`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to update profile');
            }

            setSuccess('Profil mis à jour avec succès !');
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleAvatarClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)) {
            setError('Veuillez sélectionner une image valide (JPEG, PNG, GIF, ou WebP)');
            return;
        }

        // Validate file size (5MB)
        if (file.size > 5 * 1024 * 1024) {
            setError('L\'image doit faire moins de 5MB');
            return;
        }

        // Show preview
        const reader = new FileReader();
        reader.onloadend = () => {
            setAvatarPreview(reader.result);
        };
        reader.readAsDataURL(file);

        // Upload
        setUploading(true);
        setError('');

        try {
            const uploadFormData = new FormData();
            uploadFormData.append('avatar', file);

            console.log('Uploading to:', `${API_URL}/profile/me/avatar`); // Debug log

            const response = await fetch(`${API_URL}/profile/me/avatar`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                    // Don't set Content-Type for FormData, browser will set it automatically
                },
                body: uploadFormData
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to upload avatar');
            }

            const result = await response.json();
            setAvatarUrl(result.avatar_url);
            setAvatarPreview('');
            setSuccess('Avatar mis à jour avec succès !');
        } catch (err) {
            console.error('Upload error:', err);
            setError(err.message);
            setAvatarPreview('');
        } finally {
            setUploading(false);
        }
    };

    const handleDeleteAvatar = async () => {
        if (!window.confirm('Êtes-vous sûr de vouloir supprimer votre avatar ?')) {
            return;
        }

        setUploading(true);
        setError('');

        try {
            const response = await fetch(`${API_URL}/profile/me/avatar`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to delete avatar');
            }

            setAvatarUrl('');
            setSuccess('Avatar supprimé avec succès !');
        } catch (err) {
            setError(err.message);
        } finally {
            setUploading(false);
        }
    };

    const handleExportData = async (format) => {
        try {
            const response = await fetch(`${API_URL}/profile/me/export?format=${format}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to export data');
            }

            let data;
            if (format === 'json') {
                data = await response.json();
                data = JSON.stringify(data, null, 2);
            } else {
                data = await response.text();
            }
            
            const blob = new Blob(
                [data],
                { type: format === 'json' ? 'application/json' : 'text/csv' }
            );
            
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `supcontent_export.${format}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            setSuccess(`Données exportées en ${format.toUpperCase()} !`);
        } catch (err) {
            setError(err.message);
        }
    };

    if (loading) {
        return (
            <div style={styles.loadingContainer}>
                <div style={styles.spinner}></div>
                <p>Chargement du profil...</p>
            </div>
        );
    }

    const displayAvatar = avatarPreview || (avatarUrl ? `${BACKEND_URL}${avatarUrl}` : null);

    return (
        <div style={styles.container}>
            <h1 style={styles.title}>Modifier le profil</h1>

            {error && <div style={styles.error}>{error}</div>}
            {success && <div style={styles.success}>{success}</div>}

            {/* Avatar Section */}
            <div style={styles.avatarSection}>
                <div style={styles.avatarContainer}>
                    <img
                        src={displayAvatar || 'https://via.placeholder.com/150?text=Avatar'}
                        alt="Profile"
                        style={styles.avatar}
                        onError={(e) => {
                            e.target.src = 'https://via.placeholder.com/150?text=Avatar';
                        }}
                    />
                    {uploading && <div style={styles.avatarOverlay}>Envoi...</div>}
                </div>
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    style={{ display: 'none' }}
                />
                <div style={styles.avatarButtons}>
                    <button
                        type="button"
                        onClick={handleAvatarClick}
                        disabled={uploading}
                        style={styles.avatarButton}
                    >
                        📷 Changer l'avatar
                    </button>
                    {avatarUrl && (
                        <button
                            type="button"
                            onClick={handleDeleteAvatar}
                            disabled={uploading}
                            style={styles.deleteAvatarButton}
                        >
                            🗑️ Supprimer
                        </button>
                    )}
                </div>
                <p style={styles.avatarHint}>Max 5MB. Formats: JPEG, PNG, GIF, WebP</p>
            </div>

            {/* Profile Form */}
            <form onSubmit={handleSubmit} style={styles.form}>
                <div style={styles.formGroup}>
                    <label style={styles.label}>Nom d'affichage</label>
                    <input
                        type="text"
                        name="display_name"
                        value={formData.display_name}
                        onChange={handleChange}
                        placeholder="Votre nom d'affichage"
                        maxLength={100}
                        style={styles.input}
                    />
                    <span style={styles.charCount}>{formData.display_name.length}/100</span>
                </div>

                <div style={styles.formGroup}>
                    <label style={styles.label}>Biographie</label>
                    <textarea
                        name="biography"
                        value={formData.biography}
                        onChange={handleChange}
                        placeholder="Parlez-nous de vous..."
                        maxLength={1000}
                        rows={4}
                        style={styles.textarea}
                    />
                    <span style={styles.charCount}>{formData.biography.length}/1000</span>
                </div>

                <div style={styles.formGroup}>
                    <label style={styles.label}>Site web</label>
                    <input
                        type="url"
                        name="website_url"
                        value={formData.website_url}
                        onChange={handleChange}
                        placeholder="https://votresite.com"
                        style={styles.input}
                    />
                </div>

                <div style={styles.formRow}>
                    <div style={styles.formGroupHalf}>
                        <label style={styles.label}>Thème</label>
                        <select
                            name="theme_preference"
                            value={formData.theme_preference}
                            onChange={handleChange}
                            style={styles.select}
                        >
                            <option value="light">☀️ Clair</option>
                            <option value="dark">🌙 Sombre</option>
                        </select>
                    </div>

                    <div style={styles.formGroupHalf}>
                        <label style={styles.label}>Langue</label>
                        <select
                            name="language_preference"
                            value={formData.language_preference}
                            onChange={handleChange}
                            style={styles.select}
                        >
                            <option value="fr">🇫🇷 Français</option>
                            <option value="en">🇬🇧 English</option>
                        </select>
                    </div>
                </div>

                <div style={styles.buttonGroup}>
                    <button
                        type="button"
                        onClick={() => navigate('/dashboard')}
                        style={styles.cancelButton}
                    >
                        Annuler
                    </button>
                    <button
                        type="submit"
                        disabled={saving}
                        style={styles.saveButton}
                    >
                        {saving ? 'Enregistrement...' : 'Enregistrer'}
                    </button>
                </div>
            </form>

            {/* Data Export Section (RGPD) */}
            <div style={styles.exportSection}>
                <h2 style={styles.sectionTitle}>Exporter vos données</h2>
                <p style={styles.exportDescription}>
                    Téléchargez toutes vos données personnelles (bibliothèque, critiques, listes).
                </p>
                <div style={styles.exportButtons}>
                    <button
                        type="button"
                        onClick={() => handleExportData('json')}
                        style={styles.exportButton}
                    >
                        📥 Exporter en JSON
                    </button>
                    <button
                        type="button"
                        onClick={() => handleExportData('csv')}
                        style={styles.exportButton}
                    >
                        📥 Exporter en CSV
                    </button>
                </div>
            </div>

            {/* Danger Zone */}
            <div style={styles.dangerZone}>
                <h2 style={styles.dangerTitle}>⚠️ Zone de danger</h2>
                <p style={styles.dangerDescription}>
                    Une fois votre compte supprimé, il n'y a pas de retour en arrière possible.
                </p>
                <button type="button" style={styles.deleteAccountButton}>
                    Supprimer le compte
                </button>
            </div>
        </div>
    );
};

const styles = {
    container: {
        maxWidth: '700px',
        margin: '0 auto',
        padding: '20px',
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    },
    loadingContainer: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '60vh',
    },
    spinner: {
        width: '40px',
        height: '40px',
        border: '4px solid #f3f3f3',
        borderTop: '4px solid #e50914',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
    },
    title: {
        fontSize: '28px',
        marginBottom: '30px',
        textAlign: 'center',
        color: '#1a1a2e',
    },
    error: {
        backgroundColor: '#fee',
        color: '#c00',
        padding: '15px',
        borderRadius: '8px',
        marginBottom: '20px',
        textAlign: 'center',
    },
    success: {
        backgroundColor: '#efe',
        color: '#060',
        padding: '15px',
        borderRadius: '8px',
        marginBottom: '20px',
        textAlign: 'center',
    },
    avatarSection: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        marginBottom: '30px',
        padding: '30px',
        backgroundColor: '#f8f9fa',
        borderRadius: '15px',
    },
    avatarContainer: {
        position: 'relative',
        marginBottom: '15px',
    },
    avatar: {
        width: '150px',
        height: '150px',
        borderRadius: '50%',
        objectFit: 'cover',
        border: '4px solid #e50914',
    },
    avatarOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.6)',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontWeight: 'bold',
    },
    avatarButtons: {
        display: 'flex',
        gap: '10px',
    },
    avatarButton: {
        padding: '10px 20px',
        backgroundColor: '#1a1a2e',
        color: 'white',
        border: 'none',
        borderRadius: '25px',
        cursor: 'pointer',
        fontSize: '14px',
    },
    deleteAvatarButton: {
        padding: '10px 20px',
        backgroundColor: '#dc3545',
        color: 'white',
        border: 'none',
        borderRadius: '25px',
        cursor: 'pointer',
        fontSize: '14px',
    },
    avatarHint: {
        marginTop: '10px',
        fontSize: '12px',
        color: '#666',
    },
    form: {
        backgroundColor: 'white',
        padding: '30px',
        borderRadius: '15px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        marginBottom: '20px',
    },
    formGroup: {
        marginBottom: '25px',
        position: 'relative',
    },
    formRow: {
        display: 'flex',
        gap: '20px',
        marginBottom: '20px',
    },
    formGroupHalf: {
        flex: 1,
    },
    label: {
        display: 'block',
        marginBottom: '8px',
        fontWeight: '600',
        color: '#1a1a2e',
    },
    input: {
        width: '100%',
        padding: '12px 15px',
        border: '2px solid #e1e1e1',
        borderRadius: '8px',
        fontSize: '16px',
        boxSizing: 'border-box',
    },
    textarea: {
        width: '100%',
        padding: '12px 15px',
        border: '2px solid #e1e1e1',
        borderRadius: '8px',
        fontSize: '16px',
        resize: 'vertical',
        fontFamily: 'inherit',
        boxSizing: 'border-box',
    },
    select: {
        width: '100%',
        padding: '12px 15px',
        border: '2px solid #e1e1e1',
        borderRadius: '8px',
        fontSize: '16px',
        backgroundColor: 'white',
        cursor: 'pointer',
    },
    charCount: {
        position: 'absolute',
        right: '10px',
        bottom: '-18px',
        fontSize: '12px',
        color: '#888',
    },
    buttonGroup: {
        display: 'flex',
        justifyContent: 'flex-end',
        gap: '15px',
        marginTop: '30px',
    },
    cancelButton: {
        padding: '12px 30px',
        backgroundColor: '#6c757d',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        fontSize: '16px',
    },
    saveButton: {
        padding: '12px 30px',
        backgroundColor: '#e50914',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        fontSize: '16px',
        fontWeight: 'bold',
    },
    exportSection: {
        backgroundColor: 'white',
        padding: '25px',
        borderRadius: '15px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        marginBottom: '20px',
    },
    sectionTitle: {
        fontSize: '18px',
        margin: '0 0 10px 0',
        color: '#1a1a2e',
    },
    exportDescription: {
        color: '#666',
        margin: '0 0 20px 0',
    },
    exportButtons: {
        display: 'flex',
        gap: '15px',
    },
    exportButton: {
        padding: '10px 20px',
        backgroundColor: '#28a745',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        fontSize: '14px',
    },
    dangerZone: {
        backgroundColor: '#fff5f5',
        padding: '25px',
        borderRadius: '15px',
        border: '2px solid #dc3545',
    },
    dangerTitle: {
        fontSize: '18px',
        color: '#dc3545',
        margin: '0 0 10px 0',
    },
    dangerDescription: {
        color: '#666',
        margin: '0 0 20px 0',
    },
    deleteAccountButton: {
        padding: '10px 20px',
        backgroundColor: '#dc3545',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        fontSize: '14px',
    },
};

export default ProfileEditPage;