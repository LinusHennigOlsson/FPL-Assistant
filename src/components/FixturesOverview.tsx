import { Player } from "@/data/mockPlayers";
import { cn } from "@/lib/utils";
import { Calendar } from "lucide-react";

interface FixturesOverviewProps {
  squad: Player[];
}

export function FixturesOverview({ squad }: FixturesOverviewProps) {
  if (squad.length === 0) {
    return (
      <div className="glass-card rounded-xl p-6 text-center">
        <p className="text-muted-foreground">Add players to see fixture difficulty</p>
      </div>
    );
  }

  // Get unique gameweeks from fixtures
  const gameweeks = squad[0]?.fixtures.map((f) => f.gameweek) || [];

  // Calculate average FDR per gameweek
  const avgFdrByGw = gameweeks.map((gw) => {
    const difficulties = squad.map((player) => {
      const fixture = player.fixtures.find((f) => f.gameweek === gw);
      return fixture?.difficulty || 3;
    });
    return difficulties.reduce((sum, d) => sum + d, 0) / difficulties.length;
  });

  return (
    <div className="glass-card rounded-xl p-4 overflow-x-auto">
      <h3 className="text-lg font-bold font-display text-foreground mb-4 flex items-center gap-2">
        <Calendar className="w-5 h-5 text-primary" />
        Fixture Difficulty Rating (FDR)
      </h3>

      <div className="min-w-[600px]">
        {/* Header */}
        <div className="grid gap-2 mb-3" style={{ gridTemplateColumns: "180px repeat(5, 1fr)" }}>
          <div className="text-xs text-muted-foreground font-medium">Player</div>
          {gameweeks.map((gw) => (
            <div key={gw} className="text-center text-xs text-muted-foreground font-medium">
              GW{gw}
            </div>
          ))}
        </div>

        {/* Players */}
        <div className="space-y-2">
          {squad.slice(0, 11).map((player) => (
            <div
              key={player.id}
              className="grid gap-2 items-center"
              style={{ gridTemplateColumns: "180px repeat(5, 1fr)" }}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs font-medium text-muted-foreground w-8">{player.teamShort}</span>
                <span className="text-sm font-medium text-foreground truncate">{player.name}</span>
              </div>
              {player.fixtures.map((fixture, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "text-center py-2 rounded text-xs font-semibold",
                    `fdr-${fixture.difficulty}`
                  )}
                >
                  <span>{fixture.opponentShort}</span>
                  <span className="text-[10px] opacity-80 ml-1">
                    ({fixture.isHome ? "H" : "A"})
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Average FDR */}
        <div
          className="grid gap-2 items-center mt-4 pt-4 border-t border-border"
          style={{ gridTemplateColumns: "180px repeat(5, 1fr)" }}
        >
          <div className="text-sm font-semibold text-foreground">Avg. FDR</div>
          {avgFdrByGw.map((avgFdr, idx) => (
            <div
              key={idx}
              className={cn(
                "text-center py-2 rounded text-sm font-bold",
                avgFdr <= 2 ? "bg-fdr-1 text-white" :
                avgFdr <= 2.5 ? "bg-fdr-2 text-white" :
                avgFdr <= 3.2 ? "bg-fdr-3 text-black" :
                avgFdr <= 4 ? "bg-fdr-4 text-white" :
                "bg-fdr-5 text-white"
              )}
            >
              {avgFdr.toFixed(1)}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-6 flex-wrap">
        <span className="text-xs text-muted-foreground">FDR:</span>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((fdr) => (
            <div key={fdr} className="flex items-center gap-1">
              <div className={cn("w-6 h-6 rounded flex items-center justify-center text-xs font-bold", `fdr-${fdr}`)}>
                {fdr}
              </div>
              <span className="text-xs text-muted-foreground">
                {fdr === 1 ? "Easy" : fdr === 5 ? "Hard" : ""}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
