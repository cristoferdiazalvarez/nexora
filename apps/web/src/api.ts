export async function api<T = any>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...options,
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", ...options.headers },
  });
  if (!res.ok) {
    const body = await res
      .json()
      .catch(() => ({ message: "No se pudo conectar con el servidor" }));
    throw new Error(body.message);
  }
  return res.status === 204 ? (undefined as T) : res.json();
}
export const euro = (v: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(
    v / 100,
  );
