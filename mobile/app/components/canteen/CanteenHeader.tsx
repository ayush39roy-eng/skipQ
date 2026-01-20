import { View, Text, StyleSheet, Image, Platform, useWindowDimensions } from 'react-native';
import Animated, {
    useAnimatedStyle,
    interpolate,
    Extrapolation,
    SharedValue
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Star, MapPin, Clock } from 'lucide-react-native';
import { COLORS, RADIUS, SPACING, GAME_UI } from '../../constants/theme';

// const { width } = Dimensions.get('window');
const HEADER_HEIGHT = 280;

interface CanteenHeaderProps {
    canteen: any;
    scrollY: SharedValue<number>;
}

export const CanteenHeader = ({ canteen, scrollY }: CanteenHeaderProps) => {
    const { width } = useWindowDimensions();

    const imageAnimatedStyle = useAnimatedStyle(() => {
        const translateY = interpolate(
            scrollY.value,
            [-HEADER_HEIGHT, 0, HEADER_HEIGHT],
            [-HEADER_HEIGHT / 2, 0, HEADER_HEIGHT * 0.5],
            Extrapolation.CLAMP
        );
        const scale = interpolate(
            scrollY.value,
            [-HEADER_HEIGHT, 0],
            [2, 1],
            Extrapolation.CLAMP
        );
        return {
            transform: [{ translateY }, { scale }]
        };
    });

    const contentAnimatedStyle = useAnimatedStyle(() => {
        const opacity = interpolate(
            scrollY.value,
            [0, HEADER_HEIGHT * 0.5],
            [1, 0],
            Extrapolation.CLAMP
        );
        return { opacity };
    });

    return (
        <View style={[styles.container, { width }]}>
            {/* Parallax Image */}
            <Animated.View style={[styles.imageContainer, imageAnimatedStyle]}>
                <Image
                    source={{ uri: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800&q=80' }} // Fallback if canteen.image is missing
                    style={styles.image}
                />
            </Animated.View>

            {/* Content Overlay - No Gradients, just bold text */}
            <Animated.View style={[styles.content, contentAnimatedStyle]}>
                <View style={styles.tagRow}>
                    <View style={styles.openTag}>
                        <View style={styles.pulseDot} />
                        <Text style={styles.openText}>OPEN • AVG 6m</Text>
                    </View>
                </View>

                <Text style={styles.title}>{canteen.name}</Text>

                <View style={styles.metaRow}>
                    <View style={styles.ratingBadge}>
                        <Star size={12} color={GAME_UI.ink} fill={GAME_UI.primaryBtn} strokeWidth={2.5} />
                        <Text style={styles.ratingText}>4.5</Text>
                    </View>
                   
                    <View style={styles.metaItem}>
                        <MapPin size={14} color={GAME_UI.ink} />
                        <Text style={styles.metaText}>{canteen.location || 'CAMPUS'}</Text>
                    </View>
                    
                    <View style={styles.metaItem}>
                        <Clock size={14} color={GAME_UI.ink} />
                        <Text style={styles.metaText}>CLOSES 10 PM</Text>
                    </View>
                </View>
            </Animated.View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        height: HEADER_HEIGHT,
        // width handled dynamically
        justifyContent: 'flex-end',
        overflow: 'hidden',
        backgroundColor: GAME_UI.white,
        borderBottomWidth: 3,
        borderBottomColor: GAME_UI.ink,
    },
    imageContainer: {
        ...StyleSheet.absoluteFillObject,
        zIndex: -1,
        opacity: 1, // Keep full opacity
    },
    image: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    content: {
        paddingHorizontal: SPACING.l,
        paddingBottom: SPACING.xl,
        backgroundColor: 'rgba(255,255,255,0.7)', // Slight overlay to read text
        borderTopWidth: 2,
        borderColor: GAME_UI.ink,
    },
    tagRow: {
        flexDirection: 'row',
        marginBottom: SPACING.s,
        marginTop: SPACING.m,
    },
    openTag: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        backgroundColor: GAME_UI.white,
        gap: 6,
        ...GAME_UI.shadows.sm,
    },
    pulseDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: COLORS.success,
        borderWidth: 1,
        borderColor: GAME_UI.ink,
    },
    openText: {
        color: GAME_UI.ink,
        fontSize: 12,
        fontWeight: '800',
        textTransform: 'uppercase',
    },
    title: {
        fontSize: 42,
        fontWeight: '900',
        color: GAME_UI.ink,
        marginBottom: SPACING.s,
        letterSpacing: -1,
        textShadowColor: GAME_UI.white,
        textShadowRadius: 0,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flexWrap: 'wrap'
    },
    ratingBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: GAME_UI.white,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        gap: 4,
        ...GAME_UI.shadows.sm
    },
    ratingText: {
        color: GAME_UI.ink,
        fontWeight: '800',
        fontSize: 14,
    },
    bullet: {
        display: 'none' // Remove bullets
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 4,
        backgroundColor: GAME_UI.secondary,
        borderRadius: 6,
        ...GAME_UI.shadows.sm
    },
    metaText: {
        color: GAME_UI.ink,
        fontSize: 12,
        fontWeight: '800',
        textTransform: 'uppercase',
    }
});
