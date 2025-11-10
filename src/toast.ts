export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastOptions {
  type?: ToastType;
  duration?: number;
}

/**
 * Show a toast notification
 */
export function showToast(message: string, type: ToastType = 'info', duration: number = 4000): void {
  const toastContainer = document.getElementById('toast-container');
  if (!toastContainer) return;

  const toast = document.createElement('div');
  toast.className = `
    border border-border-primary p-3 rounded font-mono text-sm max-w-sm shadow-lg
    animate-in slide-in-from-right-2 fade-in duration-300
    ${getToastClasses(type)}
  `;

  // Add terminal-style prefix
  const prefix = getToastPrefix(type);

  toast.innerHTML = `
    <div class="flex items-start gap-2">
      <span class="text-text-muted">${prefix}</span>
      <span class="flex-1">${message}</span>
      <button class="text-text-muted hover:text-text-primary ml-2" onclick="this.parentElement.parentElement.remove()">×</button>
    </div>
  `;

  toastContainer.appendChild(toast);

  // Auto-remove after duration
  setTimeout(() => {
    if (toast.parentElement) {
      toast.classList.add('animate-out', 'slide-out-to-right-2', 'fade-out', 'duration-300');
      setTimeout(() => toast.remove(), 300);
    }
  }, duration);
}

/**
 * Get CSS classes for toast type
 */
function getToastClasses(type: ToastType): string {
  switch (type) {
    case 'success':
      return 'bg-surface-secondary border-success text-success';
    case 'error':
      return 'bg-surface-secondary border-error text-error';
    case 'warning':
      return 'bg-surface-secondary border-warning text-warning';
    default:
      return 'bg-surface-secondary border-info text-info';
  }
}

/**
 * Get terminal-style prefix for toast type
 */
function getToastPrefix(type: ToastType): string {
  switch (type) {
    case 'success':
      return '[OK]';
    case 'error':
      return '[ERROR]';
    case 'warning':
      return '[WARN]';
    default:
      return '[INFO]';
  }
}