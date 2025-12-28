import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { login as apiLogin, register as apiRegister, googleLogin as apiGoogleLogin } from '../api/auth';
import { router } from 'expo-router';

interface AuthContextType {
    user: { token: string; role: string; email: string } | null;
    login: (email: string, password: string, skipNavigation?: boolean) => Promise<void>;
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

    const checkUser = async () => {
        const token = await AsyncStorage.getItem('session_token');
        const role = await AsyncStorage.getItem('user_role');
        const email = await AsyncStorage.getItem('user_email');
        if (token && role && email) {
            setUser({ token, role, email });
        }
        setLoading(false);
    };

    const login = async (email: string, password: string, skipNavigation = false) => {
        try {
            const data = await apiLogin(email, password);
            if (data.ok && data.token) {
                await AsyncStorage.setItem('session_token', data.token);
                await AsyncStorage.setItem('user_role', data.role);
                await AsyncStorage.setItem('user_email', email);
                setUser({ token: data.token, role: data.role, email });
                if (!skipNavigation) router.replace('/(app)/home');
            } else {
                throw new Error(data.error || 'Login failed');
            }
        } catch (error) {
            throw error;
        }
    };

    const googleLogin = async (idToken: string) => {
        try {
            const data = await apiGoogleLogin(idToken);
            if (data.ok && data.token) {
                await AsyncStorage.setItem('session_token', data.token);
                await AsyncStorage.setItem('user_role', data.user.role);
                await AsyncStorage.setItem('user_email', data.user.email);
                setUser({ token: data.token, role: data.user.role, email: data.user.email });
                router.replace('/(app)/home');
            } else {
                throw new Error(data.error || 'Google login failed');
            }
        } catch (error) {
            throw error;
        }
    };

    const logout = async () => {
        await AsyncStorage.removeItem('session_token');
        await AsyncStorage.removeItem('user_role');
        await AsyncStorage.removeItem('user_email');
        setUser(null);
        router.replace('/(app)/login');
    };

    return (
        <AuthContext.Provider value={{ user, login, googleLogin, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};
