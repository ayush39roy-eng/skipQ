import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRef, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { MotiView } from 'moti';
import { COLORS, SPACING, RADIUS, FONTS } from '../../constants/theme';

interface CartHeaderProps {
    step?: number; // 1: Cart, 2: Review, 3: Pay
}

export const CartHeader = ({ step = 1 }: CartHeaderProps) => {
    const router = useRouter();
    
    // Validate and clamp step to [1, 3]
    const clampedStep = Math.min(Math.max(step, 1), 3);
    
    // Store previous step to animate from
    const prevStep = useRef(clampedStep);
    
    useEffect(() => {
        prevStep.current = clampedStep;
    }, [clampedStep]);

    const percentWidth = (clampedStep / 3) * 100;
    const prevPercentWidth = (prevStep.current / 3) * 100;

    return (
        <View style={styles.container}>
            <View style={styles.topRow}>
                <Pressable onPress={() => router.back()} style={styles.backButton}>
                    <ChevronLeft size={24} color={COLORS.textDark} />
                </Pressable>
                <Text style={styles.title}>Your Cart</Text>
                <View style={{ width: 40 }} />
            </View>

            {/* Progress Bar */}
            <View style={styles.progressContainer}>
                <View style={styles.progressTrack}>
                    <MotiView
                        from={{ width: `${prevPercentWidth}%` }}
                        animate={{ width: `${percentWidth}%` }}
                        transition={{ type: 'spring', damping: 20 }}
                        style={styles.progressBar}
                    />
                </View>
                <View style={styles.stepsRow}>
                    <Text style={[styles.stepText, step >= 1 && styles.activeStep]}>Cart</Text>
                    <Text style={[styles.stepText, step >= 2 && styles.activeStep]}>Review</Text>
                    <Text style={[styles.stepText, step >= 3 && styles.activeStep]}>Pay</Text>
                </View>
            </View>

            {/* Microcopy */}
            <Text style={styles.microcopy}>
                You're one step away from skipping the line ✨
            </Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: COLORS.white,
        paddingTop: 60, // Safe area
        paddingBottom: SPACING.m,
        paddingHorizontal: SPACING.m,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.03)',
    },
    topRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: SPACING.l,
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: RADIUS.full,
        backgroundColor: COLORS.lightBg,
    },
    title: {
        fontSize: 20,
        fontWeight: '800',
        color: COLORS.textDark,
        fontFamily: FONTS.bold,
    },
    progressContainer: {
        marginBottom: SPACING.s,
    },
    progressTrack: {
        height: 6,
        backgroundColor: COLORS.lightBg,
        borderRadius: RADIUS.full,
        overflow: 'hidden',
        marginBottom: 8,
    },
    progressBar: {
        height: '100%',
        backgroundColor: COLORS.primary,
        borderRadius: RADIUS.full,
    },
    stepsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 4,
    },
    stepText: {
        fontSize: 12,
        color: COLORS.textMuted,
        fontWeight: '600',
    },
    activeStep: {
        color: COLORS.primary,
        fontWeight: '700',
    },
    microcopy: {
        fontSize: 12,
        color: COLORS.textMutedDark,
        textAlign: 'center',
        marginTop: 4,
        fontStyle: 'italic',
    }
});
