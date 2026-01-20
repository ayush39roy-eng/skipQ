import { View, Text, StyleSheet, SectionList } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { getMenu } from '../api/canteens';
import { useCart } from '../context/CartContext';
import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import Animated, {
  useAnimatedScrollHandler,
  useSharedValue,
  useAnimatedStyle,
  interpolate,
  Extrapolation,
  withTiming
} from 'react-native-reanimated';
import { StatusBar } from 'expo-status-bar';
import { COLORS, SPACING, GAME_UI } from '../constants/theme';
import { CanteenHeader } from '../components/canteen/CanteenHeader';
import { MenuCategoryNav } from '../components/canteen/MenuCategoryNav';
import { MenuItemCard } from '../components/canteen/MenuItemCard';
import { StickyCartBar } from '../components/canteen/StickyCartBar';
import { ChevronLeft } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { Pressable } from 'react-native';
import { CanteenFilterBar } from '../components/canteen/CanteenFilterBar';
import { MenuSkeleton } from '../components/canteen/MenuSkeleton';

const AnimatedSectionList = Animated.createAnimatedComponent(SectionList);
const HEADER_HEIGHT = 280;

export default function CanteenScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { addItem, removeItem, items: cartItems, total } = useCart();
  const scrollY = useSharedValue(0);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [filterType, setFilterType] = useState<'all' | 'veg' | 'non-veg'>('all');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | null>(null);
  const sectionListRef = useRef<any>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['menu', id],
    queryFn: () => getMenu(id as string),
    enabled: !!id
  });

  const scrollHandler = useAnimatedScrollHandler(event => {
    scrollY.value = event.contentOffset.y;
  });

  // Sticky Category Bar Animation (Fade in when scrolling past header)
  const stickyNavStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollY.value,
      [HEADER_HEIGHT - 60, HEADER_HEIGHT], // Fade in just before header is gone
      [0, 1],
      Extrapolation.CLAMP
    );
    return {
      opacity,
      transform: [
        { translateY: interpolate(scrollY.value, [HEADER_HEIGHT - 60, HEADER_HEIGHT], [-20, 0], Extrapolation.CLAMP) }
      ],
      zIndex: 10
    };
  });

  const handleAddItem = useCallback((item: any) => {
    if (!data?.canteen) return;
    const vendorSettings = data.canteen.vendor || {};
    addItem({ 
      id: item.id, 
      name: item.name, 
      price: item.priceCents / 100, 
      canteenId: data.canteen.id, 
      canteenName: data.canteen.name,
      selfOrderFeeRate: vendorSettings.selfOrderFeeRate ?? 0.015,
      preOrderFeeRate: vendorSettings.preOrderFeeRate ?? 0.03
    });
  }, [addItem, data]);

  const handleRemoveItem = useCallback((itemId: string) => {
    removeItem(itemId);
  }, [removeItem]);

  // 2. Sort
  const processedItems = useMemo(() => {
    if (!data || !data.items) return [];
    let result = [...data.items];

    if (filterType === 'veg') {
      result = result.filter((item: any) => item.isVeg);
    } else if (filterType === 'non-veg') {
      result = result.filter((item: any) => !item.isVeg);
    }

    if (sortOrder) {
      result.sort((a: any, b: any) => {
        if (sortOrder === 'asc') return a.priceCents - b.priceCents;
        return b.priceCents - a.priceCents;
      });
    }
    return result;
  }, [data, filterType, sortOrder]);

  // 3. Prepare Sections Data Safe Calculation
  const sectionsData = useMemo(() => {
    if (!data?.sections || !processedItems) return [];
    
    // validSectionIds
    const validSectionIds = new Set(data.sections.map((s: any) => s.id));
    
    // Main sections
    let result = data.sections.map((section: any) => ({
      id: section.id,
      title: section.name,
      data: processedItems.filter((item: any) => item.sectionId === section.id)
    })).filter((s: any) => s.data.length > 0);

    // Other items
    const otherItems = processedItems.filter((item: any) => !item.sectionId || !validSectionIds.has(item.sectionId));
    if (otherItems.length > 0) {
      result.push({ id: 'other', title: 'Other Items', data: otherItems });
    }
    
    return result;
  }, [data, processedItems]);

  // Initialize selected category if empty
  useEffect(() => {
    if (!selectedCategory && sectionsData.length > 0) {
      setSelectedCategory(sectionsData[0].id);
    }
  }, [selectedCategory, sectionsData]);

  if (isLoading) {
    return (
      <MenuSkeleton />
    );
  }

  if (error || !data) {
    return (
      <View style={styles.center}>
        <StatusBar style="dark" />
        <Text style={[styles.loadingText, { color: '#ef4444' }]}>
          {error ? `Error: ${(error as Error).message}` : 'Canteen not found'}
        </Text>
        <Pressable onPress={() => router.back()} style={{ marginTop: 20 }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: GAME_UI.ink }}>Go Back</Text>
        </Pressable>
      </View>
    );
  }
  
  const { canteen } = data; // sectionsData is already calculated above

  const getItemQuantity = (itemId: string) => {
    const item = cartItems.find(i => i.id === itemId);
    return item ? item.quantity : 0;
  };

  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(categoryId);
    // Find section index
    const sectionIndex = sectionsData.findIndex((s: any) => s.id === categoryId);
    if (sectionIndex !== -1 && sectionListRef.current) {
      sectionListRef.current.scrollToLocation({
        sectionIndex,
        itemIndex: 0,
        viewOffset: 100, // Offset for sticky header
        animated: true
      });
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Absolute Back Button (Top Left) */}
      {/* Absolute Back Button (Top Left) */}
      <Pressable onPress={() => router.back()} style={styles.backButton}>
        <View style={styles.backBtnBlock}>
          <ChevronLeft color={GAME_UI.ink} size={24} strokeWidth={3} />
        </View>
      </Pressable>

      {/* Sticky Header Overlay */}
      <Animated.View style={[
        styles.stickyNavContainer, 
        stickyNavStyle,
        { paddingTop: Math.max(insets.top, 20) }
      ]}>
          <View style={styles.stickyNavBg}>
            <CanteenFilterBar
              filterType={filterType}
              setFilterType={setFilterType}
              sortOrder={sortOrder}
              setSortOrder={setSortOrder}
            />
            <MenuCategoryNav
              categories={sectionsData.map((s: any) => ({ id: s.id, name: s.title }))}
              selectedCategory={selectedCategory}
              onSelect={handleCategorySelect}
            />
        </View>
      </Animated.View>

      <AnimatedSectionList
        ref={sectionListRef}
        sections={sectionsData}
        keyExtractor={(item: any) => item.id}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: 100 }}
        stickySectionHeadersEnabled={false} // We integrate categories differently
        initialNumToRender={10}
        windowSize={5}
        maxToRenderPerBatch={5}
        removeClippedSubviews={true}
        ListHeaderComponent={() => (
          <View>
            <CanteenHeader canteen={canteen} scrollY={scrollY} />
            {/* Static Category Nav (Scrolls with list) */}
            <View style={styles.staticNavContainer}>
              <CanteenFilterBar
                filterType={filterType}
                setFilterType={setFilterType}
                sortOrder={sortOrder}
                setSortOrder={setSortOrder}
              />
              <MenuCategoryNav
                categories={sectionsData.map((s: any) => ({ id: s.id, name: s.title }))}
                selectedCategory={selectedCategory}
                onSelect={handleCategorySelect}
              />
            </View>
          </View>
        )}
        renderSectionHeader={({ section: { title } }: any) => (
          <View style={styles.sectionHeader}>
            <View style={styles.sectionDivider} />
            <Text style={styles.sectionTitle}>{title}</Text>
          </View>
        )}
        renderItem={({ item }: any) => (
          <View style={styles.itemWrapper}>
            <MenuItemCard
              item={item}
              quantity={getItemQuantity(item.id)}
              onAdd={handleAddItem}
              onRemove={handleRemoveItem}
            />
          </View>
        )}
      />

      {/* Sticky Cart Bar */}
      <StickyCartBar itemCount={cartItems.length} total={total} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: GAME_UI.background,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: GAME_UI.background,
  },
  loadingText: {
    color: GAME_UI.ink,
    marginTop: 12,
    fontSize: 16,
    fontWeight: '800',
    textTransform: 'uppercase'
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 100,
  },
  backBtnBlock: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: GAME_UI.white,
    justifyContent: 'center',
    alignItems: 'center',
    ...GAME_UI.shadows.button
  },
  stickyNavContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 40, // Status bar area
    paddingBottom: 0,
    backgroundColor: GAME_UI.background,
    zIndex: 90,
    borderBottomWidth: 2,
    borderBottomColor: GAME_UI.ink,
  },
  stickyNavBg: {
    backgroundColor: GAME_UI.background,
  },
  staticNavContainer: {
    backgroundColor: GAME_UI.background,
    zIndex: 1,
  },
  sectionHeader: {
    paddingHorizontal: SPACING.m,
    paddingTop: SPACING.l,
    paddingBottom: SPACING.s,
    backgroundColor: GAME_UI.background,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: GAME_UI.ink,
    textTransform: 'uppercase',
  },
  sectionDivider: {
    width: 40,
    height: 4,
    backgroundColor: GAME_UI.primaryBtn,
    borderRadius: 0,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: GAME_UI.ink
  },
  itemWrapper: {
    paddingHorizontal: SPACING.m,
  }
});
