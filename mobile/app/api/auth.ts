import { client } from './client';


export interface AuthResponse {
    ok: boolean;
    token: string;
    role: string;
}

export interface GoogleAuthResponse {
    ok: boolean;
    token: string;
    user: {
        id: string;
        email: string;
        name: string;
        role: string;
    };
}

export const login = async (email: string, password: string): Promise<AuthResponse> => {
    if (!email || !password) {
        throw new Error('Email and password are required');
    }

    try {
        const response = await client.post('/api/auth/login', { email, password });
        return response.data;
    } catch (error: any) {
        throw new Error(error.response?.data?.message || 'Login failed. Please check your network.');
    }
};

export const register = async (name: string, email: string, password: string): Promise<AuthResponse> => {
    if (!name || !email || !password) {
        throw new Error('Name, email, and password are required');
    }

    try {
        const response = await client.post('/api/auth/register', { name, email, password });
        return response.data;
    } catch (error: any) {
         const message = error.response?.data?.message || error.message || 'Registration failed.';
         throw new Error(message);
    }
};

export const googleLogin = async (idToken: string): Promise<GoogleAuthResponse> => {
    if (typeof idToken !== 'string' || !idToken.trim()) {
        throw new TypeError('Invalid idToken: Token must be a non-empty string');
    }

    try {
        const response = await client.post('/api/auth/google/mobile', { idToken });
        return response.data;
    } catch (error: any) {
        const status = error.response?.status;
        const message = error.response?.data?.message || error.message || 'Google Login failed';
        throw new Error(`Google Login failed (${status || 'Network Error'}): ${message}`);
    }
};
