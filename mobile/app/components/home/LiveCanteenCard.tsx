import { View, Text, StyleSheet, Image, Pressable } from 'react-native';
// Removed LinearGradient, we want that clean cut look
import { COLORS, RADIUS, SHADOWS, SPACING, GAME_UI } from '../../constants/theme';
import { Star, Clock } from 'lucide-react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

// const { width } = Dimensions.get('window'); // Unused

export interface CanteenItem {
    id: string | number;
    name: string;
    manualIsOpen: boolean;
}

export const LiveCanteenCard = ({
    item,
    onPress,
}: {
    item: CanteenItem,
    onPress: () => void,
}) => {

    const scale = useSharedValue(1);

    const rStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

    return (
        <Animated.View style={[styles.wrapper, rStyle]}>
            <Pressable
                onPress={() => {
                    Haptics.selectionAsync();
                    onPress();
                }}
                onPressIn={() => scale.value = withSpring(0.96)}
                onPressOut={() => scale.value = withSpring(1)}
                style={styles.container}
            >
                {/* Image Section */}
                <View style={styles.imageContainer}>
                    <Image source={{ uri: String(item.id).length % 2 === 0 ? 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=600&q=80' : 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=600&q=80' }} style={styles.image} />
                    <View style={styles.statusBadge}>
                         <View style={[styles.statusDot, { backgroundColor: item.manualIsOpen ? COLORS.success : COLORS.error }]} />
                         <Text style={styles.statusText}>{item.manualIsOpen ? 'OPEN' : 'CLOSED'}</Text>
                    </View>
                </View>

                {/* Content Section */}
                <View style={styles.content}>
                    <View style={styles.row}>
                        <Text style={styles.title}>{item.name}</Text>
                         <View style={styles.rating}>
                            <Star size={12} color={GAME_UI.ink} fill={GAME_UI.primary} />
                            <Text style={styles.ratingText}>4.8</Text>
                        </View>
                    </View>
                    
                    {/* Dashed Divider */}
                    <View style={styles.dashedLine}>
                         {[...Array(15)].map((_, i) => (
                            <View key={i} style={styles.dash} />
                         ))}
                    </View>

                    <View style={styles.footerRow}>
                         <View style={styles.metaBadge}>
                            <Text style={styles.metaText}>15 MIN</Text>
                        </View>
                         <View style={styles.metaBadge}>
                            <Text style={styles.metaText}>FREE DELIVERY</Text>
                        </View>
                    </View>
                </View>
            </Pressable>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    wrapper: { marginBottom: SPACING.l, paddingHorizontal: 4 },
    container: {
        borderRadius: 16,
        overflow: 'hidden',
        backgroundColor: GAME_UI.white,
        ...GAME_UI.shadows.md,
    },
    imageContainer: {
        height: 140,
        position: 'relative',
        borderBottomWidth: 2,
        borderColor: GAME_UI.ink,
    },
    image: { width: '100%', height: '100%', resizeMode: 'cover' },
    
    statusBadge: {
        position: 'absolute',
        top: 12,
        right: 12,
        backgroundColor: GAME_UI.white,
        borderRadius: 8,
        paddingHorizontal: 8,
        paddingVertical: 4,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        ...GAME_UI.shadows.sm
    },
    statusDot: { width: 8, height: 8, borderRadius: 4, borderWidth: 1, borderColor: GAME_UI.ink },
    statusText: { fontSize: 10, fontWeight: '800', color: GAME_UI.ink },

    content: { 
        padding: SPACING.m,
        backgroundColor: GAME_UI.background, // Cream bg for content area
    },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    title: { fontSize: 20, fontWeight: '900', color: GAME_UI.ink, letterSpacing: 0.5 },
    
    rating: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        backgroundColor: GAME_UI.white, 
        paddingHorizontal: 8, 
        paddingVertical: 4, 
        borderRadius: 8, 
        gap: 4, 
        borderWidth: 2, 
        borderColor: GAME_UI.ink 
    },
    ratingText: { color: GAME_UI.ink, fontSize: 12, fontWeight: '800' },

    dashedLine: { flexDirection: 'row', overflow: 'hidden', height: 2, width: '100%', opacity: 0.2, marginBottom: 12 },
    dash: { width: 6, height: 2, backgroundColor: GAME_UI.ink, marginRight: 4 },

    footerRow: { flexDirection: 'row', gap: 8 },
    metaBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderWidth: 1.5,
        borderColor: GAME_UI.ink,
        borderRadius: 6,
        backgroundColor: 'rgba(255,255,255,0.5)'
    },
    metaText: { color: GAME_UI.ink, fontSize: 10, fontWeight: '700' },
});
