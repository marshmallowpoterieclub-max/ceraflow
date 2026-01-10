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
  ReferenceArea,
} from "recharts";
import {
  format,
  startOfMonth,
  eachDayOfInterval,
  eachMonthOfInterval,
  subDays,
  subMonths,
  getISOWeek,
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
    const entries = Array.from(buckets.entries());
    let lastMonth = -1;

    return entries.map(([key, values]) => {
      const date = new Date(key + (granularity === "day" ? "" : "-01"));
      let label: string;
      if (granularity === "day") {
        const currentMonth = date.getMonth();
        const dayLetter = format(date, "EEEEE", { locale: fr }).toUpperCase();
        const dayNum = format(date, "d", { locale: fr });

        // Show month abbreviation on first day of month or first entry of a new month
        if (currentMonth !== lastMonth) {
          const monthAbbr = format(date, "MMM", { locale: fr });
          label = `${monthAbbr} ${dayLetter}${dayNum}`;
          lastMonth = currentMonth;
        } else {
          label = `${dayLetter}${dayNum}`;
        }
      } else {
        label = format(date, "MMM yyyy", { locale: fr });
      }
      return {
        date: key,
        label,
        weekNumber: granularity === "day" ? getISOWeek(date) : undefined,
        stripe: Math.round(values.stripe * 100) / 100,
        sumup: Math.round(values.sumup * 100) / 100,
        cash: Math.round(values.cash * 100) / 100,
        other: Math.round(values.other * 100) / 100,
        total: Math.round((values.stripe + values.sumup + values.cash + values.other) * 100) / 100,
      };
    });
  }, [transactions, timeRange]);

  // Calculate month spans for 30 days view (for month indicator bars)
  const monthSpans = useMemo(() => {
    if (timeRange !== "30days" || chartData.length === 0) return [];

    const spans: { startIndex: number; endIndex: number; month: string; isOdd: boolean }[] = [];
    let currentMonth = chartData[0].date.substring(0, 7); // yyyy-MM
    let spanStart = 0;

    for (let i = 1; i < chartData.length; i++) {
      const itemMonth = chartData[i].date.substring(0, 7);
      if (itemMonth !== currentMonth) {
        const monthDate = new Date(currentMonth + "-01");
        spans.push({
          startIndex: spanStart,
          endIndex: i - 1,
          month: format(monthDate, "MMMM", { locale: fr }),
          isOdd: monthDate.getMonth() % 2 === 1,
        });
        spanStart = i;
        currentMonth = itemMonth;
      }
    }
    // Add the last span
    const lastMonthDate = new Date(currentMonth + "-01");
    spans.push({
      startIndex: spanStart,
      endIndex: chartData.length - 1,
      month: format(lastMonthDate, "MMMM", { locale: fr }),
      isOdd: lastMonthDate.getMonth() % 2 === 1,
    });

    return spans;
  }, [chartData, timeRange]);

  // Calculate week spans for 30 days view (for alternating background colors)
  const weekSpans = useMemo(() => {
    if (timeRange !== "30days" || chartData.length === 0) return [];

    const spans: { x1: string; x2: string; isOdd: boolean }[] = [];
    let currentWeek = chartData[0].weekNumber;
    let spanStartLabel = chartData[0].label;
    let weekIndex = 0;

    for (let i = 1; i < chartData.length; i++) {
      const itemWeek = chartData[i].weekNumber;
      if (itemWeek !== currentWeek) {
        spans.push({
          x1: spanStartLabel,
          x2: chartData[i - 1].label,
          isOdd: weekIndex % 2 === 1,
        });
        spanStartLabel = chartData[i].label;
        currentWeek = itemWeek;
        weekIndex++;
      }
    }
    // Add the last span
    spans.push({
      x1: spanStartLabel,
      x2: chartData[chartData.length - 1].label,
      isOdd: weekIndex % 2 === 1,
    });

    return spans;
  }, [chartData, timeRange]);

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

      {/* Month indicator bar for 30 days view */}
      {timeRange === "30days" && monthSpans.length > 0 && (
        <div className="flex mb-2 ml-[40px] mr-[10px]">
          {monthSpans.map((span, index) => {
            const width = ((span.endIndex - span.startIndex + 1) / chartData.length) * 100;
            return (
              <div
                key={index}
                className="h-5 flex items-center justify-center text-xs font-medium rounded-sm"
                style={{
                  width: `${width}%`,
                  backgroundColor: span.isOdd ? "hsl(340, 60%, 92%)" : "hsl(210, 60%, 92%)",
                  color: span.isOdd ? "hsl(340, 50%, 40%)" : "hsl(210, 50%, 40%)",
                }}
              >
                {span.month}
              </div>
            );
          })}
        </div>
      )}

      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            {/* Alternating week backgrounds for 30 days view */}
            {timeRange === "30days" && weekSpans.map((span, index) => (
              <ReferenceArea
                key={`week-${index}`}
                x1={span.x1}
                x2={span.x2}
                fill={span.isOdd ? "hsl(210, 30%, 95%)" : "transparent"}
                fillOpacity={1}
                ifOverflow="visible"
              />
            ))}
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: timeRange === "30days" ? 10 : 12 }}
              tickLine={false}
              axisLine={false}
              interval={0}
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
