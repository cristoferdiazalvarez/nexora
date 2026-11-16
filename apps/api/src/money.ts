import { z } from "zod";
export const lineSchema = z.object({
  name: z.string().trim().min(1).max(160),
  quantity: z.number().int().min(1).max(10000),
  priceCents: z.number().int().min(0).max(100000000),
});
export function calculate(lines: z.infer<typeof lineSchema>[], taxBps: number) {
  // Intermediate multiplication must also be exact, even when the final amount fits a Number.
  const subtotal = lines.reduce(
    (sum, l) => sum + BigInt(l.quantity) * BigInt(l.priceCents),
    0n,
  );
  const tax = (subtotal * BigInt(taxBps) + 5000n) / 10000n;
  const total = subtotal + tax;
  if (total < 0n || total > 1000000000000n)
    throw new RangeError("Importe fuera de rango");
  return {
    subtotalCents: Number(subtotal),
    taxCents: Number(tax),
    totalCents: Number(total),
  };
}
