import React, { createContext, useContext, useState } from 'react';

export interface CartItem {
    id: string;
    name: string;
    price: number;
    quantity: number;
    canteenId: string;
    canteenName: string;
    // Fee Rates from Vendor
    selfOrderFeeRate?: number;
    preOrderFeeRate?: number;
}

interface CartContextType {
    items: CartItem[];
    addItem: (item: Omit<CartItem, 'quantity'>) => void;
    removeItem: (id: string) => void;
    clearCart: () => void;
    total: number;
    totalTax: number;
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

    // Calculate Tax/Fee: Default to Pre-Order Rate (usually higher) if location not yet verified
    // We take the rate from the first item since all items must be from same canteen
    const activeFeeRate = items.length > 0 ? (items[0].preOrderFeeRate ?? 0.03) : 0.03;
    const totalTax = total * activeFeeRate;

    return (
        <CartContext.Provider value={{ items, addItem, removeItem, clearCart, total, totalTax }}>
            {children}
        </CartContext.Provider>
    );
};
