export type PaymentChoice = "card" | "paypal";

/** The same choice as checkout, for deposits. */
export function PaymentMethodChoice({ value, onChange, testMode, legend = "Pay your deposit by" }: { value: PaymentChoice; onChange: (value: PaymentChoice) => void; testMode: boolean; legend?: string }) {
  return (
    <fieldset>
      <legend className="text-sm font-medium">{legend}</legend>
      <div className="mt-2 grid grid-cols-2 gap-3">
        {(
          [
            ["card", "Card or wallet", "Card, Apple Pay, Google Pay"],
            ["paypal", "PayPal", "Pay with your PayPal account"],
          ] as const
        ).map(([option, label, hint]) => (
          <label key={option} className={`cursor-pointer rounded-brand border-2 bg-paper p-4 has-focus-visible:outline-3 has-focus-visible:outline-forest ${value === option ? "border-forest" : "border-transparent"}`}>
            <input type="radio" name="method" className="sr-only" checked={value === option} onChange={() => onChange(option)} />
            <span className="block font-medium">{label}</span>
            <span className="text-sm text-stone">{hint}</span>
          </label>
        ))}
      </div>
      {testMode ? <p className="mt-2 text-xs text-stone">Test mode: payment is simulated, no money moves.</p> : null}
    </fieldset>
  );
}
