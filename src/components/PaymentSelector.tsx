import Image from "next/image";
import { FaCcMastercard, FaCcVisa } from "react-icons/fa";

type TFunc = (key: string) => string;

interface PaymentSelectorProps {
  selected: string;
  onSelect: (value: string) => void;
  t: TFunc;
}

export default function PaymentSelector({
  selected,
  onSelect,
  t,
}: PaymentSelectorProps) {
  return (
    <div className="space-y-3">
      <label className="flex items-center space-x-3 cursor-pointer">
        <input
          type="radio"
          name="payment"
          value="revolut"
          checked={selected === "revolut"}
          onChange={(e) => onSelect(e.target.value)}
          className="radio radio-primary"
        />
        <div className="flex items-center space-x-2">
          <div className="flex items-center gap-1">
            <FaCcVisa className="text-xl" />
            <FaCcMastercard className="text-xl" />
          </div>
          <span className="font-semibold">{t("payment.revolutPay")}</span>
        </div>
      </label>
      <p className="text-sm text-gray-600 ml-8">
        {t("payment.revolutDescription")}
      </p>
      <label className="flex items-center space-x-3 cursor-pointer">
        <input
          type="radio"
          name="payment"
          value="mbway"
          checked={selected === "mbway"}
          onChange={(e) => onSelect(e.target.value)}
          className="radio radio-primary"
        />
        <div className="flex items-center space-x-2">
          <Image
            src="/images/mbway.png"
            alt={t("payment.mbway")}
            width={24}
            height={24}
            className="object-contain"
          />
          <span className="font-semibold">{t("payment.mbway")}</span>
        </div>
      </label>
      <p className="text-sm text-gray-600 ml-8">
        {t("payment.mbwayDescription")}
      </p>
    </div>
  );
}
