import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Skeleton } from '../ui/Skeleton';
import { GAME_UI, SPACING } from '../../constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const HomeSkeleton = () => {
    const insets = useSafeAreaInsets();

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* Header */}
            <View style={styles.headerSpacer}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.s }}>
                    <View>
                        <Skeleton width={130} height={20} borderRadius={4} style={{ marginBottom: 4 }} />
                        <Skeleton width={180} height={28} borderRadius={4} />
                    </View>
                    <Skeleton width={48} height={48} borderRadius={24} style={{ borderWidth: 2, borderColor: GAME_UI.ink }} />
                </View>
                
                {/* Search Bar Placeholder */}
                <Skeleton width="100%" height={56} borderRadius={12} style={{ borderWidth: 2, borderColor: GAME_UI.ink }} />
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
                {/* Hero Section */}
                <View style={styles.section}>
                    <Skeleton width="100%" height={220} borderRadius={16} style={{ borderWidth: 2.5, borderColor: GAME_UI.ink, borderBottomWidth: 5, borderRightWidth: 5 }} />
                </View>

                {/* Categories */}
                <View style={styles.section}>
                    <Skeleton width={100} height={24} borderRadius={4} style={{ marginBottom: SPACING.s, marginLeft: 4 }} />
                    <View style={{ flexDirection: 'row', gap: SPACING.s, overflow: 'hidden' }}>
                        {[1, 2, 3, 4].map((i) => (
                            <Skeleton key={i} width={100} height={38} borderRadius={8} style={{ borderWidth: 2, borderColor: GAME_UI.ink }} />
                        ))}
                    </View>
                </View>

                {/* Deals */}
                <View style={styles.section}>
                     <Skeleton width={180} height={24} borderRadius={4} style={{ marginBottom: SPACING.s, marginLeft: 4 }} />
                     <Skeleton width="90%" height={160} borderRadius={16} style={{ borderWidth: 2, borderColor: GAME_UI.ink, borderBottomWidth: 4, borderRightWidth: 4 }} />
                </View>

                {/* All Canteens List */}
                <View style={[styles.section, { marginBottom: 0 }]}>
                    <Skeleton width={140} height={24} borderRadius={4} style={{ marginBottom: SPACING.s, marginLeft: 4 }} />
                </View>
                
                <View style={{ paddingHorizontal: SPACING.m }}>
                    {[1, 2].map((i) => (
                        <View key={i} style={{ marginBottom: SPACING.l }}>
                            {/* Canteen Card Skeleton matching LiveCanteenCard */}
                            <View style={styles.card}>
                                {/* Image Area */}
                                <Skeleton width="100%" height={140} borderRadius={0} style={{ borderBottomWidth: 2, borderBottomColor: GAME_UI.ink }} />
                                {/* Content Area */}
                                <View style={{ padding: SPACING.m }}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                                        <Skeleton width={180} height={24} borderRadius={4} />
                                        <Skeleton width={40} height={20} borderRadius={4} />
                                    </View>
                                    <Skeleton width="100%" height={2} borderRadius={1} style={{ marginBottom: 12, opacity: 0.2 }} />
                                    <View style={{ flexDirection: 'row', gap: 8 }}>
                                        <Skeleton width={60} height={24} borderRadius={6} />
                                        <Skeleton width={80} height={24} borderRadius={6} />
                                    </View>
                                </View>
                            </View>
                        </View>
                    ))}
                </View>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: GAME_UI.background,
    },
    headerSpacer: {
        paddingHorizontal: SPACING.m,
        paddingBottom: SPACING.s,
    },
    section: {
        marginTop: SPACING.m,
        paddingHorizontal: SPACING.m,
        marginBottom: SPACING.l,
    },
    card: {
        borderRadius: 16,
        overflow: 'hidden',
        backgroundColor: GAME_UI.white,
        borderWidth: 2,
        borderColor: GAME_UI.ink,
        // Mock shadows match GAME_UI.shadows.md generally
        borderBottomWidth: 4,
        borderRightWidth: 4,
    }
});
