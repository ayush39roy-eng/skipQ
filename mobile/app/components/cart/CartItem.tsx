import { View, Text, StyleSheet, Image, Pressable } from 'react-native';
import { memo } from 'react';
import { MotiView, AnimatePresence } from 'moti';
import { Plus, Minus, Trash2 } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { COLORS, SPACING, RADIUS, GAME_UI } from '../../constants/theme';
import Swipeable from 'react-native-gesture-handler/Swipeable';

interface CartItemProps {
    item: any;
    onIncrement: () => void;
    onDecrement: () => void;
    onRemove: () => void;
}

export const CartItem = memo(({ item, onIncrement, onDecrement, onRemove }: CartItemProps) => {

    const renderRightActions = () => {
        return (
            <Pressable onPress={() => {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                onRemove();
            }} style={styles.deleteAction}>
                <Trash2 color={GAME_UI.white} size={24} strokeWidth={3} />
            </Pressable>
        );
    };

    return (
        <MotiView
            from={{ opacity: 0, translateY: 10 }}
            animate={{ opacity: 1, translateY: 0 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            style={styles.containerWrapper}
        >
            <Swipeable renderRightActions={renderRightActions}>
                <View style={styles.container}>
                    <View style={styles.imageContainer}>
                        <Image
                            source={{ uri: item.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&q=80' }}
                            style={styles.image}
                        />
                    </View>

                    <View style={styles.info}>
                        <View style={styles.headerRow}>
                            <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
                            <Text style={styles.price}>₹{item.price}</Text>
                        </View>

                        <View style={styles.controlsRow}>
                            {/* Customization Text Placeholder */}
                            <Text style={styles.customization}>Regular size</Text>

                            <View style={styles.counter}>
                                <Pressable
                                    onPress={() => {
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                        onDecrement();
                                    }}
                                    style={styles.counterBtn}
                                >
                                    <Minus size={14} color={GAME_UI.ink} strokeWidth={3} />
                                </Pressable>

                                <Text style={styles.qtyText}>{item.quantity}</Text>

                                <Pressable
                                    onPress={() => {
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                        onIncrement();
                                    }}
                                    style={styles.counterBtn}
                                >
                                    <Plus size={14} color={GAME_UI.ink} strokeWidth={3} />
                                </Pressable>
                            </View>
                        </View>
                    </View>
                </View>
            </Swipeable>
        </MotiView>
    );
});

const styles = StyleSheet.create({
    containerWrapper: {
        marginBottom: SPACING.m,
        backgroundColor: GAME_UI.white, 
    },
    container: {
        flexDirection: 'row',
        backgroundColor: GAME_UI.white,
        borderRadius: 12,
        padding: 12, 
        ...GAME_UI.shadows.sm,
    },
    imageContainer: {
        width: 70,
        height: 70,
        borderRadius: 8,
        overflow: 'hidden',
        backgroundColor: GAME_UI.secondary,
        borderWidth: 2,
        borderColor: GAME_UI.ink,
    },
    image: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    info: {
        flex: 1,
        paddingLeft: SPACING.m,
        justifyContent: 'space-between',
        paddingVertical: 2,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    name: {
        fontSize: 16,
        fontWeight: '900',
        color: GAME_UI.ink,
        flex: 1,
        marginRight: 8,
    },
    price: {
        fontSize: 16,
        fontWeight: '900',
        color: GAME_UI.ink,
        marginRight: 8,
    },
    controlsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 4,
    },
    customization: {
        fontSize: 12,
        color: GAME_UI.ink,
        fontWeight: '500',
        opacity: 0.6,
    },
    counter: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: GAME_UI.primaryBtn, // Apricot bg
        borderRadius: 8,
        paddingHorizontal: 4,
        paddingVertical: 4,
        ...GAME_UI.shadows.sm
    },
    counterBtn: {
        width: 24,
        height: 24,
        justifyContent: 'center',
        alignItems: 'center',
        // backgroundColor: GAME_UI.white,
        // borderRadius: 4,
    },
    qtyText: {
        fontWeight: '900',
        fontSize: 14,
        color: GAME_UI.ink,
        marginHorizontal: 8,
        minWidth: 16,
        textAlign: 'center',
    },
    deleteAction: {
        backgroundColor: COLORS.error, // Keep red for delete
        justifyContent: 'center',
        alignItems: 'flex-end',
        paddingHorizontal: 24,
        borderRadius: 12,
        marginBottom: 0,
        flex: 1, 
        borderWidth: 2,
        borderColor: GAME_UI.ink,
        marginLeft: 8,
    }
});
