'use client'

interface PaymentAlertProps {
  onContinue: () => void
}

export default function PaymentAlert({ onContinue }: PaymentAlertProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <section
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="payment-alert-title"
        aria-describedby="payment-alert-message"
        className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 p-6 text-center text-white shadow-2xl"
      >
        <h2 id="payment-alert-title" className="mb-3 text-2xl font-bold">Notice!</h2>
        <p id="payment-alert-message" className="mb-6 text-gray-300">
          It takes 1-2 minutes to process your payments! please wait a moment
        </p>
        <button
          type="button"
          onClick={onContinue}
          className="w-full rounded-lg bg-emerald-600 px-4 py-3 font-semibold text-white transition-colors hover:bg-emerald-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
        >
          OK
        </button>
      </section>
    </div>
  )
}