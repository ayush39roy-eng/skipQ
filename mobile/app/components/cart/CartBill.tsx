import { View, Text, StyleSheet, Pressable } from 'react-native';
import { COLORS, SPACING, RADIUS, GAME_UI } from '../../constants/theme'; // Assuming GAME_UI needs to be imported if used, otherwise keep COLORS
import { MotiView, AnimatePresence } from 'moti';
import { useState } from 'react';
import { Info } from 'lucide-react-native';

interface CartBillProps {
    subtotal: number;
    tax?: number;
    deliveryFee?: number;
    discount?: number;
}

export const CartBill = ({ subtotal, tax = 0, deliveryFee = 0, discount = 0 }: CartBillProps) => {
    const total = subtotal + tax + deliveryFee - discount;
    const [expanded, setExpanded] = useState(false);

    return (
        <MotiView
            from={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 200 }}
            style={styles.container}
        >
            <View style={styles.totalRow}>
                <View style={styles.headerRow}>
                    <Text style={styles.totalLabel}>To Pay</Text>
                    <Pressable onPress={() => setExpanded(!expanded)} hitSlop={10} style={styles.infoBtn}>
                        <Info size={16} color={COLORS.textMuted} />
                    </Pressable>
                </View>
                <Text style={styles.totalValue}>₹{total.toFixed(2)}</Text>
            </View>

            <AnimatePresence>
                {expanded && (
                    <MotiView
                        from={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ type: 'timing', duration: 300 }}
                        style={styles.detailsContainer}
                    >
                        <View style={styles.divider} />
                        
                        <View style={styles.row}>
                            <Text style={styles.label}>Item Total</Text>
                            <Text style={styles.value}>₹{subtotal.toFixed(2)}</Text>
                        </View>

                        {deliveryFee > 0 && (
                            <View style={styles.row}>
                                <Text style={styles.label}>Delivery Fee</Text>
                                <Text style={styles.value}>₹{deliveryFee.toFixed(2)}</Text>
                            </View>
                        )}

                        <View style={styles.row}>
                            <Text style={styles.label}>Platform Fee</Text>
                            <Text style={styles.value}>₹{tax.toFixed(2)}</Text>
                        </View>

                        {discount > 0 && (
                            <View style={styles.row}>
                                <Text style={[styles.label, styles.discountText]}>Discount</Text>
                                <Text style={[styles.value, styles.discountText]}>- ₹{discount.toFixed(2)}</Text>
                            </View>
                        )}
                    </MotiView>
                )}
            </AnimatePresence>
        </MotiView>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: COLORS.white,
        borderRadius: RADIUS.l,
        padding: SPACING.m,
        marginVertical: SPACING.m,
        marginHorizontal: SPACING.m,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.03)',
        ...GAME_UI.shadows.sm, // Adding shadow for better lift
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    infoBtn: {
        padding: 2,
    },
    detailsContainer: {
        overflow: 'hidden',
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    label: {
        fontSize: 14,
        color: COLORS.textMuted,
    },
    value: {
        fontSize: 14,
        color: COLORS.textDark,
        fontWeight: '500',
    },
    discountText: {
        color: COLORS.primary,
        fontWeight: '600',
    },
    divider: {
        height: 1,
        backgroundColor: COLORS.lightBg,
        marginVertical: SPACING.s,
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 4, 
    },
    totalLabel: {
        fontSize: 16,
        fontWeight: '800',
        color: COLORS.textDark,
    },
    totalValue: {
        fontSize: 18,
        fontWeight: '800',
        color: COLORS.textDark,
    }
});
