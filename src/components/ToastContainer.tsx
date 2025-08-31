'use client';

import { FiX, FiCheckCircle, FiAlertCircle, FiAlertTriangle, FiInfo } from 'react-icons/fi';
import { Toast } from '@/hooks/useToast';

interface ToastContainerProps {
  toasts: Toast[];
  onRemove: (id: string) => void;
}

export default function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  const getToastIcon = (type: Toast['type']) => {
    switch (type) {
      case 'success':
        return <FiCheckCircle className="w-5 h-5" />;
      case 'error':
        return <FiAlertCircle className="w-5 h-5" />;
      case 'warning':
        return <FiAlertTriangle className="w-5 h-5" />;
      case 'info':
      default:
        return <FiInfo className="w-5 h-5" />;
    }
  };

  const getToastClass = (type: Toast['type']) => {
    switch (type) {
      case 'success':
        return 'alert-success';
      case 'error':
        return 'alert-error';
      case 'warning':
        return 'alert-warning';
      case 'info':
      default:
        return 'alert-info';
    }
  };

  return (
    // High z-index to ensure toast overlays all UI (drawers, modals, editors)
    <div className="toast toast-top toast-end z-[9999]">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`alert ${getToastClass(toast.type)} shadow-lg`}
        >
          {getToastIcon(toast.type)}
          <span>{toast.message}</span>
          {toast.actionHref && toast.actionLabel && (
            <a href={toast.actionHref} className="btn btn-sm btn-ghost">
              {toast.actionLabel}
            </a>
          )}
          <button
            onClick={() => onRemove(toast.id)}
            className="btn btn-ghost btn-sm btn-square"
          >
            <FiX className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
