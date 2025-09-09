import { useState } from "react";
import type { CartItem } from "@/types/cart";

export const useCart = () => {
  const [cart, setCart] = useState<CartItem[]>([]);

  const removeFromCart = (packageId: number) => {
    setCart((prev) => prev.filter((item) => item.packageId !== packageId));
  };

  const addToCart = (packageId: number) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.packageId === packageId);
      if (existing) {
        return prev.map((item) =>
          item.packageId === packageId
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        );
      }
      return [...prev, { packageId, quantity: 1 }];
    });
  };

  const updateQuantity = (packageId: number, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(packageId);
      return;
    }
    setCart((prev) =>
      prev.map((item) =>
        item.packageId === packageId ? { ...item, quantity } : item,
      ),
    );
  };

  const clearCart = () => setCart([]);

  return {
    cart,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
  };
};
