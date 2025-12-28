import { View, Text, StyleSheet, Pressable } from 'react-native';
// import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, RADIUS, GAME_UI } from '../../constants/theme';
import { MotiView } from 'moti';
import { ArrowRight } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

interface CartFooterProps {
    total: number;
    onCheckout: () => void;
}

export const CartFooter = ({ total, onCheckout }: CartFooterProps) => {
    return (
        <View style={styles.wrapper}>
            <View style={styles.container}>
                <View style={styles.totalInfo}>
                    <Text style={styles.totalLabel}>Grand Total</Text>
                    <Text style={styles.totalValue}>₹{total.toFixed(2)}</Text>
                    <Text style={styles.microcopy}>View detailed bill</Text>
                </View>

                <Pressable onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    onCheckout();
                }}>
                    <MotiView
                        from={{ scale: 1 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring' }}
                    >
                        <View style={styles.payButton}>
                            <Text style={styles.payText}>PAY NOW</Text>
                            <ArrowRight color={GAME_UI.ink} size={20} strokeWidth={3} />
                        </View>
                    </MotiView>
                </Pressable>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    wrapper: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: GAME_UI.white,
        paddingBottom: 30, // Safe area
        paddingTop: SPACING.m,
        borderTopWidth: 3,
        borderTopColor: GAME_UI.ink,
        // ...GAME_UI.shadows.md, // Shadow might be weird on footer, border top is enough or shadow
        elevation: 20,
        shadowColor: "#000",
        shadowOpacity: 0.1,
        shadowRadius: 10,
    },
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: SPACING.l,
    },
    totalInfo: {
        justifyContent: 'center',
    },
    totalLabel: {
        fontSize: 12,
        color: GAME_UI.ink,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    totalValue: {
        fontSize: 24,
        fontWeight: '900',
        color: GAME_UI.ink,
        marginVertical: 2,
    },
    microcopy: {
        fontSize: 10,
        color: GAME_UI.ink,
        fontWeight: '600',
        textDecorationLine: 'underline',
        opacity: 0.6
    },
    payButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 24,
        borderRadius: 12,
        gap: 8,
        backgroundColor: GAME_UI.primaryBtn,
        ...GAME_UI.shadows.button
    },
    payText: {
        fontSize: 16,
        fontWeight: '900',
        color: GAME_UI.ink,
        letterSpacing: 0.5,
        textTransform: 'uppercase'
    }
});
