import { Slot, useRouter, useSegments } from 'expo-router';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect } from 'react';

const queryClient = new QueryClient();

function InitialLayout() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const isWelcome = segments.length === 0; // index.tsx

    if (!user && !inAuthGroup) {
      // Redirect to login if not logged in and not in auth group
      router.replace('/(auth)/login');
    } else if (user && (inAuthGroup || isWelcome)) {
      // Redirect to home if logged in and in auth/welcome
      router.replace('/(app)/home');
    }
  }, [user, loading, segments]);

  return <Slot />;
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <CartProvider>
          <InitialLayout />
        </CartProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
