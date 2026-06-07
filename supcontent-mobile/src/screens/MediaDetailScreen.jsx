import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ImageBackground,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getMediaById } from '../api/media';
import { getCollectionStatus, removeFromCollection, upsertCollection } from '../api/collections';
import { addMediaToList, getMyLists } from '../api/lists';
import MediaCastSection from '../components/media/MediaCastSection';
import MediaReviewsSection from '../components/media/MediaReviewsSection';
import MediaSimilarSection from '../components/media/MediaSimilarSection';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';

const POSTER_BASE = 'https://image.tmdb.org/t/p/w500';
const BACKDROP_BASE = 'https://image.tmdb.org/t/p/w1280';
const STATUSES = ['To Watch', 'Watching', 'Completed', 'Dropped'];

function imageUrl(base, path) {
  if (!path) return null;
  return path.startsWith('http') ? path : `${base}${path}`;
}

function runtimeLabel(runtime) {
  if (!runtime) return null;
  const hours = Math.floor(runtime / 60);
  const minutes = runtime % 60;

  if (!hours) return `${minutes} min`;
  if (!minutes) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

export default function MediaDetailScreen({ mediaType }) {
  const { from, id } = useLocalSearchParams();
  const mediaId = Array.isArray(id) ? id[0] : id;
  const showBackButton = from === 'list';
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const [media, setMedia] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [collectionStatus, setCollectionStatus] = useState(null);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [myLists, setMyLists] = useState([]);
  const [showListMenu, setShowListMenu] = useState(false);
  const [listFeedback, setListFeedback] = useState('');

  // Fetch media details
  useEffect(() => {
    // Use a cancelled flag to prevent state updates if the component unmounts before the fetch completes
    let cancelled = false;

    if (!mediaId) return undefined;

    setLoading(true);
    setError('');

    getMediaById(mediaId, mediaType)
      .then((data) => {
        if (!cancelled) setMedia(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Failed to load media.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [mediaId, mediaType]);

  // Fetch collection status - to check if it's in user's collection and what status it has
  useEffect(() => {
    let cancelled = false;

    if (!mediaId) return undefined;

    if (!token) {
      setCollectionStatus(null);
      return;
    }

    getCollectionStatus(mediaId, mediaType, token).then((status) => {
      if (!cancelled) setCollectionStatus(status);
    });

    return () => {
      cancelled = true;
    };
  }, [mediaId, mediaType, token]);

  // Fetch user's lists for "Add to List" menu
  useEffect(() => {
    let cancelled = false;

    if (!token) {
      setMyLists([]);
      setShowListMenu(false);
      return undefined;
    }

    getMyLists(token)
      .then((data) => {
        if (!cancelled) setMyLists(data ?? []);
      })
      .catch(() => {
        if (!cancelled) setMyLists([]);
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  const posterUri = imageUrl(POSTER_BASE, media?.poster_path);
  const backdropUri = imageUrl(BACKDROP_BASE, media?.backdrop_path);
  const year = media?.release_date?.slice(0, 4);
  const runtime = runtimeLabel(media?.runtime);
  const score = media?.vote_average ? Number(media.vote_average).toFixed(1) : null;
  const metaItems = useMemo(() => [year, runtime].filter(Boolean), [year, runtime]);

  async function openTrailer() {
    if (!media?.trailer?.key) return;
    await Linking.openURL(`https://www.youtube.com/watch?v=${media.trailer.key}`);
  }

  function handleCollectionPress() {
    if (!token) {
      router.push('/login');
      return;
    }

    setShowStatusMenu((current) => !current);
  }

  async function handleStatusSelect(status) {
    if (!token) return;

    if (status === collectionStatus) {
      await removeFromCollection(mediaId, mediaType, token);
      setCollectionStatus(null);
    } else {
      await upsertCollection(mediaId, mediaType, status, token);
      setCollectionStatus(status);
    }

    setShowStatusMenu(false);
  }

  function handleListPress() {
    if (!token) {
      router.push('/login');
      return;
    }

    setShowListMenu((current) => !current);
  }

  async function handleAddToList(listId) {
    if (!token) return;

    try {
      await addMediaToList(listId, mediaId, mediaType, token);
      setListFeedback('Added!');
    } catch (err) {
      setListFeedback(err.message || 'Unable to add.');
    } finally {
      setShowListMenu(false);
      setTimeout(() => setListFeedback(''), 1800);
    }
  }

  if (loading) {
    return (
      <View style={styles.state}>
        <ActivityIndicator color={colors.accent} />
        <Text style={styles.stateText}>Loading...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.state, { paddingTop: insets.top }]}>
        <Text style={styles.stateText}>{error}</Text>
        <Pressable onPress={() => router.back()} style={styles.retryButton}>
          <Text style={styles.retryButtonText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  if (!media) return null;

  return (
    <KeyboardAvoidingView
      style={styles.keyboardView}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      <ScrollView
        style={styles.page}
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom + 28, 52) }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
      <View style={styles.heroStage}>
        {backdropUri ? (
          <ImageBackground
            source={{ uri: backdropUri }}
            style={[styles.backdrop, { paddingTop: insets.top + 10 }]}
            imageStyle={styles.backdropImage}
          >
            <View style={styles.backdropShade} />
            {showBackButton ? (
              <Pressable onPress={() => router.back()} style={styles.backButton}>
                <Ionicons name="chevron-back" size={24} color={colors.text} />
              </Pressable>
            ) : null}
          </ImageBackground>
        ) : (
          <View style={[styles.backdrop, { paddingTop: insets.top + 10 }]}>
            <View style={styles.backdropShade} />
            {showBackButton ? (
              <Pressable onPress={() => router.back()} style={styles.backButton}>
                <Ionicons name="chevron-back" size={24} color={colors.text} />
              </Pressable>
            ) : null}
          </View>
        )}

        <View style={styles.hero}>
          {posterUri ? (
            <Image source={{ uri: posterUri }} style={styles.poster} resizeMode="cover" />
          ) : (
            <View style={styles.posterFallback}>
              <Ionicons name="film-outline" size={52} color={colors.textMuted} />
            </View>
          )}

          <View style={styles.info}>
            <Text style={styles.title}>{media.title}</Text>

            <View style={styles.metaRow}>
              {metaItems.map((item) => (
                <Text key={item} style={styles.metaText}>{item}</Text>
              ))}
              {score ? (
                <View style={styles.rating}>
                  <Ionicons name="star" size={13} color="#f5c518" />
                  <Text style={styles.ratingText}>{score}</Text>
                </View>
              ) : null}
            </View>

            {media.genres?.length ? (
              <View style={styles.genreRow}>
                {media.genres.map((genre) => (
                  <View key={genre.id ?? genre.name} style={styles.genrePill}>
                    <Text style={styles.genreText}>{genre.name}</Text>
                  </View>
                ))}
              </View>
            ) : null}

            <View style={styles.actions}>
              {media.trailer?.key ? (
                <Pressable onPress={openTrailer} style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}>
                  <Ionicons name="play" size={16} color={colors.accentText} />
                  <Text style={styles.primaryButtonText}>Watch Trailer</Text>
                </Pressable>
              ) : null}

              <Pressable onPress={handleCollectionPress} style={({ pressed }) => [styles.outlineButton, pressed && styles.pressed]}>
                <Ionicons name="add" size={18} color={colors.text} />
                <Text style={styles.outlineButtonText}>{collectionStatus ?? 'Collection'}</Text>
              </Pressable>

              <Pressable onPress={handleListPress} style={({ pressed }) => [styles.outlineButton, pressed && styles.pressed]}>
                <Ionicons name="add" size={18} color={colors.text} />
                <Text style={styles.outlineButtonText}>{listFeedback || 'List'}</Text>
              </Pressable>
            </View>

            {showStatusMenu ? (
              <View style={styles.statusMenu}>
                {STATUSES.map((status) => (
                  <Pressable
                    key={status}
                    onPress={() => handleStatusSelect(status)}
                    style={[styles.statusOption, status === collectionStatus && styles.statusOptionActive]}
                  >
                    <Text style={[styles.statusOptionText, status === collectionStatus && styles.statusOptionTextActive]}>
                      {status}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : null}

            {showListMenu ? (
              <View style={styles.listMenu}>
                {myLists.length ? (
                  myLists.map((list) => (
                    <Pressable key={list.list_id} onPress={() => handleAddToList(list.list_id)} style={styles.statusOption}>
                      <Text style={styles.statusOptionText} numberOfLines={1}>{list.name}</Text>
                    </Pressable>
                  ))
                ) : (
                  <View style={styles.statusOption}>
                    <Text style={styles.statusOptionText}>No lists yet</Text>
                  </View>
                )}
              </View>
            ) : null}

            {media.director ? (
              <Text style={styles.director}>
                <Text style={styles.directorLabel}>Director </Text>
                {media.director}
              </Text>
            ) : null}

            {media.overview ? (
              <Text style={styles.overview}>{media.overview}</Text>
            ) : null}
          </View>
        </View>
      </View>

      <MediaCastSection cast={media.cast} />
      <MediaSimilarSection similar={media.similar} mediaType={mediaType} />
      <MediaReviewsSection mediaId={mediaId} mediaType={mediaType} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardView: {
    flex: 1,
    backgroundColor: colors.background,
  },
  state: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 24,
    backgroundColor: colors.background,
  },
  stateText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  retryButton: {
    paddingVertical: 11,
    paddingHorizontal: 20,
    borderRadius: 999,
    backgroundColor: colors.accent,
  },
  retryButtonText: {
    color: colors.accentText,
    fontSize: 13,
    fontWeight: '800',
  },
  heroStage: {
    position: 'relative',
  },
  backdrop: {
    height: 400,
    backgroundColor: colors.elevated,
  },
  backdropImage: {
    resizeMode: 'cover',
  },
  backdropShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(18,18,18,0.58)',
  },
  backButton: {
    width: 42,
    height: 42,
    marginLeft: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(0,0,0,0.42)',
  },
  hero: {
    alignItems: 'center',
    gap: 24,
    paddingHorizontal: 20,
    marginTop: -238,
  },
  poster: {
    width: '72%',
    maxWidth: 280,
    aspectRatio: 2 / 3,
    borderRadius: 8,
    backgroundColor: colors.elevated,
  },
  posterFallback: {
    width: '72%',
    maxWidth: 280,
    aspectRatio: 2 / 3,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: colors.elevated,
  },
  info: {
    width: '100%',
  },
  title: {
    color: colors.text,
    fontSize: 32,
    fontWeight: '800',
    lineHeight: 37,
    marginBottom: 11,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  metaText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    color: '#f5c518',
    fontSize: 14,
    fontWeight: '700',
  },
  genreRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  genrePill: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  genreText: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  primaryButton: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 22,
    borderRadius: 999,
    backgroundColor: colors.accent,
  },
  primaryButtonText: {
    color: colors.accentText,
    fontSize: 13,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1.1,
  },
  outlineButton: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 18,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
  },
  outlineButtonText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1.1,
  },
  statusMenu: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: -8,
    marginBottom: 20,
  },
  listMenu: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: -8,
    marginBottom: 20,
  },
  statusOption: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    backgroundColor: colors.elevated,
  },
  statusOptionActive: {
    borderColor: colors.accent,
    backgroundColor: 'rgba(30,215,96,0.14)',
  },
  statusOptionText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  statusOptionTextActive: {
    color: colors.accent,
  },
  director: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 14,
  },
  directorLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1.1,
  },
  overview: {
    color: colors.textSecondary,
    fontSize: 16,
    lineHeight: 26,
  },
  pressed: {
    opacity: 0.82,
  },
});
