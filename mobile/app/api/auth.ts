import { client } from './client';

export const login = async (email: string, password: string) => {
    const response = await client.post('/api/auth/login', { email, password });
    return response.data;
};

export const register = async (name: string, email: string, password: string) => {
    const response = await client.post('/api/auth/register', { name, email, password });
    return response.data;
};

export const googleLogin = async (idToken: string) => {
    const response = await client.post('/api/auth/google/mobile', { idToken });
    return response.data;
};
