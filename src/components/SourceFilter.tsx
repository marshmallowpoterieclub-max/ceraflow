import { cn } from "@/lib/utils";

interface SourceFilterProps {
  selectedSource: string | null;
  onSourceChange: (source: string | null) => void;
}

const sources = [
  { id: null, label: "Toutes", color: "bg-secondary text-secondary-foreground" },
  { id: "stripe", label: "Stripe", color: "bg-stripe text-stripe-foreground" },
  { id: "sumup", label: "SumUp", color: "bg-sumup text-sumup-foreground" },
  { id: "cash", label: "Espèces", color: "bg-cash text-cash-foreground" },
];

export function SourceFilter({ selectedSource, onSourceChange }: SourceFilterProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {sources.map((source) => (
        <button
          key={source.id ?? "all"}
          onClick={() => onSourceChange(source.id)}
          className={cn(
            "rounded-full px-4 py-2 text-sm font-medium transition-all duration-200",
            selectedSource === source.id
              ? source.color
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          )}
        >
          {source.label}
        </button>
      ))}
    </div>
  );
}
