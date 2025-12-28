import { View, StyleSheet, FlatList, ActivityIndicator, Text, Pressable, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { getCanteens } from '../api/canteens';
import { useState, useCallback } from 'react';
import * as Haptics from 'expo-haptics';
import { COLORS, SPACING, GAME_UI } from '../constants/theme';
import { HomeHeader } from '../components/home/HomeHeader';
import { HeroSection } from '../components/home/HeroSection';
import { CategoryRail } from '../components/home/CategoryRail';
import { DealsCarousel } from '../components/home/DealsCarousel';
import { LiveCanteenCard } from '../components/home/LiveCanteenCard';

import { StickyCartBar } from '../components/canteen/StickyCartBar';
import { useCart } from '../context/CartContext';
import Animated, { FadeIn } from 'react-native-reanimated';

export default function HomeScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();
  const { items: cartItems, total } = useCart();

  const { data: canteens, isLoading, error, refetch } = useQuery({
    queryKey: ['canteens'],
    queryFn: getCanteens
  });

  const onRefresh = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  if (isLoading) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={COLORS.primary} />
      <Text style={styles.loadingText}>Curating your menu...</Text>
    </View>
  );

  if (error) return (
    <View style={styles.center}>
      <Text style={styles.error}>Could not load canteens.</Text>
      <Pressable style={styles.retryBtn} onPress={() => refetch()}>
        <Text style={styles.retryText}>Retry</Text>
      </Pressable>
    </View>
  );

  const renderHeader = () => (
    <View style={styles.headerSpacer}>
      <HomeHeader />
      <HeroSection onPress={() => router.push('/(app)/cart')} />

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>For You</Text>
        <CategoryRail />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Deals of the Hour</Text>
        <DealsCarousel />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>All Canteens</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={canteens}
        keyExtractor={(item: any) => item.id}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeIn.delay(Math.min(index * 100 + 400, 1200)).duration(500)}>
            <LiveCanteenCard
              item={item}
              index={index}
              onPress={() => router.push(`/(app)/canteen?id=${item.id}`)}
            />
          </Animated.View>
        )}        ItemSeparatorComponent={() => <View style={{ height: SPACING.m }} />}
        style={styles.list}
      />


      <StickyCartBar itemCount={cartItems.length} total={total} hasTabBar={true} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: GAME_UI.background },
  list: { paddingHorizontal: SPACING.m }, // Consistent padding
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.lightBg },
  loadingText: { color: COLORS.textMutedDark, marginTop: 12, fontSize: 16 },
  error: { color: COLORS.error, fontSize: 16, marginBottom: 12 },
  retryBtn: { paddingHorizontal: 20, paddingVertical: 10, backgroundColor: COLORS.cardDark, borderRadius: 8 },
  retryText: { color: COLORS.white },

  headerSpacer: { marginBottom: 4 },
  section: { marginTop: SPACING.m },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textDark, marginBottom: SPACING.s, paddingHorizontal: SPACING.xs },
});

