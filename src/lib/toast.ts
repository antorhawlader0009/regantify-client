import { toast as sonnerToast } from 'sonner';

/**
 * Thin wrapper around sonner — components import this instead of sonner
 * directly, so if we ever swap toast libraries or want to change default
 * behavior (duration, icons, etc.) app-wide, it's one place to edit.
 */
export const toast = {
  success: (message: string) => sonnerToast.success(message),
  error: (message: string) => sonnerToast.error(message),
  info: (message: string) => sonnerToast(message),
};
