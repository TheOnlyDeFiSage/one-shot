import React from 'react';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';

/**
 * Props for the Toast component
 * @property type - Type of notification (success/error/info)
 * @property message - Notification message to display
 * @property onClose - Callback to close the notification
 */
type ToastProps = {
  type: 'success' | 'error' | 'info';
  message: string;
  animate?: boolean;
  onClose: () => void;
};

/**
 * Styling map for different toast types
 * Uses Tailwind classes for consistent theming
 */
const toastStyles = {
  success: 'bg-green-100 text-green-800 border-green-200',
  error: 'bg-red-100 text-red-800 border-red-200',
  info: 'bg-blue-100 text-blue-800 border-blue-200',
};

/**
 * Icon map for different toast types
 * Uses Lucide icons for consistent design
 */
const ToastIcon = {
  success: CheckCircle,
  error: XCircle,
  info: AlertCircle,
};

/**
 * Toast component for displaying notifications
 * Auto-dismisses after 5 seconds
 * Supports success, error, and info states
 * Adds shake animation for specific error message
 */
export function Toast({ type, message, animate, onClose }: ToastProps) {
  const Icon = ToastIcon[type];
  const isSpecificError = type === 'error' && message === 'Error placing bet. Please try again.';

  React.useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div
      className={`fixed bottom-[160px] right-4 flex items-center gap-2 px-6 py-4 rounded-xl border z-[60] shadow-lg 
        ${toastStyles[type]} 
        ${animate ? 'animate-result-reveal' : 'animate-slide-up'}
        ${isSpecificError ? 'animate-shake' : ''}`}
    >
      <Icon className="w-5 h-5" />
      <span className="font-medium text-lg">{message}</span>
      <button
        onClick={onClose}
        className="ml-2 hover:opacity-80"
      >
        ×
      </button>
    </div>
  );
}