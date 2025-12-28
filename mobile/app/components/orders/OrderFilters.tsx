import React from 'react';
import { ScrollView, Text, StyleSheet, Pressable } from 'react-native';
import { MotiView } from 'moti';
import { COLORS, SPACING, RADIUS } from '../../constants/theme';

interface OrderFiltersProps {
    selected: string;
    onSelect: (filter: string) => void;
}

const FILTERS = ['All', 'Live', 'Past Week', 'Last Month'];

export const OrderFilters = ({ selected, onSelect }: OrderFiltersProps) => {
    return (
        <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.container}
            style={styles.scroll}
        >
            {FILTERS.map((filter) => {
                const isSelected = selected === filter;
                return (
                    <Pressable key={filter} onPress={() => onSelect(filter)}>
                        <MotiView
                            animate={{
                                backgroundColor: isSelected ? COLORS.primary : COLORS.white,
                                borderColor: isSelected ? COLORS.primary : COLORS.textMutedLight,
                            }}
                            transition={{ type: 'timing', duration: 200 }}
                            style={styles.chip}
                        >
                            <Text style={[
                                styles.text,
                                { color: isSelected ? COLORS.white : COLORS.textMutedDark }
                            ]}>
                                {filter}
                            </Text>
                        </MotiView>
                    </Pressable>
                );
            })}
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    scroll: {
        flexGrow: 0,
    },
    container: {
        paddingHorizontal: SPACING.l,
        paddingVertical: SPACING.m,
        gap: SPACING.s,
    },
    chip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: RADIUS.full,
        borderWidth: 1,
        marginRight: 8,
    },
    text: {
        fontSize: 13,
        fontWeight: '600',
    }
});
