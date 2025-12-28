import { View, Text, StyleSheet, Image, Dimensions, Pressable } from 'react-native';
import Animated, { useAnimatedScrollHandler, useSharedValue, useAnimatedStyle, interpolate, Extrapolation } from 'react-native-reanimated';
import { COLORS, RADIUS, SPACING, GAME_UI } from '../../constants/theme';
// Removed Gradient for clean look

const { width } = Dimensions.get('window');
const ITEM_WIDTH = width * 0.65; // Smaller width to show next card
const SPACING_WIDTH = 12;

const DATA = [
    { id: '1', title: '50% OFF', subtitle: 'First Order Special', bg: GAME_UI.white, img: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400&q=80' },
    { id: '2', title: 'Healthy?', subtitle: 'Fresh Salad Bowls', bg: GAME_UI.white, img: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&q=80' },
    { id: '3', title: 'Coffee Time', subtitle: 'Buy 1 Get 1', bg: GAME_UI.white, img: 'https://images.unsplash.com/photo-1497935586351-b67a49e012bf?w=400&q=80' },
];

export const DealsCarousel = () => {
    const scrollX = useSharedValue(0);

    const onScroll = useAnimatedScrollHandler((event) => {
        scrollX.value = event.contentOffset.x;
    });

    return (
        <View style={styles.container}>
            <Animated.ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                snapToInterval={ITEM_WIDTH + SPACING_WIDTH}
                decelerationRate="fast"
                onScroll={onScroll}
                scrollEventThrottle={16}
            >
                {DATA.map((item, index) => {
                    const inputRange = [
                        (index - 1) * (ITEM_WIDTH + SPACING_WIDTH),
                        index * (ITEM_WIDTH + SPACING_WIDTH),
                        (index + 1) * (ITEM_WIDTH + SPACING_WIDTH),
                    ];

                    const rStyle = useAnimatedStyle(() => {
                        const scale = interpolate(
                            scrollX.value,
                            inputRange,
                            [0.92, 1, 0.92],
                            Extrapolation.CLAMP
                        );
                        return { transform: [{ scale }] };
                    });

                    return (
                        <Animated.View key={item.id} style={[styles.itemContainer, rStyle]}>
                             <View style={[styles.card, { backgroundColor: item.bg }]}>
                                <View style={styles.content}>
                                    <View style={styles.badge}>
                                        <Text style={styles.badgeText}>LIMITED</Text>
                                    </View>
                                    <Text style={styles.title}>{item.title}</Text>
                                    <Text style={styles.subtitle}>{item.subtitle}</Text>
                                    <View style={styles.btn}>
                                        <Text style={styles.btnText}>CLAIM</Text>
                                    </View>
                                </View>
                                
                                <View style={styles.imageWrapper}>
                                    <Image source={{ uri: item.img }} style={styles.image} />
                                </View>
                             </View>
                        </Animated.View>
                    );
                })}
            </Animated.ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { paddingVertical: SPACING.m },
    scrollContent: { paddingHorizontal: SPACING.m },
    itemContainer: { width: ITEM_WIDTH, marginRight: SPACING_WIDTH },
    card: {
        height: 140,
        borderRadius: 12,
        padding: SPACING.m,
        flexDirection: 'row',
        alignItems: 'center',
        overflow: 'hidden',
        ...GAME_UI.shadows.md,
    },
    content: { flex: 1, zIndex: 1, justifyContent: 'center' },
    
    badge: { 
        alignSelf: 'flex-start', 
        backgroundColor: GAME_UI.primaryBtn, 
        paddingHorizontal: 6, 
        paddingVertical: 2, 
        borderRadius: 4, 
        marginBottom: 6, 
        borderWidth: 1, 
        borderColor: GAME_UI.ink 
    },
    badgeText: { fontSize: 8, fontWeight: '800', color: GAME_UI.ink },

    title: { fontSize: 20, fontWeight: '900', color: GAME_UI.ink, marginBottom: 2, letterSpacing: 0.5 },
    subtitle: { fontSize: 12, color: GAME_UI.ink, marginBottom: 12, fontWeight: '600' },
    
    btn: { 
        backgroundColor: GAME_UI.ink, 
        paddingHorizontal: 16, 
        paddingVertical: 8, 
        borderRadius: 8, 
        alignSelf: 'flex-start',
        ...GAME_UI.shadows.button, // This now adds the 3D pop!
        shadowColor: GAME_UI.primaryBtn, // Let's make the shadow colored for fun? Or stick to black. Stick to black for uniformity.
        shadowOffset: { width: 4, height: 4 } // Scale down slightly for smaller button if needed, but 6x6 is requested 'thick'. Let's stick to global.
    },
    btnText: { color: GAME_UI.white, fontWeight: '800', fontSize: 10, letterSpacing: 1 },
    
    imageWrapper: {
        position: 'absolute',
        right: -20,
        bottom: -20,
        width: 140,
        height: 140,
        borderRadius: 70,
        borderWidth: 2,
        borderColor: GAME_UI.ink,
        overflow: 'hidden',
        backgroundColor: GAME_UI.secondary,
    },
    image: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    }
});
