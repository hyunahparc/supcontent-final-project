import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
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
import { getMessagesWithUser, sendMessage } from '../../src/api/messages';
import { getUserProfile } from '../../src/api/users';
import { useAuth } from '../../src/context/AuthContext';
import { colors } from '../../src/theme/colors';

function timeLabel(dateString) {
    if (!dateString) return '';

    return new Date(dateString).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
    });
}

export default function MessageThreadScreen() {
    const { userId } = useLocalSearchParams();
    const otherUserId = Array.isArray(userId) ? userId[0] : userId;
    const insets = useSafeAreaInsets();
    const scrollRef = useRef(null);
    const { user, token, isAuthenticated } = useAuth();
    const [profile, setProfile] = useState(null);
    const [messages, setMessages] = useState([]);
    const [draft, setDraft] = useState('');
    const [canChat, setCanChat] = useState(true);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState('');

    const loadThread = useCallback(async ({ silent = false } = {}) => {
        if (!token || !otherUserId) {
            setLoading(false);
            return;
        }

        if (!silent) setError('');

        try {
            const [profileData, threadData] = await Promise.all([
                getUserProfile(otherUserId, token),
                getMessagesWithUser(otherUserId, token),
            ]);

            setProfile(profileData);
            setMessages(threadData?.messages ?? []);
            setCanChat(Boolean(threadData?.can_chat));
        } catch (err) {
            if (!silent) setError(err.message || 'Unable to load this conversation.');
        } finally {
            setLoading(false);
        }
    }, [otherUserId, token]);

    useEffect(() => {
        if (!token || !otherUserId) {
            setLoading(false);
            return undefined;
        }

        loadThread();

        const intervalId = setInterval(() => {
            loadThread({ silent: true });
        }, 5000);

        return () => clearInterval(intervalId);
    }, [loadThread]);

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            scrollRef.current?.scrollToEnd({ animated: true });
        }, 80);

        return () => clearTimeout(timeoutId);
    }, [messages.length]);

    async function handleSend() {
        const content = draft.trim();
        if (!content || !token || !otherUserId || sending) return;

        setDraft('');
        setSending(true);
        setError('');

        try {
            const saved = await sendMessage(otherUserId, content, token);
            setMessages((current) => [...current, saved]);
        } catch (err) {
            setDraft(content);
            setError(err.message || 'Unable to send message.');
        } finally {
            setSending(false);
        }
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

    const initial = profile?.username?.charAt(0)?.toUpperCase() ?? '?';

    return (
        <KeyboardAvoidingView
            style={styles.page}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
        >
            <View style={[styles.header, { paddingTop: Math.max(insets.top + 10, 34) }]}>
                <Pressable onPress={() => router.back()} hitSlop={10} style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
                    <Ionicons name="chevron-back" size={24} color={colors.text} />
                </Pressable>

                <Pressable
                    onPress={() => otherUserId && router.push(`/users/${otherUserId}`)}
                    style={({ pressed }) => [styles.identity, pressed && styles.pressed]}
                >
                    {profile?.avatar ? (
                        <Image source={{ uri: profile.avatar }} style={styles.headerAvatar} />
                    ) : (
                        <View style={styles.headerAvatarFallback}>
                            <Text style={styles.headerAvatarText}>{initial}</Text>
                        </View>
                    )}
                    <View style={styles.identityText}>
                        <Text style={styles.username} numberOfLines={1}>{profile?.username ?? 'Messages'}</Text>
                        <Text style={styles.subtitle}>{canChat ? 'Mutual follower' : 'Conversation archived'}</Text>
                    </View>
                </Pressable>
            </View>

            {loading ? (
                <View style={styles.loadingBlock}>
                    <ActivityIndicator color={colors.accent} />
                    <Text style={styles.loadingText}>Loading messages...</Text>
                </View>
            ) : (
                <>
                    <ScrollView
                        ref={scrollRef}
                        style={styles.messagesArea}
                        contentContainerStyle={styles.messagesContent}
                        showsVerticalScrollIndicator={false}
                    >
                        {messages.length ? (
                            messages.map((message) => (
                                <MessageBubble
                                    key={message.message_id}
                                    message={message}
                                    isMine={Number(message.sender_id) === Number(user?.user_id)}
                                />
                            ))
                        ) : (
                            <View style={styles.emptyBlock}>
                                <Text style={styles.emptyTitle}>Say hello</Text>
                                <Text style={styles.emptyText}>Messages refresh automatically every few seconds.</Text>
                            </View>
                        )}
                    </ScrollView>

                    {error ? <Text style={styles.errorText}>{error}</Text> : null}

                    {canChat ? (
                        <View style={[styles.composer, { paddingBottom: Math.max(insets.bottom + 10, 18) }]}>
                            <TextInput
                                value={draft}
                                onChangeText={setDraft}
                                placeholder="Write a message"
                                placeholderTextColor={colors.textMuted}
                                maxLength={1000}
                                multiline
                                style={styles.input}
                            />
                            <Pressable
                                onPress={handleSend}
                                disabled={!draft.trim() || sending}
                                style={({ pressed }) => [
                                    styles.sendButton,
                                    (!draft.trim() || sending) && styles.disabled,
                                    pressed && styles.pressed,
                                ]}
                            >
                                {sending ? (
                                    <ActivityIndicator size="small" color={colors.accentText} />
                                ) : (
                                    <Ionicons name="send" size={18} color={colors.accentText} />
                                )}
                            </Pressable>
                        </View>
                    ) : (
                        <View style={[styles.lockedComposer, { paddingBottom: Math.max(insets.bottom + 12, 20) }]}>
                            <Text style={styles.lockedText}>
                                You can read this conversation, but new messages require mutual follow.
                            </Text>
                        </View>
                    )}
                </>
            )}
        </KeyboardAvoidingView>
    );
}

