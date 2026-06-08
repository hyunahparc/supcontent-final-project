import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { getConversations, getMessagesWithUser, sendMessage } from '../api/messages';

const font = "'CircularSp', 'Helvetica Neue', helvetica, arial, sans-serif";
const POLL_INTERVAL_MS = 5000;

function timeLabel(dateStr, language) {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleTimeString(language === 'fr' ? 'fr-FR' : 'en-US', {
        hour: '2-digit',
        minute: '2-digit',
    });
}

function shortDate(dateStr, language, noMsgsLabel) {
    if (!dateStr) return noMsgsLabel;
    const date = new Date(dateStr);
    const now = new Date();
    if (date.toDateString() === now.toDateString()) return timeLabel(dateStr, language);
    return date.toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', { month: 'short', day: 'numeric' });
}

function Avatar({ user, size = 42 }) {
    const style = { width: size, height: size };

    if (user?.avatar) {
        return <img src={user.avatar} alt={user.username} style={{ ...s.avatar, ...style }} />;
    }

    return (
        <div style={{ ...s.avatarFallback, ...style, fontSize: size > 40 ? '16px' : '13px' }}>
            {user?.username?.[0]?.toUpperCase() ?? '?'}
        </div>
    );
}

export default function MessagesPage() {
    const { user } = useAuth();
    const { t, language } = useLanguage();
    const [conversations, setConversations] = useState([]);
    const [selectedUserId, setSelectedUserId] = useState(null);
    const [messages, setMessages] = useState([]);
    const [draft, setDraft] = useState('');
    const [canChat, setCanChat] = useState(true);
    const [loadingContacts, setLoadingContacts] = useState(true);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [error, setError] = useState(null);
    const [isCompact, setIsCompact] = useState(window.innerWidth < 760);
    const messagesEndRef = useRef(null);

    const selectedContact = useMemo(
        () => conversations.find(c => c.user_id === selectedUserId),
        [conversations, selectedUserId]
    );

    useEffect(() => {
        if (!user) return;

        getConversations()
            .then(data => {
                setConversations(data);
                setSelectedUserId(current => current ?? data[0]?.user_id ?? null);
            })
            .catch(() => setError(t('msg_error')))
            .finally(() => setLoadingContacts(false));
    }, [user]);

    useEffect(() => {
        const onResize = () => setIsCompact(window.innerWidth < 760);
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);

    useEffect(() => {
        if (!selectedUserId) return;

        let active = true;

        const loadMessages = (showLoading = false) => {
            if (showLoading) setLoadingMessages(true);
            getMessagesWithUser(selectedUserId)
                .then(data => {
                    if (!active) return;
                    setMessages(data.messages);
                    setCanChat(data.can_chat);
                })
                .catch(() => {
                    if (active) setError(t('msg_error_msgs'));
                })
                .finally(() => {
                    if (active && showLoading) setLoadingMessages(false);
                });
        };

        loadMessages(true);
        const id = setInterval(() => loadMessages(false), POLL_INTERVAL_MS);

        return () => {
            active = false;
            clearInterval(id);
        };
    }, [selectedUserId]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages.length, selectedUserId]);

    async function refreshConversations() {
        try {
            const data = await getConversations();
            setConversations(data);
        } catch {
            // The active chat should remain usable even if the sidebar refresh fails.
        }
    }

    async function handleSend(e) {
        e.preventDefault();
        if (!selectedUserId || !draft.trim()) return;

        const content = draft.trim();
        setDraft('');
        setError(null);

        try {
            const saved = await sendMessage(selectedUserId, content);
            setMessages(prev => [...prev, saved]);
            refreshConversations();
        } catch (err) {
            setDraft(content);
            setError(err.response?.data?.message ?? t('msg_error_send'));
        }
    }

    if (!user) return <Navigate to="/login" replace />;

    return (
        <main style={s.page}>
            <section style={{ ...s.shell, ...(isCompact ? s.shellCompact : {}) }}>
                <aside style={{ ...s.sidebar, ...(isCompact ? s.sidebarCompact : {}) }}>
                    <div style={s.sidebarHeader}>
                        <h1 style={s.heading}>{t('msg_title')}</h1>
                        <span style={s.count}>{conversations.length}</span>
                    </div>

                    {loadingContacts ? (
                        <p style={s.stateText}>{t('msg_loading')}</p>
                    ) : conversations.length === 0 ? (
                        <div style={s.emptySidebar}>
                            <p style={s.emptyTitle}>{t('msg_no_mutual')}</p>
                            <p style={s.emptyText}>{t('msg_no_mutual_body')}</p>
                        </div>
                    ) : (
                        <div style={s.contactList}>
                            {conversations.map(contact => (
                                <button
                                    type="button"
                                    key={contact.user_id}
                                    style={{
                                        ...s.contactButton,
                                        ...(selectedUserId === contact.user_id ? s.contactButtonActive : {}),
                                    }}
                                    onClick={() => setSelectedUserId(contact.user_id)}
                                >
                                    <Avatar user={contact} />
                                    <span style={s.contactMeta}>
                                        <span style={s.contactTop}>
                                            <span style={s.contactName}>{contact.username}</span>
                                            <span style={s.contactTime}>{shortDate(contact.last_message_at, language, t('msg_no_messages'))}</span>
                                        </span>
                                        <span style={s.lastMessage}>
                                            {contact.last_message || t('msg_start')}
                                        </span>
                                    </span>
                                </button>
                            ))}
                        </div>
                    )}
                </aside>

                <section style={{ ...s.chatPanel, ...(isCompact ? s.chatPanelCompact : {}) }}>
                    {selectedContact ? (
                        <>
                            <div style={s.chatHeader}>
                                <div style={s.chatIdentity}>
                                    <Avatar user={selectedContact} size={38} />
                                    <div>
                                        <Link to={`/users/${selectedContact.user_id}/profile`} style={s.profileLink}>
                                            {selectedContact.username}
                                        </Link>
                                        <p style={s.chatSub}>
                                            {canChat ? t('msg_mutual_follower') : t('msg_archived')}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div style={s.messagesArea}>
                                {loadingMessages ? (
                                    <p style={s.stateText}>{t('msg_loading_msgs')}</p>
                                ) : messages.length === 0 ? (
                                    <div style={s.emptyChat}>
                                        <p style={s.emptyTitle}>{t('msg_say_hello')}</p>
                                        <p style={s.emptyText}>{t('msg_refresh_note')}</p>
                                    </div>
                                ) : (
                                    messages.map(message => {
                                        const isMine = message.sender_id === user.user_id;
                                        return (
                                            <div
                                                key={message.message_id}
                                                style={{ ...s.messageRow, justifyContent: isMine ? 'flex-end' : 'flex-start' }}
                                            >
                                                <div style={{ ...s.bubble, ...(isMine ? s.bubbleMine : s.bubbleTheirs) }}>
                                                    <p style={s.messageText}>{message.content}</p>
                                                    <span style={s.messageTime}>{timeLabel(message.created_at, language)}</span>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            {error && <p style={s.error}>{error}</p>}

                            {canChat ? (
                                <form style={s.composer} onSubmit={handleSend}>
                                    <input
                                        value={draft}
                                        onChange={e => setDraft(e.target.value)}
                                        maxLength={1000}
                                        placeholder={t('msg_write')}
                                        style={s.input}
                                    />
                                    <button type="submit" style={s.sendButton} disabled={!draft.trim()}>
                                        {t('msg_send')}
                                    </button>
                                </form>
                            ) : (
                                <div style={s.lockedComposer}>
                                    <p style={s.lockedText}>{t('msg_readonly')}</p>
                                </div>
                            )}
                        </>
                    ) : (
                        <div style={s.noChat}>
                            <p style={s.emptyTitle}>{t('msg_choose_title')}</p>
                            <p style={s.emptyText}>{t('msg_choose_body')}</p>
                        </div>
                    )}
                </section>
            </section>
        </main>
    );
}

const s = {
    page: {
        minHeight: 'calc(100vh - 56px)',
        padding: '28px',
        color: 'var(--text-primary)',
        fontFamily: font,
    },
    shell: {
        display: 'grid',
        gridTemplateColumns: 'minmax(260px, 340px) minmax(0, 1fr)',
        gap: '16px',
        maxWidth: '1180px',
        height: 'calc(100vh - 112px)',
        minHeight: '560px',
        margin: '0 auto',
    },
    shellCompact: {
        gridTemplateColumns: '1fr',
        height: 'auto',
        minHeight: 0,
    },
    sidebar: {
        backgroundColor: 'var(--bg-elevated)',
        borderRadius: '8px',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
    },
    sidebarCompact: {
        maxHeight: '280px',
    },
    sidebarHeader: {
        height: '64px',
        padding: '0 18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid var(--border)',
    },
    heading: {
        margin: 0,
        fontSize: '24px',
        fontWeight: '700',
    },
    count: {
        color: 'var(--text-secondary)',
        fontSize: '12px',
        fontWeight: '700',
    },
    contactList: {
        overflowY: 'auto',
        padding: '8px',
    },
    contactButton: {
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '10px',
        backgroundColor: 'transparent',
        border: 0,
        borderRadius: '8px',
        color: 'var(--text-primary)',
        cursor: 'pointer',
        textAlign: 'left',
        fontFamily: font,
    },
    contactButtonActive: {
        backgroundColor: 'var(--bg-elevated)',
    },
    contactMeta: {
        flex: 1,
        minWidth: 0,
    },
    contactTop: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '8px',
        marginBottom: '2px',
    },
    contactName: {
        fontSize: '14px',
        fontWeight: '700',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
    },
    contactTime: {
        color: 'var(--text-muted)',
        fontSize: '11px',
        flexShrink: 0,
    },
    lastMessage: {
        display: 'block',
        color: 'var(--text-secondary)',
        fontSize: '12px',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
    },
    chatPanel: {
        minWidth: 0,
        backgroundColor: 'var(--bg-elevated)',
        borderRadius: '8px',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
    },
    chatPanelCompact: {
        height: 'calc(100vh - 420px)',
        minHeight: '420px',
    },
    chatHeader: {
        height: '64px',
        padding: '0 18px',
        display: 'flex',
        alignItems: 'center',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
    },
    chatIdentity: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
    },
    profileLink: {
        display: 'block',
        color: 'var(--text-primary)',
        fontSize: '14px',
        fontWeight: '700',
        textDecoration: 'none',
        marginBottom: '2px',
    },
    chatSub: {
        margin: 0,
        color: 'var(--text-secondary)',
        fontSize: '12px',
    },
    messagesArea: {
        flex: 1,
        minHeight: 0,
        overflowY: 'auto',
        padding: '18px',
        backgroundColor: 'var(--bg-primary)',
    },
    messageRow: {
        display: 'flex',
        marginBottom: '8px',
    },
    bubble: {
        maxWidth: 'min(560px, 78%)',
        borderRadius: '18px',
        padding: '9px 12px 7px',
        overflowWrap: 'anywhere',
    },
    bubbleMine: {
        backgroundColor: 'var(--accent)',
        color: 'var(--text-inverse)',
        borderBottomRightRadius: '6px',
    },
    bubbleTheirs: {
        backgroundColor: 'var(--bg-elevated)',
        color: 'var(--text-primary)',
        borderBottomLeftRadius: '6px',
    },
    messageText: {
        margin: 0,
        fontSize: '14px',
        lineHeight: 1.35,
        whiteSpace: 'pre-wrap',
    },
    messageTime: {
        display: 'block',
        marginTop: '3px',
        fontSize: '10px',
        color: 'currentColor',
        opacity: 0.65,
        textAlign: 'right',
    },
    composer: {
        display: 'flex',
        gap: '10px',
        padding: '14px',
        borderTop: '1px solid var(--border)',
        flexShrink: 0,
    },
    lockedComposer: {
        padding: '14px 18px',
        borderTop: '1px solid var(--border)',
        backgroundColor: 'var(--bg-elevated)',
        flexShrink: 0,
    },
    lockedText: {
        margin: 0,
        color: 'var(--text-secondary)',
        fontSize: '13px',
        textAlign: 'center',
        lineHeight: 1.4,
    },
    input: {
        flex: 1,
        minWidth: 0,
        height: '42px',
        border: 0,
        borderRadius: '500px',
        backgroundColor: 'var(--bg-input)',
        color: 'var(--text-primary)',
        padding: '0 16px',
        fontSize: '14px',
        fontFamily: font,
        boxShadow: 'var(--border-subtle) 0px 0px 0px 1px inset',
        outline: 'none',
    },
    sendButton: {
        height: '42px',
        border: 0,
        borderRadius: '9999px',
        backgroundColor: 'var(--accent)',
        color: 'var(--text-inverse)',
        padding: '0 20px',
        fontSize: '13px',
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: '1.4px',
        cursor: 'pointer',
        fontFamily: font,
    },
    avatar: {
        borderRadius: '50%',
        objectFit: 'cover',
        flexShrink: 0,
        display: 'block',
    },
    avatarFallback: {
        borderRadius: '50%',
        backgroundColor: 'var(--bg-elevated)',
        color: 'var(--text-primary)',
        fontWeight: '800',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    stateText: {
        color: 'var(--text-secondary)',
        fontSize: '13px',
        textAlign: 'center',
        margin: '24px 12px',
    },
    emptySidebar: {
        padding: '28px 18px',
    },
    emptyChat: {
        minHeight: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
    },
    noChat: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '24px',
    },
    emptyTitle: {
        margin: '0 0 6px',
        fontSize: '16px',
        fontWeight: '700',
        color: 'var(--text-primary)',
    },
    emptyText: {
        margin: 0,
        color: 'var(--text-secondary)',
        fontSize: '13px',
        lineHeight: 1.4,
    },
    error: {
        margin: '0 14px',
        paddingTop: '10px',
        color: '#f3727f',
        fontSize: '13px',
    },
};
