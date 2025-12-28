import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { makeRedirectUri } from 'expo-auth-session';
import { Platform } from 'react-native';

WebBrowser.maybeCompleteAuthSession();

// You should get these IDs from your Google Cloud Console
// For Expo Go, you might need a specific client ID, or use the web client ID with a proxy.
// Ideally, use environment variables.
const CONFIG = {
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || 'YOUR_WEB_CLIENT_ID.apps.googleusercontent.com',
    androidClientId: process.env.EXPO_PUBLIC_ANDROID_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_IOS_CLIENT_ID,
};

export const useGoogleAuth = () => {
    const [request, response, promptAsync] = Google.useAuthRequest({
        clientId: CONFIG.webClientId,
        androidClientId: CONFIG.androidClientId,
        iosClientId: CONFIG.iosClientId,
        webClientId: CONFIG.webClientId,
        redirectUri: makeRedirectUri({
            scheme: 'skipq' // Ensure this matches your app.json scheme
        }),
    });

    return {
        request,
        response,
        promptAsync,
    };
};
