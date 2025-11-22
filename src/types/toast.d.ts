// Type declarations for global toast functions

interface ToastOptions {
    title?: string;
    message?: string;
    type?: 'success' | 'error' | 'warning' | 'info';
    icon?: string | null;
    buttonText?: string;
    onClose?: (() => void) | null;
}

interface Window {
    showToast?: (options?: ToastOptions) => void;
    closeToast?: () => void;
}

