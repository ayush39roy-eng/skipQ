import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { MotiView } from 'moti';
import { COLORS, RADIUS, SPACING, GAME_UI } from '../../constants/theme';
import { useState } from 'react';
import * as Haptics from 'expo-haptics';

const CATEGORIES = [
    { id: 'all', label: '🔥 Trending' },
    { id: 'healthy', label: '🥗 Healthy' },
    { id: 'comfort', label: '🍔 Comfort' },
    { id: 'sips', label: '🥤 Sips' },
    { id: 'dessert', label: '🍩 Sweet' },
];

type CategoryRailProps = {
    onSelect?: (id: string) => void;
};

export const CategoryRail = ({ onSelect }: CategoryRailProps = {}) => {
    const [selected, setSelected] = useState('all');

    return (
        <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.container}
        >
            {CATEGORIES.map((cat, index) => {
                const isSelected = selected === cat.id;

                return (
                    <Pressable
                        key={cat.id}
                        accessible={true}
                        accessibilityRole="button"
                        accessibilityLabel={`Category: ${cat.label}`}
                        accessibilityHint="Double tap to select this category"
                        accessibilityState={{ selected: isSelected }}
                        onPress={() => {
                            Haptics.selectionAsync();
                            setSelected(cat.id);
                            if (onSelect) onSelect(cat.id);
                        }}
                        style={{ marginRight: SPACING.s }}
                    >
                        <MotiView
                            animate={{
                                backgroundColor: isSelected ? GAME_UI.primaryBtn : GAME_UI.white,
                                scale: isSelected ? 1.05 : 1,
                                borderWidth: 2,
                                borderColor: GAME_UI.ink,
                            }}
                            transition={{
                                type: 'spring',
                                stiffness: 200,
                                damping: 15,
                            }}
                            style={[
                                styles.pill, 
                                isSelected ? GAME_UI.shadows.sm : null
                            ]}
                        >
                            <Text
                                style={[
                                    styles.text,
                                    { color: GAME_UI.ink }
                                ]}
                            >
                                {cat.label}
                            </Text>
                        </MotiView>
                    </Pressable>
                );
            })}
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: { paddingHorizontal: SPACING.m, paddingVertical: SPACING.s },
    pill: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
        borderWidth: 2,
        borderColor: GAME_UI.ink,
        backgroundColor: GAME_UI.white,
    },
    text: { fontWeight: '800', fontSize: 13, textTransform: 'uppercase' },
});
