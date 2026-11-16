import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { euro } from "./api";
export default function IncomeChart({
  data,
}: {
  data: { month: string; ingresos: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={270}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="income" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7564f6" stopOpacity={0.22} />
            <stop offset="100%" stopColor="#7564f6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid
          strokeDasharray="4 4"
          vertical={false}
          stroke="var(--border)"
        />
        <XAxis
          dataKey="month"
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 11, fill: "#8b8b9e" }}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 11, fill: "#8b8b9e" }}
          width={55}
        />
        <Tooltip formatter={(v) => euro(Number(v) * 100)} />
        <Area
          isAnimationActive={
            !window.matchMedia("(prefers-reduced-motion: reduce)").matches
          }
          type="monotone"
          dataKey="ingresos"
          stroke="#7564f6"
          strokeWidth={3}
          fill="url(#income)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
