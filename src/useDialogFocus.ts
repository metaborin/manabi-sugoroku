import { useEffect, useRef, type RefObject } from 'react';

const controls = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function visible(element: HTMLElement): boolean {
  return !element.closest('[inert]') && element.getClientRects().length > 0 && getComputedStyle(element).visibility !== 'hidden';
}

function focusable(dialog: HTMLElement): HTMLElement[] {
  return [...dialog.querySelectorAll<HTMLElement>(controls)].filter(element => element.tabIndex >= 0 && !element.matches(':disabled') && visible(element));
}

function focusFirst(dialog: HTMLElement) {
  const preferred = dialog.querySelector<HTMLElement>('[data-dialog-initial-focus]');
  const first = preferred && !preferred.matches(':disabled') && visible(preferred) ? preferred : focusable(dialog)[0];
  if (first) first.focus({ preventScroll: true });
  else {
    dialog.tabIndex = -1;
    dialog.focus({ preventScroll: true });
  }
}

/** A view key changes focus inside the dialog without losing the original outside opener. */
export function useDialogFocus(view: string | null, dialogRef: RefObject<HTMLDivElement | null>, onEscape: () => void) {
  const escapeRef = useRef(onEscape);
  const outsideFocusRef = useRef<HTMLElement | null>(null);
  const open = view !== null;

  useEffect(() => { escapeRef.current = onEscape; }, [onEscape]);

  useEffect(() => {
    if (!open) {
      // Remember the opener before React can make the outside page inert and blur it.
      // Body focus during that transition must not overwrite the real button.
      const remember = (target: EventTarget | null) => {
        if (target instanceof HTMLElement && target !== document.body && target !== document.documentElement &&
            !dialogRef.current?.contains(target) && !target.closest('[inert]')) outsideFocusRef.current = target;
      };
      remember(document.activeElement);
      const focusin = (event: FocusEvent) => remember(event.target);
      document.addEventListener('focusin', focusin, true);
      return () => document.removeEventListener('focusin', focusin, true);
    }
    const opener = outsideFocusRef.current;
    const keydown = (event: KeyboardEvent) => {
      const dialog = dialogRef.current;
      if (!dialog) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        escapeRef.current();
        return;
      }
      if (event.key !== 'Tab') return;
      const nodes = focusable(dialog);
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      const active = document.activeElement;
      if (!first || !last) {
        event.preventDefault();
        focusFirst(dialog);
      } else if (!dialog.contains(active) || !nodes.includes(active as HTMLElement)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      } else if (event.shiftKey && active === first) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault(); first.focus();
      }
    };
    const containFocus = (event: FocusEvent) => {
      const dialog = dialogRef.current;
      if (dialog && event.target instanceof Node && !dialog.contains(event.target)) focusFirst(dialog);
    };
    document.addEventListener('keydown', keydown, true);
    document.addEventListener('focusin', containFocus, true);
    return () => {
      document.removeEventListener('keydown', keydown, true);
      document.removeEventListener('focusin', containFocus, true);
      if (opener?.isConnected && !opener.closest('[inert]')) opener.focus({ preventScroll: true });
    };
  }, [open, dialogRef]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (view !== null && dialog) focusFirst(dialog);
  }, [view, dialogRef]);
}
