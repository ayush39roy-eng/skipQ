import React, { createContext, useContext, useState } from 'react';

export interface CartItem {
    id: string;
    name: string;
    price: number;
    quantity: number;
    canteenId: string;
    canteenName: string;
}

interface CartContextType {
    items: CartItem[];
    addItem: (item: Omit<CartItem, 'quantity'>) => void;
    removeItem: (id: string) => void;
    clearCart: () => void;
    total: number;
}

const CartContext = createContext<CartContextType>({} as CartContextType);

export const useCart = () => useContext(CartContext);

export const CartProvider = ({ children }: { children: React.ReactNode }) => {
    const [items, setItems] = useState<CartItem[]>([]);

    const addItem = (newItem: Omit<CartItem, 'quantity'>) => {
        setItems((prev) => {
            const existing = prev.find((i) => i.id === newItem.id);
            if (existing) {
                return prev.map((i) => (i.id === newItem.id ? { ...i, quantity: i.quantity + 1 } : i));
            }
            // If adding item from different canteen, replace cart
            if (prev.length > 0 && prev[0].canteenId !== newItem.canteenId) {
                return [{ ...newItem, quantity: 1 }];
            }
            return [...prev, { ...newItem, quantity: 1 }];
        });
    };

    const removeItem = (id: string) => {
        setItems((prev) => {
            const existing = prev.find((i) => i.id === id);
            if (existing && existing.quantity > 1) {
                return prev.map((i) => (i.id === id ? { ...i, quantity: i.quantity - 1 } : i));
            }
            return prev.filter((i) => i.id !== id);
        });
    };

    const clearCart = () => setItems([]);

    const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

    return (
        <CartContext.Provider value={{ items, addItem, removeItem, clearCart, total }}>
            {children}
        </CartContext.Provider>
    );
};
