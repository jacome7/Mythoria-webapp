import Image from 'next/image';
import { FaApplePay, FaCcMastercard, FaCcStripe, FaCcVisa, FaGooglePay } from 'react-icons/fa';

type TFunc = (key: string) => string;

interface PaymentSelectorProps {
  t: TFunc;
}

export default function PaymentSelector({ t }: PaymentSelectorProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3">
        <FaCcStripe className="mt-1 text-2xl shrink-0" aria-hidden="true" />
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">{t('payment.stripeCheckout')}</span>
            <span className="flex items-center gap-1" aria-hidden="true">
              <FaCcVisa className="text-xl" />
              <FaCcMastercard className="text-xl" />
              <FaApplePay className="text-xl" />
              <FaGooglePay className="text-xl" />
              <Image
                src="/images/mbway.png"
                alt=""
                width={22}
                height={22}
                className="object-contain"
              />
            </span>
          </div>
          <p className="text-sm text-gray-600">{t('payment.stripeDescription')}</p>
        </div>
      </div>
    </div>
  );
}
