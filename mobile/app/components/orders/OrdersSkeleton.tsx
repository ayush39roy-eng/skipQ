import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Skeleton } from '../ui/Skeleton';
import { GAME_UI, SPACING } from '../../constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const OrdersSkeleton = () => {
    const insets = useSafeAreaInsets();
    
    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* Header */}
            <View style={{ padding: SPACING.l, paddingBottom: SPACING.m }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Skeleton width={160} height={32} borderRadius={4} />
                    <Skeleton width={40} height={40} borderRadius={20} style={{ borderWidth: 2, borderColor: GAME_UI.ink }} />
                </View>
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
                {/* Live Section (Optional in real app, but good to have placeholder space) */}
                <View style={styles.section}>
                     {/* Title */}
                     <Skeleton width={140} height={24} borderRadius={4} style={{ marginBottom: SPACING.m }} />
                     {/* Live Card */}
                     <Skeleton width="100%" height={100} borderRadius={12} style={{ borderWidth: 2, borderColor: GAME_UI.ink, borderBottomWidth: 4, borderRightWidth: 4 }} />
                </View>

                {/* Past Orders Section */}
                <View style={styles.section}>
                    <Skeleton width={160} height={24} borderRadius={4} style={{ marginBottom: SPACING.m }} />
                    
                    {/* Filters */}
                    <View style={{ flexDirection: 'row', gap: 8, marginBottom: SPACING.l }}>
                         {[1, 2, 3].map(i => (
                             <Skeleton key={i} width={70} height={32} borderRadius={16} style={{ borderWidth: 2, borderColor: GAME_UI.ink }} />
                         ))}
                    </View>

                    {/* Past Order Cards */}
                    {[1, 2, 3, 4].map((i) => (
                        <View key={i} style={styles.row}>
                             {/* Timeline Column */}
                            <View style={styles.timelineColumn}>
                                <Skeleton width={12} height={12} borderRadius={2} style={{ backgroundColor: GAME_UI.ink }} />
                                <Skeleton width={2} height={60} borderRadius={0} style={{ marginTop: 4, backgroundColor: GAME_UI.ink }} />
                            </View>

                            {/* Card content */}
                            <View style={styles.card}>
                                <View style={{ flexDirection: 'row', gap: SPACING.m }}>
                                    {/* Image */}
                                    <Skeleton width={60} height={60} borderRadius={8} style={{ borderWidth: 1, borderColor: GAME_UI.ink }} />
                                    
                                    {/* Text Info */}
                                    <View style={{ flex: 1, justifyContent: 'center' }}>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                                            <Skeleton width={120} height={18} borderRadius={4} />
                                            <Skeleton width={50} height={18} borderRadius={4} />
                                        </View>
                                        <Skeleton width={80} height={14} borderRadius={4} style={{ marginBottom: 6 }} />
                                        <Skeleton width={100} height={14} borderRadius={4} />
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
    section: {
        paddingHorizontal: SPACING.l,
        marginBottom: SPACING.l,
    },
    row: {
        flexDirection: 'row',
        marginBottom: SPACING.m,
    },
    timelineColumn: {
        alignItems: 'center',
        width: 24,
        marginRight: SPACING.s,
        paddingTop: SPACING.m, // Align dot with card top
    },
    card: {
        flex: 1,
        backgroundColor: GAME_UI.white,
        borderRadius: 12,
        padding: SPACING.m,
        borderWidth: 1, // PastOrderCard uses shadows.sm which has border
        borderColor: 'rgba(0,0,0,0.1)', // Simulating shadow.sm
        // Actual styling from PastOrderCard is shadow.sm, let's approximate
        borderBottomWidth: 3,
        borderRightWidth: 3,
        borderColor: GAME_UI.ink,
        marginTop: 0
    }
});
