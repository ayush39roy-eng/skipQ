import React, { useEffect } from 'react';
import {
    View,
    StyleSheet,
    Dimensions,
    Pressable,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
    runOnJS,
    interpolate,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { GAME_UI, RADIUS } from '../../constants/theme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.7; // 70% of screen (slightly more than 2/3)
const DISMISS_THRESHOLD = 100;

interface AuthBottomSheetProps {
    isVisible: boolean;
    onClose: () => void;
    children: React.ReactNode;
}

export const AuthBottomSheet: React.FC<AuthBottomSheetProps> = ({
    isVisible,
    onClose,
    children,
}) => {
    const translateY = useSharedValue(SCREEN_HEIGHT);
    const backdropOpacity = useSharedValue(0);
    const context = useSharedValue({ y: 0 });

    useEffect(() => {
        if (isVisible) {
            translateY.value = withSpring(0, {
                damping: 18,
                stiffness: 120,
                mass: 0.8,
            });
            backdropOpacity.value = withTiming(1, { duration: 300 });
        } else {
            translateY.value = withSpring(SCREEN_HEIGHT, {
                damping: 20,
                stiffness: 150,
            });
            backdropOpacity.value = withTiming(0, { duration: 200 });
        }
    }, [isVisible]);

    const panGesture = Gesture.Pan()
        .onStart(() => {
            context.value = { y: translateY.value };
        })
        .onUpdate((event) => {
            // Only allow dragging downward (positive translationY)
            translateY.value = Math.max(0, context.value.y + event.translationY);
            // Update backdrop opacity based on sheet position
            const progress = interpolate(
                translateY.value,
                [0, SHEET_HEIGHT],
                [1, 0]
            );
            backdropOpacity.value = progress;
        })
        .onEnd((event) => {
            // Dismiss if dragged past threshold or with high velocity
            if (translateY.value > DISMISS_THRESHOLD || event.velocityY > 500) {
                translateY.value = withSpring(SCREEN_HEIGHT, {
                    damping: 20,
                    stiffness: 150,
                    velocity: event.velocityY,
                });
                backdropOpacity.value = withTiming(0, { duration: 200 });
                runOnJS(onClose)();
            } else {
                // Snap back to open position
                translateY.value = withSpring(0, {
                    damping: 18,
                    stiffness: 120,
                });
                backdropOpacity.value = withTiming(1, { duration: 150 });
            }
        });

    const sheetStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: translateY.value }],
    }));

    const backdropStyle = useAnimatedStyle(() => ({
        opacity: backdropOpacity.value * 0.6,
        pointerEvents: backdropOpacity.value > 0 ? 'auto' : 'none',
    }));

    if (!isVisible && translateY.value >= SCREEN_HEIGHT - 10) {
        return null;
    }

    return (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
            {/* Backdrop */}
            <Animated.View style={[styles.backdrop, backdropStyle]}>
                <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
            </Animated.View>

            {/* Bottom Sheet */}
            <GestureDetector gesture={panGesture}>
                <Animated.View style={[styles.sheet, sheetStyle]}>
                    {/* Drag Handle */}
                    <View style={styles.handleContainer}>
                        <View style={styles.handle} />
                    </View>

                    {/* Content */}
                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                        style={styles.content}
                    >
                        {children}
                    </KeyboardAvoidingView>
                </Animated.View>
            </GestureDetector>
        </View>
    );
};

const styles = StyleSheet.create({
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#000',
    },
    sheet: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: SHEET_HEIGHT,
        backgroundColor: GAME_UI.card,
        borderTopLeftRadius: RADIUS.xl,
        borderTopRightRadius: RADIUS.xl,
        borderWidth: 2.5,
        borderBottomWidth: 0,
        borderColor: GAME_UI.ink,
        // Neo shadow pointing up
        shadowColor: GAME_UI.ink,
        shadowOffset: { width: 0, height: -6 },
        shadowOpacity: 1,
        shadowRadius: 0,
        elevation: 20,
    },
    handleContainer: {
        alignItems: 'center',
        paddingVertical: 12,
    },
    handle: {
        width: 48,
        height: 5,
        borderRadius: 3,
        backgroundColor: GAME_UI.ink,
    },
    content: {
        flex: 1,
        paddingHorizontal: 24,
    },
});
