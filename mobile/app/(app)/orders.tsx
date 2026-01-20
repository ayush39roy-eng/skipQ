import { View, Text, StyleSheet, FlatList, RefreshControl, ActivityIndicator } from 'react-native';
import { OrdersSkeleton } from '../components/orders/OrdersSkeleton';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { useState, useCallback } from 'react';
import { COLORS, SPACING, GAME_UI } from '../constants/theme';
import { OrdersHeader } from '../components/orders/OrdersHeader';
import { LiveOrderCard } from '../components/orders/LiveOrderCard';
import { PastOrderCard } from '../components/orders/PastOrderCard';
import { OrderFilters } from '../components/orders/OrderFilters';
import { api } from '../services/api';

export default function OrdersScreen() {
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState('All');
  const { data: orders = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['my-orders'],
    queryFn: api.getMyOrders,
    select: (data) => {
      if (!data) return [];
      return data
        .map((o: any) => {
          const created = new Date(o.createdAt);
          const isValidDate = !isNaN(created.getTime());
          const timestamp = isValidDate ? created.getTime() : 0;
          const dateStr = isValidDate
            ? created.toLocaleDateString() + ' ' + created.toLocaleTimeString()
            : 'Unknown Date';

          return {
            id: o.id,
            canteen: o.canteen?.name || 'Unknown Canteen',
            items: o.items?.map((i: any) => `${i.quantity}x ${i.menuItem.name}`) || [],
            total: (o.totalCents ?? 0) / 100,
            status: o.fulfillmentStatus || 'PENDING',
            date: dateStr,
            timestamp,
            rating: o.rating ?? 0,
            raw: o,
          };
        })
        .sort((a: any, b: any) => b.timestamp - a.timestamp);
    }
  });

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  // Separate Live and Past
  const liveOrders = orders.filter((o: any) => ['PENDING', 'PREPARING', 'READY'].includes(o.status));
  const pastOrders = orders.filter((o: any) => !['PENDING', 'PREPARING', 'READY'].includes(o.status));

  const renderHeader = () => (
    <View>
      <OrdersHeader />
      {liveOrders.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Live Updates</Text>
          {liveOrders.map((order: any) => (
            <LiveOrderCard
              key={order.id}
              order={order}
              onPress={() => router.push({ pathname: '/(app)/order-details/[id]', params: { id: order.id } })}
            />
          ))}
        </View>
      )}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>PAST ORDERS</Text>
        <OrderFilters selected={activeFilter} onSelect={setActiveFilter} />
      </View>
    </View>
  );

  if (isLoading && !isRefetching) {
    return (
      <OrdersSkeleton />
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <FlatList
        data={pastOrders}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <PastOrderCard 
            order={item} 
            isLast={index === pastOrders.length - 1} 
            onPress={() => router.push({ pathname: '/(app)/order-details/[id]', params: { id: item.id } })}
          />
        )}
        contentContainerStyle={styles.scrollContent}
        ListHeaderComponent={renderHeader}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor={COLORS.primary} />
        }
        ListEmptyComponent={
          !isLoading ? (
            <Text style={{ textAlign: 'center', color: COLORS.textMuted, marginTop: 20 }}>
              No past orders found.
            </Text>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: GAME_UI.background,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  section: {
    paddingHorizontal: SPACING.l,
    marginBottom: SPACING.l,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: GAME_UI.ink,
    marginBottom: SPACING.m,
    textTransform: 'uppercase',
  },
});
