import { View, Text, StyleSheet, Image, Pressable } from 'react-native';
import { memo } from 'react';
import { MotiView } from 'moti';
import { Plus, Minus } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { COLORS, SPACING, RADIUS, GAME_UI } from '../../constants/theme';

interface MenuItem {
  id: string;
  name: string;
  priceCents: number;
  description?: string;
  image?: string;
  isVeg: boolean;
  isPopular?: boolean;
}

interface MenuItemCardProps {
    item: MenuItem;
    quantity: number;
    onAdd: (item: MenuItem) => void;
    onRemove: (id: string) => void;
}
const MenuItemCardComponent = ({ item, quantity, onAdd, onRemove }: MenuItemCardProps) => {

    const handleAdd = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onAdd(item);
    };

    const handleRemove = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onRemove(item.id);
    };

    return (
        <Pressable
            onPress={() => {/* Navigate to item details or trigger action */}}
            style={({ pressed }) => [
                styles.container,
                pressed && { transform: [{ scale: 0.98 }] }
            ]}
        >
            <View style={styles.info}>
                {/* Veg/Non-Veg Badge */}
                <View style={[
                    styles.vegBadge,
                    { borderColor: item.isVeg ? COLORS.success : COLORS.error }
                ]}>
                    <View style={[
                        styles.vegDot,
                        { backgroundColor: item.isVeg ? COLORS.success : COLORS.error }
                    ]} />
                </View>

                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.price}>₹{item.priceCents / 100}</Text>
                <Text style={styles.description} numberOfLines={2}>
                    {item.description || "Freshly prepared with quality ingredients."}
                </Text>

                {item.isPopular && (
                    <View style={styles.popularBadge}>
                        <Text style={styles.popularText}>Popular</Text>
                    </View>
                )}
            </View><View style={styles.imageWrapper}>
                <Image
                    source={{ uri: item.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&q=80' }}
                    style={styles.image}
                />

                {/* Quick Add Button / Counter */}
                <View style={styles.actionContainer}>
                    {quantity > 0 ? (
                        <MotiView
                            from={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                            style={styles.counter}
                        >
                            <Pressable onPress={handleRemove} style={styles.counterBtn}>
                                <Minus size={14} color={GAME_UI.ink} strokeWidth={3} />
                            </Pressable>
                            <Text style={styles.qtyText}>{quantity}</Text>
                            <Pressable onPress={handleAdd} style={styles.counterBtn}>
                                <Plus size={14} color={GAME_UI.ink} strokeWidth={3} />
                            </Pressable>
                        </MotiView>
                    ) : (
                        <Pressable onPress={handleAdd}>
                            <MotiView
                                style={styles.addBtn}
                            >
                                <Text style={styles.addBtnText}>ADD</Text>
                                <View style={styles.plusIcon}>
                                    <Plus size={12} color={GAME_UI.ink} strokeWidth={4} />
                                </View>
                            </MotiView>
                        </Pressable>
                    )}
                </View>
            </View>
        </Pressable>
    );
};

export const MenuItemCard = memo(MenuItemCardComponent);

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        backgroundColor: GAME_UI.white,
        borderRadius: 12,
        padding: SPACING.m,
        marginBottom: SPACING.m,
        ...GAME_UI.shadows.sm // Includes border
    },
    info: {
        flex: 1,
        paddingRight: SPACING.m,
        justifyContent: 'center',
    },
    vegBadge: {
        width: 16,
        height: 16,
        borderWidth: 2,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: SPACING.xs,
        borderRadius: 4,
    },
    vegDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    name: {
        fontSize: 18,
        fontWeight: '900',
        color: GAME_UI.ink,
        marginBottom: 4,
        letterSpacing: -0.5,
    },
    price: {
        fontSize: 16,
        fontWeight: '800',
        color: GAME_UI.ink,
        marginBottom: 6,
    },
    description: {
        fontSize: 12,
        color: COLORS.textMutedDark,
        lineHeight: 16,
        fontWeight: '500',
    },
    popularBadge: {
        marginTop: 8,
        alignSelf: 'flex-start',
        backgroundColor: GAME_UI.tertiary, // Mint
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: GAME_UI.ink,
    },
    popularText: {
        fontSize: 10,
        fontWeight: '900',
        color: GAME_UI.ink,
        textTransform: 'uppercase',
    },
    imageWrapper: {
        width: 100,
        height: 100,
        borderRadius: 8,
        overflow: 'hidden', 
        backgroundColor: GAME_UI.secondary,
        position: 'relative',
        borderWidth: 2,
        borderColor: GAME_UI.ink,
    },
    image: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    actionContainer: {
        position: 'absolute',
        bottom: -8, // Hang off slightly
        right: -8, 
        left: 8,
        height: 36,
        alignItems: 'center',
    },
    addBtn: {
        backgroundColor: GAME_UI.primaryBtn, // Apricot
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
        ...GAME_UI.shadows.button,
        gap: 6,
        width: '90%',
    },
    addBtnText: {
        color: GAME_UI.ink,
        fontSize: 14,
        fontWeight: '900',
    },
    plusIcon: {
        // paddingLeft: 4,
    },
    counter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: GAME_UI.primaryBtn,
        borderRadius: 8,
        width: '90%',
        height: '100%',
        paddingHorizontal: 8,
        ...GAME_UI.shadows.button,
    },
    counterBtn: {
        width: 24,
        height: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    qtyText: {
        color: GAME_UI.ink,
        fontWeight: '900',
        fontSize: 16,
    },
});
