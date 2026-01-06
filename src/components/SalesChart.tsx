import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  format,
  startOfMonth,
  eachDayOfInterval,
  eachMonthOfInterval,
  subDays,
  subMonths,
} from "date-fns";
import { fr } from "date-fns/locale";
import type { Transaction } from "@/hooks/useTransactions";
import type { TimeRange } from "@/components/TimeRangeFilter";

type Granularity = "day" | "month";

interface SalesChartProps {
  transactions: Transaction[];
  timeRange: TimeRange;
}

export function SalesChart({ transactions, timeRange }: SalesChartProps) {

  const chartData = useMemo(() => {
    const now = new Date();
    let startDate: Date;
    let granularity: Granularity;
    let intervals: Date[];

    // Determine date range and granularity
    switch (timeRange) {
      case "7days":
        startDate = subDays(now, 6);
        granularity = "day";
        intervals = eachDayOfInterval({ start: startDate, end: now });
        break;
      case "30days":
        startDate = subDays(now, 29);
        granularity = "day";
        intervals = eachDayOfInterval({ start: startDate, end: now });
        break;
      case "6months":
        startDate = subMonths(now, 5);
        granularity = "month";
        intervals = eachMonthOfInterval({ start: startOfMonth(startDate), end: now });
        break;
      case "12months":
        startDate = subMonths(now, 11);
        granularity = "month";
        intervals = eachMonthOfInterval({ start: startOfMonth(startDate), end: now });
        break;
    }

    // Create buckets for each interval
    const buckets = new Map<string, { stripe: number; sumup: number; cash: number; other: number }>();

    intervals.forEach((date) => {
      const key = granularity === "day"
        ? format(date, "yyyy-MM-dd")
        : format(date, "yyyy-MM");
      buckets.set(key, { stripe: 0, sumup: 0, cash: 0, other: 0 });
    });

    // Fill buckets with transaction data
    transactions.forEach((t) => {
      const txDate = new Date(t.transaction_date);
      if (txDate < startDate || txDate > now) return;

      const key = granularity === "day"
        ? format(txDate, "yyyy-MM-dd")
        : format(txDate, "yyyy-MM");

      const bucket = buckets.get(key);
      if (bucket) {
        bucket[t.source] = (bucket[t.source] || 0) + t.amount;
      }
    });

    // Convert to array for chart
    return Array.from(buckets.entries()).map(([key, values]) => {
      const date = new Date(key + (granularity === "day" ? "" : "-01"));
      return {
        date: key,
        label: granularity === "day"
          ? format(date, "d MMM", { locale: fr })
          : format(date, "MMM yyyy", { locale: fr }),
        stripe: Math.round(values.stripe * 100) / 100,
        sumup: Math.round(values.sumup * 100) / 100,
        cash: Math.round(values.cash * 100) / 100,
        other: Math.round(values.other * 100) / 100,
        total: Math.round((values.stripe + values.sumup + values.cash + values.other) * 100) / 100,
      };
    });
  }, [transactions, timeRange]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(value);
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;

    const total = payload.reduce((sum: number, p: any) => sum + (p.value || 0), 0);

    return (
      <div className="bg-popover border rounded-lg shadow-lg p-3 text-sm">
        <p className="font-medium mb-2">{label}</p>
        {payload.map((p: any) => (
          p.value > 0 && (
            <div key={p.dataKey} className="flex justify-between gap-4">
              <span style={{ color: p.color }}>{p.name}</span>
              <span className="font-medium">{formatCurrency(p.value)}</span>
            </div>
          )
        ))}
        <div className="border-t mt-2 pt-2 flex justify-between gap-4 font-medium">
          <span>Total</span>
          <span>{formatCurrency(total)}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="rounded-xl bg-card p-6 shadow-card">
      <div className="mb-6">
        <h3 className="text-lg font-medium">Evolution des ventes</h3>
      </div>

      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              interval={timeRange === "30days" ? 4 : 0}
              angle={timeRange === "30days" ? -45 : 0}
              textAnchor={timeRange === "30days" ? "end" : "middle"}
              height={timeRange === "30days" ? 60 : 30}
            />
            <YAxis
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `${value}€`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Bar
              dataKey="stripe"
              name="Stripe"
              stackId="a"
              fill="hsl(250, 55%, 60%)"
              radius={[0, 0, 0, 0]}
            />
            <Bar
              dataKey="sumup"
              name="SumUp"
              stackId="a"
              fill="hsl(170, 50%, 45%)"
              radius={[0, 0, 0, 0]}
            />
            <Bar
              dataKey="cash"
              name="Especes"
              stackId="a"
              fill="hsl(40, 70%, 50%)"
              radius={[0, 0, 0, 0]}
            />
            <Bar
              dataKey="other"
              name="Autre"
              stackId="a"
              fill="hsl(0, 0%, 60%)"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
