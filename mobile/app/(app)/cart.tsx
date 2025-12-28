import { useState } from 'react';
import { View, StyleSheet, ScrollView, Text, Image, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCart } from '../context/CartContext';
import { SPACING, GAME_UI } from '../constants/theme';
import { CartHeader } from '../components/cart/CartHeader';
import { CartItem } from '../components/cart/CartItem';
import { CartUpsell } from '../components/cart/CartUpsell';
import { CartBill } from '../components/cart/CartBill';
import { CartFooter } from '../components/cart/CartFooter';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { MotiView } from 'moti';

export default function CartScreen() {
    const router = useRouter();
    const { items, addItem, removeItem, total } = useCart();
    const [fulfillmentType, setFulfillmentType] = useState<'TAKEAWAY' | 'DINE_IN'>('TAKEAWAY');

    // Handling Empty State
    if (items.length === 0) {
        return (
            <View style={styles.emptyContainer}>
                <StatusBar style="dark" />
                <Image
                    source={{ uri: 'https://cdn-icons-png.flaticon.com/512/11329/11329060.png' }}
                    style={styles.emptyImage}
                />
                <Text style={styles.emptyTitle}>Your cart is hungry!</Text>
                <Text style={styles.emptySubtitle}>Start adding some delicious items from the menu.</Text>

                <MotiView
                    from={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring' }}
                    style={{ marginTop: 20 }}
                >
                    <Text
                        onPress={() => router.back()}
                        style={styles.browseBtn}
                    >
                        BROWSE MENU
                    </Text>
                </MotiView>
            </View>
        );
    }

    // Group items by canteen (Assuming single canteen cart for now based on context, but logic can expand)
    // For 'Neo Mint' clean design, we just list them.

    return (
        <GestureHandlerRootView style={styles.container}>
            <StatusBar style="dark" />
            <CartHeader step={1} />

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Restaurant Summary (Simplified) */}
                <View style={styles.restaurantCard}>
                    <Text style={styles.restaurantName}>{items[0]?.canteenName || 'Canteen'}</Text>
                    <View style={styles.timePill}>
                        <Text style={styles.timeText}>Avg 12 min prep</Text>
                    </View>
                </View>

                {/* Cart Items */}
                <View style={styles.itemsList}>
                    {items.map((item) => (
                        <CartItem
                            key={item.id}
                            item={item}
                            onIncrement={() => addItem({ id: item.id, name: item.name, price: item.price, canteenId: item.canteenId, canteenName: item.canteenName })}
                            onDecrement={() => removeItem(item.id)}
                            onRemove={() => removeItem(item.id)} // Logic to fully remove coming later or handled by quantity 0 check
                        />
                    ))}
                </View>


                {/* Fulfillment Toggle */}
                <View style={styles.fulfillmentContainer}>
                    <Text style={styles.sectionTitle}>Dining Preference</Text>
                    <View style={styles.toggleWrapper}>
                        <Pressable 
                            style={[styles.toggleBtn, fulfillmentType === 'TAKEAWAY' && styles.toggleBtnActive]}
                            onPress={() => setFulfillmentType('TAKEAWAY')}
                        >
                            <Text style={[styles.toggleText, fulfillmentType === 'TAKEAWAY' && styles.toggleTextActive]}>Takeaway</Text>
                        </Pressable>
                        <Pressable 
                            style={[styles.toggleBtn, fulfillmentType === 'DINE_IN' && styles.toggleBtnActive]}
                            onPress={() => setFulfillmentType('DINE_IN')}
                        >
                            <Text style={[styles.toggleText, fulfillmentType === 'DINE_IN' && styles.toggleTextActive]}>Dine In</Text>
                        </Pressable>
                    </View>
                </View>

                {/* Bill */}
                <CartBill
                    subtotal={total}
                    deliveryFee={0}
                    tax={total * 0.05}
                    discount={0}
                />

                {/* Extra spacing for sticky footer */}
                <View style={{ height: 100 }} />
            </ScrollView>

            <CartFooter
                total={total * 1.05} // Adding tax to visual total
                onCheckout={() => router.push({ pathname: '/(app)/payment', params: { fulfillmentType } })}
            />
        </GestureHandlerRootView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: GAME_UI.background,
    },
    scrollContent: {
        paddingBottom: 40,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: GAME_UI.background,
        padding: SPACING.xl,
    },
    emptyImage: {
        width: 150,
        height: 150,
        marginBottom: SPACING.l,
        opacity: 0.8,
    },
    emptyTitle: {
        fontSize: 24,
        fontWeight: '900',
        color: GAME_UI.ink,
        marginBottom: 8,
        textTransform: 'uppercase',
    },
    emptySubtitle: {
        fontSize: 14,
        color: GAME_UI.ink,
        textAlign: 'center',
        marginBottom: 30,
    },
    browseBtn: {
        fontSize: 18,
        fontWeight: '900',
        color: GAME_UI.ink,
        textTransform: 'uppercase',
        letterSpacing: 1,
        padding: 12,
        backgroundColor: GAME_UI.primaryBtn,
        ...GAME_UI.shadows.button,
    },
    restaurantCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: GAME_UI.white,
        padding: SPACING.m,
        margin: SPACING.m,
        borderRadius: 12,
        ...GAME_UI.shadows.sm,
    },
    restaurantName: {
        fontSize: 18,
        fontWeight: '900',
        color: GAME_UI.ink,
    },
    timePill: {
        backgroundColor: GAME_UI.tertiary,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
        borderWidth: 2,
        borderColor: GAME_UI.ink,
    },
    timeText: {
        fontSize: 12,
        fontWeight: '900',
        color: GAME_UI.ink,
        textTransform: 'uppercase'
    },
    itemsList: {
        paddingHorizontal: SPACING.m,
    },
    fulfillmentContainer: {
        margin: SPACING.m,
        marginBottom: 0,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: GAME_UI.ink,
        marginBottom: SPACING.s,
    },
    toggleWrapper: {
        flexDirection: 'row',
        backgroundColor: GAME_UI.white,
        borderRadius: 12,
        padding: 4,
        ...GAME_UI.shadows.sm,
    },
    toggleBtn: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 8,
    },
    toggleBtnActive: {
        backgroundColor: GAME_UI.primaryBtn,
    },
    toggleText: {
        fontSize: 14,
        fontWeight: '600',
        color: GAME_UI.ink,
    },
    toggleTextActive: {
        fontWeight: '800',
    }
});
