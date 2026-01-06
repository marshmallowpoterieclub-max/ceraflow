import { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ExportDialog } from "@/components/ExportDialog";
import type { Transaction } from "@/hooks/useTransactions";

interface ExportButtonProps {
  transactions: Transaction[];
}

export function ExportButton({ transactions }: ExportButtonProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsDialogOpen(true)}
        disabled={!transactions.length}
        className="gap-2"
      >
        <Download className="h-4 w-4" />
        Exporter
      </Button>

      <ExportDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        transactions={transactions}
      />
    </>
  );
}
