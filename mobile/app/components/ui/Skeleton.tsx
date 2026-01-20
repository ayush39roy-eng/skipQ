import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { MotiView } from 'moti';
import { GAME_UI } from '../../constants/theme';

import { DimensionValue } from 'react-native';

interface SkeletonProps {
    width?: DimensionValue;
    height?: DimensionValue;
    borderRadius?: number;
    style?: ViewStyle;
}

export const Skeleton: React.FC<SkeletonProps> = ({ 
    width = '100%', 
    height = 20, 
    borderRadius = 4, 
    style 
}) => {
    return (
        <MotiView
            from={{ opacity: 0.5 }}
            animate={{ opacity: 1 }}
            transition={{
                type: 'timing',
                duration: 1000,
                loop: true,
            }}
            style={[
                styles.skeleton, 
                { width, height, borderRadius }, 
                style
            ]}
        />
    );
};

const styles = StyleSheet.create({
    skeleton: {
        backgroundColor: '#E2E8F0', // Light gray/slate-200
        borderWidth: 2,
        borderColor: GAME_UI.ink, // Keep the brutalist border
    }
});
