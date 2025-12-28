import { View, Text, StyleSheet, Pressable } from 'react-native';
import { MotiView } from 'moti';
import { ShoppingBag } from 'lucide-react-native';
import { Link } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, RADIUS, GAME_UI } from '../../constants/theme';

interface StickyCartBarProps {
    itemCount: number;
    total: number;
    hasTabBar?: boolean;
}

export const StickyCartBar = ({ itemCount, total, hasTabBar = false }: StickyCartBarProps) => {
    const insets = useSafeAreaInsets();
    if (itemCount === 0) return null;

    const bottomOffset = hasTabBar ? 90 : (insets.bottom + 20);

    return (
        <MotiView
            from={{ translateY: 100, opacity: 0 }}
            animate={{ translateY: 0, opacity: 1 }}
            exit={{ translateY: 100, opacity: 0 }}
            transition={{ type: 'spring', damping: 15 }}
            style={[styles.wrapper, { bottom: bottomOffset }]}
        >
            <Link href="/(app)/cart" asChild>
                <Pressable>
                    <View style={styles.container}>
                        {/* Cart Info (Left) */}
                        <View style={styles.info}>
                            <View style={styles.countBadge}>
                                <Text style={styles.countText}>{itemCount} ITEMS</Text>
                            </View>
                            <Text style={styles.totalText}>₹{total}</Text>
                        </View>

                        {/* Checkout CTA (Right) */}
                        <View style={styles.cta}>
                            <Text style={styles.ctaText}>VIEW CART</Text>
                            <ShoppingBag size={18} color={GAME_UI.ink} />
                        </View>
                    </View>
                </Pressable>
            </Link>
        </MotiView>
    );
};

const styles = StyleSheet.create({
    wrapper: {
        position: 'absolute',
        // bottom set dynamically
        left: 20,
        right: 20,
        zIndex: 100,
    },
    container: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 12,
        borderRadius: 16,
        backgroundColor: GAME_UI.white,
        ...GAME_UI.shadows.md,
    },
    info: {
        flexDirection: 'column',
    },
    countBadge: {
        backgroundColor: GAME_UI.secondary,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
        alignSelf: 'flex-start',
        marginBottom: 4,
        borderWidth: 1,
        borderColor: GAME_UI.ink
    },
    countText: {
        color: GAME_UI.ink,
        fontSize: 10,
        fontWeight: '900',
    },
    totalText: {
        fontSize: 20,
        fontWeight: '900',
        color: GAME_UI.ink,
    },
    cta: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 12, // Blocky
        gap: 8,
        backgroundColor: GAME_UI.primaryBtn,
        ...GAME_UI.shadows.button
    },
    ctaText: {
        color: GAME_UI.ink,
        fontSize: 14,
        fontWeight: '900',
        textTransform: 'uppercase'
    },
});
