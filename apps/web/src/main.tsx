import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import {
  BrowserRouter,
  Routes,
  Route,
  NavLink,
  Navigate,
  useNavigate,
  useLocation,
} from "react-router-dom";
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Toaster, toast } from "sonner";

import {
  Layers,
  LayoutDashboard,
  Users,
  Package,
  FileText,
  Settings,
  LogOut,
  Sun,
  Moon,
  Plus,
  Search,
  ArrowUpRight,
  Menu,
  Download,
  Pencil,
  Trash2,
  Wallet,
  Clock,
  ChevronRight,
  X,
} from "lucide-react";
import { api, euro } from "./api";
import "./style.css";
const IncomeChart = React.lazy(() => import("./IncomeChart"));
const qc = new QueryClient({
  defaultOptions: { queries: { retry: 0, staleTime: 15000 } },
});
const labels: Record<string, string> = {
  clients: "Clientes",
  products: "Productos y servicios",
  invoices: "Facturas",
};
function Loading() {
  return <div role="status" aria-label="Cargando" className="skeleton" />;
}
function ErrorBox({ error }: { error: Error }) {
  return (
    <div role="alert" className="error">
      {error.message}
    </div>
  );
}
const authSchema = z.object({
  email: z.email("Introduce un correo válido"),
  password: z
    .string()
    .min(12, "Mínimo 12 caracteres")
    .max(72)
    .refine(
      (v) => new TextEncoder().encode(v).length <= 72,
      "Máximo 72 bytes en UTF-8",
    ),
  name: z.string().optional(),
  organizationName: z.string().optional(),
});
function Auth() {
  const [register, setRegister] = useState(false);
  const navigate = useNavigate();
  const {
    register: field,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(authSchema) });
  return (
    <div className="auth">
      <section className="auth-brand">
        <Logo />
        <div>
          <span className="eyebrow">TU NEGOCIO, EN PERSPECTIVA</span>
          <h1>
            Más claridad.
            <br />
            Más posibilidades.
          </h1>
          <p>
            Clientes, finanzas y operaciones en un espacio diseñado para
            avanzar.
          </p>
        </div>
        <small>Un proyecto Full Stack · NEXORA</small>
      </section>
      <section className="auth-form">
        <div>
          <span className="eyebrow">BIENVENIDO A NEXORA</span>
          <h2>
            {register ? "Empieza una nueva etapa" : "Tu espacio de trabajo"}
          </h2>
          <p>
            {register
              ? "Crea tu empresa y toma el control."
              : "Accede para ver cómo va tu negocio."}
          </p>
          <form
            onSubmit={handleSubmit(async (values) => {
              try {
                if (
                  register &&
                  (!values.name?.trim() || !values.organizationName?.trim())
                )
                  throw new Error("Completa nombre y empresa");
                await api(`/auth/${register ? "register" : "login"}`, {
                  method: "POST",
                  body: JSON.stringify(values),
                });
                await qc.invalidateQueries();
                navigate("/");
              } catch (e) {
                toast.error((e as Error).message);
              }
            })}
          >
            {register && (
              <>
                <label>
                  Tu nombre
                  <input {...field("name")} required maxLength={160} />
                </label>
                <label>
                  Empresa
                  <input
                    {...field("organizationName")}
                    required
                    maxLength={160}
                  />
                </label>
              </>
            )}
            <label>
              Correo electrónico
              <input type="email" autoComplete="email" {...field("email")} />
              {errors.email && (
                <small className="invalid">{errors.email.message}</small>
              )}
            </label>
            <label>
              Contraseña
              <input
                type="password"
                autoComplete={register ? "new-password" : "current-password"}
                {...field("password")}
              />
              {errors.password && (
                <small className="invalid">{errors.password.message}</small>
              )}
            </label>
            <button disabled={isSubmitting}>
              {isSubmitting
                ? "Conectando…"
                : register
                  ? "Crear organización"
                  : "Iniciar sesión"}{" "}
              <ArrowUpRight size={17} />
            </button>
          </form>
          <button className="link" onClick={() => setRegister(!register)}>
            {register ? "Ya tengo cuenta" : "Crear una organización"}
          </button>
        </div>
      </section>
    </div>
  );
}
function Logo() {
  return (
    <div className="logo">
      <span>
        <Layers size={23} />
      </span>
      NEXORA<span className="logo-dot">®</span>
    </div>
  );
}
function Shell() {
  const me = useQuery({ queryKey: ["me"], queryFn: () => api("/me") });
  const [mobile, setMobile] = useState(false);
  const [narrow, setNarrow] = useState(
    () => window.matchMedia("(max-width:700px)").matches,
  );
  React.useEffect(() => {
    const media = window.matchMedia("(max-width:700px)");
    const update = () => {
      setNarrow(media.matches);
      if (!media.matches) setMobile(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobile(false);
    };
    media.addEventListener("change", update);
    document.addEventListener("keydown", escape);
    return () => {
      media.removeEventListener("change", update);
      document.removeEventListener("keydown", escape);
    };
  }, []);
  const [dark, setDark] = useState(
    () => localStorage.getItem("theme") === "dark",
  );
  const nav = useNavigate();
  const location = useLocation();
  React.useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);
  if (me.isPending) return <Loading />;
  if (me.isError) return <Navigate to="/login" replace />;
  const items = [
    ["/", "Resumen", LayoutDashboard],
    ["/clients", "Clientes", Users],
    ["/products", "Productos y servicios", Package],
    ["/invoices", "Facturas", FileText],
    ["/settings", "Configuración", Settings],
  ] as const;
  return (
    <div className="app">
      <aside
        id="workspace-navigation"
        inert={narrow && !mobile}
        className={mobile ? "sidebar open" : "sidebar"}
      >
        <Logo />
        <div className="workspace">
          <span className="avatar">N</span>
          <div>
            Mi organización<small>Espacio de trabajo</small>
          </div>
          <ChevronRight size={15} />
        </div>
        <span className="nav-label">PRINCIPAL</span>
        <nav>
          {items.map(([url, title, Icon]) => (
            <NavLink
              end={url === "/"}
              to={url}
              key={url}
              onClick={() => setMobile(false)}
            >
              <Icon size={19} />
              {title}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="tip">
            <span>Todo en su sitio.</span>
            <p>Una visión clara para cada decisión de tu negocio.</p>
            <Layers size={26} />
          </div>
          <div className="user">
            <span className="avatar purple">{me.data.name[0]}</span>
            <div>
              {me.data.name}
              <small>
                {me.data.role === "admin" ? "Administrador" : "Empleado"}
              </small>
            </div>
            <button
              aria-label="Cerrar sesión"
              className="icon"
              onClick={async () => {
                await api("/auth/logout", { method: "POST" });
                qc.clear();
                nav("/login");
              }}
            >
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </aside>
      {mobile && (
        <button
          className="overlay"
          aria-label="Cerrar menú"
          onClick={() => setMobile(false)}
        />
      )}
      <div className="main">
        <header>
          <button
            className="icon mobile-toggle"
            aria-label="Abrir menú"
            aria-expanded={mobile}
            aria-controls="workspace-navigation"
            onClick={() => setMobile(true)}
          >
            <Menu />
          </button>
          <div className="breadcrumb">
            Workspace <ChevronRight size={14} />{" "}
            <strong>
              {location.pathname === "/"
                ? "Resumen"
                : labels[location.pathname.slice(1)] || "Configuración"}
            </strong>
          </div>
          <div className="header-right">
            <span className="live-dot" /> Espacio conectado{" "}
            <button
              className="icon"
              aria-label="Cambiar tema"
              onClick={() => setDark(!dark)}
            >
              {dark ? <Sun size={19} /> : <Moon size={19} />}
            </button>
            <span className="avatar purple">{me.data.name[0]}</span>
          </div>
        </header>
        <main>
          <Routes>
            <Route path="/" element={<Dashboard name={me.data.name} />} />
            {Object.keys(labels).map((resource) => (
              <Route
                key={resource}
                path={`/${resource}`}
                element={
                  <Records
                    key={resource}
                    resource={resource}
                    admin={me.data.role === "admin"}
                  />
                }
              />
            ))}
            <Route path="/settings" element={<SettingsPage me={me.data} />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>
        <footer>
          NEXORA <span>Claridad para tu negocio.</span>
          <span>Gestión empresarial · EUR</span>
        </footer>
      </div>
    </div>
  );
}
function Heading({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      {children}
    </div>
  );
}
function Dashboard({ name }: { name: string }) {
  const q = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => api("/dashboard"),
  });
  if (q.isPending) return <Loading />;
  if (q.error) return <ErrorBox error={q.error} />;
  const d = q.data;
  return (
    <>
      <div className="eyebrow">EL PULSO DE TU EMPRESA</div>
      <Heading
        title={`Hola, ${name.split(" ")[0]} 👋`}
        subtitle="Cada dato, una oportunidad. Así va tu negocio hoy."
      >
        <NavLink className="button" to="/invoices">
          Ver facturas <ArrowUpRight size={17} />
        </NavLink>
      </Heading>
      <div className="kpis">
        {[
          [
            Wallet,
            "Ingresos cobrados",
            euro(d.revenueCents),
            "Total de facturas pagadas",
          ],
          [
            Clock,
            "Pendiente de cobro",
            euro(d.pendingCents),
            "Facturas por cobrar",
          ],
          [Users, "Clientes activos", d.clients, "Relaciones que suman"],
          [
            Package,
            "Productos y servicios",
            d.products,
            "Tu catálogo de soluciones",
          ],
        ].map(([Icon, label, value, desc]: any) => (
          <section className="card kpi" key={label}>
            <div>
              <span>{label}</span>
              <Icon size={19} />
            </div>
            <strong>{value}</strong>
            <small>{desc}</small>
          </section>
        ))}
      </div>
      <div className="chart-grid">
        <section className="card chart">
          <div className="section-title">
            <div>
              <h2>Evolución de ingresos</h2>
              <p>Importe cobrado de las facturas creadas cada mes</p>
            </div>
            <span className="chip">Últimos 6 meses</span>
          </div>
          <div className="chart-body">
            <React.Suspense fallback={<Loading />}>
              <IncomeChart data={d.months} />
            </React.Suspense>
          </div>
        </section>
        <section className="card overview">
          <span className="eyebrow">VISIÓN FINANCIERA</span>
          <h2>Cada factura cuenta.</h2>
          <p>Un seguimiento sencillo para mantener tus cuentas al día.</p>
          <div className="big-number">
            {d.invoices}
            <small>facturas en total</small>
          </div>
          <div className="progress">
            <span
              style={{
                width: `${d.revenueCents + d.pendingCents ? (d.revenueCents / (d.revenueCents + d.pendingCents)) * 100 : 0}%`,
              }}
            />
          </div>
          <div className="legend">
            <span>● Cobrado</span>
            <span>● Pendiente</span>
          </div>
          <NavLink to="/invoices">
            Gestionar facturación <ArrowUpRight size={17} />
          </NavLink>
        </section>
      </div>
      <section className="card">
        <div className="section-title">
          <div>
            <h2>Últimas facturas</h2>
            <p>Los movimientos más recientes de tu negocio</p>
          </div>
          <NavLink className="text-link" to="/invoices">
            Ver todas <ChevronRight size={16} />
          </NavLink>
        </div>
        <InvoiceTable items={d.recent} />
      </section>
    </>
  );
}
function InvoiceTable({ items }: { items: any[] }) {
  return !items.length ? (
    <Empty />
  ) : (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Factura</th>
            <th>Cliente</th>
            <th>Vencimiento</th>
            <th>Importe</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody>
          {items.map((i) => (
            <tr key={i._id}>
              <td className="mono">{i.number}</td>
              <td>{i.clientName}</td>
              <td>{i.dueDate}</td>
              <td className="amount">{euro(i.totalCents)}</td>
              <td>
                <Status value={i.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
function Status({ value }: { value: string }) {
  return (
    <span className={`status ${value}`}>
      ● {value === "pagada" ? "Pagada" : "Pendiente"}
    </span>
  );
}
function Empty() {
  return (
    <div className="empty">
      <Layers size={30} />
      <h3>Un nuevo comienzo</h3>
      <p>No hay registros que coincidan. Crea uno o ajusta la búsqueda.</p>
    </div>
  );
}
function Records({ resource, admin }: { resource: string; admin: boolean }) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [editing, setEditing] = useState<any>(null);
  const query = useQuery({
    queryKey: [resource, search, page, status],
    queryFn: () =>
      api(
        `/${resource}?q=${encodeURIComponent(search)}&page=${page}${status ? `&status=${status}` : ""}`,
      ),
  });
  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: [resource] });
    void qc.invalidateQueries({ queryKey: ["dashboard"] });
  };
  return (
    <>
      <span className="eyebrow">TU ESPACIO DE GESTIÓN</span>
      <Heading
        title={labels[resource]}
        subtitle={
          resource === "clients"
            ? "Conecta, organiza y haz crecer tus relaciones."
            : resource === "products"
              ? "Todo lo que tu negocio ofrece, en un solo lugar."
              : "Tus cuentas claras, desde el primer día."
        }
      >
        {admin && (
          <button onClick={() => setEditing({})}>
            <Plus size={17} />{" "}
            {resource === "invoices"
              ? "Nueva factura"
              : resource === "clients"
                ? "Nuevo cliente"
                : "Nuevo producto"}
          </button>
        )}
      </Heading>
      <section className="card">
        <div className="toolbar">
          <div className="search">
            <Search size={18} />
            <input
              aria-label="Buscar registros"
              placeholder="Buscar por nombre…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
          {resource === "invoices" && (
            <select
              aria-label="Filtrar por estado"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Todos los estados</option>
              <option value="pendiente">Pendiente</option>
              <option value="pagada">Pagada</option>
            </select>
          )}
          <span>{query.data?.total ?? 0} registros</span>
        </div>
        {query.isPending ? (
          <Loading />
        ) : query.error ? (
          <ErrorBox error={query.error} />
        ) : !query.data.items.length ? (
          <Empty />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{resource === "invoices" ? "Factura" : "Nombre"}</th>
                  <th>
                    {resource === "clients"
                      ? "Correo"
                      : resource === "products"
                        ? "Tipo"
                        : "Cliente"}
                  </th>
                  <th>
                    {resource === "clients"
                      ? "Identificación fiscal"
                      : resource === "products"
                        ? "Precio"
                        : "Total"}
                  </th>
                  {resource === "invoices" && <th>Estado</th>}
                  <th className="right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {query.data.items.map((i: any) => (
                  <tr key={i._id}>
                    <td>
                      <strong>{i.name || i.number}</strong>
                      {resource === "invoices" && (
                        <small>Vence {i.dueDate}</small>
                      )}
                    </td>
                    <td>{i.email || i.kind || i.clientName || "—"}</td>
                    <td>
                      {resource === "clients"
                        ? i.taxId || "—"
                        : euro(i.priceCents ?? i.totalCents)}
                    </td>
                    {resource === "invoices" && (
                      <td>
                        <Status value={i.status} />
                      </td>
                    )}
                    <td>
                      <div className="actions">
                        {resource === "invoices" && (
                          <a
                            className="icon"
                            aria-label="Descargar PDF"
                            href={`/api/invoices/${i._id}/pdf`}
                          >
                            <Download size={17} />
                          </a>
                        )}
                        {admin && (
                          <>
                            <button
                              className="icon"
                              aria-label="Editar registro"
                              onClick={() => setEditing(i)}
                            >
                              <Pencil size={16} />
                            </button>
                            <button
                              className="icon danger"
                              aria-label="Eliminar registro"
                              onClick={async () => {
                                if (
                                  !window.confirm(
                                    "¿Eliminar este registro de forma permanente?",
                                  )
                                )
                                  return;
                                try {
                                  await api(`/${resource}/${i._id}`, {
                                    method: "DELETE",
                                  });
                                  toast.success("Registro eliminado");
                                  invalidate();
                                } catch (e) {
                                  toast.error((e as Error).message);
                                }
                              }}
                            >
                              <Trash2 size={16} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="pagination">
          <span>
            Página {page} de{" "}
            {Math.max(1, Math.ceil((query.data?.total || 0) / 10))}
          </span>
          <div>
            <button
              className="secondary"
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
            >
              Anterior
            </button>
            <button
              className="secondary"
              disabled={page * 10 >= (query.data?.total || 0)}
              onClick={() => setPage(page + 1)}
            >
              Siguiente
            </button>
          </div>
        </div>
      </section>
      {editing && (
        <Editor
          resource={resource}
          item={editing}
          close={() => setEditing(null)}
          saved={invalidate}
        />
      )}
    </>
  );
}
function Editor({
  resource,
  item,
  close,
  saved,
}: {
  resource: string;
  item: any;
  close: () => void;
  saved: () => void;
}) {
  const clients = useQuery({
    queryKey: ["client-options"],
    queryFn: async () => {
      let page = 1;
      let all: any[] = [];
      for (;;) {
        const d = await api(`/clients?page=${page}`);
        all = all.concat(d.items);
        if (all.length >= d.total) break;
        page++;
      }
      return all;
    },
    enabled: resource === "invoices",
  });
  const settings = useQuery({
    queryKey: ["settings"],
    queryFn: () => api("/settings"),
  });
  const [lines, setLines] = useState<any[]>(
    item.lines || [{ name: "", quantity: 1, priceCents: 0 }],
  );
  const [busy, setBusy] = useState(false);
  const form = useForm<any>({
    defaultValues: {
      ...item,
      taxBps: item.taxBps ?? settings.data?.taxBps ?? 2100,
      kind: item.kind || "servicio",
      status: item.status || "pendiente",
    },
  });
  const field = form.register;
  const dialog = React.useRef<HTMLElement>(null);
  React.useEffect(() => {
    if (!item._id && settings.data && !form.getFieldState("taxBps").isDirty) {
      form.setValue("taxBps", settings.data.taxBps);
    }
  }, [settings.data, item._id, form]);
  React.useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const container = dialog.current;
    const controls = () =>
      Array.from(
        container?.querySelectorAll<HTMLElement>(
          'button:not(:disabled), input, select, [tabindex="0"]',
        ) || [],
      );
    controls()[0]?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
      if (event.key !== "Tab") return;
      const nodes = controls();
      if (event.shiftKey && document.activeElement === nodes[0]) {
        event.preventDefault();
        nodes.at(-1)?.focus();
      } else if (!event.shiftKey && document.activeElement === nodes.at(-1)) {
        event.preventDefault();
        nodes[0]?.focus();
      }
    };
    container?.addEventListener("keydown", handleKey);
    return () => {
      container?.removeEventListener("keydown", handleKey);
      previous?.focus();
    };
  }, [close]);
  return (
    <div className="modal-backdrop">
      <section
        ref={dialog}
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="editor-title"
      >
        <div className="section-title">
          <h2 id="editor-title">
            {item._id ? "Editar" : "Crear"} · {labels[resource]}
          </h2>
          <button
            aria-label="Cerrar formulario"
            className="icon"
            onClick={close}
          >
            <X />
          </button>
        </div>
        <form
          onSubmit={form.handleSubmit(async (values) => {
            setBusy(true);
            try {
              const name = z
                .string()
                .trim()
                .min(1, "El nombre es obligatorio")
                .max(160);
              if (resource === "clients") {
                values = z
                  .object({
                    name,
                    email: z.union([z.email(), z.literal("")]),
                    taxId: z.string().max(40),
                    address: z.string().max(300),
                  })
                  .parse(values);
              } else if (resource === "products") {
                values = z
                  .object({
                    name,
                    priceCents: z.number().int().min(0).max(100000000),
                    kind: z.enum(["producto", "servicio"]),
                  })
                  .parse(values);
              } else {
                values = z
                  .object({
                    clientId: z.string().regex(/^[a-f0-9]{24}$/),
                    dueDate: z.iso.date(),
                    status: z.enum(["pendiente", "pagada"]),
                    taxBps: z.number().int().min(0).max(10000),
                  })
                  .parse(values);
              }
              if (resource === "invoices") {
                values.lines = z
                  .array(
                    z.object({
                      name: z.string().trim().min(1),
                      quantity: z.number().int().positive(),
                      priceCents: z.number().int().nonnegative(),
                    }),
                  )
                  .min(1)
                  .parse(lines);
              }
              await api(`/${resource}${item._id ? `/${item._id}` : ""}`, {
                method: item._id ? "PUT" : "POST",
                body: JSON.stringify(values),
              });
              toast.success("Cambios guardados");
              saved();
              close();
            } catch (e) {
              toast.error((e as Error).message);
            } finally {
              setBusy(false);
            }
          })}
        >
          {resource !== "invoices" ? (
            <>
              <label>
                Nombre
                <input autoFocus required maxLength={160} {...field("name")} />
              </label>
              {resource === "clients" ? (
                <>
                  <label>
                    Correo
                    <input type="email" {...field("email")} />
                  </label>
                  <label>
                    Identificación fiscal
                    <input maxLength={40} {...field("taxId")} />
                  </label>
                  <label>
                    Dirección
                    <input maxLength={300} {...field("address")} />
                  </label>
                </>
              ) : (
                <>
                  <label>
                    Precio en céntimos
                    <input
                      type="number"
                      min="0"
                      max="100000000"
                      step="1"
                      required
                      {...field("priceCents", { valueAsNumber: true })}
                    />
                  </label>
                  <label>
                    Tipo
                    <select {...field("kind")}>
                      <option value="servicio">Servicio</option>
                      <option value="producto">Producto</option>
                    </select>
                  </label>
                </>
              )}
            </>
          ) : (
            <>
              <label>
                Cliente
                <select required {...field("clientId")}>
                  <option value="">Seleccionar cliente</option>
                  {clients.data?.map((c: any) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              {clients.error && <ErrorBox error={clients.error} />}
              <label>
                Vencimiento
                <input required type="date" {...field("dueDate")} />
              </label>
              <label>
                Estado
                <select {...field("status")}>
                  <option value="pendiente">Pendiente</option>
                  <option value="pagada">Pagada</option>
                </select>
              </label>
              <label>
                Impuesto en puntos básicos (2100 = 21%)
                <input
                  type="number"
                  required
                  min="0"
                  max="10000"
                  {...field("taxBps", { valueAsNumber: true })}
                />
              </label>
              <fieldset>
                <legend>Conceptos de la factura</legend>
                {lines.map((line, index) => (
                  <div className="invoice-line" key={index}>
                    <label>
                      Descripción
                      <input
                        required
                        maxLength={160}
                        value={line.name}
                        onChange={(e) =>
                          setLines(
                            lines.map((l, n) =>
                              n === index ? { ...l, name: e.target.value } : l,
                            ),
                          )
                        }
                      />
                    </label>
                    <label>
                      Unidades
                      <input
                        required
                        type="number"
                        min="1"
                        max="10000"
                        value={line.quantity}
                        onChange={(e) =>
                          setLines(
                            lines.map((l, n) =>
                              n === index
                                ? { ...l, quantity: Number(e.target.value) }
                                : l,
                            ),
                          )
                        }
                      />
                    </label>
                    <label>
                      Céntimos/unidad
                      <input
                        required
                        type="number"
                        min="0"
                        max="100000000"
                        value={line.priceCents}
                        onChange={(e) =>
                          setLines(
                            lines.map((l, n) =>
                              n === index
                                ? { ...l, priceCents: Number(e.target.value) }
                                : l,
                            ),
                          )
                        }
                      />
                    </label>
                    <button
                      type="button"
                      className="icon"
                      aria-label="Quitar concepto"
                      disabled={lines.length === 1}
                      onClick={() =>
                        setLines(lines.filter((_, n) => n !== index))
                      }
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="secondary"
                  onClick={() =>
                    setLines([
                      ...lines,
                      { name: "", quantity: 1, priceCents: 0 },
                    ])
                  }
                >
                  Añadir concepto
                </button>
              </fieldset>
              <p>
                Base estimada:{" "}
                {euro(lines.reduce((s, l) => s + l.quantity * l.priceCents, 0))}
                . El servidor calcula y valida el importe final.
              </p>
            </>
          )}
          <div className="form-actions">
            <button type="button" className="secondary" onClick={close}>
              Cancelar
            </button>
            <button disabled={busy || clients.isFetching}>
              {busy ? "Guardando…" : "Guardar cambios"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
function SettingsPage({ me }: { me: any }) {
  const q = useQuery({
    queryKey: ["settings"],
    queryFn: () => api("/settings"),
  });
  const profile = useForm({ defaultValues: { name: me.name } });
  const [saving, setSaving] = useState(false);
  const users = useQuery({
    queryKey: ["users"],
    queryFn: () => api("/users"),
    enabled: me.role === "admin",
  });
  async function submit(path: string, body: any) {
    setSaving(true);
    try {
      await api(path, {
        method: path === "/users" ? "POST" : "PATCH",
        body: JSON.stringify(body),
      });
      await qc.invalidateQueries();
      toast.success("Cambios guardados");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }
  return (
    <>
      <Heading
        title="Configuración"
        subtitle="Tu perfil, tu equipo y los detalles de tu empresa."
      />
      <div className="settings-grid">
        <section className="card settings">
          <h2>Mi perfil</h2>
          <p>
            {me.email} · {me.role}
          </p>
          <form onSubmit={profile.handleSubmit((v) => submit("/me", v))}>
            <label>
              Nombre
              <input required maxLength={160} {...profile.register("name")} />
            </label>
            <button disabled={saving}>Guardar perfil</button>
          </form>
        </section>
        {me.role === "admin" && (
          <section className="card settings">
            <h2>Organización</h2>
            {q.isPending ? (
              <Loading />
            ) : q.error ? (
              <ErrorBox error={q.error} />
            ) : (
              <form
                key={q.data.updatedAt}
                onSubmit={(e) => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget);
                  void submit("/settings", {
                    name: f.get("name"),
                    address: f.get("address"),
                    taxBps: Number(f.get("taxBps")),
                  });
                }}
              >
                <label>
                  Nombre
                  <input name="name" required defaultValue={q.data.name} />
                </label>
                <label>
                  Dirección
                  <input
                    name="address"
                    maxLength={300}
                    defaultValue={q.data.address}
                  />
                </label>
                <label>
                  Impuesto por defecto (puntos básicos)
                  <input
                    type="number"
                    name="taxBps"
                    required
                    min="0"
                    max="10000"
                    defaultValue={q.data.taxBps}
                  />
                </label>
                <button disabled={saving}>Guardar organización</button>
              </form>
            )}
          </section>
        )}
      </div>
      {me.role === "admin" && (
        <section className="card settings">
          <h2>Equipo</h2>
          {users.error && <ErrorBox error={users.error} />}
          <ul>
            {users.data?.map((u: any) => (
              <li key={u._id}>
                {u.name} · {u.email} · {u.role}
              </li>
            ))}
          </ul>
          <h3>Crear usuario</h3>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const element = e.currentTarget;
              const values = Object.fromEntries(new FormData(element));
              await submit("/users", values);
            }}
          >
            <div className="settings-grid">
              <label>
                Nombre
                <input name="name" required maxLength={160} />
              </label>
              <label>
                Correo
                <input name="email" required type="email" />
              </label>
              <label>
                Contraseña inicial
                <input
                  name="password"
                  required
                  type="password"
                  minLength={12}
                  maxLength={72}
                />
              </label>
              <label>
                Rol
                <select name="role">
                  <option value="empleado">Empleado</option>
                  <option value="admin">Administrador</option>
                </select>
              </label>
            </div>
            <button disabled={saving}>Crear usuario</button>
          </form>
        </section>
      )}
    </>
  );
}
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Auth />} />
          <Route path="/*" element={<Shell />} />
        </Routes>
      </BrowserRouter>
      <Toaster richColors expand position="top-right" />
    </QueryClientProvider>
  </React.StrictMode>,
);
