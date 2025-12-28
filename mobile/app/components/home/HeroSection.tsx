import { View, Text, StyleSheet, Image, Pressable, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, RADIUS, SHADOWS, SPACING, GAME_UI } from '../../constants/theme';
import { Clock, ArrowRight, Trophy } from 'lucide-react-native';
import Animated, { FadeInUp, useAnimatedStyle, withRepeat, withSequence, withTiming, useSharedValue, withSpring } from 'react-native-reanimated';
import { useEffect } from 'react';
import * as Haptics from 'expo-haptics';

// Simulated Reorder Data
const LAST_ORDER = {
    name: "Spicy Chicken Burger",
    canteen: "Burger Point",
    price: "₹120",
    image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&q=80"
};

const DashedLine = () => (
    <View style={styles.dashedContainer}>
         {[...Array(20)].map((_, i) => (
            <View key={i} style={styles.dash} />
         ))}
    </View>
);

const PulseDot = () => {
    const opacity = useSharedValue(0.5);
    const scale = useSharedValue(1);

    useEffect(() => {
        opacity.value = withRepeat(withSequence(withTiming(1, { duration: 1000 }), withTiming(0.5, { duration: 1000 })), -1, true);
        scale.value = withRepeat(withSequence(withTiming(1.2, { duration: 1000 }), withTiming(1, { duration: 1000 })), -1, true);
    }, []);

    const rStyle = useAnimatedStyle(() => ({ opacity: opacity.value, transform: [{ scale: scale.value }] }));

    return <Animated.View style={[styles.pulseDot, rStyle]} />;
};

export const HeroSection = ({ onPress }: { onPress: () => void }) => {
    const scale = useSharedValue(1);

    const handlePressIn = () => {
        scale.value = withSpring(0.96);
    };

    const handlePressOut = () => {
        scale.value = withSpring(1);
    };

    const rStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

    return (
        <Animated.View entering={FadeInUp.delay(200).springify()} style={{ paddingHorizontal: SPACING.m, marginTop: SPACING.s }}>
            <Pressable
                onPress={() => {
                    Haptics.selectionAsync();
                    onPress();
                }}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
            >
                <Animated.View style={[styles.container, rStyle]}>
                    <Image source={{ uri: LAST_ORDER.image }} style={styles.image} />
                    <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']} style={styles.gradient} />

                    <View style={styles.content}>
                        <View style={styles.badgeRow}>
                            <View style={styles.liveBadge}>
                                <PulseDot />
                                <Text style={styles.liveText}>Ready in 10m</Text>
                            </View>
                            <View style={styles.reorderBadge}>
                                <Trophy size={12} color={GAME_UI.ink} />
                                <Text style={styles.reorderText}>QUEST COMPLETED</Text>
                            </View>
                        </View>

                        <View>
                            <Text style={styles.title}>{LAST_ORDER.name}</Text>
                            <Text style={styles.subtitle}>from {LAST_ORDER.canteen}</Text>
                        </View>
                        
                        <DashedLine />

                        <View style={styles.ctaRow}>
                            <View style={styles.ctaBtn}>
                                <Text style={styles.ctaText}>Place Reorder</Text>
                            </View>
                        </View>
                    </View>
                </Animated.View>
            </Pressable>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        height: 220, // Taller to fit spacing
        borderRadius: 16, // Not fully round, but soft box
        overflow: 'hidden',
        backgroundColor: GAME_UI.white,
        ...GAME_UI.shadows.md,
    },
    image: { width: '100%', height: '100%', resizeMode: 'cover', opacity: 0.9 }, // Image slightly muted
    gradient: { ...StyleSheet.absoluteFillObject },
    content: { ...StyleSheet.absoluteFillObject, padding: SPACING.m, justifyContent: 'space-between' },

    badgeRow: { flexDirection: 'row', justifyContent: 'space-between' },
    liveBadge: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        borderRadius: 8, 
        gap: 6, 
        backgroundColor: GAME_UI.white, 
        paddingHorizontal: 10, 
        paddingVertical: 6, 
        ...GAME_UI.shadows.sm
    },
    pulseDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.success, borderWidth: 1, borderColor: GAME_UI.ink },
    liveText: { color: GAME_UI.ink, fontSize: 11, fontWeight: '800' },

    reorderBadge: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        backgroundColor: GAME_UI.secondary, // Blue tag
        paddingHorizontal: 10, 
        paddingVertical: 6, 
        borderRadius: 8, 
        gap: 6, 
        ...GAME_UI.shadows.sm
    },
    reorderText: { color: GAME_UI.ink, fontSize: 11, fontWeight: '800' },

    title: { fontSize: 28, fontWeight: '900', color: COLORS.white, width: '90%', textShadowColor: GAME_UI.ink, textShadowOffset: { width: 2, height: 2 }, textShadowRadius: 0, marginTop: SPACING.s },
    subtitle: { fontSize: 16, color: GAME_UI.white, fontWeight: '700', textShadowColor: GAME_UI.ink, textShadowOffset: { width: 1.5, height: 1.5 }, textShadowRadius: 0 },

    dashedContainer: { flexDirection: 'row', overflow: 'hidden', height: 2, width: '100%', opacity: 0.6, marginVertical: 4 },
    dash: { width: 8, height: 2, backgroundColor: GAME_UI.white, marginRight: 4 },

    ctaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    price: { fontSize: 24, fontWeight: '900', color: GAME_UI.primaryBtn, textShadowColor: GAME_UI.ink, textShadowOffset: { width: 2, height: 2 }, textShadowRadius: 0 },
    
    // THE BUTTON - Inspired by "Place Bid"
    ctaBtn: { 
        width: '100%',
        flexDirection: 'row', 
        alignItems: 'center', 
        justifyContent: 'center',
        paddingVertical: 14, 
        borderRadius: 12, 
        backgroundColor: GAME_UI.primaryBtn, // Apricot
        ...GAME_UI.shadows.button 
    },
    ctaText: { color: GAME_UI.ink, fontSize: 16, fontWeight: '900', textTransform: 'uppercase' },
});