function MessageBubble({ message, isMine }) {
    return (
        <View style={[styles.messageRow, isMine ? styles.messageRowMine : styles.messageRowTheirs]}>
            <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleTheirs]}>
                <Text style={[styles.messageText, isMine && styles.messageTextMine]}>{message.content}</Text>
                <Text style={[styles.messageTime, isMine && styles.messageTimeMine]}>{timeLabel(message.created_at)}</Text>
            </View>
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
        minHeight: 86,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 16,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        backgroundColor: colors.background,
    },
    iconButton: {
        width: 38,
        height: 38,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 999,
        backgroundColor: colors.surface,
    },
    identity: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        minWidth: 0,
    },
    headerAvatar: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: colors.elevated,
    },
    headerAvatarFallback: {
        width: 42,
        height: 42,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 21,
        backgroundColor: colors.elevated,
        borderWidth: 1,
        borderColor: colors.border,
    },
    headerAvatarText: {
        color: colors.text,
        fontSize: 16,
        fontWeight: '900',
    },
    identityText: {
        flex: 1,
        minWidth: 0,
    },
    username: {
        color: colors.text,
        fontSize: 16,
        fontWeight: '900',
    },
    subtitle: {
        marginTop: 2,
        color: colors.textSecondary,
        fontSize: 12,
        fontWeight: '700',
    },
    loadingBlock: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
    },
    loadingText: {
        color: colors.textSecondary,
        fontSize: 14,
    },
    messagesArea: {
        flex: 1,
    },
    messagesContent: {
        flexGrow: 1,
        justifyContent: 'flex-end',
        gap: 8,
        paddingHorizontal: 16,
        paddingTop: 18,
        paddingBottom: 16,
    },
    emptyBlock: {
        alignItems: 'center',
        justifyContent: 'center',
        gap: 7,
        paddingVertical: 54,
        paddingHorizontal: 24,
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
    messageRow: {
        flexDirection: 'row',
    },
    messageRowMine: {
        justifyContent: 'flex-end',
    },
    messageRowTheirs: {
        justifyContent: 'flex-start',
    },
    bubble: {
        maxWidth: '78%',
        paddingHorizontal: 13,
        paddingTop: 10,
        paddingBottom: 7,
        borderRadius: 18,
    },
    bubbleMine: {
        backgroundColor: colors.accent,
        borderBottomRightRadius: 6,
    },
    bubbleTheirs: {
        backgroundColor: colors.surface,
        borderBottomLeftRadius: 6,
    },
    messageText: {
        color: colors.text,
        fontSize: 14,
        lineHeight: 20,
    },
    messageTextMine: {
        color: colors.accentText,
        fontWeight: '700',
    },
    messageTime: {
        marginTop: 4,
        color: colors.textMuted,
        fontSize: 10,
        fontWeight: '700',
        textAlign: 'right',
    },
    messageTimeMine: {
        color: 'rgba(0,0,0,0.62)',
    },
    errorText: {
        paddingHorizontal: 18,
        paddingBottom: 6,
        color: colors.danger,
        fontSize: 13,
        fontWeight: '700',
    },
    composer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 10,
        paddingHorizontal: 14,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        backgroundColor: colors.background,
    },
    input: {
        flex: 1,
        maxHeight: 112,
        minHeight: 44,
        paddingHorizontal: 15,
        paddingTop: 12,
        paddingBottom: 10,
        borderRadius: 22,
        backgroundColor: colors.surface,
        color: colors.text,
        fontSize: 14,
        lineHeight: 19,
    },
    sendButton: {
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 22,
        backgroundColor: colors.accent,
    },
    lockedComposer: {
        paddingHorizontal: 18,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        backgroundColor: colors.background,
    },
    lockedText: {
        color: colors.textSecondary,
        fontSize: 13,
        lineHeight: 19,
        textAlign: 'center',
    },
    disabled: {
        opacity: 0.5,
    },
    pressed: {
        opacity: 0.78,
    },
});
