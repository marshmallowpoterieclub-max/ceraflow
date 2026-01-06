import { Button } from "@/components/ui/button";

export type TimeRange = "7days" | "30days" | "6months" | "12months";

interface TimeRangeFilterProps {
  value: TimeRange;
  onChange: (value: TimeRange) => void;
}

const TIME_RANGES: { value: TimeRange; label: string }[] = [
  { value: "7days", label: "7 jours" },
  { value: "30days", label: "30 jours" },
  { value: "6months", label: "6 mois" },
  { value: "12months", label: "12 mois" },
];

export function TimeRangeFilter({ value, onChange }: TimeRangeFilterProps) {
  return (
    <div className="flex gap-2">
      {TIME_RANGES.map((range) => (
        <Button
          key={range.value}
          variant={value === range.value ? "default" : "outline"}
          size="sm"
          onClick={() => onChange(range.value)}
        >
          {range.label}
        </Button>
      ))}
    </div>
  );
}
