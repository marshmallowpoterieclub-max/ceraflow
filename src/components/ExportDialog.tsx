import { useState, useMemo, useEffect } from "react";
import { Download, CalendarIcon, Search } from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths, startOfYear } from "date-fns";
import { fr } from "date-fns/locale";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { Transaction } from "@/hooks/useTransactions";

type DatePreset = "this-month" | "last-month" | "this-year" | "all" | "custom";
type SourceType = "stripe" | "sumup" | "cash" | "other";

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transactions: Transaction[];
}

const SOURCE_OPTIONS: { value: SourceType; label: string }[] = [
  { value: "stripe", label: "Stripe" },
  { value: "sumup", label: "SumUp" },
  { value: "cash", label: "Espèces" },
  { value: "other", label: "Autre" },
];

const DATE_PRESETS: { value: DatePreset; label: string }[] = [
  { value: "this-month", label: "Ce mois" },
  { value: "last-month", label: "Mois dernier" },
  { value: "this-year", label: "Cette année" },
  { value: "all", label: "Tout" },
];

export function ExportDialog({ open, onOpenChange, transactions }: ExportDialogProps) {
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);

  // Date filters
  const [datePreset, setDatePreset] = useState<DatePreset>("all");
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);

  // Other filters
  const [selectedSources, setSelectedSources] = useState<SourceType[]>(["stripe", "sumup", "cash", "other"]);
  const [searchQuery, setSearchQuery] = useState("");
  const [amountMin, setAmountMin] = useState("");
  const [amountMax, setAmountMax] = useState("");

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Apply date preset
  const applyDatePreset = (preset: DatePreset) => {
    setDatePreset(preset);
    const now = new Date();

    switch (preset) {
      case "this-month":
        setDateFrom(startOfMonth(now));
        setDateTo(now);
        break;
      case "last-month":
        const lastMonth = subMonths(now, 1);
        setDateFrom(startOfMonth(lastMonth));
        setDateTo(endOfMonth(lastMonth));
        break;
      case "this-year":
        setDateFrom(startOfYear(now));
        setDateTo(now);
        break;
      case "all":
        setDateFrom(undefined);
        setDateTo(undefined);
        break;
      case "custom":
        // Keep current dates
        break;
    }
  };

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      // Date filter
      if (dateFrom || dateTo) {
        const txDate = new Date(t.transaction_date);
        if (dateFrom && txDate < dateFrom) return false;
        if (dateTo) {
          const endOfDay = new Date(dateTo);
          endOfDay.setHours(23, 59, 59, 999);
          if (txDate > endOfDay) return false;
        }
      }

      // Source filter
      if (!selectedSources.includes(t.source as SourceType)) return false;

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = t.customer_name?.toLowerCase().includes(query);
        const matchesDesc = t.description?.toLowerCase().includes(query);
        if (!matchesName && !matchesDesc) return false;
      }

      // Amount filter
      const minVal = parseFloat(amountMin);
      const maxVal = parseFloat(amountMax);
      if (!isNaN(minVal) && t.amount < minVal) return false;
      if (!isNaN(maxVal) && t.amount > maxVal) return false;

      return true;
    });
  }, [transactions, dateFrom, dateTo, selectedSources, searchQuery, amountMin, amountMax]);

  // Auto-select all filtered transactions when filters change
  useEffect(() => {
    setSelectedIds(new Set(filteredTransactions.map((t) => t.id)));
  }, [filteredTransactions]);

  // Selected transactions
  const selectedTransactions = useMemo(() => {
    return filteredTransactions.filter((t) => selectedIds.has(t.id));
  }, [filteredTransactions, selectedIds]);

  // Calculate totals
  const selectedTotal = useMemo(() => {
    return selectedTransactions.reduce((sum, t) => sum + t.amount, 0);
  }, [selectedTransactions]);

  const toggleTransaction = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const toggleAll = () => {
    if (selectedIds.size === filteredTransactions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredTransactions.map((t) => t.id)));
    }
  };

  const toggleSource = (source: SourceType) => {
    setSelectedSources((prev) =>
      prev.includes(source) ? prev.filter((s) => s !== source) : [...prev, source]
    );
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
    }).format(value);
  };

  const formatDateDisplay = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const getSourceLabel = (source: string) => {
    const labels: Record<string, string> = {
      stripe: "Stripe",
      sumup: "SumUp",
      cash: "Espèces",
      other: "Autre",
    };
    return labels[source] || source;
  };

  const handleExport = async () => {
    if (selectedTransactions.length === 0) {
      toast({
        title: "Aucune transaction",
        description: "Veuillez sélectionner au moins une transaction à exporter.",
        variant: "destructive",
      });
      return;
    }

    setIsExporting(true);

    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();

      // Title
      doc.setFontSize(24);
      doc.setFont("helvetica", "bold");
      doc.text("Céramique Studio", pageWidth / 2, 25, { align: "center" });

      doc.setFontSize(14);
      doc.setFont("helvetica", "normal");
      doc.text("Livre de Recettes", pageWidth / 2, 35, { align: "center" });

      // Date of export & period
      doc.setFontSize(10);
      doc.setTextColor(128, 128, 128);

      let periodText = "";
      if (dateFrom && dateTo) {
        periodText = ` (du ${format(dateFrom, "dd/MM/yyyy")} au ${format(dateTo, "dd/MM/yyyy")})`;
      } else if (dateFrom) {
        periodText = ` (à partir du ${format(dateFrom, "dd/MM/yyyy")})`;
      } else if (dateTo) {
        periodText = ` (jusqu'au ${format(dateTo, "dd/MM/yyyy")})`;
      }

      doc.text(
        `Exporté le ${new Date().toLocaleDateString("fr-FR", {
          day: "2-digit",
          month: "long",
          year: "numeric",
        })}${periodText}`,
        pageWidth / 2,
        43,
        { align: "center" }
      );

      // Stats summary
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Récapitulatif", 14, 58);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      const statsY = 66;
      const statsLineHeight = 7;

      // Calculate stats from selected transactions
      const stripeTotal = selectedTransactions
        .filter((t) => t.source === "stripe")
        .reduce((sum, t) => sum + t.amount, 0);
      const sumupTotal = selectedTransactions
        .filter((t) => t.source === "sumup")
        .reduce((sum, t) => sum + t.amount, 0);
      const cashTotal = selectedTransactions
        .filter((t) => t.source === "cash")
        .reduce((sum, t) => sum + t.amount, 0);

      doc.text(`Recettes totales: ${formatCurrency(selectedTotal)}`, 14, statsY);
      doc.text(`Via Stripe: ${formatCurrency(stripeTotal)}`, 14, statsY + statsLineHeight);
      doc.text(`Via SumUp: ${formatCurrency(sumupTotal)}`, 14, statsY + statsLineHeight * 2);
      doc.text(`Via Espèces: ${formatCurrency(cashTotal)}`, 14, statsY + statsLineHeight * 3);
      doc.text(`Nombre de transactions: ${selectedTransactions.length}`, 14, statsY + statsLineHeight * 4);

      // Transactions table
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Détail des transactions", 14, statsY + statsLineHeight * 6);

      const tableData = selectedTransactions.map((t) => [
        formatDateDisplay(t.transaction_date),
        t.description || "-",
        t.customer_name || "-",
        getSourceLabel(t.source),
        formatCurrency(t.amount),
      ]);

      autoTable(doc, {
        startY: statsY + statsLineHeight * 7,
        head: [["Date", "Description", "Client", "Source", "Montant"]],
        body: tableData,
        styles: {
          fontSize: 9,
          cellPadding: 3,
        },
        headStyles: {
          fillColor: [79, 70, 229],
          textColor: 255,
          fontStyle: "bold",
        },
        columnStyles: {
          0: { cellWidth: 25 },
          1: { cellWidth: 55 },
          2: { cellWidth: 40 },
          3: { cellWidth: 25 },
          4: { cellWidth: 30, halign: "right" },
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252],
        },
      });

      // Save the PDF
      const filename = `livre-recettes-${new Date().toISOString().split("T")[0]}.pdf`;
      doc.save(filename);

      toast({
        title: "Export réussi",
        description: `Le fichier ${filename} a été téléchargé.`,
      });

      onOpenChange(false);
    } catch (error) {
      console.error("Error exporting PDF:", error);
      toast({
        title: "Erreur d'export",
        description: error instanceof Error ? error.message : "Une erreur est survenue",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Exporter le livre de recettes</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Period section */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Période</Label>
            <div className="flex flex-wrap gap-2">
              {DATE_PRESETS.map((preset) => (
                <Button
                  key={preset.value}
                  variant={datePreset === preset.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => applyDatePreset(preset.value)}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Du:</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(
                        "w-[140px] justify-start text-left font-normal",
                        !dateFrom && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateFrom ? format(dateFrom, "dd/MM/yyyy") : "Début"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dateFrom}
                      onSelect={(date) => {
                        setDateFrom(date);
                        setDatePreset("custom");
                      }}
                      locale={fr}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Au:</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(
                        "w-[140px] justify-start text-left font-normal",
                        !dateTo && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateTo ? format(dateTo, "dd/MM/yyyy") : "Fin"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dateTo}
                      onSelect={(date) => {
                        setDateTo(date);
                        setDatePreset("custom");
                      }}
                      locale={fr}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>

          {/* Filters section */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Filtres</Label>

            {/* Sources */}
            <div className="flex flex-wrap gap-3">
              {SOURCE_OPTIONS.map((source) => (
                <label
                  key={source.value}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <Checkbox
                    checked={selectedSources.includes(source.value)}
                    onCheckedChange={() => toggleSource(source.value)}
                  />
                  <span className="text-sm">{source.label}</span>
                </label>
              ))}
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par nom ou description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Amount range */}
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Montant min:</span>
                <Input
                  type="number"
                  placeholder="0"
                  value={amountMin}
                  onChange={(e) => setAmountMin(e.target.value)}
                  className="w-24"
                />
                <span className="text-sm text-muted-foreground">€</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Max:</span>
                <Input
                  type="number"
                  placeholder="∞"
                  value={amountMax}
                  onChange={(e) => setAmountMax(e.target.value)}
                  className="w-24"
                />
                <span className="text-sm text-muted-foreground">€</span>
              </div>
            </div>
          </div>

          {/* Transactions list */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">
                Transactions ({selectedIds.size} / {filteredTransactions.length} sélectionnées)
              </Label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={selectedIds.size === filteredTransactions.length && filteredTransactions.length > 0}
                  onCheckedChange={toggleAll}
                />
                <span className="text-sm">Tout sélectionner</span>
              </label>
            </div>

            <div className="border rounded-md max-h-60 overflow-y-auto">
              {filteredTransactions.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground text-sm">
                  Aucune transaction ne correspond aux filtres
                </div>
              ) : (
                <div className="divide-y">
                  {filteredTransactions.map((t) => (
                    <label
                      key={t.id}
                      className="flex items-center gap-3 p-3 hover:bg-muted/50 cursor-pointer"
                    >
                      <Checkbox
                        checked={selectedIds.has(t.id)}
                        onCheckedChange={() => toggleTransaction(t.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">
                            {formatDateDisplay(t.transaction_date)}
                          </span>
                          <span className="text-xs px-1.5 py-0.5 rounded bg-muted">
                            {getSourceLabel(t.source)}
                          </span>
                        </div>
                        <div className="text-sm text-muted-foreground truncate">
                          {t.description || "Sans description"}
                          {t.customer_name && ` - ${t.customer_name}`}
                        </div>
                      </div>
                      <span className="text-sm font-medium whitespace-nowrap">
                        {formatCurrency(t.amount)}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Summary */}
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Total sélectionné</span>
              <span className="text-lg font-bold">{formatCurrency(selectedTotal)}</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            onClick={handleExport}
            disabled={isExporting || selectedTransactions.length === 0}
            className="gap-2"
          >
            <Download className={`h-4 w-4 ${isExporting ? "animate-pulse" : ""}`} />
            {isExporting ? "Export..." : "Exporter PDF"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
