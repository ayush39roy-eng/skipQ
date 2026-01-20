import { Dimensions, Platform } from 'react-native';

const { width, height } = Dimensions.get('window');

export const COLORS = {
    // Brand - Neo Mint Green
    primary: '#00C48C',
    secondary: '#00E0A1',
    accent: '#D9FFF1', // Soft Tint

    // Gradients
    primaryGradient: ['#00C48C', '#00E0A1'] as const,
    softGlowGradient: ['#D9FFF1', '#E3FFF6'] as const, // New Soft Glow
    darkGradient: ['#F8FAFC', '#F1F5F9'] as const, // Subtle Grey Gradient
    glassGradient: ['rgba(255,255,255,0.7)', 'rgba(255,255,255,0.4)'] as const,

    // Backgrounds
    lightBg: '#FAFAFA', // Off white
    darkBg: '#FFFFFF', // Pure white (Primary Background)
    cardLight: '#FFFFFF',
    cardDark: '#FFFFFF',

    // Text
    textLight: '#475569',
    textDark: '#111214', // Primary Text (Dark Grey, not Black)
    textMutedLight: '#94A3B8',
    textMutedDark: '#6C757D', // Secondary Text
    textMuted: '#94A3B8', // Added alias for compatibility

    // Utility
    success: '#00C48C', // Match primary for continuity in this theme
    error: '#FF3B30',
    warning: '#FFC107',
    white: '#FFFFFF',
    black: '#111214', // Softened black
    transparent: 'transparent',
};

export const GAME_UI = {
    background: '#F9F4EF', // Azuki Cream (slightly warmer/greyer)
    primary: '#FFD700', // Solid Yellow/Gold (like the 'Place Bid' button)
    primaryBtn: '#FFBD59', // The specific "Apricot/Orange" button color from inspo
    secondary: '#A8DADC', // Soft Blue
    tertiary: '#00C48C', // Mint Green (was missing)
    accent: '#FF6B6B', // Red/Pink accent (like the 'Azuki' tag)
    ink: '#000000', // Pure Black for that sharp comic look
    card: '#FFFFFF',
    white: '#FFFFFF',
    
    // Neubrutalist Shadows (Sharper, Harder)
    shadows: {
        sm: {
            borderWidth: 2,
            borderColor: '#000000',
            shadowColor: '#000000',
            shadowOffset: { width: 4, height: 4 }, // Increased from 3,3
            shadowOpacity: 1,
            shadowRadius: 0,
            elevation: 0,
        },
        md: {
            borderWidth: 2.5,
            borderColor: '#000000',
            shadowColor: '#000000',
            shadowOffset: { width: 6, height: 6 }, // Increased from 5,5
            shadowOpacity: 1,
            shadowRadius: 0,
            elevation: 0,
        },
        button: {
            borderWidth: 2,
            borderColor: '#000000',
            shadowColor: '#000000',
            shadowOffset: { width: 6, height: 6 }, // Distinct "Thick" shadow (6px)
            shadowOpacity: 1,
            shadowRadius: 0,
            elevation: 0,
        }
    }
};

export const SPACING = {
    xs: 4,
    s: 8,
    m: 16,
    l: 24,
    xl: 32,
    xxl: 48,
    // width, // Removed for dynamic sizing
    // height, // Removed for dynamic sizing
};

export const RADIUS = {
    s: 8,
    m: 12,
    l: 16,
    xl: 24,
    full: 9999,
};

export const SHADOWS = {
    light: {
        shadowColor: '#111214',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    medium: {
        shadowColor: '#111214',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
        elevation: 4,
    },
    glow: {
        shadowColor: '#00C48C', // Mint Glow
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2, // Subtle 20%
        shadowRadius: 24,
        elevation: 10,
    },
    dark: {
        shadowColor: '#111214',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius: 24,
        elevation: 8,
    }
};

export const FONTS = {
    // Use system fonts for now, assuming standard weights
    bold: Platform.select({ ios: 'System', android: 'Roboto' }), // Bold weight applied in style
    medium: Platform.select({ ios: 'System', android: 'Roboto' }),
    regular: Platform.select({ ios: 'System', android: 'Roboto' }),
};
