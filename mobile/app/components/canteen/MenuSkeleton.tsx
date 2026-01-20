import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Skeleton } from '../ui/Skeleton';
import { GAME_UI, SPACING } from '../../constants/theme';

export const MenuSkeleton = () => {
    return (
        <View style={styles.container}>
            {/* Header / Filter Bar Placeholder */}
            {/* Note: The real screen has a collapsing header, but for loading state just showing the list part is often cleaner */}
             <View style={{ height: 280, backgroundColor: GAME_UI.white, borderBottomWidth: 2, borderBottomColor: GAME_UI.ink, marginBottom: SPACING.l }}>
                 {/* Fake Canteen Header Image */}
                 <Skeleton width="100%" height={200} borderRadius={0} />
                 <View style={{ padding: SPACING.m }}>
                     <Skeleton width={200} height={32} borderRadius={4} />
                 </View>
             </View>

            {/* Menu Items Skeleton */}
            <View style={styles.list}>
                {[1, 2, 3, 4].map((key) => (
                    <View key={key} style={styles.itemCard}>
                        {/* Info Section */}
                        <View style={{ flex: 1, paddingRight: SPACING.m }}>
                            <Skeleton width={16} height={16} borderRadius={4} style={{ marginBottom: 6, borderWidth: 2, borderColor: GAME_UI.ink }} />
                            <Skeleton width="80%" height={20} borderRadius={4} style={{ marginBottom: 6 }} />
                            <Skeleton width={60} height={18} borderRadius={4} style={{ marginBottom: 8 }} />
                            <Skeleton width="100%" height={12} borderRadius={4} />
                        </View>
                        
                        {/* Image Wrapper */}
                        <View style={styles.imageWrapper}>
                             <Skeleton width="100%" height="100%" borderRadius={0} />
                             {/* Add Button */}
                             <Skeleton width="90%" height={36} borderRadius={8} style={{ position: 'absolute', bottom: -18, alignSelf: 'center', borderWidth: 2, borderColor: GAME_UI.ink, backgroundColor: GAME_UI.primaryBtn }} />
                        </View>
                    </View>
                ))}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: GAME_UI.background,
    },
    list: {
        paddingHorizontal: SPACING.m,
    },
    itemCard: {
        flexDirection: 'row',
        backgroundColor: GAME_UI.white,
        borderRadius: 12,
        padding: SPACING.m,
        marginBottom: SPACING.m,
        borderWidth: 2, // Shadow SM
        borderColor: GAME_UI.ink,
        borderBottomWidth: 4,
        borderRightWidth: 4,
    },
    imageWrapper: {
        width: 100,
        height: 100,
        borderRadius: 8,
        overflow: 'visible', // allow button hang
        borderWidth: 2,
        borderColor: GAME_UI.ink,
        backgroundColor: GAME_UI.secondary,
        marginBottom: 10 // Space for hanging button
    }
});
