import { View, Text, StyleSheet, TextInput, Pressable, ActivityIndicator, Alert, Image, Dimensions, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { Link, router, useLocalSearchParams } from 'expo-router';
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useGoogleAuth } from '../auth/google-auth';
import { Mail, Lock, User, ArrowRight, Eye, EyeOff, Sparkles, Check, ChevronRight } from 'lucide-react-native';
import { register } from '../api/auth';
import { COLORS, RADIUS, SPACING, GAME_UI } from '../constants/theme';
import Animated, { FadeIn, FadeOut, FadeInDown, useSharedValue, useAnimatedStyle, withSpring, withTiming, Easing, withRepeat, withSequence, Layout, ZoomIn } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

const { width, height } = Dimensions.get('window');

// Reusable Google Button Component
const GoogleButton = ({ onPress }: { onPress: () => void }) => (
  <TouchableOpacity onPress={onPress} style={styles.googleBtn}>
    <Image
      source={{ uri: 'https://cdn-icons-png.flaticon.com/512/300/300221.png' }}
      style={{ width: 20, height: 20, marginRight: 12 }}
    />
    <Text style={styles.googleText}>SIGN IN WITH GOOGLE</Text>
  </TouchableOpacity>
);

export default function AuthScreen({ initialMode = 'welcome' }: { initialMode?: 'welcome' | 'login' | 'signup' }) {
  const params = useLocalSearchParams();
  const startMode = (params.mode as 'login' | 'signup' | 'welcome' | undefined) || initialMode;

  const [mode, setMode] = useState<'welcome' | 'login' | 'signup'>(startMode === 'welcome' ? 'welcome' : startMode);

  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false); // Success State
  const { login, googleLogin } = useAuth();
  const { promptAsync, response } = useGoogleAuth();

  // Animation Values
  const sheetTranslateY = useSharedValue(height);
  const welcomeOpacity = useSharedValue(1);
  const heroTranslateY = useSharedValue(0); // Floating animation

  useEffect(() => {
    if (response?.type === 'success') {
      const token = response.authentication?.idToken || response.params?.id_token;

      if (token) {
        setLoading(true);
        googleLogin(token)
          .then(() => {
            setIsSuccess(true);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setTimeout(() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
              router.replace('/(app)/home');
            }, 800);
          })
          .catch(err => {
            Alert.alert('Google Login Error', err.message);
            setLoading(false);
          });
      }
    }
  }, [response]);

  useEffect(() => {
    // Floating Hero Animation
    heroTranslateY.value = withRepeat(
      withSequence(
        withTiming(-10, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 2000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  useEffect(() => {
    if (mode === 'welcome') {
      sheetTranslateY.value = withSpring(height);
      welcomeOpacity.value = withTiming(1, { duration: 300 });
    } else {
      sheetTranslateY.value = withSpring(0, { damping: 15, stiffness: 90 });
      welcomeOpacity.value = withTiming(0, { duration: 300 }); // Fade out welcome text
    }
  }, [mode]);

  const handleAuth = async () => {
    Haptics.selectionAsync();

    if (mode === 'login') {
      if (!email || !password) { Alert.alert('Error', 'Please fill in all fields'); return; }
      setLoading(true);
      try {
        await login(email, password, true);

        setIsSuccess(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        setTimeout(() => {
          router.replace('/(app)/home');
        }, 1200);

      } catch (e: any) {
        Alert.alert('Login Failed', e.message);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setLoading(false);
      }

    } else {
      if (!name || !email || !password) { Alert.alert('Error', 'Please fill in all fields'); return; }
      setLoading(true);
      try {
        await register(name, email, password);
        await login(email, password, true); // login also skips nav

        setIsSuccess(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        setTimeout(() => {
          router.replace('/(app)/home');
        }, 1200);

      } catch (e: any) {
        Alert.alert('Signup Failed', e.message);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setLoading(false);
      }
    }
  };

  const handleGoogleLogin = () => {
    Haptics.selectionAsync();
    promptAsync();
  };

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: sheetTranslateY.value }]
  }));

  const welcomeStyle = useAnimatedStyle(() => ({
    opacity: welcomeOpacity.value
  }));

  const heroStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: heroTranslateY.value }]
  }));

  return (
    <View style={styles.container}>
      {/* Background: Solid Cream */}
      <View style={StyleSheet.absoluteFill}>
         {/* Azuki Background Pattern (Optional dots or lines could go here) */}
      </View>

      {/* Welcome Layer (Fades out when sheet opens) */}
      <View style={styles.welcomeContainer}>
        {/* SkipQ Logo - Top Left */}
        <Animated.View entering={FadeIn.delay(200)} style={styles.logoContainer}>
          <Text style={styles.logoText}>Skip<Text style={{ color: GAME_UI.primaryBtn }}>Q</Text></Text>
        </Animated.View>

        <Animated.View style={[styles.welcomeContent, welcomeStyle]}>
          {/* Floating Hero Illustration */}
          <Animated.View entering={FadeIn.duration(800)} style={[heroStyle, { marginBottom: 40 }]}>
            <Image
              source={require('../../assets/Mobile login-pana.png')}
              style={{ width: width * 0.85, height: width * 0.85, resizeMode: 'contain' }}
            />
          </Animated.View>

          {/* Staggered Text */}
          <Animated.View entering={FadeInDown.delay(300).springify()}>
            <Text style={styles.welcomeTitle}>Skip the Queue.</Text>
          </Animated.View>
          <Animated.View entering={FadeInDown.delay(400).springify()}>
            <Text style={styles.welcomeTitle}>Grab Your Food Faster.</Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(500).springify()}>
            <Text style={styles.welcomeSubtitle}>Campus food, ordered smart. No waiting.</Text>
          </Animated.View>
        </Animated.View>

        {/* Entry Buttons (Fades out too) */}
        <Animated.View
          entering={FadeInDown.delay(600).springify()}
          style={[styles.entryButtons, welcomeStyle]}
        >
          {/* Sign Up - Primary Mint Gradient */}
          {/* Sign Up - Apricot Block */}
          <Pressable onPress={() => setMode('signup')} style={styles.signupBtn}>
             <Text style={styles.signupText}>CREATE ACCOUNT</Text>
             <ChevronRight size={20} color={GAME_UI.ink} strokeWidth={3} />
          </Pressable>

          {/* Log In - White Block */}
          <Pressable onPress={() => setMode('login')} style={styles.loginBtn}>
            <Text style={styles.loginText}>LOG IN</Text>
          </Pressable>

          <Text style={styles.termsText}>By continuing, you agree to our Terms & Privacy Policy.</Text>

        </Animated.View>
      </View>

      {/* Backdrop for Closing Sheet */}
      {mode !== 'welcome' && (
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={() => setMode('welcome')}
        />
      )}

      {/* Auth Sheet */}
      <Animated.View
        layout={Layout.springify().damping(15)}
        style={[styles.sheet, sheetStyle]}
      >

        {/* Success Overlay - Replaces content when Success */}
        {isSuccess ? (
          <Animated.View
            entering={FadeIn.duration(400)}
            style={styles.successContainer}
          >
            <Animated.View entering={ZoomIn.delay(200).springify()}>
              <View style={styles.successIconCircle}>
                <Check size={50} color="#fff" strokeWidth={4} />
              </View>
            </Animated.View>
            <Animated.Text entering={FadeInDown.delay(500)} style={styles.successText}>
              Welcome Back!
            </Animated.Text>
          </Animated.View>
        ) : (
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>
                {mode === 'login' ? 'Welcome Back' : 'Create Account'}
              </Text>
            </View>

            <Text style={styles.sheetSubtitle}>
              {mode === 'login' ? 'ENTER YOUR CREDENTIALS.' : 'JOIN THE SQUAD.'}
            </Text>

            <View style={styles.formContainer}>

              {mode === 'signup' && (
                <Animated.View
                  entering={FadeIn.duration(300)}
                  exiting={FadeOut.duration(200)}
                  style={styles.inputWrapper}
                >
                  <User size={20} color={GAME_UI.ink} style={styles.icon} strokeWidth={2.5} />
                  <TextInput
                    placeholder="Full Name"
                    style={styles.input}
                    value={name}
                    onChangeText={setName}
                  />
                </Animated.View>
              )}

              <View style={styles.inputWrapper}>
                <Mail size={20} color={GAME_UI.ink} style={styles.icon} strokeWidth={2.5} />
                <TextInput
                  placeholder="Email Address"
                  style={styles.input}
                  autoCapitalize="none"
                  value={email}
                  onChangeText={setEmail}
                />
              </View>

              <View style={styles.inputWrapper}>
                <Lock size={20} color={GAME_UI.ink} style={styles.icon} strokeWidth={2.5} />
                <TextInput
                  placeholder="Password"
                  style={styles.input}
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                />
                <Pressable onPress={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff size={20} color={GAME_UI.ink} strokeWidth={2.5} /> : <Eye size={20} color={GAME_UI.ink} strokeWidth={2.5} />}
                </Pressable>
              </View>

                <Pressable onPress={() => router.push('/(auth)/forgot-password')} style={{ alignSelf: 'flex-end', marginBottom: 20 }}>
                  <Text style={{ color: GAME_UI.ink, fontWeight: '700', textTransform: 'uppercase', fontSize: 12 }}>Forgot password?</Text>
                </Pressable>

              <Pressable onPress={handleAuth} style={styles.actionBtn}>
                {loading ? <ActivityIndicator color="#fff" /> : (
                  <Text style={styles.actionBtnText}>
                    {mode === 'login' ? 'LOG IN' : 'SIGN UP'}
                  </Text>
                )}
              </Pressable>

            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 30 }}>
              <View style={{ flex: 1, height: 2, backgroundColor: GAME_UI.ink }} />
              <Text style={{ marginHorizontal: 10, color: GAME_UI.ink, fontWeight: '800', textTransform: 'uppercase', fontSize: 12 }}>Or</Text>
              <View style={{ flex: 1, height: 2, backgroundColor: GAME_UI.ink }} />
            </View>

            <GoogleButton onPress={handleGoogleLogin} />

            <View style={styles.footerLink}>
              <Text style={{ color: '#64748b' }}>
                {mode === 'login' ? "Don't have an account?" : "Already have an account?"}
              </Text>
              <Pressable onPress={() => setMode(mode === 'login' ? 'signup' : 'login')}>
                <Text style={{ color: COLORS.primary, fontWeight: '700', marginLeft: 5 }}>
                  {mode === 'login' ? 'REGISTER' : 'LOG IN'}
                </Text>
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        )}

      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: GAME_UI.background },

  decorCircle: {
      display: 'none'
  },

  welcomeContainer: {
    flex: 1,
    paddingHorizontal: SPACING.l,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 40,
    justifyContent: 'space-between'
  },

  logoContainer: {
    alignSelf: 'flex-start',
    marginBottom: 20,
  },
  logoText: {
    fontSize: 28,
    fontWeight: '800',
    color: GAME_UI.ink,
    letterSpacing: -1,
    textShadowColor: GAME_UI.white,
    textShadowRadius: 0,
  },

  welcomeContent: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -40
  },
  welcomeTitle: {
    fontSize: 42,
    color: GAME_UI.ink,
    fontWeight: '900',
    textAlign: 'center',
    lineHeight: 46,
    textTransform: 'uppercase',
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: GAME_UI.ink,
    marginTop: 12,
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 24,
  },

  entryButtons: {
    width: '100%',
    gap: 16,
    marginBottom: 30
  },

  signupBtnWrapper: {
     // Removed
  },
  signupBtn: {
    height: 56,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: GAME_UI.primaryBtn,
    gap: 8,
    ...GAME_UI.shadows.button,
  },
  signupText: {
    fontSize: 16,
    fontWeight: '900',
    color: GAME_UI.ink,
    textTransform: 'uppercase',
  },

  loginBtn: {
    height: 56,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: GAME_UI.white,
    ...GAME_UI.shadows.button
  },
  loginText: {
    fontSize: 16,
    fontWeight: '900',
    color: GAME_UI.ink,
    textTransform: 'uppercase'
  },

  termsText: {
    fontSize: 11,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 8
  },

  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: GAME_UI.white,
    borderTopLeftRadius: 32, borderTopRightRadius: 32,
    padding: 32,
    paddingBottom: 50,
    borderTopWidth: 3,
    borderLeftWidth: 3, 
    borderRightWidth: 3,
    borderColor: GAME_UI.ink,
    minHeight: 500
  },

  sheetHeader: { alignItems: 'center', marginBottom: 10 },
  sheetTitle: { fontSize: 24, fontWeight: '900', color: GAME_UI.ink, textAlign: 'center', textTransform: 'uppercase' },
  sheetSubtitle: { fontSize: 13, color: GAME_UI.ink, marginBottom: 30, textAlign: 'center', fontWeight: '500' },

  formContainer: { width: '100%' },

  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 56,
    marginBottom: 16,
    backgroundColor: GAME_UI.white,
    ...GAME_UI.shadows.sm
  },
  icon: { marginRight: 12 },
  input: { flex: 1, fontSize: 16, color: GAME_UI.ink, fontWeight: '700' },

  actionBtn: {
    height: 56, backgroundColor: GAME_UI.primaryBtn,
    borderRadius: 12, justifyContent: 'center', alignItems: 'center',
    ...GAME_UI.shadows.button,
    marginTop: 10
  },
  actionBtnText: { color: GAME_UI.ink, fontSize: 16, fontWeight: '900', textTransform: 'uppercase' },

  googleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    height: 56,
    backgroundColor: GAME_UI.white,
    borderRadius: 12,
    ...GAME_UI.shadows.sm
  },
  googleText: { fontSize: 14, fontWeight: '800', color: GAME_UI.ink, textTransform: 'uppercase' },

  footerLink: { flexDirection: 'row', justifyContent: 'center', marginTop: 30 },

  // Success State Styles
  successContainer: {
    alignItems: 'center', justifyContent: 'center', paddingVertical: 50
  },
  successIconCircle: {
    width: 100, height: 100, borderRadius: 12,
    backgroundColor: GAME_UI.tertiary, // Mint
    alignItems: 'center', justifyContent: 'center',
    ...GAME_UI.shadows.md,
    borderWidth: 3, 
    marginBottom: 20
  },
  successText: {
    fontSize: 28, fontWeight: '900', color: GAME_UI.ink, textTransform: 'uppercase'
  },
});
