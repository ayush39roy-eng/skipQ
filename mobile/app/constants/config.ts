// Replace with your machine's IP address for physical device testing
// Try to import local config if it exists
let LOCAL_CONFIG: { BASE_URL?: string } | undefined;
try {
    // @ts-ignore: File might not exist
    LOCAL_CONFIG = require('./config.local').LOCAL_CONFIG;
} catch {
    // Ignore error if local config doesn't exist
}

export const CONFIG = {
    BASE_URL: LOCAL_CONFIG?.BASE_URL || process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000',
};
