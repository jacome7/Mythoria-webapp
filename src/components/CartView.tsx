import { RefObject } from 'react';
import { FaPlus, FaMinus, FaTrash, FaShoppingCart } from 'react-icons/fa';
import type { CartItem, CreditPackage } from '@/types/cart';

type TFunc = (key: string) => string;

const getIconComponent = (iconName: string) => {
  switch (iconName) {
    case 'FaShoppingCart':
    default:
      return <FaShoppingCart />;
  }
};

interface CartViewProps {
  cart: CartItem[];
  creditPackages: CreditPackage[];
  tBuyCreditsPage: TFunc;
  tPricingPage: TFunc;
  updateQuantity: (packageId: number, quantity: number) => void;
  removeFromCart: (packageId: number) => void;
  subtotal: number;
  vatAmount: number;
  total: number;
  cartItemsRef: RefObject<HTMLDivElement | null>;
}

export default function CartView({
  cart,
  creditPackages,
  tBuyCreditsPage,
  tPricingPage,
  updateQuantity,
  removeFromCart,
  subtotal,
  vatAmount,
  total,
  cartItemsRef,
}: CartViewProps) {
  const getPackageById = (id: number) => creditPackages.find((pkg) => pkg.id === id);

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">{tBuyCreditsPage('cart.title')}</h2>
      <div ref={cartItemsRef} className="bg-base-200 rounded-lg p-6 mb-6">
        {cart.length === 0 ? (
          <p className="text-center text-gray-500 py-8">{tBuyCreditsPage('cart.empty')}</p>
        ) : (
          <div className="space-y-4">
            {cart.map((item) => {
              const pkg = getPackageById(item.packageId);
              if (!pkg) return null;
              return (
                <div
                  key={item.packageId}
                  className="flex items-center justify-between border-b border-base-300 pb-4"
                >
                  <div className="flex items-center space-x-3">
                    <div className="text-2xl text-primary">{getIconComponent(pkg.icon)}</div>
                    <div>
                      <h4 className="font-semibold">
                        {pkg.credits} {tPricingPage('creditPackages.credits')}
                      </h4>
                      <p className="text-sm text-gray-600">
                        €{pkg.price.toFixed(2)} {tBuyCreditsPage('cart.each')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => updateQuantity(item.packageId, item.quantity - 1)}
                        className="btn btn-sm btn-outline"
                      >
                        <FaMinus />
                      </button>
                      <span className="w-8 text-center font-semibold">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.packageId, item.quantity + 1)}
                        className="btn btn-sm btn-outline"
                      >
                        <FaPlus />
                      </button>
                    </div>
                    <button
                      onClick={() => removeFromCart(item.packageId)}
                      className="btn btn-sm btn-error"
                    >
                      <FaTrash />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      {cart.length > 0 && (
        <div className="bg-base-200 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-bold mb-4">{tBuyCreditsPage('summary.title')}</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>{tBuyCreditsPage('summary.subtotal')}</span>
              <span>€{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>{tBuyCreditsPage('summary.vat')}</span>
              <span>€{vatAmount.toFixed(2)}</span>
            </div>
            <div className="divider my-2"></div>
            <div className="flex justify-between text-xl font-bold">
              <span>{tBuyCreditsPage('summary.total')}</span>
              <span className="text-primary">€{total.toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
