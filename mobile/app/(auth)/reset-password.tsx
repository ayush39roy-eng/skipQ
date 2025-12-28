import { View, Text, StyleSheet, TextInput, Pressable, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Lock, Check, ChevronLeft, KeyRound } from 'lucide-react-native';
import { resetPassword } from '../api/auth';
import { COLORS, SPACING, GAME_UI } from '../constants/theme';
import Animated, { FadeInDown } from 'react-native-reanimated';

export default function ResetPasswordScreen() {
    const router = useRouter();
    const [token, setToken] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleReset = async () => {
        if (!token || !newPassword) {
            Alert.alert("Error", "Please fill all fields");
            return;
        }

        setLoading(true);
        try {
            await resetPassword(token, newPassword);
            Alert.alert("Success", "Your password has been reset successfully.", [
                { text: "Login", onPress: () => router.replace('/(app)/login') }
            ]);
        } catch (error: any) {
            Alert.alert("Error", error.message || "Failed to reset password");
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
                     <Text style={styles.title}>Reset Password</Text>
                     <Text style={styles.subtitle}>Enter the code sent to your email and your new password.</Text>
                </Animated.View>

                <Animated.View entering={FadeInDown.delay(400)} style={styles.form}>
                    <View style={styles.inputWrapper}>
                        <KeyRound size={20} color={GAME_UI.ink} style={styles.icon} />
                        <TextInput
                            placeholder="Reset Token / Code"
                            style={styles.input}
                            autoCapitalize="none"
                            value={token}
                            onChangeText={setToken}
                        />
                    </View>

                    <View style={styles.inputWrapper}>
                        <Lock size={20} color={GAME_UI.ink} style={styles.icon} />
                         <TextInput
                            placeholder="New Password"
                            style={styles.input}
                            secureTextEntry
                            value={newPassword}
                            onChangeText={setNewPassword}
                        />
                    </View>

                    <Pressable onPress={handleReset} style={styles.submitBtn} disabled={loading}>
                        {loading ? <ActivityIndicator color="#fff" /> : (
                            <Text style={styles.submitBtnText}>UPDATE PASSWORD</Text>
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
