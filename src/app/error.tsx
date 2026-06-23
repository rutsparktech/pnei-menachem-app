'use client'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <p className="text-lg font-semibold text-text mb-2">שגיאה בטעינת הנתונים</p>
      {error.message && (
        <p className="text-sm text-muted mb-2 max-w-sm">{error.message}</p>
      )}
      <p className="text-muted text-sm mb-5">נסי לרענן את הדף</p>
      <button
        onClick={reset}
        className="bg-primary text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-primary-hover transition-colors"
      >
        רענן
      </button>
      {error.digest && (
        <p className="mt-4 text-[10px] text-muted font-mono">{error.digest}</p>
      )}
    </div>
  )
}
