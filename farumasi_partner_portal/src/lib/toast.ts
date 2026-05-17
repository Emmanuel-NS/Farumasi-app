// Simple singleton toast emitter — no external deps
export type ToastType = "success" | "error" | "info" | "warning";

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

type Listener = (toasts: Toast[]) => void;

let _toasts: Toast[] = [];
let _listeners: Listener[] = [];

const _emit = () => _listeners.forEach((l) => l([..._toasts]));

const _add = (message: string, type: ToastType, duration = 3500) => {
  const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const t: Toast = { id, message, type };
  _toasts = [..._toasts, t];
  _emit();
  setTimeout(() => {
    _toasts = _toasts.filter((x) => x.id !== id);
    _emit();
  }, duration);
};

export const toast = {
  success: (message: string) => _add(message, "success", 3500),
  error: (message: string) => _add(message, "error", 5000),
  info: (message: string) => _add(message, "info", 3000),
  warning: (message: string) => _add(message, "warning", 4000),
  subscribe: (listener: Listener) => {
    _listeners.push(listener);
    return () => {
      _listeners = _listeners.filter((l) => l !== listener);
    };
  },
};
