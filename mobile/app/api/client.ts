import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { CONFIG } from '../constants/config';

export const BASE_URL = CONFIG.BASE_URL;

export const client = axios.create({
    baseURL: BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

client.interceptors.request.use(async (config) => {
    try {
        const token = await AsyncStorage.getItem('session_token');
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
    } catch (error) {
        console.warn('Failed to read session token from AsyncStorage:', error);
        // Continue without token rather than failing the request
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});