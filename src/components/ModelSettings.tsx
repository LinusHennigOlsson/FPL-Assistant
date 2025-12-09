import { Slider } from "@/components/ui/slider";
import { useModelWeights } from "@/contexts/ModelWeightsContext";

export const ModelSettings: React.FC = () => {
  const { weightMlNext, setWeightMlNext } = useModelWeights();
  const value = Math.round(weightMlNext * 100);

  return (
    <div className="glass-card rounded-xl p-4 mb-4">
      <p className="text-sm font-medium text-foreground">
        Blend classic xPts vs ML
      </p>
      <p className="text-xs text-muted-foreground mb-2">
        0% = bara FPL xPts, 100% = bara ML-modellen.
      </p>
      <div className="flex items-center gap-4">
        <span className="text-xs text-muted-foreground w-10 text-left">
          Classic
        </span>
        <Slider
          min={0}
          max={100}
          step={5}
          value={[value]}
          onValueChange={([v]) => {
            const w = (v ?? 50) / 100;
            setWeightMlNext(w);
          }}
          className="flex-1"
        />
        <span className="text-xs text-muted-foreground w-16 text-right">
          ML {value}%
        </span>
      </div>
    </div>
  );
};
