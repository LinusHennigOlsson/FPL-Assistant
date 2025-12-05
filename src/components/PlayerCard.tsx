import { Player } from "@/data/mockPlayers";
import { Badge } from "@/components/ui/badge";
import { X, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface PlayerCardProps {
  player: Player;
  onRemove?: () => void;
  showRemove?: boolean;
  variant?: "compact" | "detailed";
}

const positionColors: Record<string, string> = {
  GKP: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  DEF: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  MID: "bg-sky-500/20 text-sky-400 border-sky-500/30",
  FWD: "bg-rose-500/20 text-rose-400 border-rose-500/30",
};

export function PlayerCard({ player, onRemove, showRemove = true, variant = "compact" }: PlayerCardProps) {
  const formTrend = player.form >= 6 ? "up" : player.form <= 3 ? "down" : "neutral";
  
  if (variant === "compact") {
    return (
      <div className="glass-card rounded-lg p-3 group hover:border-primary/50 transition-all duration-300">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <Badge className={cn("text-xs font-semibold border", positionColors[player.position])}>
              {player.position}
            </Badge>
            <div className="min-w-0">
              <p className="font-semibold text-foreground truncate">{player.name}</p>
              <p className="text-xs text-muted-foreground">{player.team}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-bold text-gold">{player.expectedPointsNext.toFixed(1)}</p>
              <p className="text-xs text-muted-foreground">xPts</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-foreground">£{player.price.toFixed(1)}m</p>
            </div>
            {showRemove && onRemove && (
              <button
                onClick={onRemove}
                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/20 rounded-full transition-all"
              >
                <X className="w-4 h-4 text-destructive" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-xl p-4 hover:border-primary/50 transition-all duration-300 group">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <Badge className={cn("text-xs font-semibold border", positionColors[player.position])}>
            {player.position}
          </Badge>
          <div>
            <p className="font-bold text-foreground">{player.name}</p>
            <p className="text-sm text-muted-foreground">{player.team}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-foreground">£{player.price.toFixed(1)}m</p>
          <div className="flex items-center gap-1 justify-end">
            {formTrend === "up" && <TrendingUp className="w-3 h-3 text-green-400" />}
            {formTrend === "down" && <TrendingDown className="w-3 h-3 text-red-400" />}
            <span className="text-xs text-muted-foreground">Form: {player.form.toFixed(1)}</span>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-secondary/50 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-gold">{player.expectedPointsNext.toFixed(1)}</p>
          <p className="text-xs text-muted-foreground">xPts Next GW</p>
        </div>
        <div className="bg-secondary/50 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-primary">{player.expectedPoints5GW.toFixed(1)}</p>
          <p className="text-xs text-muted-foreground">xPts (5 GW)</p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2 text-center text-xs mb-4">
        <div>
          <p className="font-semibold text-foreground">{player.goalsScored}</p>
          <p className="text-muted-foreground">Goals</p>
        </div>
        <div>
          <p className="font-semibold text-foreground">{player.assists}</p>
          <p className="text-muted-foreground">Assists</p>
        </div>
        <div>
          <p className="font-semibold text-foreground">{player.totalPoints}</p>
          <p className="text-muted-foreground">Total Pts</p>
        </div>
        <div>
          <p className="font-semibold text-foreground">{player.selectedBy}%</p>
          <p className="text-muted-foreground">Selected</p>
        </div>
      </div>

      {/* Fixtures */}
      <div>
        <p className="text-xs text-muted-foreground mb-2">Next 5 Fixtures</p>
        <div className="flex gap-1">
          {player.fixtures.map((fixture, idx) => (
            <div
              key={idx}
              className={cn(
                "flex-1 text-center py-1.5 rounded text-xs font-semibold",
                `fdr-${fixture.difficulty}`
              )}
              title={`GW${fixture.gameweek}: ${fixture.isHome ? "vs" : "@"} ${fixture.opponent}`}
            >
              <span className="hidden sm:inline">{fixture.opponentShort}</span>
              <span className="sm:hidden">{fixture.opponentShort.slice(0, 3)}</span>
              <span className="text-[10px] opacity-80 block">
                {fixture.isHome ? "H" : "A"}
              </span>
            </div>
          ))}
        </div>
      </div>

      {showRemove && onRemove && (
        <button
          onClick={onRemove}
          className="w-full mt-4 py-2 text-sm text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
        >
          Remove from squad
        </button>
      )}
    </div>
  );
}
