import { View, Text, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, withTiming, withSpring, useSharedValue, withRepeat, withSequence } from 'react-native-reanimated';
import { CheckCircle2, ChefHat, Receipt, ShoppingBag } from 'lucide-react-native';
import { COLORS, GAME_UI } from '../../constants/theme';
import { useEffect } from 'react';

const STEPS = [
    { id: 'PLACED', label: 'Placed', icon: Receipt },
    { id: 'PREPARING', label: 'Preparing', icon: ChefHat },
    { id: 'READY', label: 'Ready', icon: ShoppingBag },
    { id: 'COMPLETED', label: 'Picked Up', icon: CheckCircle2 },
];

const STATUS_ORDER = ['PLACED', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED'];

export const OrderTracker = ({ status }: { status: string }) => {
    const currentIndex = STATUS_ORDER.indexOf(status);
    const progress = useSharedValue(0);

    useEffect(() => {
        if (currentIndex >= 0) {
            progress.value = withSpring(currentIndex / (STEPS.length - 1));
        }
    }, [currentIndex]);

    const progressStyle = useAnimatedStyle(() => ({
        width: `${progress.value * 100}%`
    }));

    return (
        <View style={styles.container}>
            {/* Progress Bar Background */}
            <View style={styles.track}>
                <Animated.View style={[styles.fill, progressStyle]} />
            </View>

            {/* Steps */}
            <View style={styles.stepsContainer}>
                {STEPS.map((step, index) => {
                    const isActive = index === currentIndex;
                    const isCompleted = index <= currentIndex;
                    
                    return (
                        <View key={step.id} style={styles.stepWrapper}>
                            <View style={[
                                styles.iconContainer,
                                isCompleted && styles.iconCompleted,
                                isActive && styles.iconActive
                            ]}>
                                <step.icon 
                                    size={16} 
                                    color={isCompleted ? GAME_UI.white : GAME_UI.ink} 
                                    strokeWidth={isCompleted ? 3 : 2}
                                />
                            </View>
                            <Text style={[
                                styles.label,
                                isCompleted && styles.labelCompleted,
                                isActive && styles.labelActive
                            ]}>
                                {step.label}
                            </Text>
                        </View>
                    );
                })}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginVertical: 24,
        paddingHorizontal: 12,
    },
    track: {
        position: 'absolute',
        top: 20, // Align with center of icons (approx)
        left: 30,
        right: 30,
        height: 4,
        backgroundColor: COLORS.textMutedLight,
        borderRadius: 2,
        zIndex: 0,
    },
    fill: {
        height: '100%',
        backgroundColor: GAME_UI.tertiary,
        borderRadius: 2,
    },
    stepsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        zIndex: 1,
    },
    stepWrapper: {
        alignItems: 'center',
        gap: 8,
        width: 60,
    },
    iconContainer: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: GAME_UI.white,
        borderWidth: 2,
        borderColor: COLORS.textMutedLight,
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconCompleted: {
        backgroundColor: GAME_UI.tertiary,
        borderColor: GAME_UI.ink,
    },
    iconActive: {
        borderColor: GAME_UI.primaryBtn,
        transform: [{ scale: 1.1 }],
    },
    label: {
        fontSize: 10,
        fontWeight: '600',
        color: COLORS.textMuted,
        textAlign: 'center',
    },
    labelCompleted: {
        color: GAME_UI.tertiary,
        fontWeight: '800',
    },
    labelActive: {
        color: GAME_UI.ink,
        fontWeight: '900',
    },
});
