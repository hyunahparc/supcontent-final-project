import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Image,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getNotifications, markAllRead, markOneRead } from '../src/api/notifications';
import { useAuth } from '../src/context/AuthContext';
import { useLanguage } from '../src/context/LanguageContext';
import { colors } from '../src/theme/colors';

function timeAgo(dateString, language) {
    const diff = Date.now() - new Date(dateString).getTime();
    const mins = Math.floor(diff / 60000);

    if (mins < 1) return 'now';
    if (mins < 60) return `${mins}m`;

    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;

    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}j`;

    return new Date(dateString).toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', { month: 'short', day: 'numeric' });
}

function notificationText(notification, t) {
    if (notification.type === 'like') return `${notification.source_username} ${t('notif_liked')}`;
    if (notification.type === 'comment') return `${notification.source_username} ${t('notif_commented')}`;
    if (notification.type === 'follow') return `${notification.source_username} ${t('notif_following')}`;

    return t('notif_title');
}

function notificationRoute(notification) {
    if (notification.type === 'follow' && notification.source_user_id) {
        return `/users/${notification.source_user_id}`;
    }

    if (notification.media_id) {
        const routeType = notification.media_type === 'Series' || notification.media_type === 'tv' ? 'tv' : 'movie';
        return `/${routeType}/${notification.media_id}`;
    }

    return null;
}

export default function NotificationsScreen() {
    const insets = useSafeAreaInsets();
    const { token, isAuthenticated } = useAuth();
    const { t, language } = useLanguage();
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState('');

    const loadNotifications = useCallback(async ({ silent = false } = {}) => {
        if (!token) {
            setNotifications([]);
            setLoading(false);
            return;
        }

        if (!silent) setError('');

        try {
            const data = await getNotifications(token);
            const nextNotifications = data ?? [];
            const hasUnread = nextNotifications.some((item) => !item.is_read);

            setNotifications(nextNotifications);

            if (hasUnread) {
                await markAllRead(token);
            }
        } catch (err) {
            if (!silent) setError(err.message || t('notif_error'));
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [token]);

    useEffect(() => {
        loadNotifications();
    }, [loadNotifications]);

    useEffect(() => {
        if (!token) return undefined;

        const intervalId = setInterval(() => {
            loadNotifications({ silent: true });
        }, 30000);

        return () => clearInterval(intervalId);
    }, [loadNotifications, token]);

    async function handleRefresh() {
        setRefreshing(true);
        await loadNotifications();
    }

    async function handleMarkAllRead() {
        await markAllRead(token);
        setNotifications((current) => current.map((item) => ({ ...item, is_read: true })));
    }

    async function handleNotificationPress(notification) {
        if (!notification.is_read) {
            await markOneRead(notification.notification_id, token);
            setNotifications((current) =>
                current.map((item) =>
                    item.notification_id === notification.notification_id
                        ? { ...item, is_read: true }
                        : item
                )
            );
        }

        const route = notificationRoute(notification);
        if (route) router.push(route);
    }

    if (!isAuthenticated) {
        return (
            <View style={[styles.statePage, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
                <Ionicons name="notifications-outline" size={36} color={colors.textMuted} />
                <Text style={styles.stateTitle}>{t('notif_title')}</Text>
                <Text style={styles.stateText}>{t('notif_login_prompt')}</Text>
                <Pressable onPress={() => router.push('/login')} style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}>
                    <Text style={styles.primaryButtonText}>{t('notif_login')}</Text>
                </Pressable>
            </View>
        );
    }

    const hasUnread = notifications.some((item) => !item.is_read);

    return (
        <ScrollView
            style={styles.page}
            contentContainerStyle={{
                paddingTop: Math.max(insets.top + 18, 44),
                paddingBottom: Math.max(insets.bottom + 24, 42),
                paddingHorizontal: 20,
            }}
            refreshControl={
                <RefreshControl
                    refreshing={refreshing}
                    onRefresh={handleRefresh}
                    tintColor={colors.accent}
                    colors={[colors.accent]}
                />
            }
            showsVerticalScrollIndicator={false}
        >
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} hitSlop={10} style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
                    <Ionicons name="chevron-back" size={24} color={colors.text} />
                </Pressable>

                <Text style={styles.heading}>{t('notif_title')}</Text>

                {hasUnread ? (
                    <Pressable onPress={handleMarkAllRead} hitSlop={10} style={({ pressed }) => [styles.markAllButton, pressed && styles.pressed]}>
                        <Text style={styles.markAllText}>{t('notif_read_all')}</Text>
                    </Pressable>
                ) : (
                    <View style={styles.headerSpacer} />
                )}
            </View>

            {loading ? (
                <View style={styles.loadingBlock}>
                    <ActivityIndicator color={colors.accent} />
                    <Text style={styles.loadingText}>{t('notif_loading')}</Text>
                </View>
            ) : error ? (
                <View style={styles.emptyBlock}>
                    <Text style={styles.emptyTitle}>{t('notif_error')}</Text>
                    <Text style={styles.emptyText}>{error}</Text>
                </View>
            ) : notifications.length ? (
                <View style={styles.list}>
                    {notifications.map((notification) => (
                        <NotificationCard
                            key={notification.notification_id}
                            notification={notification}
                            onPress={() => handleNotificationPress(notification)}
                        />
                    ))}
                </View>
            ) : (
                <View style={styles.emptyBlock}>
                    <Ionicons name="notifications-off-outline" size={34} color={colors.textMuted} />
                    <Text style={styles.emptyTitle}>{t('notif_empty_title')}</Text>
                    <Text style={styles.emptyText}>{t('notif_empty_body')}</Text>
                </View>
            )}
        </ScrollView>
    );
}

function NotificationCard({ notification, onPress }) {
    const { t, language } = useLanguage();
    const initial = notification.source_username?.charAt(0)?.toUpperCase() ?? '?';

    return (
        <Pressable
            onPress={onPress}
            style={({ pressed }) => [
                styles.card,
                !notification.is_read && styles.unreadCard,
                pressed && styles.pressed,
            ]}
        >
            <Pressable
                onPress={() => router.push(`/users/${notification.source_user_id}`)}
                hitSlop={8}
                style={styles.avatarWrap}
            >
                {notification.source_avatar ? (
                    <Image source={{ uri: notification.source_avatar }} style={styles.avatar} />
                ) : (
                    <View style={styles.avatarFallback}>
                        <Text style={styles.avatarInitial}>{initial}</Text>
                    </View>
                )}
            </Pressable>

            <View style={styles.cardContent}>
                <Text style={styles.cardText}>{notificationText(notification, t)}</Text>
                {notification.media_title ? (
                    <Text style={styles.mediaTitle} numberOfLines={1}>{notification.media_title}</Text>
                ) : null}
                <Text style={styles.timeText}>{timeAgo(notification.created_at, language)}</Text>
            </View>

            {!notification.is_read ? <View style={styles.unreadDot} /> : null}
        </Pressable>
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
    markAllButton: {
        minHeight: 38,
        justifyContent: 'center',
        paddingHorizontal: 12,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: colors.borderVisible,
    },
    markAllText: {
        color: colors.textSecondary,
        fontSize: 12,
        fontWeight: '900',
    },
    headerSpacer: {
        width: 76,
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
    emptyBlock: {
        alignItems: 'center',
        gap: 10,
        paddingVertical: 64,
        paddingHorizontal: 24,
        borderRadius: 14,
        backgroundColor: colors.surface,
    },
    emptyTitle: {
        color: colors.text,
        fontSize: 18,
        fontWeight: '900',
        textAlign: 'center',
    },
    emptyText: {
        color: colors.textMuted,
        fontSize: 14,
        lineHeight: 21,
        textAlign: 'center',
    },
    list: {
        gap: 10,
    },
    card: {
        minHeight: 76,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 13,
        padding: 14,
        borderRadius: 12,
        backgroundColor: colors.surface,
    },
    unreadCard: {
        backgroundColor: '#18281b',
        borderWidth: 1,
        borderColor: 'rgba(30, 215, 96, 0.28)',
    },
    avatarWrap: {
        flexShrink: 0,
    },
    avatar: {
        width: 46,
        height: 46,
        borderRadius: 23,
        backgroundColor: colors.elevated,
    },
    avatarFallback: {
        width: 46,
        height: 46,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 23,
        backgroundColor: colors.elevated,
        borderWidth: 1,
        borderColor: colors.border,
    },
    avatarInitial: {
        color: colors.text,
        fontSize: 17,
        fontWeight: '900',
    },
    cardContent: {
        flex: 1,
        minWidth: 0,
    },
    cardText: {
        color: colors.text,
        fontSize: 14,
        fontWeight: '800',
        lineHeight: 20,
    },
    mediaTitle: {
        marginTop: 2,
        color: colors.textSecondary,
        fontSize: 13,
        fontWeight: '700',
    },
    timeText: {
        marginTop: 5,
        color: colors.textMuted,
        fontSize: 12,
        fontWeight: '700',
    },
    unreadDot: {
        width: 9,
        height: 9,
        borderRadius: 999,
        backgroundColor: colors.accent,
    },
    pressed: {
        opacity: 0.78,
    },
});
