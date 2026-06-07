import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Image,
    Keyboard,
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
import { advancedSearch, getGenres, searchLists, searchUsers } from '../../src/api/search';
import { colors } from '../../src/theme/colors';

const POSTER_BASE = 'https://image.tmdb.org/t/p/w342';

const CATEGORIES = [
    { id: 'movie', label: 'Movies' },
    { id: 'tv', label: 'Series' },
    { id: 'users', label: 'Users' },
    { id: 'lists', label: 'Lists' },
];

const SORTS = [
    { id: 'popularity.desc', label: 'Popular' },
    { id: 'vote_average.desc', label: 'Top Rated' },
    { id: 'primary_release_date.desc', label: 'Newest' },
    { id: 'primary_release_date.asc', label: 'Oldest' },
];

const RATINGS = [
    { id: '', label: 'Any rating' },
    { id: '6', label: '6+' },
    { id: '7', label: '7+' },
    { id: '8', label: '8+' },
];

function posterUrl(path) {
    if (!path) return null;
    return path.startsWith('http') ? path : `${POSTER_BASE}${path}`;
}

function mediaRoute(item) {
    const routeType = item.media_type === 'Series' || item.media_type === 'tv' ? 'tv' : 'movie';
    return `/${routeType}/${item.external_id}`;
}

