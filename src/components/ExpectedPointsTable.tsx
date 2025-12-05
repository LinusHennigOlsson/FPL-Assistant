import { Player } from "@/data/mockPlayers";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface ExpectedPointsTableProps {
  squad: Player[];
}

const positionColors: Record<string, string> = {
  GKP: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  DEF: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  MID: "bg-sky-500/20 text-sky-400 border-sky-500/30",
  FWD: "bg-rose-500/20 text-rose-400 border-rose-500/30",
};

export function ExpectedPointsTable({ squad }: ExpectedPointsTableProps) {
  const sortedSquad = [...squad].sort((a, b) => b.expectedPointsNext - a.expectedPointsNext);
  const totalXptsNext = squad.reduce((sum, p) => sum + p.expectedPointsNext, 0);
  const totalXpts5GW = squad.reduce((sum, p) => sum + p.expectedPoints5GW, 0);

  if (squad.length === 0) {
    return (
      <div className="glass-card rounded-xl p-6 text-center">
        <p className="text-muted-foreground">Add players to see expected points</p>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-xl p-4">
      <h3 className="text-lg font-bold font-display text-foreground mb-4 flex items-center gap-2">
        <Star className="w-5 h-5 text-gold" />
        Expected Points
      </h3>

      {/* Totals */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-gradient-to-br from-gold/20 to-gold/5 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-gold">{totalXptsNext.toFixed(1)}</p>
          <p className="text-sm text-muted-foreground">Total xPts Next GW</p>
        </div>
        <div className="bg-gradient-to-br from-primary/20 to-primary/5 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-primary">{totalXpts5GW.toFixed(1)}</p>
          <p className="text-sm text-muted-foreground">Total xPts (5 GW)</p>
        </div>
      </div>

      {/* Player list */}
      <div className="space-y-2">
        {sortedSquad.map((player, idx) => (
          <div
            key={player.id}
            className={cn(
              "flex items-center justify-between p-3 rounded-lg bg-secondary/30",
              idx === 0 && "bg-gold/10 border border-gold/30"
            )}
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-sm font-medium text-muted-foreground w-6">
                {idx + 1}
              </span>
              <Badge className={cn("text-xs border", positionColors[player.position])}>
                {player.position}
              </Badge>
              <div className="min-w-0">
                <p className="font-medium text-foreground truncate">{player.name}</p>
                <p className="text-xs text-muted-foreground">{player.team}</p>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-right">
                <p className="text-lg font-bold text-gold">{player.expectedPointsNext.toFixed(1)}</p>
                <p className="text-xs text-muted-foreground">Next GW</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-primary">{player.expectedPoints5GW.toFixed(1)}</p>
                <p className="text-xs text-muted-foreground">5 GW</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
