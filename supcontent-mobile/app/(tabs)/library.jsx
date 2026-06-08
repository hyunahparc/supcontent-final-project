import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getLibrary } from '../../src/api/collections';
import { createList, deleteList, getMyLists, updateList } from '../../src/api/lists';
import { getUserStats } from '../../src/api/users';
import StatsPanel from '../../src/components/StatsPanel';
import { useAuth } from '../../src/context/AuthContext';
import { colors } from '../../src/theme/colors';

const POSTER_BASE = 'https://image.tmdb.org/t/p/w500';
const LIST_POSTER_BASE = 'https://image.tmdb.org/t/p/w200';
const STATUSES = ['To Watch', 'Watching', 'Completed', 'Dropped'];
const VIEW_TABS = [
  { id: 'collection', label: 'My Collection' },
  { id: 'lists', label: 'My Lists' },
];

function posterUrl(path, base = POSTER_BASE) {
  if (!path) return null;
  return path.startsWith('http') ? path : `${base}${path}`;
}

function mediaRoute(item) {
  const type = item.media_type === 'Series' || item.media_type === 'tv' ? 'tv' : 'movie';
  return `/${type}/${item.external_id}`;
}

export default function LibraryScreen() {
  const insets = useSafeAreaInsets();
  const { view } = useLocalSearchParams();
  const { user, token, isAuthenticated } = useAuth();
  const [activeView, setActiveView] = useState(view === 'lists' ? 'lists' : 'collection');
  const [activeStatus, setActiveStatus] = useState(null);
  const [collection, setCollection] = useState([]);
  const [lists, setLists] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [newName, setNewName] = useState('');
  const [newPublic, setNewPublic] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(null);
  const [openMenu, setOpenMenu] = useState(null);
  const hasLoadedRef = useRef(false);

  const pagePadding = {
    paddingTop: Math.max(insets.top + 26, 52),
    paddingBottom: Math.max(insets.bottom + 20, 32),
  };

  const filteredCollection = useMemo(() => {
    if (!activeStatus) return collection;
    return collection.filter((item) => item.status === activeStatus);
  }, [activeStatus, collection]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      setActiveView(view === 'lists' ? 'lists' : 'collection');

      if (!isAuthenticated || !user?.user_id || !token) {
        setCollection([]);
        setLists([]);
        return undefined;
      }

      setLoading(!hasLoadedRef.current);
      setError('');

      Promise.all([
        getLibrary(user.user_id, token),
        getMyLists(token),
        getUserStats(user.user_id, token).catch(() => null),
      ])
        .then(([libraryData, listsData, statsData]) => {
          if (cancelled) return;
          setCollection(libraryData ?? []);
          setLists(listsData ?? []);
          setStats(statsData ?? null);
          hasLoadedRef.current = true;
        })
        .catch((err) => {
          if (!cancelled) setError(err.message || 'Unable to load library.');
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });

      return () => {
        cancelled = true;
      };
    }, [isAuthenticated, token, user?.user_id, view])
  );

  async function handleCreateList() {
    if (!newName.trim() || !token) return;

    setCreating(true);
    setError('');

    try {
      const created = await createList(newName.trim(), newPublic, token);
      setLists((current) => [created, ...current]);
      setNewName('');
      setNewPublic(false);
    } catch (err) {
      setError(err.message || 'Unable to create list.');
    } finally {
      setCreating(false);
    }
  }

  async function handleUpdateList() {
    if (!editing?.name.trim() || !token) return;

    try {
      const updated = await updateList(editing.listId, editing.name.trim(), editing.isPublic, token);
      setLists((current) => current.map((list) => (
        list.list_id === editing.listId ? { ...list, ...updated } : list
      )));
      setEditing(null);
    } catch (err) {
      setError(err.message || 'Unable to update list.');
    }
  }

  function confirmDeleteList(listId) {
    Alert.alert('Delete this list?', 'This action cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          if (!token) return;
          try {
            await deleteList(listId, token);
            setLists((current) => current.filter((list) => list.list_id !== listId));
          } catch (err) {
            setError(err.message || 'Unable to delete list.');
          }
        },
      },
    ]);
  }

  if (!isAuthenticated) {
    return (
      <View style={[styles.guestPage, pagePadding]}>
        <Ionicons name="albums-outline" size={44} color={colors.accent} />
        <Text style={styles.guestTitle}>Library</Text>
        <Text style={styles.guestBody}>Log in to manage your collection and custom lists.</Text>
        <Pressable onPress={() => router.push('/login')} style={({ pressed }) => [styles.loginButton, pressed && styles.pressed]}>
          <Text style={styles.loginButtonText}>Log in</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={[styles.content, pagePadding]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.viewTabs}>
        {VIEW_TABS.map((tab) => {
          const isActive = activeView === tab.id;

          return (
            <Pressable
              key={tab.id}
              onPress={() => setActiveView(tab.id)}
              style={[styles.viewTab, isActive && styles.viewTabActive]}
            >
              <Text style={[styles.viewTabText, isActive && styles.viewTabTextActive]}>{tab.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {loading ? (
        <View style={styles.stateBox}>
          <ActivityIndicator color={colors.accent} />
          <Text style={styles.stateText}>Loading library...</Text>
        </View>
      ) : activeView === 'collection' ? (
        <CollectionView
          activeStatus={activeStatus}
          items={filteredCollection}
          totalCount={collection.length}
          stats={stats}
          onStatusChange={setActiveStatus}
        />
      ) : (
        <ListsView
          creating={creating}
          editing={editing}
          lists={lists}
          newName={newName}
          newPublic={newPublic}
          openMenu={openMenu}
          onCancelEdit={() => setEditing(null)}
          onCreate={handleCreateList}
          onDelete={confirmDeleteList}
          onEdit={(list) => {
            setEditing({ listId: list.list_id, name: list.name, isPublic: Boolean(list.is_public) });
            setOpenMenu(null);
          }}
          onMenuChange={setOpenMenu}
          onNameChange={setNewName}
          onPublicChange={setNewPublic}
          onUpdate={handleUpdateList}
          onUpdateDraft={setEditing}
        />
      )}
    </ScrollView>
  );
}

function CollectionView({ activeStatus, items, totalCount, stats, onStatusChange }) {
  return (
    <View>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>My Collection</Text>
        <Text style={styles.sectionCount}>{totalCount} items</Text>
      </View>

      <StatsPanel stats={stats} />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statusTabs}>
        <StatusTab label="All" active={activeStatus === null} onPress={() => onStatusChange(null)} />
        {STATUSES.map((status) => (
          <StatusTab key={status} label={status} active={activeStatus === status} onPress={() => onStatusChange(status)} />
        ))}
      </ScrollView>

      {items.length ? (
        <View style={styles.collectionGrid}>
          {items.map((item) => (
            <CollectionCard key={item.collection_id} item={item} />
          ))}
        </View>
      ) : (
        <Text style={styles.emptyText}>No media items in this collection.</Text>
      )}
    </View>
  );
}

function StatusTab({ label, active, onPress }) {
  return (
    <Pressable onPress={onPress} style={[styles.statusTab, active && styles.statusTabActive]}>
      <Text style={[styles.statusTabText, active && styles.statusTabTextActive]}>{label}</Text>
    </Pressable>
  );
}

function CollectionCard({ item }) {
  const poster = posterUrl(item.full_data?.poster_path);

  return (
    <Pressable onPress={() => router.push(mediaRoute(item))} style={({ pressed }) => [styles.collectionCard, pressed && styles.cardPressed]}>
      {poster ? (
        <Image source={{ uri: poster }} style={styles.collectionPoster} resizeMode="cover" />
      ) : (
        <View style={styles.posterFallback}>
          <Ionicons name="film-outline" size={32} color={colors.textMuted} />
        </View>
      )}
      <Text style={styles.cardTitle} numberOfLines={1}>{item.full_data?.title}</Text>
      <Text style={styles.cardMeta}>{item.status}</Text>
    </Pressable>
  );
}

function ListsView({
  creating,
  editing,
  lists,
  newName,
  newPublic,
  openMenu,
  onCancelEdit,
  onCreate,
  onDelete,
  onEdit,
  onMenuChange,
  onNameChange,
  onPublicChange,
  onUpdate,
  onUpdateDraft,
}) {
  return (
    <View>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>My Lists</Text>
        <Text style={styles.sectionCount}>{lists.length} lists</Text>
      </View>

      <View style={styles.createForm}>
        <TextInput
          value={newName}
          onChangeText={onNameChange}
          placeholder="New list name..."
          placeholderTextColor={colors.textMuted}
          style={styles.input}
        />
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Public</Text>
          <Switch
            value={newPublic}
            onValueChange={onPublicChange}
            trackColor={{ false: colors.borderVisible, true: colors.accentHover }}
            thumbColor={newPublic ? colors.accent : colors.textSecondary}
          />
        </View>
        <Pressable
          onPress={onCreate}
          disabled={creating || !newName.trim()}
          style={({ pressed }) => [styles.createButton, (pressed || creating || !newName.trim()) && styles.disabledButton]}
        >
          <Text style={styles.createButtonText}>{creating ? 'Creating...' : '+ Create'}</Text>
        </Pressable>
      </View>

      {lists.length ? (
        <View style={styles.listsGrid}>
          {lists.map((list) => (
            <ListCard
              key={list.list_id}
              editing={editing}
              list={list}
              menuOpen={openMenu === list.list_id}
              onCancelEdit={onCancelEdit}
              onDelete={() => onDelete(list.list_id)}
              onEdit={() => onEdit(list)}
              onMenu={() => onMenuChange(openMenu === list.list_id ? null : list.list_id)}
              onUpdate={onUpdate}
              onUpdateDraft={onUpdateDraft}
            />
          ))}
        </View>
      ) : (
        <Text style={styles.emptyText}>No lists yet. Create one above!</Text>
      )}
    </View>
  );
}

function ListCard({ editing, list, menuOpen, onCancelEdit, onDelete, onEdit, onMenu, onUpdate, onUpdateDraft }) {
  const isEditing = editing?.listId === list.list_id;
  const poster = posterUrl(list.preview_posters?.[0], LIST_POSTER_BASE);

  if (isEditing) {
    return (
      <View style={styles.editCard}>
        <TextInput
          value={editing.name}
          onChangeText={(text) => onUpdateDraft((current) => ({ ...current, name: text }))}
          placeholder="List name"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
        />
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Public</Text>
          <Switch
            value={editing.isPublic}
            onValueChange={(value) => onUpdateDraft((current) => ({ ...current, isPublic: value }))}
            trackColor={{ false: colors.borderVisible, true: colors.accentHover }}
            thumbColor={editing.isPublic ? colors.accent : colors.textSecondary}
          />
        </View>
        <View style={styles.editActions}>
          <Pressable onPress={onUpdate} style={({ pressed }) => [styles.saveButton, pressed && styles.pressed]}>
            <Text style={styles.saveButtonText}>Save</Text>
          </Pressable>
          <Pressable onPress={onCancelEdit} style={({ pressed }) => [styles.cancelButton, pressed && styles.pressed]}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.listCard}>
      <Pressable onPress={() => router.push(`/lists/${list.list_id}`)} style={({ pressed }) => [styles.listContent, pressed && styles.cardPressed]}>
        {poster ? (
          <Image source={{ uri: poster }} style={styles.listPoster} resizeMode="cover" />
        ) : (
          <View style={styles.listPosterFallback} />
        )}
        <View style={styles.listInfo}>
          <View style={styles.listTitleRow}>
            <Text style={styles.listName} numberOfLines={1}>{list.name}</Text>
            <Ionicons name={list.is_public ? 'globe-outline' : 'lock-closed-outline'} size={15} color={colors.textSecondary} />
          </View>
          <Text style={styles.listCount}>{list.media_count ?? 0} items</Text>
        </View>
      </Pressable>

      <Pressable onPress={onMenu} style={({ pressed }) => [styles.kebabButton, pressed && styles.pressed]}>
        <Ionicons name="ellipsis-horizontal" size={18} color={colors.text} />
      </Pressable>

      {menuOpen ? (
        <View style={styles.kebabMenu}>
          <Pressable onPress={onEdit} style={styles.kebabOption}>
            <Text style={styles.kebabOptionText}>Edit</Text>
          </Pressable>
          <Pressable onPress={onDelete} style={styles.kebabOption}>
            <Text style={styles.kebabDangerText}>Delete</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: 24,
  },
  guestPage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: colors.background,
  },
  guestTitle: {
    color: colors.text,
    fontSize: 30,
    fontWeight: '900',
    marginTop: 14,
  },
  guestBody: {
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 22,
  },
  loginButton: {
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    borderRadius: 999,
    backgroundColor: colors.accent,
  },
  loginButtonText: {
    color: colors.accentText,
    fontSize: 14,
    fontWeight: '900',
  },
  header: {
    marginBottom: 22,
  },
  heading: {
    color: colors.text,
    fontSize: 30,
    fontWeight: '900',
  },
  subheading: {
    color: colors.textSecondary,
    fontSize: 14,
    marginTop: 6,
  },
  viewTabs: {
    flexDirection: 'row',
    gap: 5,
    padding: 4,
    marginBottom: 24,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  viewTab: {
    flex: 1,
    minHeight: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 7,
  },
  viewTabActive: {
    backgroundColor: colors.accent,
  },
  viewTabText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '800',
  },
  viewTabTextActive: {
    color: colors.accentText,
  },
  errorBox: {
    padding: 14,
    marginBottom: 18,
    borderRadius: 8,
    backgroundColor: 'rgba(243,114,127,0.12)',
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
  },
  stateBox: {
    minHeight: 260,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  stateText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '900',
  },
  sectionCount: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
  },
  statusTabs: {
    gap: 8,
    paddingRight: 24,
    marginBottom: 28,
  },
  statusTab: {
    paddingVertical: 8,
    paddingHorizontal: 17,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.borderVisible,
  },
  statusTabActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accent,
  },
  statusTabText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '800',
  },
  statusTabTextActive: {
    color: colors.accentText,
  },
  collectionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 18,
  },
  collectionCard: {
    width: '47.2%',
    gap: 7,
  },
  collectionPoster: {
    width: '100%',
    aspectRatio: 2 / 3,
    borderRadius: 6,
    backgroundColor: colors.elevated,
  },
  posterFallback: {
    width: '100%',
    aspectRatio: 2 / 3,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    backgroundColor: colors.elevated,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
  },
  cardMeta: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 14,
    fontStyle: 'italic',
    paddingTop: 16,
  },
  createForm: {
    gap: 12,
    marginBottom: 28,
  },
  input: {
    minHeight: 46,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: colors.elevated,
    color: colors.text,
    fontSize: 14,
  },
  switchRow: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchLabel: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
  },
  createButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    backgroundColor: colors.accent,
  },
  createButtonText: {
    color: colors.accentText,
    fontSize: 13,
    fontWeight: '900',
  },
  disabledButton: {
    opacity: 0.55,
  },
  listsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  listCard: {
    position: 'relative',
    width: '47.7%',
    overflow: 'visible',
    borderRadius: 8,
    backgroundColor: colors.elevated,
  },
  listContent: {
    overflow: 'hidden',
    borderRadius: 8,
    backgroundColor: colors.elevated,
  },
  listPoster: {
    width: '100%',
    aspectRatio: 2 / 3,
    backgroundColor: colors.card,
  },
  listPosterFallback: {
    width: '100%',
    aspectRatio: 2 / 3,
    backgroundColor: colors.card,
  },
  listInfo: {
    paddingHorizontal: 11,
    paddingTop: 10,
    paddingBottom: 12,
  },
  listTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  listName: {
    flex: 1,
    color: colors.text,
    fontSize: 13,
    fontWeight: '900',
  },
  listCount: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 4,
  },
  kebabButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 5,
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.64)',
  },
  kebabMenu: {
    position: 'absolute',
    top: 43,
    right: 8,
    zIndex: 10,
    minWidth: 112,
    overflow: 'hidden',
    borderRadius: 7,
    backgroundColor: colors.card,
  },
  kebabOption: {
    paddingVertical: 11,
    paddingHorizontal: 14,
  },
  kebabOptionText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  kebabDangerText: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: '700',
  },
  editCard: {
    width: '100%',
    gap: 12,
    padding: 14,
    borderRadius: 8,
    backgroundColor: colors.elevated,
  },
  editActions: {
    flexDirection: 'row',
    gap: 10,
  },
  saveButton: {
    flex: 1,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    backgroundColor: colors.accent,
  },
  saveButtonText: {
    color: colors.accentText,
    fontSize: 13,
    fontWeight: '900',
  },
  cancelButton: {
    flex: 1,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.borderVisible,
  },
  cancelButtonText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '800',
  },
  cardPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.98 }],
  },
  pressed: {
    opacity: 0.78,
  },
});
