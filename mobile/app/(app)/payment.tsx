import { View, Text, StyleSheet, Pressable, ActivityIndicator, Alert, Linking, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { COLORS, RADIUS, SPACING, SHADOWS, GAME_UI } from '../constants/theme';
import { StatusBar } from 'expo-status-bar';
import { MotiView } from 'moti';
import { ChevronLeft, Lock, ShieldCheck, Wallet, CreditCard, Banknote, Check } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useCart } from '../context/CartContext';
import { api } from '../services/api';
// import RazorpayCheckout from 'react-native-razorpay'; // Import carefully, might need require to avoid build issues if native module missing in dev client

// Safe import for Razorpay to avoid crashes in Expo Go
let RazorpayCheckout: any = null;
try {
    RazorpayCheckout = require('react-native-razorpay').default;
} catch (e) {
    console.warn("Razorpay native module not found. Using simulation.");
}

export default function PaymentScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const params = useLocalSearchParams();
    const fulfillmentType = (params.fulfillmentType as 'TAKEAWAY' | 'DINE_IN') || 'TAKEAWAY';
    
    const { items, clearCart, total: cartSubtotal } = useCart();

    const tax = cartSubtotal * 0.05;
    const totalAmount = cartSubtotal + tax;

    const [status, setStatus] = useState<'selecting' | 'processing' | 'success'>('selecting');
    const [loading, setLoading] = useState(false);

    const handlePayment = async () => {
        if (items.length === 0) {
            Alert.alert("Cart is empty");
            return;
        }

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        setLoading(true);
        setStatus('processing');

        try {
            // 1. Create Order on Backend
            const canteenId = items[0].canteenId;
            const orderItems = items.map(i => ({ menuItemId: i.id, quantity: i.quantity }));

            console.log("Creating order...");
            // Server validates prices and calculates total
            const orderData = await api.createOrder(canteenId, orderItems, fulfillmentType);
            console.log("Order Created:", orderData);

            const { id: orderId, razorpayOrderId, keyId, amount } = orderData;

            // Optional: Client-side validaton that server amount covers our expected total
            // However, slight rounding differences might exist, so we usually trust server
            // const serverAmountInRupees = amount / 100;
            // if (Math.abs(serverAmountInRupees - totalAmount) > 1) { ... }

            // 2. Open Razorpay (or Simulate)
            if (keyId && razorpayOrderId && RazorpayCheckout) {
                const options = {
                    description: 'Food Order',
                    image: 'https://i.imgur.com/3g7nmJC.png',
                    currency: 'INR',
                    key: keyId,
                    amount: amount,
                    name: 'SkipQ',
                    order_id: razorpayOrderId,
                    theme: { color: COLORS.primary }
                };

                try {
                    const data = await RazorpayCheckout.open(options);
                    // 3. Confirm Payment
                    await verifyAndFinish(orderId, data.razorpay_payment_id, data.razorpay_order_id);
                } catch (error: any) {
                    console.error("Razorpay Error", error);
                    Alert.alert("Payment Cancelled", error.error?.description || "Something went wrong");
                    setStatus('selecting');
                    setLoading(false);
                }
            } else {
                // FALLBACK / SIMULATION (If no keys configured or no native module)
                console.log("Simulating Payment (No Razorpay keys or module)");
                // Simulate a 2s delay
                setTimeout(async () => {
                    await verifyAndFinish(orderId, `pay_simulated_${Date.now()}`, 'order_simulated');
                }, 2000);
            }

        } catch (error: any) {
            console.error("Payment Flow Error:", error);
            Alert.alert("Error", error.message);
            setStatus('selecting');
            setLoading(false);
        }
    };

    const verifyAndFinish = async (orderId: string, paymentId: string, rzpOrderId: string) => {
        try {
            console.log("Verifying payment...");
            await api.confirmPayment(orderId, paymentId, rzpOrderId);

            setStatus('success');
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            clearCart();

            setTimeout(() => {
                router.replace({
                    pathname: '/(app)/order-details/[id]',
                    params: { id: orderId }
                });
            }, 1000);
        } catch (error: any) {
            Alert.alert("Verification Failed", "Payment processing failed on server.");
            setStatus('selecting');
            setLoading(false);
        }
    };

    if (status === 'processing' || status === 'success') {
        return (
            <View style={styles.processingContainer}>
                <StatusBar style="dark" />
                <MotiView
                    from={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    style={styles.processingContent}
                >
                    {status === 'processing' ? (
                        <>
                            <ActivityIndicator size="large" color={GAME_UI.ink} />
                            <Text style={styles.processingText}>PROCESSING PAYMENT...</Text>
                            <Text style={styles.secureText}>
                                <Lock size={14} color={GAME_UI.ink} strokeWidth={2.5} /> BANK LEVEL SECURITY
                            </Text>
                        </>
                    ) : (
                        <>
                            <View style={styles.successIcon}>
                                <Check size={48} color="#fff" strokeWidth={3} />
                            </View>
                            <Text style={styles.successText}>PAYMENT SUCCESSFUL!</Text>
                            <Text style={styles.redirectText}>REDIRECTING TO ORDER...</Text>
                        </>
                    )}
                </MotiView>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar style="dark" />

            <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={styles.backBtn}>
                    <ChevronLeft color={GAME_UI.ink} size={28} strokeWidth={3} />
                </Pressable>
                <Text style={styles.headerTitle}>Payment</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: 220 }} showsVerticalScrollIndicator={false}>
                <View style={styles.content}>

                    <View style={styles.totalCard}>
                        <Text style={styles.payLabel}>TOTAL AMOUNT</Text>
                        <Text style={styles.totalAmount}>₹{totalAmount.toFixed(2)}</Text>
                        <View style={styles.secureBadge}>
                            <ShieldCheck size={16} color={GAME_UI.ink} strokeWidth={2.5} />
                            <Text style={styles.secureBadgeText}>100% SECURE BY RAZORPAY</Text>
                        </View>
                    </View>

                    <Text style={styles.sectionTitle}>PREFERRED PAYMENT</Text>

                    <Pressable onPress={handlePayment} style={styles.methodCard}>
                        <View style={[styles.iconBox, { backgroundColor: '#E0E7FF' }]}>
                            <Wallet size={24} color={GAME_UI.ink} strokeWidth={2.5} />
                        </View>
                        <View style={styles.methodInfo}>
                            <Text style={styles.methodTitle}>UPI</Text>
                            <Text style={styles.methodSub}>Google Pay, PhonePe, Paytm</Text>
                        </View>
                        <View style={styles.radio} />
                    </Pressable>

                    <Pressable onPress={handlePayment} style={[styles.methodCard, styles.selectedCard]}>
                        <View style={[styles.iconBox, { backgroundColor: '#FEF3C7' }]}>
                            <CreditCard size={24} color={GAME_UI.ink} strokeWidth={2.5} />
                        </View>
                        <View style={styles.methodInfo}>
                            <Text style={styles.methodTitle}>CARDS</Text>
                            <Text style={styles.methodSub}>Credit or Debit</Text>
                        </View>
                        <View style={styles.radio}>
                            <View style={styles.radioInner} />
                        </View>
                    </Pressable>

                    <Pressable onPress={handlePayment} style={styles.methodCard}>
                        <View style={[styles.iconBox, { backgroundColor: '#DCFCE7' }]}>
                            <Banknote size={24} color={GAME_UI.ink} strokeWidth={2.5} />
                        </View>
                        <View style={styles.methodInfo}>
                            <Text style={styles.methodTitle}>NET BANKING</Text>
                            <Text style={styles.methodSub}>All Indian banks supported</Text>
                        </View>
                        <View style={styles.radio} />
                    </Pressable>

                </View>
            </ScrollView>

            <View style={[styles.footer, { paddingBottom: (insets.bottom || 24) + 40 }]}>
                <Pressable onPress={handlePayment} style={styles.payBtn} disabled={loading}>
                    <Text style={styles.payBtnText}>
                        {loading ? "PROCESSING..." : `PAY ₹${totalAmount.toFixed(2)}`}
                    </Text>
                </Pressable>
                <View style={styles.razorpayLogo}>
                    <Text style={{ fontSize: 10, color: GAME_UI.ink, fontWeight: '700', textTransform: 'uppercase' }}>Powered by</Text>
                    <Text style={{ fontSize: 14, fontWeight: '900', color: '#334155' }}>Razorpay</Text>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: GAME_UI.background },
    header: {
        paddingTop: 60,
        paddingHorizontal: SPACING.l,
        paddingBottom: SPACING.m,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        // backgroundColor: GAME_UI.white, 
    },
    backBtn: { 
        padding: 8, 
        // borderRadius: RADIUS.full, backgroundColor: COLORS.lightBg 
    },
    headerTitle: { fontSize: 24, fontWeight: '900', color: GAME_UI.ink, textTransform: 'uppercase', letterSpacing: -1 },

    content: { padding: SPACING.l },

    totalCard: {
        backgroundColor: GAME_UI.white,
        borderRadius: 16,
        padding: SPACING.xl,
        alignItems: 'center',
        marginBottom: SPACING.xl,
        ...GAME_UI.shadows.md,
        borderWidth: 2.5,
        borderColor: GAME_UI.ink
    },
    payLabel: { fontSize: 14, fontWeight: '700', color: GAME_UI.ink, marginBottom: 8, textTransform: 'uppercase', opacity: 0.6 },
    totalAmount: { fontSize: 42, fontWeight: '900', color: GAME_UI.ink, marginBottom: 16 },
    secureBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: GAME_UI.tertiary, // Mint
        paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999,
        borderWidth: 2, borderColor: GAME_UI.ink
    },
    secureBadgeText: { fontSize: 11, fontWeight: '800', color: GAME_UI.ink },

    sectionTitle: { fontSize: 16, fontWeight: '900', color: GAME_UI.ink, marginBottom: SPACING.m, textTransform: 'uppercase' },

    methodCard: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: GAME_UI.white,
        padding: SPACING.m,
        borderRadius: 12,
        marginBottom: SPACING.m,
        ...GAME_UI.shadows.sm
    },
    selectedCard: {
        // backgroundColor: '#FFF4E5', // Maybe a light orange tint? Or just keep white
        borderColor: GAME_UI.primaryBtn,
        transform: [{ translateY: 2 }] // Slight pressed effect visual
    },
    iconBox: {
        width: 48, height: 48, borderRadius: 8,
        justifyContent: 'center', alignItems: 'center',
        marginRight: SPACING.m,
        borderWidth: 2, borderColor: GAME_UI.ink
    },
    methodInfo: { flex: 1 },
    methodTitle: { fontSize: 16, fontWeight: '800', color: GAME_UI.ink, textTransform: 'uppercase' },
    methodSub: { fontSize: 12, color: GAME_UI.ink, fontWeight: '500' },

    radio: {
        width: 24, height: 24, borderRadius: 12,
        borderWidth: 2, borderColor: GAME_UI.ink,
        justifyContent: 'center', alignItems: 'center',
        backgroundColor: '#fff'
    },
    radioInner: { width: 12, height: 12, borderRadius: 6, backgroundColor: GAME_UI.ink },

    footer: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        backgroundColor: GAME_UI.white,
        padding: SPACING.l,
        borderTopLeftRadius: 32, borderTopRightRadius: 32,
        borderTopWidth: 3, borderLeftWidth: 3, borderRightWidth: 3, borderColor: GAME_UI.ink,
        // ...GAME_UI.shadows.md
    },
    payBtn: {
        backgroundColor: GAME_UI.primaryBtn,
        height: 60, borderRadius: 12,
        justifyContent: 'center', alignItems: 'center',
        marginBottom: SPACING.m,
        ...GAME_UI.shadows.button
    },
    payBtnText: { fontSize: 18, fontWeight: '900', color: GAME_UI.ink, textTransform: 'uppercase' },
    razorpayLogo: { alignItems: 'center', gap: 2 },

    processingContainer: { flex: 1, backgroundColor: GAME_UI.background, justifyContent: 'center', alignItems: 'center' },
    processingContent: { alignItems: 'center', padding: SPACING.xl },
    processingText: { marginTop: 24, fontSize: 20, fontWeight: '900', color: GAME_UI.ink, marginBottom: 12, textTransform: 'uppercase' },
    secureText: { fontSize: 12, color: GAME_UI.ink, fontWeight:'700', flexDirection: 'row', alignItems: 'center', gap: 6, textTransform: 'uppercase' },
    successIcon: {
        width: 100, height: 100, borderRadius: 16, backgroundColor: GAME_UI.tertiary,
        justifyContent: 'center', alignItems: 'center', marginBottom: 24,
        ...GAME_UI.shadows.md,
        borderWidth: 3, borderColor: GAME_UI.ink
    },
    successText: { fontSize: 24, fontWeight: '900', color: GAME_UI.ink, marginBottom: 8, textTransform: 'uppercase' },
    redirectText: { fontSize: 14, color: GAME_UI.ink, fontWeight: '600', textTransform: 'uppercase' }
});
