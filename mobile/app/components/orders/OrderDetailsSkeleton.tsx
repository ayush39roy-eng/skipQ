import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Skeleton } from '../ui/Skeleton';
import { GAME_UI, SPACING } from '../../constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const OrderDetailsSkeleton = () => {
    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Skeleton width={40} height={40} borderRadius={20} />
                <Skeleton width={140} height={24} borderRadius={4} />
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                {/* Hero Status Card */}
                <View style={styles.heroCard}>
                    <Skeleton width={72} height={72} borderRadius={12} style={{ marginBottom: SPACING.m, borderWidth: 2.5, borderColor: GAME_UI.ink }} />
                    <Skeleton width={180} height={28} borderRadius={4} style={{ marginBottom: 4 }} />
                    <Skeleton width={100} height={16} borderRadius={4} style={{ marginBottom: SPACING.l }} />
                    
                    {/* Progress Bar */}
                    <Skeleton width="100%" height={12} borderRadius={6} style={{ borderWidth: 2, borderColor: GAME_UI.ink }} />
                </View>
                
                {/* Timeline */}
                <View style={styles.section}>
                    <Skeleton width={140} height={16} borderRadius={4} style={{ marginBottom: SPACING.m, marginLeft: 4 }} />
                    <View style={{ paddingLeft: 8 }}>
                        {[1, 2, 3, 4].map((i) => (
                            <View key={i} style={{ flexDirection: 'row', marginBottom: SPACING.l }}>
                                <View style={{ alignItems: 'center', marginRight: SPACING.m }}>
                                    <Skeleton width={24} height={24} borderRadius={6} style={{ borderWidth: 2.5, borderColor: GAME_UI.ink }} />
                                    {i < 4 && <Skeleton width={2.5} height={30} borderRadius={0} style={{ position: 'absolute', top: 26, backgroundColor: GAME_UI.ink }} />} 
                                </View>
                                <View style={{ paddingTop: 2 }}>
                                    <Skeleton width={100} height={16} borderRadius={4} style={{ marginBottom: 4 }} />
                                    <Skeleton width={60} height={12} borderRadius={4} />
                                </View>
                            </View>
                        ))}
                    </View>
                </View>

                {/* Items List */}
                <View style={styles.section}>
                    <Skeleton width={140} height={16} borderRadius={4} style={{ marginBottom: SPACING.m, marginLeft: 4 }} />
                    <View style={styles.itemsCard}>
                        {[1, 2].map((i) => (
                            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.m }}>
                                <Skeleton width={32} height={24} borderRadius={4} style={{ marginRight: SPACING.s, borderWidth: 2, borderColor: GAME_UI.ink }} />
                                <Skeleton width={150} height={16} borderRadius={4} style={{ flex: 1 }} />
                                <Skeleton width={50} height={16} borderRadius={4} />
                            </View>
                        ))}
                    </View>
                </View>

                {/* Bill Details */}
                <View style={styles.section}>
                    <Skeleton width={120} height={16} borderRadius={4} style={{ marginBottom: SPACING.m, marginLeft: 4 }} />
                    <View style={styles.itemsCard}>
                         <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: SPACING.s, borderTopWidth: 2.5, borderTopColor: GAME_UI.ink }}>
                             <Skeleton width={100} height={20} borderRadius={4} />
                             <Skeleton width={80} height={20} borderRadius={4} />
                         </View>
                    </View>
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
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 60,
        paddingHorizontal: SPACING.l,
        paddingBottom: SPACING.m,
        backgroundColor: GAME_UI.white,
        borderBottomWidth: 2,
        borderBottomColor: GAME_UI.ink,
        // Mock shadow md
        borderRightWidth: 0,
    },
    content: {
        padding: SPACING.l,
        paddingBottom: 40,
    },
    heroCard: {
        backgroundColor: GAME_UI.white,
        borderRadius: 12,
        padding: SPACING.xl,
        alignItems: 'center',
        marginBottom: SPACING.xl,
        borderWidth: 2.5,
        borderColor: GAME_UI.ink,
        // Shadow MD
        borderBottomWidth: 5,
        borderRightWidth: 5,
    },
    section: {
        marginBottom: SPACING.xl,
    },
    itemsCard: {
        backgroundColor: GAME_UI.white,
        borderRadius: 12,
        padding: SPACING.m,
        borderWidth: 2, // Shadow SM (approx)
        borderColor: GAME_UI.ink,
        borderBottomWidth: 3,
        borderRightWidth: 3,
    }
});
