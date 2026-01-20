import { useState } from 'react';
import { View, Text, StyleSheet, FlatList, Image, Pressable } from 'react-native';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../../constants/theme';
import { Plus, Utensils } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

export interface UpsellItem {
    id: string;
    name: string;
    price: number;
    imageUrl?: string;
    description?: string;
    quantity?: number;
    metadata?: Record<string, unknown>;
}

const MOCK_UPSELL: UpsellItem[] = [
    { id: 'u1', name: 'Coke Zero', price: 40, imageUrl: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=500&q=80' },
    { id: 'u2', name: 'Brownie', price: 80, imageUrl: 'https://images.unsplash.com/photo-1577555613309-84725350325f?w=500&q=80' },
    { id: 'u3', name: 'Fries', price: 60, imageUrl: 'https://images.unsplash.com/photo-1541592106381-b31e9674c96a?w=500&q=80' },
];

const UpsellImage = ({ uri }: { uri?: string }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(false);

    if (error || !uri) {
        return (
            <View style={[styles.image, styles.centerAuth]}>
                <Utensils size={24} color={COLORS.textMuted} />
            </View>
        );
    }

    return (
        <View>
            <Image
                source={{ uri }}
                style={styles.image}
                onLoadStart={() => setIsLoading(true)}
                onLoadEnd={() => setIsLoading(false)}
                onError={() => setError(true)}
            />
            {isLoading && (
                <View style={[styles.image, styles.loadingOverlay]} />
            )}
        </View>
    );
};

export const CartUpsell = ({ onAdd }: { onAdd: (item: UpsellItem) => void }) => {
    return (
        <View style={styles.container}>
            <View style={styles.titleRow}>
                <Text style={styles.title}>Make it a meal?</Text>
                <Text style={styles.subtitle}>Suggested for you</Text>
            </View>

            <FlatList
                horizontal
                data={MOCK_UPSELL}
                keyExtractor={item => item.id}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: SPACING.m }}
                renderItem={({ item }) => (
                    <View style={styles.card}>
                        <UpsellImage uri={item.imageUrl} />
                        <View style={styles.content}>
                            <Text style={styles.name}>{item.name}</Text>
                            <Text style={styles.price}>₹{item.price}</Text>
                            <Pressable
                                onPress={() => {
                                    Haptics.selectionAsync();
                                    onAdd(item);
                                }}
                                style={styles.addBtn}
                            >
                                <Text style={styles.addText}>ADD</Text>
                                <Plus size={12} color={COLORS.primary} strokeWidth={3} />
                            </Pressable>
                        </View>
                    </View>
                )}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginTop: SPACING.l,
        marginBottom: SPACING.m,
    },
    titleRow: {
        paddingHorizontal: SPACING.m,
        marginBottom: SPACING.m,
    },
    title: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.textDark,
    },
    subtitle: {
        fontSize: 12,
        color: COLORS.textMuted,
    },
    card: {
        width: 140,
        backgroundColor: COLORS.white,
        borderRadius: RADIUS.m,
        marginRight: SPACING.m,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.03)',
        ...SHADOWS.light,
    },
    image: {
        width: '100%',
        height: 80,
        resizeMode: 'cover',
    },
    content: {
        padding: 8,
    },
    name: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.textDark,
        marginBottom: 2,
    },
    price: {
        fontSize: 13,
        color: COLORS.textMuted,
        marginBottom: 8,
    },
    addBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 196, 140, 0.1)',
        paddingVertical: 6,
        borderRadius: RADIUS.s,
        gap: 4,
    },
    addText: {
        fontSize: 10,
        fontWeight: '800',
        color: COLORS.primary,
    },
    loadingOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: COLORS.lightBg,
    },
    centerAuth: {
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.lightBg,
    }
});
