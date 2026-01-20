import React, { useEffect, memo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { MotiView } from 'moti';
import { Clock, CheckCircle2, ChefHat, ShoppingBag } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { COLORS, SPACING, RADIUS, GAME_UI } from '../../constants/theme';

// const { width } = Dimensions.get('window'); // Unused

interface LiveOrderCardProps {
    order: {
        id: string;
        vendorName: string;
        status: 'ACCEPTED' | 'PREPARING' | 'READY' | 'COMPLETED';
        items: string[];
        eta: string;
        total: number;
    };
    onPress: () => void;
}

const STEPS = [
    { key: 'ACCEPTED', icon: CheckCircle2, label: 'Accepted' },
    { key: 'PREPARING', icon: ChefHat, label: 'Cooking' },
    { key: 'READY', icon: ShoppingBag, label: 'Ready' },
];

export const LiveOrderCard = memo(({ order, onPress }: LiveOrderCardProps) => {
    // Calculate progress index
    const currentStepIndex = STEPS.findIndex(s => s.key === order.status);
    // If completed/unknown, default to max or 0
    const activeIndex = currentStepIndex === -1 ? (order.status === 'COMPLETED' ? STEPS.length - 1 : 0) : currentStepIndex;
    return (
        <Pressable onPress={() => {
            Haptics.selectionAsync();
            onPress();
        }}>
            {({ pressed }) => (
                <MotiView
                    from={{ opacity: 0, scale: 0.95 }}
                    animate={{
                        opacity: 1,
                        scale: pressed ? 0.98 : 1,
                        borderColor: GAME_UI.ink
                    }}
                    transition={{ type: 'spring', delay: 100 }}
                    style={styles.container}
                >
                    {/* Header: Restaurant & ETA */}
                    <View style={styles.header}>
                        <View>
                            <Text style={styles.vendorName}>{order.vendorName}</Text>
                            <Text style={styles.orderId}>Order #{order.id.slice(-4)}</Text>
                        </View>
                        <View style={styles.etaPill}>
                            <Clock size={12} color={GAME_UI.ink} strokeWidth={3} />
                            <Text style={styles.etaText}>{order.eta}</Text>
                        </View>
                    </View>

                    {/* Progress Bar Track */}
                    <View style={styles.trackContainer}>
                        {/* Background Line */}
                        <View style={styles.lineBg} />

                        {/* Active Line (Animated Width) */}
                        <MotiView
                            animate={{ width: `${(activeIndex / (STEPS.length - 1)) * 100}%` }}
                            transition={{ type: 'spring', damping: 15 }}
                            style={styles.lineActive}
                        />

                        {/* Steps */}
                        <View style={styles.stepsRow}>
                            {STEPS.map((step, index) => {
                                const Icon = step.icon;
                                const isActive = index <= activeIndex;
                                const isCurrent = index === activeIndex;

                                return (
                                    <View key={step.key} style={styles.stepWrapper}>
                                        <MotiView
                                            animate={{
                                                backgroundColor: isActive ? GAME_UI.primaryBtn : GAME_UI.white, // Apricot if active
                                                scale: isCurrent ? 1.1 : 1,
                                                borderWidth: 2,
                                                borderColor: GAME_UI.ink
                                            }}
                                            style={styles.stepCircle}
                                        >
                                            <Icon
                                                size={14}
                                                color={GAME_UI.ink}
                                                strokeWidth={3}
                                            />
                                        </MotiView>
                                        <Text style={[
                                            styles.stepLabel,
                                            { color: GAME_UI.ink, fontWeight: isActive ? '900' : '500', textTransform: 'uppercase' }
                                        ]}>
                                            {step.label}
                                        </Text>
                                    </View>
                                );
                            })}
                        </View>
                    </View>

                    {/* Footer: Item Summary */}
                    <View style={styles.footer}>
                        <Text style={styles.itemSummary} numberOfLines={1}>
                            {order.items.join(', ')}
                        </Text>
                        <Text style={styles.totalPrice}>₹{order.total}</Text>
                    </View>
                </MotiView>
            )}
        </Pressable>
    );
});

const styles = StyleSheet.create({
    container: {
        backgroundColor: GAME_UI.white,
        borderRadius: 16,
        padding: SPACING.l,
        marginHorizontal: SPACING.l,
        marginBottom: SPACING.l,
        ...GAME_UI.shadows.md,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: SPACING.l,
    },
    vendorName: {
        fontSize: 18,
        fontWeight: '900',
        color: GAME_UI.ink,
        textTransform: 'uppercase',
    },
    orderId: {
        fontSize: 12,
        color: GAME_UI.ink,
        marginTop: 2,
        fontWeight: '700',
    },
    etaPill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: GAME_UI.tertiary, // Mint
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 4,
        gap: 6,
        borderWidth: 1,
        borderColor: GAME_UI.ink,
    },
    etaText: {
        fontSize: 12,
        fontWeight: '900',
        color: GAME_UI.ink,
    },
    trackContainer: {
        marginBottom: SPACING.l,
        position: 'relative',
        justifyContent: 'center',
    },
    lineBg: {
        position: 'absolute',
        top: 14, // Center vertically relative to circle (30px / 2 approx)
        left: 15,
        right: 15,
        height: 3,
        backgroundColor: GAME_UI.white,
        borderWidth: 1,
        borderColor: GAME_UI.ink,
        borderRadius: 2,
    },
    lineActive: {
        position: 'absolute',
        top: 14,
        left: 15,
        height: 3,
        backgroundColor: GAME_UI.ink,
        borderRadius: 2,
        zIndex: 1,
    },
    stepsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        zIndex: 2,
    },
    stepWrapper: {
        alignItems: 'center',
        gap: 6,
    },
    stepCircle: {
        width: 30,
        height: 30,
        borderRadius: 15,
        justifyContent: 'center',
        alignItems: 'center',
    },
    stepLabel: {
        fontSize: 10,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: SPACING.m,
        borderTopWidth: 2,
        borderTopColor: GAME_UI.ink,
    },
    itemSummary: {
        flex: 1,
        color: GAME_UI.ink,
        fontSize: 13,
        marginRight: SPACING.m,
        fontWeight: '600',
    },
    totalPrice: {
        fontSize: 16,
        fontWeight: '900',
        color: GAME_UI.ink,
    }
});
