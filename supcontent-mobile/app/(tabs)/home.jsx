import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getTrending } from '../../src/api/media';
import { useLanguage } from '../../src/context/LanguageContext';
import { colors } from '../../src/theme/colors';

const POSTER_BASE = 'https://image.tmdb.org/t/p/w342';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('all');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retryCount, setRetryCount] = useState(0);

  const tabs = [
    { id: 'all', label: t('home_all') },
    { id: 'Movie', label: t('home_movies') },
    { id: 'Series', label: t('home_series') },
  ];

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError('');

    getTrending(activeTab, 12)
      .then((data) => {
        if (!cancelled) setItems(data ?? []);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || t('home_error'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeTab, retryCount]);

  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={{
        paddingTop: Math.max(insets.top + 44, 76),
        paddingBottom: Math.max(insets.bottom + 16, 22),
      }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>{t('home_title')}</Text>

        <Text style={styles.heroSubtitle}>{t('home_subtitle')}</Text>

        <Pressable
          onPress={() => router.push('/search')}
          style={({ pressed }) => [styles.searchWrap, pressed && styles.pressed]}
        >
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <Text style={styles.searchPlaceholder} numberOfLines={1}>
            {t('home_search_placeholder')}
          </Text>
          <View style={styles.searchButton}>
            <Text style={styles.searchButtonText}>{t('home_search_btn')}</Text>
          </View>
        </Pressable>

      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>{t('home_trending')}</Text>
          </View>

          <View style={styles.tabs}>
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;

              return (
                <Pressable
                  key={tab.id}
                  onPress={() => setActiveTab(tab.id)}
                  style={[styles.tab, isActive && styles.tabActive]}
                >
                  <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{tab.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{t('home_error')}</Text>
            <Pressable onPress={() => setRetryCount((count) => count + 1)}>
              <Text style={styles.retryText}>{t('home_retry')}</Text>
            </Pressable>
          </View>
        ) : null}

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={colors.accent} />
            <Text style={styles.loadingText}>{t('home_loading')}</Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {items.map((item) => (
              <MediaCard key={`${item.external_id}-${item.media_type}`} item={item} />
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

function MediaCard({ item }) {
  const { t } = useLanguage();
  const year = item.release_date?.slice(0, 4) || 'N/A';
  const score = Number(item.vote_average || 0).toFixed(1);
  const routeType = item.media_type === 'Series' ? 'tv' : 'movie';
  const posterUri = item.poster_path?.startsWith('http')
    ? item.poster_path
    : item.poster_path
      ? `${POSTER_BASE}${item.poster_path}`
      : null;

  return (
    <Pressable
      onPress={() => router.push(`/${routeType}/${item.external_id}`)}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      <View style={styles.posterWrap}>
        {posterUri ? (
          <Image source={{ uri: posterUri }} style={styles.poster} resizeMode="cover" />
        ) : (
          <View style={styles.posterFallback}>
            <Ionicons name="film-outline" size={34} color={colors.textMuted} />
          </View>
        )}

        <View style={styles.typeBadge}>
          <Text style={[styles.typeBadgeText, item.media_type === 'Series' && styles.seriesBadgeText]}>
            {item.media_type === 'Series' ? t('home_series_label') : t('home_movie_label')}
          </Text>
        </View>

        <View style={styles.scoreBadge}>
          <Ionicons name="star" size={10} color="#ffd700" />
          <Text style={styles.scoreBadgeText}>{score}</Text>
        </View>
      </View>

      <View style={styles.cardBody}>
        <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.cardYear}>{year}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: colors.background,
  },
  hero: {
    position: 'relative',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 38,
    overflow: 'hidden',
  },
  heroTitle: {
    color: colors.text,
    fontSize: 34,
    fontWeight: '900',
    lineHeight: 41,
    textAlign: 'center',
    marginBottom: 18,
  },
  heroSubtitle: {
    color: colors.textSecondary,
    fontSize: 16,
    lineHeight: 25,
    textAlign: 'center',
    marginBottom: 34,
  },
  searchWrap: {
    width: '100%',
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingLeft: 16,
    paddingRight: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  searchPlaceholder: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: 14,
  },
  searchButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: colors.accent,
  },
  searchButtonText: {
    color: colors.accentText,
    fontSize: 14,
    fontWeight: '800',
  },
  section: {
    paddingHorizontal: 24,
  },
  sectionHeader: {
    gap: 18,
    marginBottom: 26,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '900',
  },
  tabs: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    gap: 4,
    padding: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  tab: {
    paddingVertical: 7,
    paddingHorizontal: 16,
    borderRadius: 7,
  },
  tabActive: {
    backgroundColor: colors.accent,
  },
  tabText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
  },
  tabTextActive: {
    color: colors.accentText,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(243,114,127,0.2)',
    backgroundColor: 'rgba(243,114,127,0.1)',
    marginBottom: 22,
  },
  errorText: {
    flex: 1,
    color: colors.danger,
    fontSize: 13,
  },
  retryText: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: '800',
    textDecorationLine: 'underline',
  },
  loadingBox: {
    minHeight: 180,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  card: {
    width: '47.7%',
    overflow: 'hidden',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    backgroundColor: colors.surface,
  },
  cardPressed: {
    opacity: 0.82,
    transform: [{ translateY: 2 }],
  },
  posterWrap: {
    position: 'relative',
    width: '100%',
    aspectRatio: 2 / 3,
    backgroundColor: colors.elevated,
  },
  poster: {
    width: '100%',
    height: '100%',
  },
  posterFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.elevated,
  },
  typeBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(0,0,0,0.75)',
  },
  typeBadgeText: {
    color: 'rgba(255,255,255,0.86)',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  seriesBadgeText: {
    color: colors.info,
  },
  scoreBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: 'rgba(0,0,0,0.75)',
  },
  scoreBadgeText: {
    color: '#ffd700',
    fontSize: 11,
    fontWeight: '800',
  },
  cardBody: {
    padding: 12,
    gap: 4,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
  },
  cardYear: {
    color: colors.textMuted,
    fontSize: 11,
  },
  pressed: {
    opacity: 0.82,
  },
});
