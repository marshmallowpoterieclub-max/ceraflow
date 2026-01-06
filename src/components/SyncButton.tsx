import { useState, useRef } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

const CERAMIQUE_QUOTES = [
  "On tourne, on tourne...",
  "Patience, ça sèche...",
  "Le tour est lancé !",
  "On pétrit les données...",
  "Cuisson en cours... 1280°C",
  "L'argile prend forme...",
  "On émaille les transactions...",
  "Séchage à l'air libre...",
  "On centre la pièce...",
  "Le four chauffe doucement...",
  "On lisse les bords...",
  "Défournement imminent...",
];

export function SyncButton() {
  const [isSyncing, setIsSyncing] = useState(false);
  const queryClient = useQueryClient();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const handleSync = async () => {
    setIsSyncing(true);
    let quoteIndex = 0;

    // Afficher le toast initial avec la première citation
    const { update, dismiss } = toast({
      title: "Synchronisation en cours...",
      description: CERAMIQUE_QUOTES[0],
      duration: Infinity,
    });

    // Intervalle pour changer les citations toutes les 2.5 secondes
    intervalRef.current = setInterval(() => {
      quoteIndex = (quoteIndex + 1) % CERAMIQUE_QUOTES.length;
      update({
        title: "Synchronisation en cours...",
        description: CERAMIQUE_QUOTES[quoteIndex],
      });
    }, 2500);

    try {
      // Lancer les 2 syncs en parallèle
      const [sumupResult, stripeResult] = await Promise.all([
        supabase.functions.invoke("sync-sumup"),
        supabase.functions.invoke("sync-stripe"),
      ]);

      // Vérifier les erreurs individuelles
      const errors = [];
      if (sumupResult.error) errors.push(`SumUp: ${sumupResult.error.message}`);
      if (stripeResult.error) errors.push(`Stripe: ${stripeResult.error.message}`);

      // Calculer les totaux (même si une source a échoué, on compte l'autre)
      const totalSynced = (sumupResult.data?.synced || 0) + (stripeResult.data?.synced || 0);
      const totalSkipped = (sumupResult.data?.skipped || 0) + (stripeResult.data?.skipped || 0);

      // Arrêter l'intervalle avant d'afficher le résultat
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      if (errors.length > 0) {
        // Erreur partielle ou totale
        update({
          title: errors.length === 2 ? "Erreur de synchronisation" : "Synchronisation partielle",
          description: errors.length === 2
            ? errors.join(", ")
            : `${totalSynced} transaction(s) importée(s). Erreur: ${errors.join(", ")}`,
          variant: errors.length === 2 ? "destructive" : undefined,
          duration: 5000,
        });
      } else {
        // Succès complet
        update({
          title: "Synchronisation terminée !",
          description: `${totalSynced} transaction(s) importée(s), ${totalSkipped} ignorée(s).`,
          duration: 5000,
        });
      }

      // Invalider les queries pour rafraîchir les données
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["transaction-stats"] });

    } catch (error) {
      // Arrêter l'intervalle en cas d'erreur
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      console.error("Error during sync:", error);
      update({
        title: "Erreur de synchronisation",
        description: error instanceof Error ? error.message : "Une erreur est survenue",
        variant: "destructive",
        duration: 5000,
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
      {isSyncing ? "Synchronisation..." : "Synchroniser"}
    </Button>
  );
}
