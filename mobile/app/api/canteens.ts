import { client } from './client';

export const getCanteens = async () => {
    try {
        console.log('[API] Fetching canteens...');
        const response = await client.get('/api/canteens');
        console.log('[API] Success:', response.status);
        return response.data;
    } catch (error) {
        console.error('[API Error] getCanteens failed:', error);
        throw error;
    }
};

export const getMenu = async (canteenId: string) => {
    try {
        const response = await client.get(`/api/menu/${canteenId}`);
        return response.data;
    } catch (error) {
        console.error('[API Error] getMenu failed:', error);
        throw error;
    }
};
