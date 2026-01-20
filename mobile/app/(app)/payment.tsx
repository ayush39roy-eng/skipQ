import { View, Text, StyleSheet, Pressable, ActivityIndicator, Alert, Linking, ScrollView, NativeModules } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useState, useEffect, useRef, useCallback } from 'react';
import { COLORS, RADIUS, SPACING, SHADOWS, GAME_UI } from '../constants/theme';
import { StatusBar } from 'expo-status-bar';
import { MotiView } from 'moti';
import { ChevronLeft, Lock, ShieldCheck, Wallet, CreditCard, Banknote, Check } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useCart } from '../context/CartContext';
import { api } from '../services/api';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RazorpayCheckout as RazorpayWebView } from '../components/RazorpayCheckout'; // Import WebView Component as alias
import { Modal } from 'react-native'; // Import Modal 

// Safe import for Razorpay to avoid crashes in Expo Go
// Safe import for Razorpay to avoid crashes in Expo Go
let RazorpayCheckout: any = null;
try {
    // Only load if native module exists (prevents loading JS wrapper in Expo Go which acts like it works)
    if (NativeModules.RNRazorpay) { 
        RazorpayCheckout = require('react-native-razorpay').default;
    }
} catch (e) {
    console.warn("Razorpay native module not found. Using simulation/webview.");
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
    const [currentIntent, setCurrentIntent] = useState<any>(null);
    const [location, setLocation] = useState<{ latitude: number; longitude: number; accuracy?: number } | null>(null);
    const [showWebView, setShowWebView] = useState(false); // State for WebView Modal
    const [paymentOptions, setPaymentOptions] = useState<any>(null); // State for Checkout Options

    const isMounted = useRef(true);
    const timeoutRef = useRef<any>(null);

    // Reset state when screen comes into focus
    useFocusEffect(
        useCallback(() => {
            isMounted.current = true;
            return () => {
                isMounted.current = false;
                if (timeoutRef.current) {
                    clearTimeout(timeoutRef.current);
                }
            };
        }, [])
    );

    // If coming back to this screen and it was left in success/processing state, we should probably reset
    // UNLESS we are currently waiting for a payment result (which shouldn't happen via focus usually)
    useFocusEffect(
        useCallback(() => {
             // If we have items and we are in success state, it means we are seeing stale state.
             // But valid success navigates away. So if we are here, we must reset.
             if (status === 'success') {
                 console.log("Resetting stale success state on focus");
                 setStatus('selecting');
                 setCurrentIntent(null);
                 setLoading(false);
             }
        }, [status])
    );

    const fetchUserLocation = async () => {
        if (!isMounted.current) return null;
        
        // 1. Consent Dialog
        const userConsented = await new Promise<boolean>((resolve) => {
            Alert.alert(
                "Location Required",
                "To ensure you are at the canteen for pickup, we need to access your current location.",
                [
                    { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
                    { text: "Allow", onPress: () => resolve(true) }
                ]
            );
        });

        if (!userConsented) return null;

        try {
            // 2. Request Permission
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                if (isMounted.current) {
                    Alert.alert("Permission Required", "Location permission is needed to process your order.");
                }
                return null;
            }

            // 3. Fetch with 10s Timeout
            const locationPromise = Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error("Location request timed out")), 10000)
            );

            const position: any = await Promise.race([locationPromise, timeoutPromise]);
            
            if (isMounted.current) {
                const locData = {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    accuracy: position.coords.accuracy || undefined,
                };
                setLocation(locData);
                console.log('[LOCATION] Successfully acquired fresh coordinates (Status: OK)');
                return locData;
            }
        } catch (error) {
            console.error('[LOCATION] Failed to retrieve location (Error masked for privacy)');
            if (isMounted.current) {
                Alert.alert("Location Error", "Could not fetch your location. Please check your GPS settings.");
            }
        }
        return null;
    };

    const handlePayment = async () => {
        if (items.length === 0) {
            Alert.alert("Cart is empty");
            return;
        }

        // Allow native Razorpay if available, even in DEV (for testing with test credentials)
        const USE_SIMULATION = !RazorpayCheckout;
        setLoading(true);
        setStatus('processing');

        try {
            // 1. Get Fresh Location (Reuse existing logic)
            const itemsLocation = await fetchUserLocation();
            
            // 2. Create Payment Intent (or Reuse)
            let intent = currentIntent;
            
            if (!intent) {
                 const canteenId = items[0].canteenId;
                 const orderItems = items.map(i => ({ menuItemId: i.id, quantity: i.quantity }));
                 
                 console.log("Creating Payment Intent...");
                 intent = await api.createPaymentIntent(
                    canteenId, 
                    orderItems, 
                    fulfillmentType,
                    itemsLocation ? {
                        userLatitude: itemsLocation.latitude,
                        userLongitude: itemsLocation.longitude,
                        locationAccuracy: itemsLocation.accuracy
                    } : undefined
                 );
                 setCurrentIntent(intent);
                 console.log("Payment Intent Created:", intent.id);
            } else {
                 console.log("Reusing existing Payment Intent:", intent.id);
            }

            const { id: paymentIntentId, amount, payment: paymentData, pricing } = intent;
            const razorpayOrderId = paymentData?.razorpayOrderId;
            const keyId = paymentData?.keyId;

            // 3. Payment Processing
            console.log('[PAYMENT] Mode:', USE_SIMULATION ? 'SIMULATION' : 'NATIVE');
            
            if (!USE_SIMULATION && RazorpayCheckout?.open && keyId && razorpayOrderId) {
                console.log('[PAYMENT] Opening native Razorpay...');
                const options = {
                    description: 'Food Order',
                    image: 'https://i.imgur.com/3g7nmJC.png',
                    currency: 'INR',
                    key: keyId,
                    amount: amount, // Amount in paise
                    name: 'SkipQ',
                    order_id: razorpayOrderId,
                    theme: { color: COLORS.primary }
                };

                try {
                    const data = await RazorpayCheckout.open(options);
                    // 4. Confirm Payment
                    await verifyAndFinish(paymentIntentId, data.razorpay_payment_id, data.razorpay_order_id, data.razorpay_signature);
                } catch (error: any) {
                    console.error("Razorpay Error", error);
                    // Don't clear intent on failure - allow retry
                    Alert.alert("Payment Cancelled", error.error?.description || "Something went wrong");
                    setStatus('selecting');
                    setLoading(false);
                }
            } else {
                 // Open WebView Modal for Expo Go / Fallback
                 console.log('[PAYMENT] Using WebView Fallback');
                 const rzpOptions = {
                    key: keyId,
                    amount: amount,
                    currency: 'INR',
                    name: 'SkipQ',
                    description: 'Food Order',
                    order_id: razorpayOrderId,
                    theme: { color: COLORS.primary }
                 };
                 setPaymentOptions(rzpOptions);
                 setShowWebView(true);
            }

        } catch (error: any) {
            console.error("Payment Flow Error:", error);
            Alert.alert("Error", error.message);
            setStatus('selecting');
            setLoading(false);
            // If creation failed, we don't have an intent, so retry will create new. Correct.
        }
    };

    const verifyAndFinish = async (paymentIntentId: string, paymentId: string, rzpOrderId: string, signature: string) => {
        try {
            console.log("Finalizing Payment Intent...");
            const order = await api.finalizePaymentIntent(paymentIntentId, paymentId, rzpOrderId, signature);
            
            console.log("Order Finalized:", order.id);

            if (!isMounted.current) return;

            setStatus('success');
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            clearCart();
            setCurrentIntent(null); // Clear intent so next distinct visit creates new

            timeoutRef.current = setTimeout(() => {
                if (isMounted.current) {
                    router.replace({
                        pathname: '/(app)/order-details/[id]',
                        params: { id: order.id } // Use the actual Order ID returned from finalize
                    });
                }
            }, 1000);
        } catch (error: any) {
            if (!isMounted.current) return;
            console.error("Verification Error", error);
            Alert.alert("Verification Failed", "Payment processing failed on server. Please contact support if money was deducted.");
            setStatus('selecting');
            setLoading(false);
        }
    };

    if (status === 'processing' || status === 'success') {
        if (!showWebView) { // Only show processing view if NOT in WebView (WebView handles its own loading)
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

            {/* WebView Modal */}
            <Modal visible={showWebView} animationType="slide" transparent={true} onRequestClose={() => setShowWebView(false)}>
                {paymentOptions && (
                    <RazorpayWebView
                        options={paymentOptions}
                        onSuccess={(data) => {
                            setShowWebView(false);
                            console.log('WebView Payment Success:', data);
                             // Call verifyAndFinish with the data from WebView
                            verifyAndFinish(currentIntent.id, data.razorpay_payment_id, data.razorpay_order_id, data.razorpay_signature);
                        }}
                        onFailure={(data) => {
                            setShowWebView(false);
                             console.error('WebView Payment Failure:', data);
                            Alert.alert("Payment Cancelled", data.description || "Payment failed or cancelled");
                            setStatus('selecting');
                            setLoading(false);
                        }}
                    />
                )}
            </Modal>
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
