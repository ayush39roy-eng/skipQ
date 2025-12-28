import { View, Text, StyleSheet } from 'react-native';
// import { BlurView } from 'expo-blur';
import { COLORS, SPACING, GAME_UI } from '../../constants/theme';
import { MotiView } from 'moti';

export const OrdersHeader = () => {
    return (
        <View style={styles.container}>
            <View style={styles.content}>
                <MotiView
                    from={{ opacity: 0, translateY: 10 }}
                    animate={{ opacity: 1, translateY: 0 }}
                    transition={{ type: 'timing', duration: 600 }}
                >
                    <Text style={styles.title}>MY ORDERS</Text>
                    <Text style={styles.subtitle}>TRACK YOUR CRAVINGS & REVISIT FAVORITES.</Text>
                </MotiView>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingTop: 60, // Status bar space
        paddingBottom: SPACING.m,
        backgroundColor: GAME_UI.background,
        zIndex: 10,
        borderBottomWidth: 3,
        borderBottomColor: GAME_UI.ink,
    },
    content: {
        paddingHorizontal: SPACING.l,
    },
    title: {
        fontSize: 32,
        fontWeight: '900',
        color: GAME_UI.ink,
        letterSpacing: -0.5,
        marginBottom: 4,
        textTransform: 'uppercase',
    },
    subtitle: {
        fontSize: 12,
        color: GAME_UI.ink,
        fontWeight: '700',
        textTransform: 'uppercase',
    },
});
