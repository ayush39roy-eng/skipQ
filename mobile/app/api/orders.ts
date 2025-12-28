import { client } from './client';

export const getOrders = async () => {
    const response = await client.get('/api/orders');
    return response.data;
};

export const createOrder = async (orderData: any) => {
    const response = await client.post('/api/orders', orderData);
    return response.data;
};

export const verifyPayment = async (payload: { orderId: string, razorpay_payment_id: string, razorpay_order_id: string }) => {
    const response = await client.post('/api/payment/confirm', payload);
    return response.data;
};
