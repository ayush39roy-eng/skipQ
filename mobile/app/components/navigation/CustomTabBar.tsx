import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { COLORS, RADIUS, SPACING, GAME_UI } from '../../constants/theme';
import { House, ShoppingBasket, ReceiptText, UserRound } from 'lucide-react-native';
import { MotiView } from 'moti';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import * as Haptics from 'expo-haptics';
import { useCart } from '../../context/CartContext';

const ICONS: Record<string, any> = {
    home: House,
    cart: ShoppingBasket,
    orders: ReceiptText,
    profile: UserRound,
};

const LABELS: Record<string, string> = {
    home: 'Home',
    cart: 'Cart',
    orders: 'Orders',
    profile: 'Profile',
};

export const CustomTabBar = ({ state, descriptors, navigation }: BottomTabBarProps) => {
    // Check if the current focused route needs to hide the tab bar
    const focusedRoute = state.routes[state.index];
    const { options } = descriptors[focusedRoute.key];

    // access Cart Context
    const { items } = useCart();
    const hasCartItems = items.length > 0;

    // @ts-ignore
    if (options.tabBarStyle?.display === 'none') {
        return null;
    }

    // Filter out hidden routes (like canteen details, hidden login/signup)
    const ALLOWED_ROUTES = ['home', 'orders', 'profile'];

    const visibleRoutes = state.routes.filter(route => {
        return ALLOWED_ROUTES.includes(route.name);
    });

    return (
        <View style={styles.container}>
            <View style={styles.bar}>
                {visibleRoutes.map((route, index) => {
                    const { options } = descriptors[route.key];
                    const isFocused = state.index === state.routes.indexOf(route);
                    const isCart = route.name === 'cart';

                    const onPress = () => {
                        const event = navigation.emit({
                            type: 'tabPress',
                            target: route.key,
                            canPreventDefault: true,
                        });

                        if (!isFocused && !event.defaultPrevented) {
                            Haptics.selectionAsync();
                            navigation.navigate(route.name);
                        }
                    };

                    const IconComponent = ICONS[route.name] || House;

                    return (
                        <Pressable
                            key={route.key}
                            onPress={onPress}
                            style={styles.tabItem}
                            accessibilityRole="tab"
                            accessibilityState={{ selected: isFocused }}
                            accessibilityLabel={LABELS[route.name] || route.name}
                        >
                            <MotiView
                                animate={{
                                    scale: isFocused ? 1 : 0.9,
                                    translateY: isFocused ? -4 : 0,
                                }}
                                transition={{ type: 'spring', damping: 15 }}
                                style={styles.iconWrapper}
                            >
                                {/* Active Indicator Block */}
                                {isFocused && (
                                    <MotiView
                                        from={{ opacity: 0, scale: 0.5 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        style={styles.activeBlock}
                                    />
                                )}

                                <IconComponent
                                    size={24}
                                    color={GAME_UI.ink}
                                    fill={isCart && hasCartItems ? GAME_UI.ink : "transparent"}
                                    strokeWidth={isFocused ? 2.5 : 2}
                                    style={{ zIndex: 2, opacity: isFocused ? 1 : 0.7 }}
                                />

                                {isFocused && (
                                    <Text style={styles.label}>
                                        {LABELS[route.name] || route.name}
                                    </Text>
                                )}

                                {/* Cart Item Badge */}
                                {isCart && hasCartItems && !isFocused && (
                                    <View style={styles.cartBadge} />
                                )}
                            </MotiView>
                        </Pressable>
                    );
                })}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 100,
    },
    bar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
        paddingHorizontal: SPACING.l,
        paddingTop: 10,
        paddingBottom: Platform.OS === 'ios' ? 24 : 14, // Increased slightly to fit text
        backgroundColor: GAME_UI.white, 
        borderTopWidth: 2,
        ...GAME_UI.shadows.sm,
    },
    tabItem: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconWrapper: {
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        height: 40,
    },
    activeBlock: {
        position: 'absolute',
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: GAME_UI.primaryBtn,
        zIndex: 1,
        bottom: -2,
        ...GAME_UI.shadows.sm
    },
    label: {
        position: 'absolute',
        bottom: -18, // Pulled up slightly
        fontSize: 9,
        fontWeight: '900',
        color: GAME_UI.ink,
        textTransform: 'uppercase',
        zIndex: 3,
        textAlign: 'center',
        width: 60, // Ensure text doesn't wrap awkwardly
    },
    cartBadge: {
        position: 'absolute',
        top: 0,
        right: 16,
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: COLORS.error,
        zIndex: 5,
        ...GAME_UI.shadows.sm,
        borderWidth: 1.5, // Override shadow width if needed
        borderColor: GAME_UI.ink,
        shadowColor: 'transparent' // No shadow for badge, just border? Or keep shadow? Let's keep simple border for badge
    }
});
