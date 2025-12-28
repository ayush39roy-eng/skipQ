import { View, Text, StyleSheet, Image, Pressable } from 'react-native';
import { BlurView } from 'expo-blur';
import { Search, MapPin, ChevronDown, Zap } from 'lucide-react-native';
import { COLORS, RADIUS, SPACING, GAME_UI } from '../../constants/theme';
import Animated, { FadeInDown } from 'react-native-reanimated';

export const HomeHeader = () => {
    return (
        <Animated.View entering={FadeInDown.duration(600).springify()} style={styles.container}>

            {/* Top Row: Location & Avatar */}
            <View style={styles.topRow}>
                <View>
                    {/* Badge Style Greeting */}
                    <View style={styles.badge}>
                        <Zap size={10} color={GAME_UI.ink} fill={GAME_UI.accent} />
                        <Text style={styles.badgeText}>LEVEL 5 FOODIE</Text>
                    </View>
                    
                    <Pressable style={styles.locationBtn}>
                        <View style={styles.locationIcon}>
                            <MapPin size={12} color={GAME_UI.ink} />
                        </View>
                        <Text style={styles.locationText}>Block A, Main Campus</Text>
                        <ChevronDown size={14} color={GAME_UI.ink} />
                    </Pressable>
                </View>

                <View style={styles.avatarContainer}>
                    <Image
                        source={{ uri: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&q=80' }}
                        style={styles.avatar}
                    />
                    <View style={styles.notificationDot} />
                </View>
            </View>

            {/* Search Bar */}
            <View style={styles.searchContainer}>
                <BlurView intensity={20} tint="dark" style={styles.searchBlur}>
                    <Search size={20} color={COLORS.textMutedDark} />
                    <Text style={styles.placeholder}>Search "Cappuccino"...</Text>
                </BlurView>
            </View>

        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: { paddingHorizontal: SPACING.m, paddingTop: 35, paddingBottom: SPACING.xs },
    topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.l },
    
    badge: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        gap: 4, 
        backgroundColor: GAME_UI.white, 
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 8,
        marginBottom: 8,
        ...GAME_UI.shadows.sm
    },
    badgeText: { fontSize: 10, fontWeight: '800', color: GAME_UI.ink, letterSpacing: 0.5 },
    
    greeting: { fontSize: 14, color: COLORS.textMutedDark, marginBottom: 4, fontWeight: '600' },
    locationBtn: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    locationIcon: { width: 20, height: 20, borderRadius: 10, backgroundColor: GAME_UI.white, borderWidth: 1.5, borderColor: GAME_UI.ink, justifyContent: 'center', alignItems: 'center' },
    locationText: { color: GAME_UI.ink, fontSize: 16, fontWeight: '800' },

    avatarContainer: { position: 'relative' },
    avatar: { 
        width: 48, 
        height: 48, 
        borderRadius: RADIUS.full, 
        borderWidth: 2, 
        borderColor: GAME_UI.ink,
        backgroundColor: GAME_UI.white
    },
    notificationDot: { 
        position: 'absolute', 
        top: 0, 
        right: 0, 
        width: 14, 
        height: 14, 
        borderRadius: 7, 
        backgroundColor: GAME_UI.primary, 
        borderWidth: 2, 
        borderColor: GAME_UI.ink 
    },

    searchContainer: { 
        borderRadius: 12, 
        overflow: 'hidden', 
        backgroundColor: GAME_UI.white, 
        ...GAME_UI.shadows.sm, // Apply our custom shadow
    },
    searchBlur: { 
        height: 52, 
        flexDirection: 'row', 
        alignItems: 'center', 
        paddingHorizontal: SPACING.m, 
        gap: 12, 
        backgroundColor: GAME_UI.white 
    },
    placeholder: { color: 'rgba(0,0,0,0.4)', fontSize: 16, fontWeight: '600', fontFamily: 'System' },
});
