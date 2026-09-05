import { StrictMode } from 'react';
import { act, renderHook } from '@testing-library/react';
import { useCart } from './useCart';

describe('cart initial package', () => {
  it('waits for the catalogue, initializes once and retains later quantity/removal changes', () => {
    const { result, rerender } = renderHook<
      ReturnType<typeof useCart>,
      { id: number | null | undefined }
    >(({ id }) => useCart(id), {
      initialProps: { id: undefined },
      wrapper: StrictMode,
    });
    expect(result.current.cart).toEqual([]);
    rerender({ id: 2 });
    expect(result.current.cart).toEqual([{ packageId: 2, quantity: 1 }]);
    act(() => result.current.updateQuantity(2, 3));
    rerender({ id: 2 });
    expect(result.current.cart).toEqual([{ packageId: 2, quantity: 3 }]);
    act(() => result.current.removeFromCart(2));
    rerender({ id: 2 });
    expect(result.current.cart).toEqual([]);
    rerender({ id: 3 });
    expect(result.current.cart).toEqual([]);
  });
  it('leaves normal selection available when the URL package is invalid', () => {
    const { result, rerender } = renderHook<
      ReturnType<typeof useCart>,
      { id: number | null | undefined }
    >(({ id }) => useCart(id), {
      initialProps: { id: null },
    });
    act(() => result.current.addToCart(3));
    rerender({ id: 2 });
    expect(result.current.cart).toEqual([{ packageId: 3, quantity: 1 }]);
  });
});
