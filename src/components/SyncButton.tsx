import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

interface SyncButtonProps {
  source: "sumup" | "stripe";
  label: string;
}

export function SyncButton({ source, label }: SyncButtonProps) {
  const [isSyncing, setIsSyncing] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleSync = async () => {
    setIsSyncing(true);
    
    try {
      const { data, error } = await supabase.functions.invoke(`sync-${source}`);
      
      if (error) {
        throw error;
      }

      toast({
        title: "Synchronisation réussie",
        description: `${data.synced} nouvelle(s) transaction(s) importée(s), ${data.skipped} ignorée(s).`,
      });

      // Refresh the transactions data
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["transaction-stats"] });
    } catch (error) {
      console.error(`Error syncing ${source}:`, error);
      toast({
        title: "Erreur de synchronisation",
        description: error instanceof Error ? error.message : "Une erreur est survenue",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleSync}
      disabled={isSyncing}
      className="gap-2"
    >
      <RefreshCw className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`} />
      {isSyncing ? "Synchronisation..." : label}
    </Button>
  );
}
