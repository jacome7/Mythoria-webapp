'use client';

import { useState, useCallback } from 'react';

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  actionLabel?: string;
  actionHref?: string;
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const addToast = useCallback((message: string, type: Toast['type'] = 'info', duration = 5000) => {
    const id = Math.random().toString(36).substr(2, 9);
    const toast: Toast = { id, message, type, duration };
    setToasts((prev) => [...prev, toast]);
    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
      }, duration);
    }
    return id;
  }, []);

  const addToastWithAction = useCallback(
    (
      message: string,
      type: Toast['type'] = 'info',
      actionLabel?: string,
      actionHref?: string,
      duration = 5000,
    ) => {
      const id = Math.random().toString(36).substr(2, 9);
      const toast: Toast = { id, message, type, duration, actionLabel, actionHref };
      setToasts((prev) => [...prev, toast]);
      if (duration > 0) {
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== id));
        }, duration);
      }
      return id;
    },
    [],
  );

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const success = useCallback(
    (message: string, duration?: number) => {
      return addToast(message, 'success', duration);
    },
    [addToast],
  );

  const successWithAction = useCallback(
    (message: string, actionLabel: string, actionHref: string, duration?: number) => {
      return addToastWithAction(message, 'success', actionLabel, actionHref, duration);
    },
    [addToastWithAction],
  );

  const error = useCallback(
    (message: string, duration?: number) => {
      return addToast(message, 'error', duration);
    },
    [addToast],
  );

  const warning = useCallback(
    (message: string, duration?: number) => {
      return addToast(message, 'warning', duration);
    },
    [addToast],
  );

  const info = useCallback(
    (message: string, duration?: number) => {
      return addToast(message, 'info', duration);
    },
    [addToast],
  );

  return {
    toasts,
    addToast,
    addToastWithAction,
    removeToast,
    success,
    successWithAction,
    error,
    warning,
    info,
  };
}
