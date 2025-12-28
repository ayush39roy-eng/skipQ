import { View, Text, StyleSheet, ScrollView, Pressable, Image, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { COLORS, SPACING, RADIUS, SHADOWS, FONTS } from '../../constants/theme';
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
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    if (!order) return null;

    // Helper to determine active step
    const status = order.fulfillmentStatus || 'PENDING';
    const isPlaced = true;
    const isAccepted = ['PREPARING', 'READY', 'COMPLETED', 'DELIVERED'].includes(status);
    const isPreparing = ['PREPARING', 'READY', 'COMPLETED', 'DELIVERED'].includes(status);
    const isReady = ['READY', 'COMPLETED', 'DELIVERED'].includes(status);
    const isCompleted = ['COMPLETED', 'DELIVERED'].includes(status);

    const timeline = [
        { status: 'Order Placed', time: new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), done: isPlaced },
        { status: 'Accepted', time: isAccepted ? 'Confirmed' : 'Pending', done: isAccepted },
        { status: 'Preparing', time: isPreparing ? 'Kitchen' : 'Pending', done: isPreparing },
        { status: 'Ready for Pickup', time: isReady ? 'Counter' : 'Pending', done: isReady }
    ];

    const subtotal = order.totalCents / 100; // backend total includes fees usually, but let's assume raw sum here
    // In a real app we'd parse the items price breakdown better

    return (
        <View style={styles.container}>
            <StatusBar style="dark" />

            {/* Header */}
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={styles.backBtn}>
                    <ChevronLeft color={COLORS.textDark} size={24} />
                </Pressable>
                <Text style={styles.headerTitle}>Order #{String(id).slice(-4)}</Text>
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
                        <Clock size={32} color={COLORS.primary} />
                    </View>
                    <Text style={styles.heroStatus}>
                        {isCompleted ? "Order Completed" : isReady ? "Ready for Pickup!" : "Preparing your food"}
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
                    <Text style={styles.sectionTitle}>Order Status</Text>
                    <View style={styles.timelineContainer}>
                        {timeline.map((step, index) => (
                            <View key={index} style={styles.timelineRow}>
                                {/* Line Connector */}
                                {index !== timeline.length - 1 && (
                                    <View style={[
                                        styles.connectorLine,
                                        { backgroundColor: step.done ? COLORS.primary : COLORS.lightBg }
                                    ]} />
                                )}

                                <View style={[
                                    styles.dot,
                                    {
                                        backgroundColor: step.done ? COLORS.primary : COLORS.white,
                                        borderColor: step.done ? COLORS.primary : COLORS.textMutedLight
                                    }
                                ]}>
                                    {step.done && <CheckCircle2 size={12} color="#fff" />}
                                </View>

                                <View style={styles.timelineContent}>
                                    <Text style={[
                                        styles.timelineStatus,
                                        { color: step.done ? COLORS.textDark : COLORS.textMutedDark }
                                    ]}>
                                        {step.status}
                                    </Text>
                                    <Text style={styles.timelineTime}>{step.time}</Text>
                                </View>
                            </View>
                        ))}
                    </View>
                </View>

                {/* Item List */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Items Ordered</Text>
                    <View style={styles.itemsCard}>
                        {order.items?.map((item: any, index: number) => (
                            <View key={index} style={styles.itemRow}>
                                <View style={styles.qtyBadge}>
                                    <Text style={styles.qtyText}>{item.quantity}x</Text>
                                </View>
                                <Text style={styles.itemName}>{item.menuItem?.name || "Item"}</Text>
                                <Text style={styles.itemPrice}>₹{(item.menuItem?.priceCents || 0) / 100}</Text>
                            </View>
                        ))}
                    </View>
                </View>

                {/* Bill Details */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Bill Details</Text>
                    <View style={styles.billCard}>
                        {/* <View style={styles.billRow}>
                            <Text style={styles.billLabel}>Item Total</Text>
                            <Text style={styles.billValue}>₹{subtotal}</Text>
                        </View> */}
                        {/* Simplified for demo since backend might not send breakdown */}
                        <View style={[styles.billRow, styles.totalRow]}>
                            <Text style={styles.totalLabel}>Grand Total</Text>
                            <Text style={styles.totalValue}>₹{subtotal}</Text>
                        </View>
                    </View>
                </View>

                {/* Support Button */}
                <Pressable style={styles.supportButton}>
                    <Phone size={20} color={COLORS.primary} />
                    <Text style={styles.supportText}>Call Canteen Support</Text>
                </Pressable>

            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.lightBg,
    },
    header: {
        paddingTop: 60,
        paddingHorizontal: SPACING.l,
        paddingBottom: SPACING.m,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: COLORS.white,
        ...SHADOWS.light,
        zIndex: 10,
    },
    backBtn: {
        padding: 8,
        borderRadius: RADIUS.full,
        backgroundColor: COLORS.lightBg,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.textDark,
    },
    scrollContent: {
        padding: SPACING.l,
        paddingBottom: 40,
    },
    heroCard: {
        backgroundColor: COLORS.white,
        borderRadius: RADIUS.l,
        padding: SPACING.xl,
        alignItems: 'center',
        marginBottom: SPACING.xl,
        ...SHADOWS.medium,
    },
    heroIconWrapper: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: COLORS.accent,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: SPACING.m,
    },
    heroStatus: {
        fontSize: 20,
        fontWeight: '800',
        color: COLORS.textDark,
        marginBottom: 4,
    },
    heroSubtext: {
        fontSize: 14,
        color: COLORS.textMutedDark,
        marginBottom: SPACING.l,
    },
    progressBarBg: {
        width: '100%',
        height: 6,
        backgroundColor: COLORS.lightBg,
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: COLORS.primary,
        borderRadius: 3,
    },
    section: {
        marginBottom: SPACING.xl,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.textDark,
        marginBottom: SPACING.m,
        marginLeft: 4,
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
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 2,
        marginTop: 2,
    },
    connectorLine: {
        position: 'absolute',
        left: 9, // Center of dot (20/2 - 1)
        top: 22,
        bottom: -15,
        width: 2,
    },
    timelineContent: {
        marginLeft: SPACING.m,
        flex: 1,
    },
    timelineStatus: {
        fontSize: 15,
        fontWeight: '600',
        marginBottom: 2,
    },
    timelineTime: {
        fontSize: 12,
        color: COLORS.textMutedLight,
    },
    itemsCard: {
        backgroundColor: COLORS.white,
        borderRadius: RADIUS.m,
        padding: SPACING.m,
        borderWidth: 1,
        borderColor: COLORS.lightBg,
    },
    itemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.m,
    },
    qtyBadge: {
        backgroundColor: COLORS.lightBg,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
        marginRight: SPACING.s,
    },
    qtyText: {
        fontSize: 12,
        fontWeight: '700',
        color: COLORS.textDark,
    },
    itemName: {
        flex: 1,
        fontSize: 14,
        color: COLORS.textDark,
    },
    itemPrice: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.textDark,
    },
    billCard: {
        backgroundColor: COLORS.white,
        borderRadius: RADIUS.m,
        padding: SPACING.m,
        ...SHADOWS.light,
    },
    billRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: SPACING.s,
    },
    billLabel: {
        fontSize: 14,
        color: COLORS.textMutedDark,
    },
    billValue: {
        fontSize: 14,
        color: COLORS.textDark,
        fontWeight: '500',
    },
    totalRow: {
        marginTop: SPACING.s,
        paddingTop: SPACING.s,
        borderTopWidth: 1,
        borderTopColor: COLORS.lightBg,
        marginBottom: 0,
    },
    totalLabel: {
        fontSize: 16,
        fontWeight: '800',
        color: COLORS.textDark,
    },
    totalValue: {
        fontSize: 16,
        fontWeight: '800',
        color: COLORS.primary,
    },
    supportButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: SPACING.m,
        borderRadius: RADIUS.m,
        borderWidth: 1,
        borderColor: COLORS.primary,
        backgroundColor: COLORS.white,
        gap: 8,
    },
    supportText: {
        color: COLORS.primary,
        fontWeight: '700',
        fontSize: 14,
    }

});
