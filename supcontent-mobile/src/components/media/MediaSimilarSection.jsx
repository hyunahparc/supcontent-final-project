import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors } from '../../theme/colors';

const POSTER_BASE = 'https://image.tmdb.org/t/p/w500';

// Utility to handle both full URLs and relative paths for images
function imageUrl(path) {
    if (!path) return null;
    return path.startsWith('http') ? path : `${POSTER_BASE}${path}`;
}

// Determine the correct route based on media type
function mediaRoute(item, fallbackType) {
    const type = item.media_type ?? fallbackType;
    const routeType = type === 'Series' || type === 'tv' ? 'tv' : 'movie';

    return `/${routeType}/${item.id}`;
}

export default function MediaSimilarSection({ similar, mediaType }) {
    if (!similar?.length) return null;

    return (
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>You May Also Like</Text>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.similarRow}>
                {/* Similar Media Cards */}
                {similar.map((item) => (
                    <Pressable
                        key={`${item.id}-${item.media_type ?? mediaType}`}
                        onPress={() => router.push(mediaRoute(item, mediaType))}
                        style={({ pressed }) => [styles.similarCard, pressed && styles.pressed]}
                    >
                        {item.poster_path ? (
                            <Image source={{ uri: imageUrl(item.poster_path) }} style={styles.similarPoster} />
                        ) : (
                            <View style={styles.similarFallback}>
                                <Ionicons name="film-outline" size={28} color={colors.textMuted} />
                            </View>
                        )}

                        <Text style={styles.similarTitle} numberOfLines={1}>{item.title}</Text>
                        {item.vote_average ? (
                            <Text style={styles.similarRating}>{Number(item.vote_average).toFixed(1)}</Text>
                        ) : null}
                    </Pressable>
                ))}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    section: {
        paddingHorizontal: 20,
        marginTop: 48,
    },
    sectionTitle: {
        color: colors.text,
        fontSize: 24,
        fontWeight: '800',
        marginBottom: 20,
    },
    similarRow: {
        gap: 12,
        paddingRight: 20,
    },
    similarCard: {
        width: 150,
    },
    similarPoster: {
        width: 150,
        height: 225,
        borderRadius: 6,
        backgroundColor: colors.elevated,
    },
    similarFallback: {
        width: 150,
        height: 225,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 6,
        backgroundColor: colors.elevated,
    },
    similarTitle: {
        color: colors.text,
        fontSize: 12,
        fontWeight: '800',
        marginTop: 8,
    },
    similarRating: {
        color: colors.textSecondary,
        fontSize: 11,
        marginTop: 3,
    },
    pressed: {
        opacity: 0.82,
    },
});
