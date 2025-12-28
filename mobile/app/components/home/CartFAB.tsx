import { View, Text, StyleSheet, Pressable } from 'react-native';
import { ShoppingBag } from 'lucide-react-native';
import { COLORS, SHADOWS, RADIUS } from '../../constants/theme';
import { useRouter } from 'expo-router';
import { MotiView, AnimatePresence } from 'moti';
import { useCart } from '../../context/CartContext';
import * as Haptics from 'expo-haptics';

export const CartFAB = () => {
    const router = useRouter();
    const { total, items } = useCart();
    const count = items.reduce((sum, item) => sum + item.quantity, 0);

    // Only show if cart has items
    if (count === 0) return null;

    return (
        <AnimatePresence>
            <MotiView
                from={{ opacity: 0, scale: 0.5, translateY: 100 }}
                animate={{ opacity: 1, scale: 1, translateY: 0 }}
                exit={{ opacity: 0, scale: 0.5, translateY: 100 }}
                transition={{ type: 'spring', damping: 15 }}
                style={styles.container}
            >
                <Pressable
                    onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        router.push('/(app)/cart');
                    }}
                    style={styles.btn}
                >
                    <View style={styles.iconContainer}>
                        <ShoppingBag size={24} color={COLORS.white} />
                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>{count}</Text>
                        </View>
                    </View>

                    <View style={styles.textContainer}>
                        <Text style={styles.viewCart}>View Cart</Text>
                        <Text style={styles.total}>₹{total}</Text>
                    </View>
                </Pressable>
            </MotiView>
        </AnimatePresence>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 30,
        alignSelf: 'center',
        zIndex: 100,
    },
    btn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.primary,
        paddingVertical: 14,
        paddingHorizontal: 24,
        borderRadius: RADIUS.full,
        gap: 16,
        ...SHADOWS.glow,
    },
    iconContainer: { position: 'relative' },
    badge: {
        position: 'absolute',
        top: -6,
        right: -6,
        backgroundColor: COLORS.white,
        width: 18,
        height: 18,
        borderRadius: 9,
        alignItems: 'center',
        justifyContent: 'center',
    },
    badgeText: { fontSize: 10, fontWeight: '800', color: COLORS.primary },
    textContainer: { gap: 2 },
    viewCart: { color: COLORS.white, fontWeight: '700', fontSize: 16 },
    total: { color: 'rgba(255,255,255,0.9)', fontWeight: '600', fontSize: 12 },
});
