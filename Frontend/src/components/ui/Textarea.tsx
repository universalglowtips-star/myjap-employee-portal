import type { TextareaHTMLAttributes } from 'react'
import { forwardRef, useId } from 'react'
import { cn } from '../../lib/cn'

interface TextareaProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'className'> {
  /** String pesan error - kalau diisi, border+teks jadi merah (border/status-rejected) + pesan muncul di bawah. Pola persis Input.tsx. */
  error?: string
  className?: string
}

/** Belum ada Textarea di project ini sebelum Task 8d (field "Alasan" override lokasi absensi) - dibuat mirror persis styling Input.tsx (border/focus/error/disabled), bukan token baru. */
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { error, className, id, ...rest },
  ref
) {
  const generatedId = useId()
  const textareaId = id ?? generatedId
  const errorId = `${textareaId}-error`

  return (
    <div className="flex flex-col gap-1.5">
      <textarea
        ref={ref}
        id={textareaId}
        aria-invalid={!!error}
        aria-describedby={error ? errorId : undefined}
        className={cn(
          'w-full rounded-sm border px-4 py-2.5 text-sm font-body text-neutral-900',
          'placeholder:text-neutral-400',
          'focus:outline-none focus:border-2 focus:border-primary-600',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:text-neutral-400',
          error ? 'border-status-rejected' : 'border-neutral-200',
          className
        )}
        {...rest}
      />
      {error && (
        <p id={errorId} className="text-xs font-body text-status-rejected">
          {error}
        </p>
      )}
    </div>
  )
})
