import React, { memo } from 'react';
import { View, Text, StyleSheet, Pressable, Image } from 'react-native';
import { RotateCcw } from 'lucide-react-native';
import { MotiView } from 'moti';
import { COLORS, SPACING, RADIUS, GAME_UI } from '../../constants/theme';

interface PastOrderCardProps {
    order: {
        id: string;
        vendorName: string;
        date: string;
        total: number;
        items: string[];
        image?: string;
    };
    isLast: boolean;
}

export const PastOrderCard = memo(({ order, isLast }: PastOrderCardProps) => {
    return (
        <View style={styles.row}>
            {/* Timeline Left */}
            <View style={styles.timelineColumn}>
                <View style={styles.dot} />
                {!isLast && <View style={styles.line} />}
            </View>

            {/* Content Right */}
            <Pressable style={({ pressed }) => [
                styles.card,
                pressed && { opacity: 0.8 }
            ]}>
                <MotiView
                    from={{ opacity: 0, translateX: 20 }}
                    animate={{ opacity: 1, translateX: 0 }}
                    transition={{ type: 'timing', duration: 400 }}
                    style={styles.cardContent}
                >
                    {/* Image Thumbnail */}
                    <View style={styles.imageWrapper}>
                        <Image
                            source={{ uri: order.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c' }}
                            style={styles.image}
                        />
                    </View>

                    <View style={styles.info}>
                        <View style={styles.topRow}>
                            <Text style={styles.vendorName}>{order.vendorName}</Text>
                            <Text style={styles.price}>₹{order.total}</Text>
                        </View>
                        <Text style={styles.date}>{order.date}</Text>
                        <Text style={styles.items} numberOfLines={1}>{order.items.join(', ')}</Text>

                        {/* Reorder Button */}
                        <Pressable style={styles.reorderBtn}>
                            <RotateCcw size={12} color={GAME_UI.ink} strokeWidth={3} />
                            <Text style={styles.reorderText}>Reorder</Text>
                        </Pressable>
                    </View>
                </MotiView>
            </Pressable>
        </View>
    );
});

const styles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        paddingHorizontal: SPACING.l,
    },
    timelineColumn: {
        alignItems: 'center',
        width: 24,
        marginRight: SPACING.s,
    },
    dot: {
        width: 12,
        height: 12,
        borderRadius: 2, // Square dot
        backgroundColor: GAME_UI.ink,
        marginTop: 24, // Align with card top content
    },
    line: {
        flex: 1,
        width: 2,
        backgroundColor: GAME_UI.ink, // Bold connector
        marginTop: 4,
        marginBottom: 4,
    },
    card: {
        flex: 1,
        backgroundColor: GAME_UI.white,
        borderRadius: 12,
        marginBottom: SPACING.m,
        padding: SPACING.m,
        ...GAME_UI.shadows.sm,
    },
    cardContent: {
        flexDirection: 'row',
        gap: SPACING.m,
    },
    imageWrapper: {
        width: 60,
        height: 60,
        borderRadius: 8,
        backgroundColor: GAME_UI.secondary,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: GAME_UI.ink,
    },
    image: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    info: {
        flex: 1,
        justifyContent: 'center',
    },
    topRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 2,
    },
    vendorName: {
        fontSize: 15,
        fontWeight: '900',
        color: GAME_UI.ink,
        textTransform: 'uppercase',
    },
    price: {
        fontSize: 15,
        fontWeight: '900',
        color: GAME_UI.ink,
    },
    date: {
        fontSize: 12,
        color: GAME_UI.ink,
        marginBottom: 6,
        fontWeight: '600',
    },
    items: {
        fontSize: 13,
        color: GAME_UI.ink,
        marginBottom: 8,
        opacity: 0.7,
    },
    reorderBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        gap: 6,
        paddingVertical: 6,
        paddingHorizontal: 12,
        backgroundColor: GAME_UI.white,
        borderRadius: 4,
        ...GAME_UI.shadows.sm,
    },
    reorderText: {
        fontSize: 12,
        fontWeight: '900',
        color: GAME_UI.ink,
        textTransform: 'uppercase',
    }
});
