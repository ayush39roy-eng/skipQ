import { Alert } from 'react-native';

import { CONFIG } from '../constants/config';

const BASE_URL = CONFIG.BASE_URL;

export interface OrderItem {
    menuItemId: string;
    quantity: number;
}

export const api = {
    async createOrder(canteenId: string, items: OrderItem[], fulfillmentType: 'TAKEAWAY' | 'DINE_IN' = 'TAKEAWAY') {
        try {
            const response = await fetch(`${BASE_URL}/api/orders`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    canteenId,
                    items,
                    fulfillmentType,
                }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to create order');
            return data;
        } catch (error) {
            console.error('API createOrder error:', error);
            throw error;
        }
    },

    async confirmPayment(orderId: string, paymentId: string, razorpayOrderId: string) {
        try {
            const response = await fetch(`${BASE_URL}/api/payment/confirm`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    orderId,
                    razorpay_payment_id: paymentId,
                    razorpay_order_id: razorpayOrderId
                }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Payment verification failed');
            return data;
        } catch (error) {
            console.error('API confirmPayment error:', error);
            throw error;
        }
    },

    async getMyOrders() {
        try {
            const response = await fetch(`${BASE_URL}/api/orders`);
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to fetch orders');
            return data;
        } catch (error) {
            console.error('API getMyOrders error:', error);
            throw error;
        }
    },

    async getOrderDetails(orderId: string) {
        try {
            const response = await fetch(`${BASE_URL}/api/orders/${orderId}`);
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to fetch order details');
            return data;
        } catch (error) {
            console.error('API getOrderDetails error:', error);
            throw error;
        }
    }
};
