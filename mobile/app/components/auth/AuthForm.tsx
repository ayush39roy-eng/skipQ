import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    StyleSheet,
    Pressable,
    ActivityIndicator,
    Alert,
} from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withSequence,
    FadeInDown,
    Layout,
} from 'react-native-reanimated';
import { Mail, Lock, User, Eye, EyeOff } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { GAME_UI, SPACING, RADIUS, COLORS } from '../../constants/theme';
import { Link } from 'expo-router';

type AuthMode = 'login' | 'signup';

interface AuthFormProps {
    initialMode?: AuthMode;
    onSuccess?: () => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const AuthForm: React.FC<AuthFormProps> = ({ 
    initialMode = 'login',
    onSuccess 
}) => {
    const [mode, setMode] = useState<AuthMode>(initialMode);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [focusedInput, setFocusedInput] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    
    const { login, register } = useAuth();
    
    // Button animation
    const buttonScale = useSharedValue(1);
    
    const handleSubmit = async () => {
        setError(null);
        if (!email.trim() || !password.trim()) {
            setError('Please fill in all fields');
            // Shake animation on button
            buttonScale.value = withSequence(
                withSpring(0.95),
                withSpring(1.02),
                withSpring(0.98),
                withSpring(1)
            );
            return;
        }

        if (mode === 'signup' && !name.trim()) {
            setError('Please enter your name');
            return;
        }

        setLoading(true);
        try {
            if (mode === 'login') {
                await login(email.trim(), password);
                onSuccess?.();
            } else {
                await register(name.trim(), email.trim(), password);
                onSuccess?.();
            }
        } catch (error: any) {
            console.error('Auth Error:', error);
            setError(error.message || 'Authentication failed');
            // Shake animation
            buttonScale.value = withSequence(
                withSpring(0.95), withSpring(1.02), withSpring(0.98), withSpring(1)
            );
        } finally {
            setLoading(false);
        }
    };

    const buttonStyle = useAnimatedStyle(() => ({
        transform: [{ scale: buttonScale.value }],
    }));

    const toggleMode = () => {
        setMode(mode === 'login' ? 'signup' : 'login');
        setEmail('');
        setPassword('');
        setName('');
    };

    const getInputStyle = (inputName: string) => [
        styles.inputWrapper,
        focusedInput === inputName && styles.inputFocused,
    ];

    return (
        <View style={styles.container}>
            {/* Mode Toggle */}
            <Animated.View 
                entering={FadeInDown.delay(100).springify()}
                style={styles.toggleContainer}
            >
                <Pressable 
                    style={[styles.toggleBtn, mode === 'login' && styles.toggleActive]}
                    onPress={() => setMode('login')}
                >
                    <Text style={[styles.toggleText, mode === 'login' && styles.toggleTextActive]}>
                        LOGIN
                    </Text>
                </Pressable>
                <Pressable 
                    style={[styles.toggleBtn, mode === 'signup' && styles.toggleActive]}
                    onPress={() => setMode('signup')}
                >
                    <Text style={[styles.toggleText, mode === 'signup' && styles.toggleTextActive]}>
                        SIGN UP
                    </Text>
                </Pressable>
            </Animated.View>

            {/* Form */}
            <Animated.View 
                entering={FadeInDown.delay(200).springify()}
                layout={Layout.springify()}
                style={styles.form}
            >
                {/* Name Input (only for signup) */}
                {mode === 'signup' && (
                    <Animated.View 
                        entering={FadeInDown.springify()}
                        style={getInputStyle('name')}
                    >
                        <User size={20} color={GAME_UI.ink} style={styles.icon} />
                        <TextInput
                            style={styles.input}
                            placeholder="Full Name"
                            placeholderTextColor={COLORS.textMuted}
                            value={name}
                            onChangeText={(text) => { setName(text); setError(null); }}
                            autoCapitalize="words"
                            onFocus={() => setFocusedInput('name')}
                            onBlur={() => setFocusedInput(null)}
                        />
                    </Animated.View>
                )}

                {/* Email Input */}
                <View style={getInputStyle('email')}>
                    <Mail size={20} color={GAME_UI.ink} style={styles.icon} />
                    <TextInput
                        style={styles.input}
                        placeholder="Email Address"
                        placeholderTextColor={COLORS.textMuted}
                        value={email}
                        onChangeText={(text) => { setEmail(text); setError(null); }}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoCorrect={false}
                        onFocus={() => setFocusedInput('email')}
                        onBlur={() => setFocusedInput(null)}
                    />
                </View>

                {/* Password Input */}
                <View style={getInputStyle('password')}>
                    <Lock size={20} color={GAME_UI.ink} style={styles.icon} />
                    <TextInput
                        style={styles.input}
                        placeholder="Password"
                        placeholderTextColor={COLORS.textMuted}
                        value={password}
                        onChangeText={(text) => { setPassword(text); setError(null); }}
                        secureTextEntry={!showPassword}
                        autoCapitalize="none"
                        onFocus={() => setFocusedInput('password')}
                        onBlur={() => setFocusedInput(null)}
                    />
                    <Pressable onPress={() => setShowPassword(!showPassword)}>
                        {showPassword ? (
                            <EyeOff size={20} color={GAME_UI.ink} />
                        ) : (
                            <Eye size={20} color={GAME_UI.ink} />
                        )}
                    </Pressable>
                </View>
                
                {mode === 'signup' && (
                    <Text style={styles.helperText}>
                        Password must be at least 8 characters
                    </Text>
                )}

                {/* Error Message */}
                {error && (
                    <Animated.Text 
                        entering={FadeInDown.springify()} 
                        style={styles.errorText}
                    >
                        {error}
                    </Animated.Text>
                )}

                {/* Forgot Password (login only) */}
                {mode === 'login' && (
                    <Link href="/(auth)/forgot-password" asChild>
                        <Pressable style={styles.forgotBtn}>
                            <Text style={styles.forgotText}>Forgot Password?</Text>
                        </Pressable>
                    </Link>
                )}
            </Animated.View>

            {/* Submit Button */}
            <Animated.View entering={FadeInDown.delay(300).springify()}>
                <AnimatedPressable
                    style={[styles.submitBtn, buttonStyle, loading && styles.submitBtnLoading]}
                    onPress={handleSubmit}
                    disabled={loading}
                    onPressIn={() => {
                        buttonScale.value = withSpring(0.97);
                    }}
                    onPressOut={() => {
                        buttonScale.value = withSpring(1);
                    }}
                >
                    {loading ? (
                        <ActivityIndicator color={GAME_UI.ink} size="small" />
                    ) : (
                        <Text style={styles.submitBtnText}>
                            {mode === 'login' ? 'LET\'S GO!' : 'CREATE ACCOUNT'}
                        </Text>
                    )}
                </AnimatedPressable>
            </Animated.View>

            {/* Switch Mode Text */}
            <Animated.View 
                entering={FadeInDown.delay(400).springify()}
                style={styles.switchContainer}
            >
                <Text style={styles.switchText}>
                    {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
                </Text>
                <Pressable onPress={toggleMode}>
                    <Text style={styles.switchLink}>
                        {mode === 'login' ? 'Sign Up' : 'Login'}
                    </Text>
                </Pressable>
            </Animated.View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingTop: SPACING.m,
    },
    toggleContainer: {
        flexDirection: 'row',
        backgroundColor: GAME_UI.background,
        borderRadius: RADIUS.m,
        borderWidth: 2,
        borderColor: GAME_UI.ink,
        padding: 4,
        marginBottom: SPACING.l,
    },
    toggleBtn: {
        flex: 1,
        paddingVertical: SPACING.s + 2,
        alignItems: 'center',
        borderRadius: RADIUS.s,
    },
    toggleActive: {
        backgroundColor: GAME_UI.primaryBtn,
        ...GAME_UI.shadows.sm,
    },
    toggleText: {
        fontSize: 14,
        fontWeight: '800',
        color: COLORS.textMuted,
        letterSpacing: 1,
    },
    toggleTextActive: {
        color: GAME_UI.ink,
    },
    form: {
        gap: SPACING.m,
        marginBottom: SPACING.l,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: GAME_UI.white,
        borderRadius: RADIUS.m,
        borderWidth: 2,
        borderColor: GAME_UI.ink,
        paddingHorizontal: SPACING.m,
        height: 56,
    },
    inputFocused: {
        borderColor: GAME_UI.tertiary,
        shadowColor: GAME_UI.tertiary,
        shadowOffset: { width: 4, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 0,
        elevation: 4,
    },
    icon: {
        marginRight: SPACING.s,
    },
    input: {
        flex: 1,
        fontSize: 16,
        color: GAME_UI.ink,
        fontWeight: '600',
    },
    forgotBtn: {
        alignSelf: 'flex-end',
        marginTop: -SPACING.xs,
    },
    forgotText: {
        fontSize: 13,
        fontWeight: '700',
        color: GAME_UI.tertiary,
    },
    submitBtn: {
        backgroundColor: GAME_UI.primaryBtn,
        borderRadius: RADIUS.m,
        height: 58,
        justifyContent: 'center',
        alignItems: 'center',
        ...GAME_UI.shadows.button,
    },
    submitBtnLoading: {
        opacity: 0.8,
    },
    submitBtnText: {
        fontSize: 18,
        fontWeight: '900',
        color: GAME_UI.ink,
        letterSpacing: 1.5,
    },
    switchContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: SPACING.l,
    },
    switchText: {
        fontSize: 14,
        color: COLORS.textMuted,
    },
    switchLink: {
        fontSize: 14,
        fontWeight: '800',
        color: GAME_UI.tertiary,
    },
    errorText: {
        color: '#FF4444',
        fontSize: 14,
        fontWeight: '600',
        textAlign: 'center',
        marginTop: SPACING.xs,
    },
    helperText: {
        color: COLORS.textMuted,
        fontSize: 12,
        marginTop: -SPACING.s + 4,
        marginLeft: SPACING.xs,
    },
});
