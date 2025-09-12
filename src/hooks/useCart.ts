import { useState, useCallback } from "react";
import type { CartItem } from "@/types/cart";

export const useCart = () => {
  const [cart, setCart] = useState<CartItem[]>([]);

  const removeFromCart = useCallback((packageId: number) => {
    setCart((prev) => prev.filter((item) => item.packageId !== packageId));
  }, []);

  const addToCart = useCallback((packageId: number) => {
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
  }, []);

  const updateQuantity = useCallback(
    (packageId: number, quantity: number) => {
      if (quantity <= 0) {
        removeFromCart(packageId);
        return;
      }
      setCart((prev) =>
        prev.map((item) =>
          item.packageId === packageId ? { ...item, quantity } : item,
        ),
      );
    },
    [removeFromCart],
  );

  const clearCart = useCallback(() => setCart([]), []);

  return {
    cart,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
  };
};
