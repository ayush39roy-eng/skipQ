import { Alert } from 'react-native';
import { CONFIG } from '../constants/config';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = CONFIG.BASE_URL;

export interface OrderItem {
    menuItemId: string;
    quantity: number;
}

// Session-scoped idempotency storage
// Map<sessionId, { hash: string, key: string }>
const idempotencyCache = new Map<string, { hash: string, key: string }>();

// Helper to create a comprehensive hash of the payload
const createPayloadHash = (
    canteenId: string, 
    items: OrderItem[], 
    fulfillmentType: string, 
    location?: { userLatitude: number; userLongitude: number }
) => {
    const sortedItems = [...items].sort((a, b) => a.menuItemId.localeCompare(b.menuItemId));
    const locationStr = location ? `${location.userLatitude.toFixed(5)},${location.userLongitude.toFixed(5)}` : 'null';
    return JSON.stringify({ canteenId, items: sortedItems, fulfillmentType, locationStr });
};

export const api = {
    async createPaymentIntent(
        canteenId: string, 
        items: OrderItem[], 
        fulfillmentType: 'TAKEAWAY' | 'DINE_IN' = 'TAKEAWAY',
        location?: { userLatitude: number; userLongitude: number; locationAccuracy?: number; selectedOrderType?: string; cookingInstructions?: string }
    ) {
        try {
            const token = await AsyncStorage.getItem('session_token');
            if (!token) throw new Error('No authentication token found');

            const response = await fetch(`${BASE_URL}/api/payment-intents`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    canteenId,
                    items,
                    fulfillmentType,
                    ...location
                }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to create payment intent');
            return data;
        } catch (error) {
            console.error('API createPaymentIntent error:', error);
            throw error;
        }
    },

    async finalizePaymentIntent(
        paymentIntentId: string, 
        razorpayPaymentId: string, 
        razorpayOrderId: string, 
        razorpaySignature: string
    ) {
        try {
            const token = await AsyncStorage.getItem('session_token');
            if (!token) throw new Error('No authentication token found');

            const response = await fetch(`${BASE_URL}/api/payment-intents/finalize`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    paymentIntentId,
                    razorpayPaymentId,
                    razorpayOrderId,
                    razorpaySignature
                }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to finalize order');
            return data;
        } catch (error) {
            console.error('API finalizePaymentIntent error:', error);
            throw error;
        }
    },

    // Legacy method - keeping for reference or fallback
    async createOrder(
        sessionId: string,
        canteenId: string, 
        items: OrderItem[], 
        fulfillmentType: 'TAKEAWAY' | 'DINE_IN' = 'TAKEAWAY',
        location?: { userLatitude: number; userLongitude: number; locationAccuracy?: number }
    ) {
        // ... (Legacy implementation)
        return this.createPaymentIntent(canteenId, items, fulfillmentType, location as any);
    },
    
    // ... existing methods
    async confirmPayment(orderId: string, paymentId: string, razorpayOrderId: string) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        try {
            const token = await AsyncStorage.getItem('session_token');
            if (!token) {
                 throw new Error('No authentication token found. Please login again.');
            }
            const response = await fetch(`${BASE_URL}/api/payment/confirm`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    orderId,
                    razorpay_payment_id: paymentId,
                    razorpay_order_id: razorpayOrderId
                }),
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorText = await response.text();
                let errorMessage = 'Payment verification failed';
                try {
                    const errorJson = JSON.parse(errorText);
                    // Prioritize data.error to match createOrder, fallback to message
                    errorMessage = errorJson.error || errorJson.message || errorMessage;
                } catch (e) {
                    errorMessage = errorText || errorMessage;
                }
                throw new Error(errorMessage);
            }

            return await response.json();
        } catch (error: any) {
            if (error.name === 'AbortError') {
                throw new Error('Request timed out');
            }
            console.error('API confirmPayment error:', error);
            throw error;
        } finally {
            clearTimeout(timeoutId);
        }
    },

    async getMyOrders() {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

        try {
            const token = await AsyncStorage.getItem('session_token');
            const response = await fetch(`${BASE_URL}/api/orders`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorText = await response.text();
                let errorMessage = 'Failed to fetch orders';
                try {
                    const errorJson = JSON.parse(errorText);
                    errorMessage = errorJson.error || errorMessage;
                } catch (e) {
                    errorMessage = errorText || errorMessage;
                }
                throw new Error(errorMessage);
            }

            return await response.json();
        } catch (error: any) {
            if (error.name === 'AbortError') {
                console.error('API getMyOrders timeout');
                throw new Error('Request timed out. Please check your connection.');
            }
            console.error('API getMyOrders error:', error);
            throw error;
        } finally {
            clearTimeout(timeoutId);
        }
    },

    async getOrderDetails(orderId: string) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        try {
            const token = await AsyncStorage.getItem('session_token');
            if (!token) {
                throw new Error('No authentication token found');
            }
            const response = await fetch(`${BASE_URL}/api/orders/${orderId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                },                signal: controller.signal
            });
            
            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorText = await response.text();
                let errorMessage = 'Failed to fetch order details';
                try {
                    const errorJson = JSON.parse(errorText);
                    errorMessage = errorJson.error || errorMessage;
                } catch (e) {
                    errorMessage = errorText || errorMessage;
                }
                throw new Error(errorMessage);
            }

            return await response.json();
        } catch (error: any) {
            if (error.name === 'AbortError') {
                throw new Error('Request timed out');
            }
            console.error('API getOrderDetails error:', error);
            throw error;
        } finally {
            clearTimeout(timeoutId);
        }
    }
};
