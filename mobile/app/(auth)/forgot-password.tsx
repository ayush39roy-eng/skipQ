import { View, Text, StyleSheet, TextInput, Pressable, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Mail, ChevronLeft } from 'lucide-react-native';
import { requestPasswordReset } from '../api/auth';
import { COLORS, SPACING, GAME_UI } from '../constants/theme';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

export default function ForgotPasswordScreen() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSendLink = async () => {
        if (!email) {
            Alert.alert("Error", "Please enter your email address");
            return;
        }

        setLoading(true);
        try {
            await requestPasswordReset(email);
            // Since we mocked email, we might want to simulate "check your console" if connected to dev,
            // OR just navigate to Reset Password screen where user enters TOKEN manually (for dev/MVP).
            // In a real app with deep links, we would say "Check your email".
            // To satisfy "end to end" request in this dev environment without email service,
            // we will navigate to the Reset Screen and ask them to input the token.
            
            Alert.alert("Link Sent", "If an account exists, we sent a reset token to your email (Check server console for Dev).", [
                { text: "Enter Code", onPress: () => router.push('/(auth)/reset-password') }
            ]);

        } catch (error: any) {
            Alert.alert("Error", error.message || "Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={styles.backBtn}>
                    <ChevronLeft size={24} color={GAME_UI.ink} />
                </Pressable>
            </View>

            <View style={styles.content}>
                <Animated.View entering={FadeInDown.delay(200)}>
                    <Text style={styles.title}>Forgot Password?</Text>
                    <Text style={styles.subtitle}>Don't worry! It happens. Please enter the email associated with your account.</Text>
                </Animated.View>

                <Animated.View entering={FadeInDown.delay(400)} style={styles.form}>
                    <View style={styles.inputWrapper}>
                        <Mail size={20} color={GAME_UI.ink} style={styles.icon} />
                        <TextInput
                            placeholder="Email Address"
                            style={styles.input}
                            autoCapitalize="none"
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                        />
                    </View>

                    <Pressable onPress={handleSendLink} style={styles.submitBtn} disabled={loading}>
                        {loading ? <ActivityIndicator color="#fff" /> : (
                            <Text style={styles.submitBtnText}>SEND CODE</Text>
                        )}
                    </Pressable>
                </Animated.View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: GAME_UI.background },
    header: { padding: SPACING.l, paddingTop: 60 },
    backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', borderRadius: 12, backgroundColor: GAME_UI.white, ...GAME_UI.shadows.sm },
    
    content: { padding: SPACING.l, paddingTop: 0 },
    title: { fontSize: 32, fontWeight: '900', color: GAME_UI.ink, marginBottom: 10, textTransform: 'uppercase' },
    subtitle: { fontSize: 16, color: COLORS.textMuted, lineHeight: 24, marginBottom: 40 },

    form: { gap: 20 },
    inputWrapper: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: GAME_UI.white, borderRadius: 12,
        paddingHorizontal: 16, height: 56,
        ...GAME_UI.shadows.sm
    },
    icon: { marginRight: 12 },
    input: { flex: 1, fontSize: 16, color: GAME_UI.ink, fontWeight: '700' },

    submitBtn: {
        height: 56, backgroundColor: GAME_UI.primaryBtn,
        borderRadius: 12, justifyContent: 'center', alignItems: 'center',
        ...GAME_UI.shadows.button
    },
    submitBtnText: { fontSize: 16, fontWeight: '900', color: GAME_UI.ink, textTransform: 'uppercase' }
});
