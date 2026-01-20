import { View, Text, StyleSheet, ScrollView, Image, ActivityIndicator, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import { ArrowLeft, Clock, CheckCircle2, XCircle, ChefHat, ShoppingBag, Receipt } from 'lucide-react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { OrderTracker } from '../components/order/OrderTracker';

export default function OrderDetailsScreen() {
    const { orderId } = useLocalSearchParams();
    const router = useRouter();

    const { data: order, isLoading } = useQuery({
        queryKey: ['order', orderId],
        queryFn: () => api.getOrderDetails(orderId as string),
        enabled: !!orderId,
        refetchInterval: 8000,
    });

    if (isLoading) return (
        <View style={styles.center}>
            <ActivityIndicator size="large" color="#2563eb" />
        </View>
    );

    if (!order) return (
        <View style={styles.center}>
            <Text style={styles.error}>Order not found</Text>
            <Pressable onPress={() => router.back()} style={styles.backBtn}>
                <Text style={styles.backBtnText}>Go Back</Text>
            </Pressable>
        </View>
    );

    const getStatusColor = (status: string, paymentStatus: string) => {
        if (paymentStatus === 'PAID' && status === 'PLACED') return '#3b82f6'; // Blue
        switch (status) {
            case 'READY': return '#22c55e';
            case 'PREPARING': return '#f59e0b';
            case 'COMPLETED': return '#22c55e'; // Green
            case 'CANCELLED': return '#ef4444';
            default: return '#94a3b8';
        }
    };

    const statusColor = getStatusColor(order.status, order.paymentStatus);

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={styles.backIcon}>
                    <ArrowLeft size={24} color="#fff" />
                </Pressable>
                <Text style={styles.headerTitle}>Order Details</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {/* Status Section */}
                <View style={styles.section}>
                    <View style={styles.statusRow}>
                        <Text style={styles.orderId}>Order #{String(order.id).slice(0, 8)}</Text>
                        <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
                            <Text style={styles.statusText}>
                                {order.paymentStatus === 'PAID' && order.status === 'PLACED' ? 'PAID' : order.status}
                            </Text>
                        </View>
                    </View>

                    <OrderTracker status={order.status} />

                    <Text style={styles.date}>{new Date(order.createdAt).toLocaleString()}</Text>
                </View>

                {/* Canteen Info */}
                <View style={styles.canteenCard}>
                    <Image
                        source={{ uri: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=100&auto=format&fit=crop&q=60' }}
                        style={styles.canteenLogo}
                    />
                    <View>
                        <Text style={styles.canteenName}>{order.canteen?.name || 'Campus Canteen'}</Text>
                        <Text style={styles.canteenSub}>View Canteen Menu</Text>
                    </View>
                </View>

                {/* Items List */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Items</Text>
                    {order.items?.map((item: any, index: number) => (
                        <View key={index} style={styles.itemRow}>
                            <View style={styles.itemInfo}>
                                <View style={styles.quantityBadge}>
                                    <Text style={styles.quantityText}>{item.quantity}x</Text>
                                </View>
                                <Text style={styles.itemName}>{item.menuItem?.name || 'Item Name'}</Text>
                            </View>
                            <Text style={styles.itemPrice}>₹{((item.priceCents * item.quantity) / 100).toFixed(2)}</Text>
                        </View>
                    ))}
                </View>

                {/* Bill Details */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Bill Details</Text>
                    <View style={styles.billRow}>
                        <Text style={styles.billLabel}>Item Total</Text>
                        <Text style={styles.billValue}>₹{(order.totalCents / 100).toFixed(2)}</Text>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.billRow}>
                        <Text style={styles.totalLabel}>Grand Total</Text>
                        <Text style={styles.totalValue}>₹{(order.totalCents / 100).toFixed(2)}</Text>
                    </View>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0f172a' },
    header: { flexDirection: 'row', alignItems: 'center', padding: 16, paddingTop: 60, backgroundColor: '#1e293b', gap: 16 },
    backIcon: { padding: 4 },
    headerTitle: { fontSize: 20, fontWeight: '700', color: '#fff' },
    content: { padding: 16, gap: 16 },

    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' },
    error: { color: '#ef4444', fontSize: 18, fontWeight: '600', marginBottom: 16 },
    backBtn: { padding: 12, backgroundColor: '#334155', borderRadius: 8 },
    backBtnText: { color: '#fff', fontWeight: '600' },

    section: { backgroundColor: '#1e293b', padding: 16, borderRadius: 16 },
    statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    orderId: { color: '#cbd5e1', fontSize: 16, fontWeight: '600' },
    statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
    statusText: { color: '#fff', fontSize: 12, fontWeight: '700' },
    lottieContainer: { alignItems: 'center', marginVertical: 20 },
    date: { color: '#94a3b8', fontSize: 14 },

    canteenCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e293b', padding: 16, borderRadius: 16, gap: 12 },
    canteenLogo: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#334155' },
    canteenName: { color: '#fff', fontSize: 16, fontWeight: '700' },
    canteenSub: { color: '#3b82f6', fontSize: 14 },

    sectionTitle: { color: '#94a3b8', fontSize: 14, fontWeight: '600', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
    itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    itemInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    quantityBadge: { backgroundColor: '#334155', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    quantityText: { color: '#fff', fontSize: 12, fontWeight: '700' },
    itemName: { color: '#e2e8f0', fontSize: 16, width: 200 },
    itemPrice: { color: '#fff', fontSize: 16, fontWeight: '600' },

    billRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    billLabel: { color: '#cbd5e1', fontSize: 14 },
    billValue: { color: '#fff', fontSize: 14, fontWeight: '600' },
    divider: { height: 1, backgroundColor: '#334155', marginVertical: 12 },
    totalLabel: { color: '#fff', fontSize: 18, fontWeight: '700' },
    totalValue: { color: '#fff', fontSize: 18, fontWeight: '700' },
});
