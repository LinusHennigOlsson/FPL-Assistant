import { useQuery } from "@tanstack/react-query";

export interface MlPredictionRecord {
  element_id: number;
  round: number;
  player_name: string;
  pred_points_rf: number;
}

export type MlPredictionMap = Record<string, MlPredictionRecord>;

async function fetchMlPredictions(): Promise<MlPredictionMap> {
  const baseUrl = import.meta.env.BASE_URL || "/";

  const res = await fetch(`${baseUrl}ml_predictions_24_25.json`, {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Failed to load ML predictions: ${res.statusText}`);
  }

  const data = (await res.json()) as MlPredictionMap;
  return data;
}

export function useMLPredictions() {
  const query = useQuery({
    queryKey: ["ml-predictions-24-25"],
    queryFn: fetchMlPredictions,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  return {
    predictions: query.data,
    isLoading: query.isLoading,
    error: query.error,
  };
}
