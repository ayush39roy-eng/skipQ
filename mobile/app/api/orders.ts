import { client } from './client';

export const getOrders = async () => {
    const response = await client.get('/api/orders');
    return response.data;
};

export interface OrderItem {
  id: string; // Menu Item ID or SKU
  name: string;
  quantity: number;
  unitPrice: number;
  description?: string;
  metadata?: Record<string, any>;
}

interface OrderData {
  items: OrderItem[];
  totalAmount: number;
  // Add other required fields
}

export const createOrder = async (orderData: OrderData): Promise<any> => {
    try {
        const response = await client.post('/api/orders', orderData);
        return response.data;
    } catch (error) {
        // Handle or rethrow with context
        throw error;
    }
};
export interface PaymentConfirmationResponse {
  success: boolean;
  orderId: string;
  status: string;
  message?: string;
}

export const verifyPayment = async (payload: { orderId: string, razorpay_payment_id: string, razorpay_order_id: string }): Promise<PaymentConfirmationResponse> => {
    const { orderId, razorpay_payment_id, razorpay_order_id } = payload;

    if (!orderId || !razorpay_order_id || !razorpay_payment_id) {
        throw new Error('Payment Verification Failed: Missing required payment details (OrderId or Razorpay IDs).');
    }

    if (orderId === razorpay_order_id) {
         console.warn('Warning: Internal OrderID matches Razorpay OrderID. This might be intentional but is usually distinct.');
    }

    try {
        const response = await client.post('/api/payment/confirm', payload);
        return response.data;
    } catch (error: any) {
        const status = error.response?.status;
        const message = error.response?.data?.message || error.message || 'Payment Verification Failed';
        console.error(`[API] Payment Verification Error (${status}):`, message);
        throw new Error(`Verification failed: ${message}`);
    }
};
