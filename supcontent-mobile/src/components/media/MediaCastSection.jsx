import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors } from '../../theme/colors';

const PROFILE_BASE = 'https://image.tmdb.org/t/p/w185';

function imageUrl(path) {
    if (!path) return null;
    return path.startsWith('http') ? path : `${PROFILE_BASE}${path}`;
}

export default function MediaCastSection({ cast }) {
    if (!cast?.length) return null;

    return (
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>Cast</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.castRow}>
                {cast.slice(0, 12).map((actor) => (
                    <View key={actor.id} style={styles.castCard}>
                        {actor.profile_path ? (
                            <Image source={{ uri: imageUrl(actor.profile_path) }} style={styles.castImage} />
                        ) : (
                            <View style={styles.castFallback}>
                                <Text style={styles.castFallbackText}>{actor.name?.charAt(0)}</Text>
                            </View>
                        )}
                        <View style={styles.castBody}>
                            <Text style={styles.castName} numberOfLines={1}>{actor.name}</Text>
                            <Text style={styles.castRole} numberOfLines={1}>{actor.character}</Text>
                        </View>
                    </View>
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
    castRow: {
        gap: 10,
        paddingRight: 20,
    },
    castCard: {
        width: 118,
        overflow: 'hidden',
        borderRadius: 8,
        backgroundColor: colors.elevated,
    },
    castImage: {
        width: '100%',
        aspectRatio: 3 / 4,
        backgroundColor: colors.card,
    },
    castFallback: {
        width: '100%',
        aspectRatio: 3 / 4,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.card,
    },
    castFallbackText: {
        color: colors.textMuted,
        fontSize: 28,
        fontWeight: '800',
    },
    castBody: {
        paddingHorizontal: 9,
        paddingTop: 8,
        paddingBottom: 10,
    },
    castName: {
        color: colors.text,
        fontSize: 12,
        fontWeight: '800',
    },
    castRole: {
        color: colors.textSecondary,
        fontSize: 11,
        marginTop: 3,
    },
});
