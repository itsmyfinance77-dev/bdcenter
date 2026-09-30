'use client';

import { dangerButtonClass } from './ui';

/** A form button for destructive server actions that asks for confirmation first. */
export function ConfirmButton({
  action,
  message,
  children,
  className = dangerButtonClass,
}: {
  action: () => Promise<void>;
  message: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!window.confirm(message)) event.preventDefault();
      }}
    >
      <button type="submit" className={className}>
        {children}
      </button>
    </form>
  );
}
