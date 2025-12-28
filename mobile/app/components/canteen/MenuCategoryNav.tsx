import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import Animated, { Layout, FadeIn } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../../constants/theme';
import { MotiView } from 'moti';

interface MenuCategoryNavProps {
    categories: any[];
    selectedCategory: string;
    onSelect: (id: string) => void;
}

export const MenuCategoryNav = ({ categories, selectedCategory, onSelect }: MenuCategoryNavProps) => {
    return (
        <View style={styles.container}>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {categories.map((cat, index) => {
                    const isSelected = selectedCategory === cat.id;

                    return (
                        <Pressable
                            key={cat.id}
                            onPress={() => {
                                Haptics.selectionAsync();
                                onSelect(cat.id);
                            }}
                            style={{ marginRight: SPACING.s }}
                        >
                            <MotiView
                                animate={{
                                    scale: isSelected ? 1 : 0.95,
                                    opacity: isSelected ? 1 : 0.7,
                                }}
                                transition={{ type: 'spring', damping: 15 }}
                            >
                                {isSelected ? (
                                    <LinearGradient
                                        colors={COLORS.primaryGradient}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                        style={styles.pill}
                                    >
                                        <Text style={[styles.text, styles.textSelected]}>
                                            {cat.name}
                                        </Text>
                                    </LinearGradient>
                                ) : (
                                    <View style={[styles.pill, styles.pillInactive]}>
                                        <Text style={styles.text}>
                                            {cat.name}
                                        </Text>
                                    </View>
                                )}
                            </MotiView>
                        </Pressable>
                    );
                })}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: COLORS.lightBg,
        paddingVertical: SPACING.s,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.03)',
    },
    scrollContent: {
        paddingHorizontal: SPACING.m,
    },
    pill: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: RADIUS.full,
        justifyContent: 'center',
        alignItems: 'center',
    },
    pillInactive: {
        backgroundColor: COLORS.accent, // Soft Tint
        borderWidth: 1,
        borderColor: 'rgba(0, 196, 140, 0.1)', // Subtle mint border
    },
    text: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.textMutedDark,
    },
    textSelected: {
        color: COLORS.white,
        fontWeight: '700',
    },
});