export default function SearchScreen() {
    const insets = useSafeAreaInsets();
    const [category, setCategory] = useState('movie');
    const [query, setQuery] = useState('');
    const [year, setYear] = useState('');
    const [genre, setGenre] = useState('');
    const [sort, setSort] = useState('popularity.desc');
    const [minRating, setMinRating] = useState('');
    const [genres, setGenres] = useState([]);
    const [results, setResults] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [pageInput, setPageInput] = useState('');
    const [showPageInput, setShowPageInput] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [hasSearched, setHasSearched] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    const isMediaSearch = category === 'movie' || category === 'tv';
    const trimmedQuery = query.trim();
    const canGoPrevious = isMediaSearch && hasSearched && !loading && page > 1;
    const canGoNext = isMediaSearch && hasSearched && !loading && page < totalPages;

    useEffect(() => {
        let cancelled = false;

        if (!isMediaSearch) {
            setGenres([]);
            setGenre('');
            return undefined;
        }

        getGenres(category)
            .then((data) => {
                if (!cancelled) setGenres(data ?? []);
            })
            .catch(() => {
                if (!cancelled) setGenres([]);
            });

        return () => {
            cancelled = true;
        };
    }, [category, isMediaSearch]);

    async function handleSearch(nextPage = 1) {
        setError('');

        if (isMediaSearch && year && year.length !== 4) {
            setResults([]);
            setTotal(0);
            setPage(1);
            setTotalPages(0);
            setHasSearched(false);
            setError('Enter a 4-digit year.');
            return;
        }

        if (!isMediaSearch && trimmedQuery.length < 2) {
            setResults([]);
            setTotal(0);
            setPage(1);
            setTotalPages(0);
            setHasSearched(false);
            setError('Type at least 2 characters to search.');
            return;
        }

        setLoading(true);
        setHasSearched(true);
        Keyboard.dismiss();

        try {
            const request = isMediaSearch
                ? advancedSearch({
                    q: trimmedQuery,
                    type: category,
                    year,
                    genre,
                    sort,
                    min_rating: minRating,
                    page: nextPage,
                })
                : category === 'users'
                    ? searchUsers(trimmedQuery, 30)
                    : searchLists(trimmedQuery, 30);

            const data = await request;
            const nextResults = data?.results ?? [];

            setResults(nextResults);
            setTotal(data?.total_results ?? data?.total ?? data?.results?.length ?? 0);
            setPage(data?.page ?? nextPage);
            setTotalPages(data?.total_pages ?? 0);
        } catch (err) {
            setResults([]);
            setTotal(0);
            setPage(1);
            setTotalPages(0);
            setError(err.message || 'Search failed.');
        } finally {
            setLoading(false);
        }
    }

    function handlePageChange(nextPage) {
        if (nextPage < 1 || nextPage > totalPages || loading) return;
        setShowPageInput(false);
        setPageInput('');
        handleSearch(nextPage);
    }

    function handlePageJump() {
        const nextPage = parseInt(pageInput, 10);

        if (!nextPage || nextPage < 1 || nextPage > totalPages) {
            setError(`Enter a page between 1 and ${totalPages}.`);
            return;
        }

        handlePageChange(nextPage);
    }

    function handleCategoryChange(nextCategory) {
        setCategory(nextCategory);
        setGenre('');
        setResults([]);
        setTotal(0);
        setPage(1);
        setTotalPages(0);
        setPageInput('');
        setShowPageInput(false);
        setError('');
        setHasSearched(false);
        setShowFilters(false);
    }

    const title = useMemo(() => {
        if (!hasSearched) return isMediaSearch ? 'Search or discover by filters' : 'Type at least 2 characters';
        if (loading) return 'Searching...';
        if (error) return 'Something went wrong';
        if (!results.length) return 'No results found';
        return `${total} result${total === 1 ? '' : 's'}`;
    }, [error, hasSearched, isMediaSearch, loading, results.length, total]);

    return (
        <KeyboardAvoidingView
            style={styles.keyboardView}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={0}
        >
            <ScrollView
                style={styles.page}
                contentContainerStyle={{
                    paddingTop: Math.max(insets.top + 28, 62),
                    paddingBottom: Math.max(insets.bottom + 96, 120),
                }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.content}>
                    <Text style={styles.title}>Search</Text>

                <View style={styles.searchRow}>
                    <View style={styles.searchBox}>
                        <Ionicons name="search" size={20} color={colors.textMuted} />
                        <TextInput
                            value={query}
                            onChangeText={setQuery}
                            placeholder="Search movies, series, users, lists..."
                            placeholderTextColor={colors.textMuted}
                            autoCapitalize="none"
                            autoCorrect={false}
                            returnKeyType="search"
                            onSubmitEditing={() => handleSearch()}
                            style={styles.searchInput}
                        />
                        {query ? (
                            <Pressable onPress={() => setQuery('')} hitSlop={8}>
                                <Ionicons name="close-circle" size={20} color={colors.textMuted} />
                            </Pressable>
                        ) : null}
                    </View>

                    <Pressable
                        onPress={() => handleSearch()}
                        disabled={loading}
                        style={({ pressed }) => [styles.searchButton, pressed && styles.pressed, loading && styles.disabled]}
                    >
                        <Ionicons name="arrow-forward" size={20} color={colors.accentText} />
                    </Pressable>
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>
                    {CATEGORIES.map((item) => {
                        const active = category === item.id;

                        return (
                            <Pressable
                                key={item.id}
                                onPress={() => handleCategoryChange(item.id)}
                                style={[styles.categoryChip, active && styles.categoryChipActive]}
                            >
                                <Text style={[styles.categoryText, active && styles.categoryTextActive]}>{item.label}</Text>
                            </Pressable>
                        );
                    })}
                </ScrollView>

                {isMediaSearch ? (
                    <View style={styles.filters}>
                        <Pressable onPress={() => setShowFilters((current) => !current)} style={styles.filterHeader}>
                            <View style={styles.filterHeaderTitle}>
                                <Ionicons name="options-outline" size={17} color={colors.text} />
                                <Text style={styles.filterTitle}>Filters</Text>
                            </View>
                            <Ionicons name={showFilters ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textSecondary} />
                        </Pressable>

                        {showFilters ? (
                            <>
                                <View style={styles.filterTools}>
                                    <TextInput
                                        value={year}
                                        onChangeText={(value) => setYear(value.replace(/[^0-9]/g, '').slice(0, 4))}
                                        placeholder="Year"
                                        placeholderTextColor={colors.textMuted}
                                        keyboardType="number-pad"
                                        style={styles.yearInput}
                                    />

                                    <Pressable
                                        onPress={() => {
                                            setYear('');
                                            setGenre('');
                                            setSort('popularity.desc');
                                            setMinRating('');
                                        }}
                                        style={styles.clearButton}
                                    >
                                        <Text style={styles.clearText}>Clear</Text>
                                    </Pressable>
                                </View>

                                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                                    {SORTS.map((item) => (
                                        <FilterChip
                                            key={item.id}
                                            label={item.label}
                                            active={sort === item.id}
                                            onPress={() => setSort(item.id)}
                                        />
                                    ))}
                                </ScrollView>

                                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                                    {RATINGS.map((item) => (
                                        <FilterChip
                                            key={item.id || 'any'}
                                            label={item.label}
                                            active={minRating === item.id}
                                            onPress={() => setMinRating(item.id)}
                                        />
                                    ))}
                                </ScrollView>

                                {genres.length ? (
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                                        <FilterChip label="All genres" active={!genre} onPress={() => setGenre('')} />
                                        {genres.map((item) => (
                                            <FilterChip
                                                key={item.id}
                                                label={item.name}
                                                active={genre === String(item.id)}
                                                onPress={() => setGenre(String(item.id))}
                                            />
                                        ))}
                                    </ScrollView>
                                ) : null}
                            </>
                        ) : null}
                    </View>
                ) : null}

                <View style={styles.resultHeader}>
                    <Text style={styles.resultTitle}>{title}</Text>
                    {loading ? <ActivityIndicator color={colors.accent} /> : null}
                </View>

                {error ? <Text style={styles.errorText}>{error}</Text> : null}

                {category === 'users' ? (
                    <View style={styles.userList}>
                        {results.map((item) => <UserResult key={item.user_id} item={item} />)}
                    </View>
                ) : category === 'lists' ? (
                    <View style={styles.listResults}>
                        {results.map((item) => <ListResult key={item.list_id} item={item} />)}
                    </View>
                ) : (
                    <>
                        <View style={styles.mediaGrid}>
                            {results.map((item) => <MediaResult key={`${item.external_id}-${item.media_type}`} item={item} />)}
                        </View>

                        {hasSearched && totalPages > 1 ? (
                            <View style={styles.pagination}>
                                <Pressable
                                    onPress={() => handlePageChange(page - 1)}
                                    disabled={!canGoPrevious}
                                    style={({ pressed }) => [
                                        styles.pageButton,
                                        pressed && styles.pressed,
                                        !canGoPrevious && styles.pageButtonDisabled,
                                    ]}
                                >
                                    <Ionicons name="chevron-back" size={18} color={colors.text} />
                                    <Text style={styles.pageButtonText}>Previous</Text>
                                </Pressable>

                                <Pressable
                                    onPress={() => {
                                        setShowPageInput((current) => !current);
                                        setPageInput(String(page));
                                    }}
                                    style={styles.pageIndicator}
                                >
                                    <Text style={styles.pageIndicatorText}>{page} / {totalPages}</Text>
                                </Pressable>

                                <Pressable
                                    onPress={() => handlePageChange(page + 1)}
                                    disabled={!canGoNext}
                                    style={({ pressed }) => [
                                        styles.pageButton,
                                        pressed && styles.pressed,
                                        !canGoNext && styles.pageButtonDisabled,
                                    ]}
                                >
                                    <Text style={styles.pageButtonText}>Next</Text>
                                    <Ionicons name="chevron-forward" size={18} color={colors.text} />
                                </Pressable>
                            </View>
                        ) : null}

                        {showPageInput ? (
                            <View style={styles.pageJump}>
                                <TextInput
                                    value={pageInput}
                                    onChangeText={(value) => setPageInput(value.replace(/[^0-9]/g, ''))}
                                    keyboardType="number-pad"
                                    placeholder={`1-${totalPages}`}
                                    placeholderTextColor={colors.textMuted}
                                    style={styles.pageJumpInput}
                                />
                                <Pressable onPress={handlePageJump} style={({ pressed }) => [styles.pageJumpButton, pressed && styles.pressed]}>
                                    <Text style={styles.pageJumpButtonText}>Go</Text>
                                </Pressable>
                            </View>
                        ) : null}
                    </>
                )}
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

function FilterChip({ label, active, onPress }) {
    return (
        <Pressable onPress={onPress} style={[styles.filterChip, active && styles.filterChipActive]}>
            <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{label}</Text>
        </Pressable>
    );
}

function MediaResult({ item }) {
    const poster = posterUrl(item.poster_path);
    const year = item.release_date?.slice(0, 4) ?? 'N/A';
    const score = item.vote_average ? Number(item.vote_average).toFixed(1) : null;

    return (
        <Pressable onPress={() => router.push(mediaRoute(item))} style={({ pressed }) => [styles.mediaCard, pressed && styles.pressed]}>
            {poster ? (
                <Image source={{ uri: poster }} style={styles.poster} resizeMode="cover" />
            ) : (
                <View style={styles.posterFallback}>
                    <Ionicons name="film-outline" size={32} color={colors.textMuted} />
                </View>
            )}
            <Text style={styles.mediaTitle} numberOfLines={2}>{item.title}</Text>
            <View style={styles.mediaMeta}>
                <Text style={styles.metaText}>{item.media_type === 'Series' ? 'Series' : 'Movie'} - {year}</Text>
                {score ? <Text style={styles.metaText}>Rating {score}</Text> : null}
            </View>
        </Pressable>
    );
}

function UserResult({ item }) {
    const initial = item.username?.charAt(0)?.toUpperCase() ?? '?';

    return (
        <Pressable onPress={() => router.push(`/users/${item.user_id}`)} style={({ pressed }) => [styles.userCard, pressed && styles.pressed]}>
            {item.avatar ? (
                <Image source={{ uri: item.avatar }} style={styles.avatar} />
            ) : (
                <View style={styles.avatarFallback}>
                    <Text style={styles.avatarText}>{initial}</Text>
                </View>
            )}
            <View style={styles.userInfo}>
                <Text style={styles.userName}>{item.username}</Text>
                <Text style={styles.userBio} numberOfLines={2}>{item.bio || 'Supcontent member'}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </Pressable>
    );
}

function ListResult({ item }) {
    return (
        <Pressable onPress={() => router.push(`/lists/${item.list_id}`)} style={({ pressed }) => [styles.listCard, pressed && styles.pressed]}>
            <View style={styles.listIcon}>
                <Ionicons name="albums-outline" size={24} color={colors.accent} />
            </View>
            <View style={styles.listInfo}>
                <Text style={styles.listName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.listMeta} numberOfLines={1}>
                    {item.media_count ?? 0} items by {item.owner_username}
                </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </Pressable>
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
    content: {
        paddingHorizontal: 20,
    },
    title: {
        color: colors.text,
        fontSize: 34,
        fontWeight: '900',
        marginBottom: 18,
    },
    searchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    searchBox: {
        flex: 1,
        minHeight: 54,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 15,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)',
        backgroundColor: colors.elevated,
    },
    searchButton: {
        width: 54,
        height: 54,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 14,
        backgroundColor: colors.accent,
    },
    searchInput: {
        flex: 1,
        color: colors.text,
        fontSize: 15,
    },
    categoryRow: {
        gap: 9,
        paddingVertical: 18,
    },
    categoryChip: {
        paddingVertical: 9,
        paddingHorizontal: 16,
        borderRadius: 999,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
    },
    categoryChipActive: {
        backgroundColor: colors.accent,
        borderColor: colors.accent,
    },
    categoryText: {
        color: colors.textSecondary,
        fontSize: 13,
        fontWeight: '800',
    },
    categoryTextActive: {
        color: colors.accentText,
    },
    filters: {
        gap: 12,
        padding: 14,
        borderRadius: 8,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        marginBottom: 22,
    },
    filterHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    filterHeaderTitle: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    filterTitle: {
        color: colors.text,
        fontSize: 15,
        fontWeight: '900',
    },
    filterTools: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    clearButton: {
        height: 44,
        justifyContent: 'center',
        paddingHorizontal: 14,
        borderRadius: 8,
        backgroundColor: colors.elevated,
        borderWidth: 1,
        borderColor: colors.border,
    },
    clearText: {
        color: colors.accent,
        fontSize: 12,
        fontWeight: '800',
    },
    yearInput: {
        flex: 1,
        height: 44,
        paddingHorizontal: 12,
        borderRadius: 8,
        color: colors.text,
        backgroundColor: colors.elevated,
        borderWidth: 1,
        borderColor: colors.border,
    },
    chipRow: {
        gap: 8,
    },
    filterChip: {
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 999,
        backgroundColor: colors.elevated,
        borderWidth: 1,
        borderColor: colors.border,
    },
    filterChipActive: {
        borderColor: colors.accent,
        backgroundColor: 'rgba(30,215,96,0.14)',
    },
    filterChipText: {
        color: colors.textSecondary,
        fontSize: 12,
        fontWeight: '700',
    },
    filterChipTextActive: {
        color: colors.accent,
    },
    resultHeader: {
        minHeight: 28,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 14,
    },
    resultTitle: {
        color: colors.text,
        fontSize: 19,
        fontWeight: '900',
    },
    errorText: {
        color: colors.danger,
        fontSize: 13,
        marginBottom: 12,
    },
    mediaGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 14,
    },
    mediaCard: {
        width: '47.8%',
        marginBottom: 8,
    },
    poster: {
        width: '100%',
        aspectRatio: 2 / 3,
        borderRadius: 8,
        backgroundColor: colors.elevated,
    },
    posterFallback: {
        width: '100%',
        aspectRatio: 2 / 3,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 8,
        backgroundColor: colors.elevated,
    },
    mediaTitle: {
        color: colors.text,
        fontSize: 13,
        fontWeight: '900',
        lineHeight: 18,
        marginTop: 9,
    },
    mediaMeta: {
        gap: 3,
        marginTop: 5,
    },
    metaText: {
        color: colors.textSecondary,
        fontSize: 11,
        fontWeight: '700',
    },
    pagination: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
        marginTop: 10,
        marginBottom: 8,
    },
    pageButton: {
        minHeight: 46,
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 5,
        borderRadius: 999,
        backgroundColor: colors.elevated,
        borderWidth: 1,
        borderColor: colors.borderVisible,
    },
    pageButtonDisabled: {
        opacity: 0.35,
    },
    pageButtonText: {
        color: colors.text,
        fontSize: 12,
        fontWeight: '900',
    },
    pageIndicator: {
        minHeight: 46,
        minWidth: 72,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 10,
        borderRadius: 999,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
    },
    pageIndicatorText: {
        color: colors.accent,
        fontSize: 12,
        fontWeight: '900',
    },
    pageJump: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginTop: 2,
        marginBottom: 10,
    },
    pageJumpInput: {
        flex: 1,
        height: 46,
        paddingHorizontal: 14,
        borderRadius: 999,
        color: colors.text,
        backgroundColor: colors.elevated,
        borderWidth: 1,
        borderColor: colors.border,
    },
    pageJumpButton: {
        width: 68,
        height: 46,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 999,
        backgroundColor: colors.accent,
    },
    pageJumpButtonText: {
        color: colors.accentText,
        fontSize: 13,
        fontWeight: '900',
    },
    userList: {
        gap: 10,
    },
    userCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 13,
        padding: 13,
        borderRadius: 8,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 999,
        backgroundColor: colors.elevated,
    },
    avatarFallback: {
        width: 48,
        height: 48,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 999,
        backgroundColor: colors.elevated,
    },
    avatarText: {
        color: colors.accent,
        fontSize: 18,
        fontWeight: '900',
    },
    userInfo: {
        flex: 1,
    },
    userName: {
        color: colors.text,
        fontSize: 15,
        fontWeight: '900',
    },
    userBio: {
        color: colors.textSecondary,
        fontSize: 12,
        lineHeight: 17,
        marginTop: 3,
    },
    listResults: {
        gap: 10,
    },
    listCard: {
        minHeight: 78,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 13,
        padding: 13,
        borderRadius: 8,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
    },
    listIcon: {
        width: 52,
        height: 52,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 8,
        backgroundColor: colors.elevated,
    },
    listInfo: {
        flex: 1,
    },
    listName: {
        color: colors.text,
        fontSize: 15,
        fontWeight: '900',
    },
    listMeta: {
        color: colors.textSecondary,
        fontSize: 12,
        marginTop: 4,
    },
    pressed: {
        opacity: 0.82,
    },
    disabled: {
        opacity: 0.55,
    },
});
