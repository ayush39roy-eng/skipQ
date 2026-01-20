import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { login as apiLogin, register as apiRegister, googleLogin as apiGoogleLogin } from '../api/auth';
import { router } from 'expo-router';
import { decode } from 'base-64';

interface AuthContextType {
    user: { token: string; role: string; email: string } | null;
    login: (email: string, password: string, skipNavigation?: boolean) => Promise<void>;
    register: (name: string, email: string, password: string) => Promise<void>;
    googleLogin: (idToken: string) => Promise<void>;
    logout: () => Promise<void>;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<{ token: string; role: string; email: string } | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        checkUser();
    }, []);

    // Helper to validate JWT expiration locally
    const isTokenValid = (token: string): boolean => {
        try {
            const parts = token.split('.');
            if (parts.length !== 3) return false;
            
            const payload = JSON.parse(decode(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
            if (payload.exp && Date.now() >= payload.exp * 1000) {
                return false;
            }
            return true;
        } catch (e) {
            console.error('Token validation error:', e);
            return false;
        }
    };

    const checkUser = async () => {
        try {
            const [token, role, email] = await Promise.all([
                AsyncStorage.getItem('session_token'),
                AsyncStorage.getItem('user_role'),
                AsyncStorage.getItem('user_email')
            ]);

            if (token && role && email) {
                if (isTokenValid(token)) {
                    setUser({ token, role, email });
                } else {
                    console.warn('Token expired or invalid, clearing session');
                    await AsyncStorage.multiRemove(['session_token', 'user_role', 'user_email']);
                    setUser(null);
                }
            }
        } catch (error) {
            console.error('Session restoration failed:', error);
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

    const login = async (email: string, password: string, skipNavigation = false) => {
        try {
            const data = await apiLogin(email, password);
            
            try {
                await Promise.all([
                    AsyncStorage.setItem('session_token', data.token),
                    AsyncStorage.setItem('user_role', data.role),
                    AsyncStorage.setItem('user_email', email)
                ]);
            } catch (error) {
                console.error('Login storage failed:', error);
                await AsyncStorage.multiRemove(['session_token', 'user_role', 'user_email']).catch(() => {});
                throw new Error('Login storage failed');
            }

            setUser({ token: data.token, role: data.role, email });
            if (!skipNavigation) router.replace('/(app)/home');
        } catch (error) {
            console.error('Login failed:', error);
            throw error;
        }
    };

    const register = async (name: string, email: string, password: string) => {
        try {
            const data = await apiRegister(name, email, password);
            
            try {
                await Promise.all([
                    AsyncStorage.setItem('session_token', data.token),
                    AsyncStorage.setItem('user_role', data.role),
                    AsyncStorage.setItem('user_email', email)
                ]);
            } catch (error) {
                console.error('Register storage failed:', error);
                await AsyncStorage.multiRemove(['session_token', 'user_role', 'user_email']).catch(() => {});
                throw new Error('Register storage failed');
            }

            setUser({ token: data.token, role: data.role, email });
            router.replace('/(app)/home');
        } catch (error) {
            console.error('Registration failed:', error);
            throw error;
        }
    };

    const googleLogin = async (idToken: string) => {
        try {
            const data = await apiGoogleLogin(idToken);
            
            try {
                await Promise.all([
                    AsyncStorage.setItem('session_token', data.token),
                    AsyncStorage.setItem('user_role', data.user.role),
                    AsyncStorage.setItem('user_email', data.user.email)
                ]);
            } catch (error) {
                console.error('Storage failed:', error);
                throw new Error('Google login storage failed');
            }
            
            setUser({ token: data.token, role: data.user.role, email: data.user.email });
            router.replace('/(app)/home');
        } catch (error) {
             console.error('Google login failed:', error);
             throw error;
        }
    };

    const logout = async () => {
        try {
            // TODO: Add API call to invalidate session on backend
            // await apiLogout(user?.token);
            
            await AsyncStorage.multiRemove(['session_token', 'user_role', 'user_email']);
            setUser(null);
            router.replace('/(auth)/login');
        } catch (error) {
            console.error('Logout failed:', error);
            // Still clear local state and navigate even if storage cleanup fails
            setUser(null);
            router.replace('/(auth)/login');
        }
    };
    return (
        <AuthContext.Provider value={{ user, login, register, googleLogin, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};
