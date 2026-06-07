import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
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
import { getConversations } from '../src/api/messages';
import { useAuth } from '../src/context/AuthContext';
import { colors } from '../src/theme/colors';

function shortDate(dateString) {
    if (!dateString) return 'No messages yet';

    const date = new Date(dateString);
    const now = new Date();

    if (date.toDateString() === now.toDateString()) {
        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    }

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function MessagesScreen() {
    const insets = useSafeAreaInsets();
    const { token, isAuthenticated } = useAuth();
    const [conversations, setConversations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState('');

    const loadConversations = useCallback(async ({ silent = false } = {}) => {
        if (!token) {
            setConversations([]);
            setLoading(false);
            return;
        }

        if (!silent) setError('');

        try {
            const data = await getConversations(token);
            setConversations(data ?? []);
        } catch (err) {
            if (!silent) setError(err.message || 'Unable to load messages.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [token]);

    useFocusEffect(
        useCallback(() => {
            loadConversations();

            const intervalId = setInterval(() => {
                loadConversations({ silent: true });
            }, 10000);

            return () => clearInterval(intervalId);
        }, [loadConversations])
    );

    async function handleRefresh() {
        setRefreshing(true);
        await loadConversations();
    }

    if (!isAuthenticated) {
        return (
            <View style={[styles.statePage, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
                <Ionicons name="chatbubbles-outline" size={36} color={colors.textMuted} />
                <Text style={styles.stateTitle}>Messages</Text>
                <Text style={styles.stateText}>Log in to chat with mutual followers.</Text>
                <Pressable onPress={() => router.push('/login')} style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}>
                    <Text style={styles.primaryButtonText}>Log in</Text>
                </Pressable>
            </View>
        );
    }

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
                <Text style={styles.heading}>Messages</Text>
                <View style={styles.headerSpacer} />
            </View>

            {loading ? (
                <View style={styles.loadingBlock}>
                    <ActivityIndicator color={colors.accent} />
                    <Text style={styles.loadingText}>Loading conversations...</Text>
                </View>
            ) : error ? (
                <View style={styles.emptyBlock}>
                    <Text style={styles.emptyTitle}>Unable to load messages</Text>
                    <Text style={styles.emptyText}>{error}</Text>
                </View>
            ) : conversations.length ? (
                <View style={styles.list}>
                    {conversations.map((conversation) => (
                        <ConversationCard key={conversation.user_id} conversation={conversation} />
                    ))}
                </View>
            ) : (
                <View style={styles.emptyBlock}>
                    <Ionicons name="chatbubble-ellipses-outline" size={34} color={colors.textMuted} />
                    <Text style={styles.emptyTitle}>No conversations yet</Text>
                    <Text style={styles.emptyText}>Private messages are available when two users follow each other.</Text>
                </View>
            )}
        </ScrollView>
    );
}

function ConversationCard({ conversation }) {
    const initial = conversation.username?.charAt(0)?.toUpperCase() ?? '?';
    const unreadCount = Number(conversation.unread_count ?? 0);

    return (
        <Pressable
            onPress={() => router.push(`/messages/${conversation.user_id}`)}
            style={({ pressed }) => [styles.card, unreadCount > 0 && styles.unreadCard, pressed && styles.pressed]}
        >
            {conversation.avatar ? (
                <Image source={{ uri: conversation.avatar }} style={styles.avatar} />
            ) : (
                <View style={styles.avatarFallback}>
                    <Text style={styles.avatarInitial}>{initial}</Text>
                </View>
            )}

            <View style={styles.cardContent}>
                <View style={styles.cardTop}>
                    <Text style={styles.username} numberOfLines={1}>{conversation.username}</Text>
                    <Text style={styles.timeText}>{shortDate(conversation.last_message_at)}</Text>
                </View>
                <Text style={[styles.lastMessage, unreadCount > 0 && styles.unreadText]} numberOfLines={1}>
                    {conversation.last_message || 'Start the conversation'}
                </Text>
                {!conversation.can_chat ? <Text style={styles.archivedText}>Conversation archived</Text> : null}
            </View>

            {unreadCount > 0 ? (
                <View style={styles.unreadBadge}>
                    <Text style={styles.unreadBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                </View>
            ) : null}
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
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: colors.elevated,
    },
    avatarFallback: {
        width: 48,
        height: 48,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 24,
        backgroundColor: colors.elevated,
        borderWidth: 1,
        borderColor: colors.border,
    },
    avatarInitial: {
        color: colors.text,
        fontSize: 18,
        fontWeight: '900',
    },
    cardContent: {
        flex: 1,
        minWidth: 0,
    },
    cardTop: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    username: {
        flex: 1,
        color: colors.text,
        fontSize: 15,
        fontWeight: '900',
    },
    timeText: {
        color: colors.textMuted,
        fontSize: 11,
        fontWeight: '700',
    },
    lastMessage: {
        marginTop: 3,
        color: colors.textSecondary,
        fontSize: 13,
        fontWeight: '600',
    },
    unreadText: {
        color: colors.text,
        fontWeight: '900',
    },
    archivedText: {
        marginTop: 3,
        color: colors.warning,
        fontSize: 11,
        fontWeight: '800',
    },
    unreadBadge: {
        minWidth: 22,
        height: 22,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 6,
        borderRadius: 999,
        backgroundColor: colors.accent,
    },
    unreadBadgeText: {
        color: colors.accentText,
        fontSize: 11,
        fontWeight: '900',
    },
    pressed: {
        opacity: 0.78,
    },
});
