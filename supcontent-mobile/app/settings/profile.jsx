import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Image,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getUserProfile, updateMyProfile, uploadAvatar, updateLanguage } from '../../src/api/users';
import { useAuth } from '../../src/context/AuthContext';
import { useLanguage } from '../../src/context/LanguageContext';
import { colors } from '../../src/theme/colors';

const MAX_BIO = 500;

export default function EditProfileScreen() {
    const insets = useSafeAreaInsets();
    const { user, token, isAuthenticated, updateUser } = useAuth();
    const { language, setLanguage, t } = useLanguage();
    const [username, setUsername] = useState('');
    const [bio, setBio] = useState('');
    const [link, setLink] = useState('');
    const [avatar, setAvatar] = useState('');
    const [selectedAvatar, setSelectedAvatar] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [savingLang, setSavingLang] = useState(false);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        let cancelled = false;

        if (!isAuthenticated || !user?.user_id) {
            setLoading(false);
            return undefined;
        }

        getUserProfile(user.user_id, token)
            .then((profile) => {
                if (cancelled) return;
                setUsername(profile.username ?? '');
                setBio(profile.bio ?? '');
                setLink(profile.link ?? '');
                setAvatar(profile.avatar ?? '');
            })
            .catch(() => {
                if (cancelled) return;
                setUsername(user.username ?? '');
                setAvatar(user.avatar ?? '');
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [isAuthenticated, token, user]);

    async function handleSave() {
        const trimmedUsername = username.trim();
        const trimmedLink = link.trim();

        setError('');
        setSuccess('');

        if (trimmedUsername.length < 3 || trimmedUsername.length > 50) {
            setError(t('settings_username_min'));
            return;
        }

        if (bio.length > MAX_BIO) {
            setError(`${t('settings_bio_max')} ${MAX_BIO} ${t('settings_bio_max_chars')}`);
            return;
        }

        if (trimmedLink && !/^https?:\/\//i.test(trimmedLink)) {
            setError(t('settings_website_invalid'));
            return;
        }

        setSaving(true);

        try {
            const updated = await updateMyProfile({
                username: trimmedUsername,
                bio,
                link: trimmedLink || null,
            }, token);

            await updateUser({
                username: updated.username,
                avatar: updated.avatar ?? user.avatar ?? null,
            });

            setSuccess(t('settings_saved'));
        } catch (err) {
            setError(err.message || t('settings_failed_save'));
        } finally {
            setSaving(false);
        }
    }

    async function handlePickAvatar() {
        setError('');
        setSuccess('');

        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (!permission.granted) {
            setError(t('settings_unsupported_format'));
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.85,
        });

        if (result.canceled) return;

        const image = result.assets?.[0];
        if (!image) return;

        if (image.fileSize && image.fileSize > 5 * 1024 * 1024) {
            setError(t('settings_too_large'));
            return;
        }

        setSelectedAvatar(image);
        setAvatar(image.uri);
    }

    async function handleUploadAvatar() {
        if (!selectedAvatar || !token) return;

        setUploadingAvatar(true);
        setError('');
        setSuccess('');

        try {
            const updated = await uploadAvatar(selectedAvatar, token);
            setAvatar(updated.avatar ?? '');
            setSelectedAvatar(null);
            await updateUser({ avatar: updated.avatar ?? null });
            setSuccess(t('settings_avatar_updated'));
        } catch (err) {
            setError(err.message || t('settings_upload_failed'));
        } finally {
            setUploadingAvatar(false);
        }
    }

    async function handleLanguageChange(lang) {
        if (lang === language || savingLang) return;
        const prev = language;
        setLanguage(lang);
        setSavingLang(true);
        try {
            await updateLanguage(lang, token);
            await updateUser({ preferred_language: lang });
        } catch {
            setLanguage(prev);
        } finally {
            setSavingLang(false);
        }
    }

    if (!isAuthenticated) {
        return (
            <View style={[styles.statePage, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
                <Ionicons name="person-circle-outline" size={38} color={colors.textMuted} />
                <Text style={styles.stateTitle}>{t('settings_login_required')}</Text>
                <Text style={styles.stateText}>{t('settings_login_to_edit')}</Text>
                <Pressable onPress={() => router.push('/login')} style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}>
                    <Text style={styles.primaryButtonText}>{t('settings_log_in')}</Text>
                </Pressable>
            </View>
        );
    }

    const initial = username?.charAt(0)?.toUpperCase() || user?.username?.charAt(0)?.toUpperCase() || '?';

    return (
        <KeyboardAvoidingView
            style={styles.page}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <ScrollView
                contentContainerStyle={{
                    paddingTop: Math.max(insets.top + 18, 44),
                    paddingBottom: Math.max(insets.bottom + 28, 48),
                    paddingHorizontal: 20,
                }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.header}>
                    <Pressable onPress={() => router.back()} hitSlop={10} style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
                        <Ionicons name="chevron-back" size={24} color={colors.text} />
                    </Pressable>
                    <Text style={styles.heading}>{t('settings_edit_profile')}</Text>
                    <View style={styles.headerSpacer} />
                </View>

                {loading ? (
                    <View style={styles.loadingBlock}>
                        <ActivityIndicator color={colors.accent} />
                        <Text style={styles.loadingText}>{t('settings_loading_profile')}</Text>
                    </View>
                ) : (
                    <>
                        <View style={styles.avatarCard}>
                            <Pressable onPress={handlePickAvatar} style={({ pressed }) => [styles.avatarPressable, pressed && styles.pressed]}>
                                {avatar ? (
                                    <Image source={{ uri: avatar }} style={styles.avatar} />
                                ) : (
                                    <View style={styles.avatarFallback}>
                                        <Text style={styles.avatarInitial}>{initial}</Text>
                                    </View>
                                )}
                                <View style={styles.avatarOverlay}>
                                    <Ionicons name="camera" size={18} color={colors.text} />
                                </View>
                            </Pressable>
                            <View style={styles.avatarTextBlock}>
                                <Text style={styles.avatarTitle}>{t('settings_profile_picture')}</Text>
                                <Text style={styles.avatarHint}>{t('settings_image_hint')}</Text>
                                <View style={styles.avatarActions}>
                                    <Pressable
                                        onPress={handlePickAvatar}
                                        style={({ pressed }) => [styles.avatarActionButton, pressed && styles.pressed]}
                                    >
                                        <Text style={styles.avatarActionText}>{t('settings_choose')}</Text>
                                    </Pressable>
                                    {selectedAvatar ? (
                                        <Pressable
                                            onPress={handleUploadAvatar}
                                            disabled={uploadingAvatar}
                                            style={({ pressed }) => [styles.avatarUploadButton, uploadingAvatar && styles.disabled, pressed && styles.pressed]}
                                        >
                                            {uploadingAvatar ? (
                                                <ActivityIndicator size="small" color={colors.accentText} />
                                            ) : (
                                                <Text style={styles.avatarUploadText}>{t('settings_upload')}</Text>
                                            )}
                                        </Pressable>
                                    ) : null}
                                </View>
                            </View>
                        </View>

                        {success ? <Text style={styles.successBanner}>{success}</Text> : null}
                        {error ? <Text style={styles.errorBanner}>{error}</Text> : null}

                        <View style={styles.card}>
                            <FieldLabel label={t('settings_username')} value={`${username.length} / 50`} />
                            <TextInput
                                value={username}
                                onChangeText={setUsername}
                                maxLength={50}
                                autoCapitalize="none"
                                placeholder={t('settings_username_placeholder')}
                                placeholderTextColor={colors.textMuted}
                                style={styles.input}
                            />

                            <FieldLabel label={t('settings_bio')} value={`${bio.length} / ${MAX_BIO}`} />
                            <TextInput
                                value={bio}
                                onChangeText={setBio}
                                maxLength={MAX_BIO}
                                multiline
                                placeholder={t('settings_bio_placeholder')}
                                placeholderTextColor={colors.textMuted}
                                style={[styles.input, styles.bioInput]}
                            />

                            <FieldLabel label={t('settings_website')} />
                            <TextInput
                                value={link}
                                onChangeText={setLink}
                                autoCapitalize="none"
                                keyboardType="url"
                                placeholder={t('settings_website_placeholder')}
                                placeholderTextColor={colors.textMuted}
                                style={styles.input}
                            />

                            <Pressable
                                onPress={handleSave}
                                disabled={saving}
                                style={({ pressed }) => [styles.saveButton, saving && styles.disabled, pressed && styles.pressed]}
                            >
                                {saving ? (
                                    <ActivityIndicator color={colors.accentText} />
                                ) : (
                                    <Text style={styles.saveButtonText}>{t('settings_save')}</Text>
                                )}
                            </Pressable>
                        </View>

                        {/* Language preference */}
                        <View style={styles.card}>
                            <View style={styles.prefRow}>
                                <View>
                                    <Text style={styles.prefLabel}>{t('settings_language')}</Text>
                                    {savingLang ? <Text style={styles.prefHint}>{t('settings_language_saving')}</Text> : null}
                                </View>
                                <View style={styles.langToggle}>
                                    <Pressable
                                        onPress={() => handleLanguageChange('fr')}
                                        style={({ pressed }) => [styles.langBtn, language === 'fr' && styles.langBtnActive, pressed && styles.pressed]}
                                    >
                                        <Text style={[styles.langBtnText, language === 'fr' && styles.langBtnTextActive]}>FR</Text>
                                    </Pressable>
                                    <Pressable
                                        onPress={() => handleLanguageChange('en')}
                                        style={({ pressed }) => [styles.langBtn, language === 'en' && styles.langBtnActive, pressed && styles.pressed]}
                                    >
                                        <Text style={[styles.langBtnText, language === 'en' && styles.langBtnTextActive]}>EN</Text>
                                    </Pressable>
                                </View>
                            </View>
                        </View>
                    </>
                )}
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

function FieldLabel({ label, value }) {
    return (
        <View style={styles.fieldHeader}>
            <Text style={styles.label}>{label}</Text>
            {value ? <Text style={styles.charCount}>{value}</Text> : null}
        </View>
    );
}

const styles = StyleSheet.create({
    page: {
        flex: 1,
        backgroundColor: colors.background,
    },
    statePage: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 14,
        paddingHorizontal: 24,
        backgroundColor: colors.background,
    },
    stateTitle: {
        color: colors.text,
        fontSize: 24,
        fontWeight: '900',
    },
    stateText: {
        color: colors.textSecondary,
        fontSize: 14,
        lineHeight: 21,
        textAlign: 'center',
    },
    primaryButton: {
        minHeight: 46,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 8,
        paddingHorizontal: 28,
        borderRadius: 999,
        backgroundColor: colors.accent,
    },
    primaryButtonText: {
        color: colors.accentText,
        fontSize: 14,
        fontWeight: '900',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 24,
    },
    iconButton: {
        width: 38,
        height: 38,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 999,
        backgroundColor: colors.surface,
    },
    heading: {
        color: colors.text,
        fontSize: 24,
        fontWeight: '900',
    },
    headerSpacer: {
        width: 38,
    },
    loadingBlock: {
        alignItems: 'center',
        gap: 12,
        paddingVertical: 70,
    },
    loadingText: {
        color: colors.textSecondary,
        fontSize: 14,
    },
    avatarCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        marginBottom: 18,
        padding: 18,
        borderRadius: 12,
        backgroundColor: colors.surface,
    },
    avatarPressable: {
        position: 'relative',
        width: 76,
        height: 76,
        borderRadius: 38,
    },
    avatar: {
        width: 76,
        height: 76,
        borderRadius: 38,
        backgroundColor: colors.elevated,
    },
    avatarFallback: {
        width: 76,
        height: 76,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 38,
        backgroundColor: colors.elevated,
        borderWidth: 2,
        borderColor: colors.border,
    },
    avatarInitial: {
        color: colors.text,
        fontSize: 30,
        fontWeight: '900',
    },
    avatarOverlay: {
        position: 'absolute',
        right: 0,
        bottom: 0,
        width: 28,
        height: 28,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 14,
        backgroundColor: 'rgba(0,0,0,0.78)',
        borderWidth: 1,
        borderColor: colors.borderVisible,
    },
    avatarTextBlock: {
        flex: 1,
        minWidth: 0,
    },
    avatarTitle: {
        color: colors.text,
        fontSize: 16,
        fontWeight: '900',
    },
    avatarHint: {
        marginTop: 5,
        color: colors.textMuted,
        fontSize: 12,
        lineHeight: 17,
    },
    avatarActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 12,
    },
    avatarActionButton: {
        minHeight: 34,
        justifyContent: 'center',
        paddingHorizontal: 14,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: colors.borderVisible,
    },
    avatarActionText: {
        color: colors.text,
        fontSize: 12,
        fontWeight: '900',
    },
    avatarUploadButton: {
        minHeight: 34,
        minWidth: 78,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 14,
        borderRadius: 999,
        backgroundColor: colors.accent,
    },
    avatarUploadText: {
        color: colors.accentText,
        fontSize: 12,
        fontWeight: '900',
    },
    successBanner: {
        marginBottom: 12,
        padding: 13,
        overflow: 'hidden',
        borderRadius: 10,
        backgroundColor: '#0d2b1a',
        color: colors.accent,
        fontSize: 13,
        fontWeight: '800',
    },
    errorBanner: {
        marginBottom: 12,
        padding: 13,
        overflow: 'hidden',
        borderRadius: 10,
        backgroundColor: '#2b0d0d',
        color: colors.danger,
        fontSize: 13,
        fontWeight: '800',
    },
    card: {
        padding: 18,
        borderRadius: 12,
        backgroundColor: colors.surface,
        marginBottom: 14,
    },
    fieldHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    label: {
        color: colors.textSecondary,
        fontSize: 12,
        fontWeight: '900',
        textTransform: 'uppercase',
    },
    charCount: {
        color: colors.textMuted,
        fontSize: 12,
        fontWeight: '700',
    },
    input: {
        minHeight: 48,
        marginBottom: 18,
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderRadius: 8,
        backgroundColor: colors.elevated,
        borderWidth: 1,
        borderColor: colors.border,
        color: colors.text,
        fontSize: 14,
    },
    bioInput: {
        minHeight: 116,
        textAlignVertical: 'top',
        lineHeight: 20,
    },
    saveButton: {
        minHeight: 48,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 999,
        backgroundColor: colors.accent,
    },
    saveButtonText: {
        color: colors.accentText,
        fontSize: 14,
        fontWeight: '900',
    },
    prefRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
    },
    prefLabel: {
        color: colors.text,
        fontSize: 14,
        fontWeight: '900',
    },
    prefHint: {
        color: colors.textMuted,
        fontSize: 12,
        marginTop: 2,
    },
    langToggle: {
        flexDirection: 'row',
        gap: 8,
    },
    langBtn: {
        paddingHorizontal: 18,
        paddingVertical: 7,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: colors.borderVisible,
    },
    langBtnActive: {
        backgroundColor: colors.accent,
        borderColor: colors.accent,
    },
    langBtnText: {
        color: colors.textSecondary,
        fontSize: 13,
        fontWeight: '900',
    },
    langBtnTextActive: {
        color: colors.accentText,
    },
    disabled: {
        opacity: 0.55,
    },
    pressed: {
        opacity: 0.78,
    },
});
