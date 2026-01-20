import { View, Text, StyleSheet, ScrollView, Pressable, Image, ActivityIndicator, Alert } from 'react-native';
import { OrderDetailsSkeleton } from '../../components/orders/OrderDetailsSkeleton';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SPACING, GAME_UI } from '../../constants/theme';
import { ChevronLeft, Clock, MapPin, Receipt, CheckCircle2, Phone } from 'lucide-react-native';
import { MotiView } from 'moti';
import { BlurView } from 'expo-blur';
import { useEffect, useState } from 'react';
import { api } from '../../services/api';

export default function OrderDetailsScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();

    const [order, setOrder] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!id) return;
        fetchOrderDetails();
    }, [id]);

    const fetchOrderDetails = async () => {
        try {
            const data = await api.getOrderDetails(id as string);
            if (data) {
                setOrder(data);
            } else {
                Alert.alert("Order not found");
                router.back();
            }
        } catch (e) {
            console.error("Failed to fetch order details", e);
            Alert.alert("Error", "Could not load order details");
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <OrderDetailsSkeleton />
        );
    }

    if (!order) return null;

    // Helper to determine active step
    const status = order.fulfillmentStatus || 'PENDING';
    const isPlaced = true;
    const isAccepted = ['ACCEPTED', 'PREPARING', 'READY', 'COMPLETED', 'DELIVERED'].includes(status);
    const isPreparing = ['PREPARING', 'READY', 'COMPLETED', 'DELIVERED'].includes(status);
    const isReady = ['READY', 'COMPLETED', 'DELIVERED'].includes(status);
    const isCompleted = ['COMPLETED', 'DELIVERED'].includes(status);

    const timeline = [
        { status: 'Order Placed', time: new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), done: isPlaced },
        { status: 'Accepted', time: isAccepted ? 'Confirmed' : 'Pending', done: isAccepted },
        { status: 'Preparing', time: isPreparing ? 'Kitchen' : 'Pending', done: isPreparing },
        { status: 'Ready for Pickup', time: isReady ? 'Counter' : 'Pending', done: isReady }
    ];

    const subtotal = order.totalCents / 100;

    return (
        <View style={styles.container}>
            <StatusBar style="dark" />

            {/* Header */}
            <View style={styles.header}>
                <Pressable 
                    onPress={() => router.back()} 
                    style={styles.backBtn}
                    accessibilityLabel="Go back"
                    accessibilityRole="button"
                >
                    <ChevronLeft color={GAME_UI.ink} size={28} strokeWidth={3} />
                </Pressable>
                <Text style={styles.headerTitle}>ORDER #{String(id).slice(-4)}</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                {/* Status Hero */}
                <MotiView
                    from={{ opacity: 0, translateY: 20 }}
                    animate={{ opacity: 1, translateY: 0 }}
                    style={styles.heroCard}
                >
                    <View style={styles.heroIconWrapper}>
                        <Clock size={36} color={GAME_UI.ink} strokeWidth={3} />
                    </View>
                    <Text style={styles.heroStatus}>
                        {isCompleted ? "ORDER COMPLETE!" : isReady ? "READY FOR PICKUP!" : "PREPARING..."}
                    </Text>
                    <Text style={styles.heroSubtext}>
                        {order.canteen?.name || "Canteen"}
                    </Text>

                    {/* Animated Progress Bar */}
                    <View style={styles.progressBarBg}>
                        <MotiView
                            from={{ width: '0%' }}
                            animate={{ width: isCompleted ? '100%' : isReady ? '80%' : isPreparing ? '50%' : '10%' }}
                            transition={{ type: 'timing', duration: 1000 }}
                            style={styles.progressBarFill}
                        />
                    </View>
                </MotiView>

                {/* Timeline */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>ORDER STATUS</Text>
                    <View style={styles.timelineContainer}>
                        {timeline.map((step, index) => (
                            <View key={index} style={styles.timelineRow}>
                                {/* Line Connector */}
                                {index !== timeline.length - 1 && (
                                    <View style={[
                                        styles.connectorLine,
                                        { backgroundColor: step.done ? GAME_UI.ink : GAME_UI.background }
                                    ]} />
                                )}

                                <View style={[
                                    styles.dot,
                                    {
                                        backgroundColor: step.done ? GAME_UI.primaryBtn : GAME_UI.white,
                                        borderColor: GAME_UI.ink
                                    }
                                ]}>
                                    {step.done && <CheckCircle2 size={12} color={GAME_UI.ink} strokeWidth={3} />}
                                </View>

                                <View style={styles.timelineContent}>
                                    <Text style={[
                                        styles.timelineStatus,
                                        { color: GAME_UI.ink, opacity: step.done ? 1 : 0.5 }
                                    ]}>
                                        {step.status.toUpperCase()}
                                    </Text>
                                    <Text style={styles.timelineTime}>{step.time}</Text>
                                </View>
                            </View>
                        ))}
                    </View>
                </View>

                {/* Item List */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>ITEMS ORDERED</Text>
                    <View style={styles.itemsCard}>
                        {order.items?.map((item: any, index: number) => (
                            <View key={index} style={styles.itemRow}>
                                <View style={styles.qtyBadge}>
                                    <Text style={styles.qtyText}>{item.quantity}x</Text>
                                </View>
                                <Text style={styles.itemName}>{item.menuItem?.name || "Item"}</Text>
                                <Text style={styles.itemPrice}>₹{((item.menuItem?.priceCents || 0) * item.quantity) / 100}</Text>
                            </View>
                        ))}
                    </View>
                </View>

                {/* Bill Details */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>BILL DETAILS</Text>
                    <View style={styles.billCard}>
                        <View style={[styles.billRow, styles.totalRow]}>
                            <Text style={styles.totalLabel}>GRAND TOTAL</Text>
                            <Text style={styles.totalValue}>₹{subtotal}</Text>
                        </View>
                    </View>
                </View>

                {/* Support Button */}
                <Pressable style={styles.supportButton}>
                    <Phone size={20} color={GAME_UI.ink} strokeWidth={3} />
                    <Text style={styles.supportText}>CALL SUPPORT</Text>
                </Pressable>

            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: GAME_UI.background,
    },
    header: {
        paddingTop: 60,
        paddingHorizontal: SPACING.l,
        paddingBottom: SPACING.m,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: GAME_UI.white,
        ...GAME_UI.shadows.md,
        zIndex: 10,
    },
    backBtn: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: '900',
        color: GAME_UI.ink,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    scrollContent: {
        padding: SPACING.l,
        paddingBottom: 40,
    },
    heroCard: {
        backgroundColor: GAME_UI.white,
        borderRadius: 12,
        padding: SPACING.xl,
        alignItems: 'center',
        marginBottom: SPACING.xl,
        ...GAME_UI.shadows.md,
        borderWidth: 2.5,
        borderColor: GAME_UI.ink,
    },
    heroIconWrapper: {
        width: 72,
        height: 72,
        borderRadius: 12,
        backgroundColor: GAME_UI.tertiary,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: SPACING.m,
        borderWidth: 2.5,
        borderColor: GAME_UI.ink,
    },
    heroStatus: {
        fontSize: 22,
        fontWeight: '900',
        color: GAME_UI.ink,
        marginBottom: 4,
        textTransform: 'uppercase',
    },
    heroSubtext: {
        fontSize: 14,
        color: GAME_UI.ink,
        marginBottom: SPACING.l,
        opacity: 0.6,
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    progressBarBg: {
        width: '100%',
        height: 8,
        backgroundColor: GAME_UI.background,
        borderRadius: 4,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: GAME_UI.ink,
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: GAME_UI.primaryBtn,
        borderRadius: 2,
    },
    section: {
        marginBottom: SPACING.xl,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '900',
        color: GAME_UI.ink,
        marginBottom: SPACING.m,
        marginLeft: 4,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    timelineContainer: {
        paddingLeft: 8,
    },
    timelineRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: SPACING.l,
        position: 'relative',
    },
    dot: {
        width: 24,
        height: 24,
        borderRadius: 6,
        borderWidth: 2.5,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 2,
        marginTop: 2,
    },
    connectorLine: {
        position: 'absolute',
        left: 11,
        top: 26,
        bottom: -15,
        width: 2.5,
    },
    timelineContent: {
        marginLeft: SPACING.m,
        flex: 1,
    },
    timelineStatus: {
        fontSize: 14,
        fontWeight: '800',
        marginBottom: 2,
        textTransform: 'uppercase',
    },
    timelineTime: {
        fontSize: 12,
        color: GAME_UI.ink,
        fontWeight: '600',
        opacity: 0.5,
    },
    itemsCard: {
        backgroundColor: GAME_UI.white,
        borderRadius: 12,
        padding: SPACING.m,

        ...GAME_UI.shadows.sm,
    },
    itemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.m,
    },
    qtyBadge: {
        backgroundColor: GAME_UI.tertiary,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
        marginRight: SPACING.s,
        borderWidth: 2,
        borderColor: GAME_UI.ink,
    },
    qtyText: {
        fontSize: 12,
        fontWeight: '900',
        color: GAME_UI.ink,
        textTransform: 'uppercase',
    },
    itemName: {
        flex: 1,
        fontSize: 14,
        color: GAME_UI.ink,
        fontWeight: '700',
    },
    itemPrice: {
        fontSize: 14,
        fontWeight: '900',
        color: GAME_UI.ink,
    },
    billCard: {
        backgroundColor: GAME_UI.white,
        borderRadius: 12,
        padding: SPACING.m,
        ...GAME_UI.shadows.md,
        borderWidth: 2.5,
        borderColor: GAME_UI.ink,
    },
    billRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: SPACING.s,
    },
    totalRow: {
        marginTop: SPACING.s,
        paddingTop: SPACING.s,
        borderTopWidth: 2.5,
        borderTopColor: GAME_UI.ink,
        marginBottom: 0,
    },
    totalLabel: {
        fontSize: 16,
        fontWeight: '900',
        color: GAME_UI.ink,
        textTransform: 'uppercase',
    },
    totalValue: {
        fontSize: 18,
        fontWeight: '900',
        color: GAME_UI.ink,
    },
    supportButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: SPACING.m,
        borderRadius: 8,

        backgroundColor: GAME_UI.white,
        gap: 8,
        ...GAME_UI.shadows.sm,
    },
    supportText: {
        color: GAME_UI.ink,
        fontWeight: '900',
        fontSize: 14,
        textTransform: 'uppercase',
        letterSpacing: 1,
    }

});
