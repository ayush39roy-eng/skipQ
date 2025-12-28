import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { MotiView } from 'moti';
import { COLORS, SPACING, RADIUS, GAME_UI } from '../../constants/theme';
import { Leaf, Drumstick, ArrowUpNarrowWide, ArrowDownNarrowWide, ArrowUpDown } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

interface CanteenFilterBarProps {
    filterType: 'all' | 'veg' | 'non-veg';
    setFilterType: (type: 'all' | 'veg' | 'non-veg') => void;
    sortOrder: 'asc' | 'desc' | null;
    setSortOrder: (order: 'asc' | 'desc' | null) => void;
}

export const CanteenFilterBar = ({ filterType, setFilterType, sortOrder, setSortOrder }: CanteenFilterBarProps) => {

    const toggleFilter = (type: 'veg' | 'non-veg') => {
        Haptics.selectionAsync();
        // If tapping the same active filter, toggle off to 'all'
        if (filterType === type) {
            setFilterType('all');
        } else {
            setFilterType(type);
        }
    }

    const toggleSort = () => {
        Haptics.selectionAsync();
        if (sortOrder === null) {
            setSortOrder('asc');
        } else if (sortOrder === 'asc') {
            setSortOrder('desc');
        } else {
            setSortOrder(null);
        }
    }

    return (
        <View style={styles.container}>
            <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false} 
                contentContainerStyle={styles.scrollContent}
            >
                {/* Veg Filter */}
                <Pressable onPress={() => toggleFilter('veg')} style={styles.chipWrapper}>
                     <MotiView
                        animate={{
                            backgroundColor: filterType === 'veg' ? COLORS.success : GAME_UI.white,
                            scale: filterType === 'veg' ? 1.05 : 1,
                        }}
                        style={[styles.chip, filterType === 'veg' && { borderColor: GAME_UI.ink }]}
                     >
                        <Leaf size={14} color={filterType === 'veg' ? GAME_UI.white : GAME_UI.ink} strokeWidth={2.5} />
                        <Text style={[styles.text, filterType === 'veg' && { color: GAME_UI.white, fontWeight: '800' }]}>Veg</Text>
                     </MotiView>
                </Pressable>

                {/* Non-Veg Filter */}
                <Pressable onPress={() => toggleFilter('non-veg')} style={styles.chipWrapper}>
                     <MotiView
                        animate={{
                            backgroundColor: filterType === 'non-veg' ? COLORS.error : GAME_UI.white,
                            scale: filterType === 'non-veg' ? 1.05 : 1,
                        }}
                        style={[styles.chip, filterType === 'non-veg' && { borderColor: GAME_UI.ink }]}
                     >
                        <Drumstick size={14} color={filterType === 'non-veg' ? GAME_UI.white : GAME_UI.ink} strokeWidth={2.5} />
                        <Text style={[styles.text, filterType === 'non-veg' && { color: GAME_UI.white, fontWeight: '800' }]}>Non-Veg</Text>
                     </MotiView>
                </Pressable>

                {/* Price Sort */}
                <Pressable onPress={toggleSort} style={styles.chipWrapper}>
                     <MotiView
                        animate={{
                            backgroundColor: sortOrder ? GAME_UI.primaryBtn : GAME_UI.white,
                        }}
                        style={[styles.chip, sortOrder && { borderColor: GAME_UI.ink }]}
                     >
                        {sortOrder === 'asc' && <ArrowUpNarrowWide size={14} color={GAME_UI.ink} strokeWidth={2.5} />}
                        {sortOrder === 'desc' && <ArrowDownNarrowWide size={14} color={GAME_UI.ink} strokeWidth={2.5} />}
                        {!sortOrder && <ArrowUpDown size={14} color={GAME_UI.ink} />}
                        <Text style={[styles.text, sortOrder && { color: GAME_UI.ink, fontWeight: '800' }]}>
                            Price
                        </Text>
                     </MotiView>
                </Pressable>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: GAME_UI.background,
        paddingBottom: SPACING.s, // Add some bottom padding
    },
    scrollContent: {
        paddingHorizontal: SPACING.m,
        gap: 8,
    },
    chipWrapper: {
        // Wrapper for pressable
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
        gap: 8,
        backgroundColor: GAME_UI.white,
        ...GAME_UI.shadows.sm, // Apply shadow by default
    },
    text: {
        fontSize: 13,
        color: COLORS.textDark,
        fontWeight: '500',
    }
});
