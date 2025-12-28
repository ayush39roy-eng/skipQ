import { Tabs } from 'expo-router';
import { Home, ShoppingBag, Receipt, LogOut, User } from 'lucide-react-native';
import { View } from 'react-native';
import { CustomTabBar } from '../components/navigation/CustomTabBar';

export default function AppLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
        }}
      />
      <Tabs.Screen
        name="canteen"
        options={{
          href: null,
          title: 'Canteen',
          tabBarStyle: { display: 'none' }, // Retaining for logic in CustomTabBar
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
            href: null,
            title: 'Cart',
            tabBarStyle: { display: 'none' }
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: 'Orders',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
        }}
      />
      <Tabs.Screen
        name="login"
        options={{
          href: null,
          tabBarStyle: { display: 'none' }
        }}
      />
      <Tabs.Screen
        name="signup"
        options={{
          href: null,
          tabBarStyle: { display: 'none' }
        }}
      />
      <Tabs.Screen
        name="order-details/[id]"
        options={{
          href: null,
          tabBarStyle: { display: 'none' }
        }}
      />
      <Tabs.Screen
        name="payment"
        options={{
          href: null,
          tabBarStyle: { display: 'none' }
        }}
      />
    </Tabs>
  );
}
