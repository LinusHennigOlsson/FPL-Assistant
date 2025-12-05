import { useMemo, useState } from "react";
import { Player } from "@/data/mockPlayers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, TrendingUp, Zap, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface TransferRecommendationsProps {
  squad: Player[];
  onTransfer: (outPlayer: Player, inPlayer: Player) => void;
  allPlayers: Player[];
}

interface TransferSuggestion {
  out: Player;
  in: Player;
  reason: string;
  pointsGain: number;
  icon: React.ReactNode;
}

const positionColors: Record<string, string> = {
  GKP: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  DEF: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  MID: "bg-sky-500/20 text-sky-400 border-sky-500/30",
  FWD: "bg-rose-500/20 text-rose-400 border-rose-500/30",
};

export function TransferRecommendations({
  squad,
  onTransfer,
  allPlayers,
}: TransferRecommendationsProps) {
  const [transferCount, setTransferCount] = useState<number>(1);
  const [bankInput, setBankInput] = useState<string>("0.0");

  const bank = parseFloat(bankInput) || 0;

  const initialSpent = useMemo(
    () => squad.reduce((sum, p) => sum + p.price, 0),
    [squad]
  );
  const totalBudget = initialSpent + bank; // squad value + money in bank

  // --- 1) Player score: how "good" is this player overall ---
  const playerScore = (p: Player): number => {
    const xp5 = Math.max(0, p.expectedPoints5GW || 0);
    const xp1 = Math.max(0, p.expectedPointsNext || 0);
    const season = p.totalPoints || 0;

    // Simple, sane blend:
    //  - 5GW model is main
    //  - next GW matters but a bit less
    //  - season points give credit for real performance
    return xp5 + 0.5 * xp1 + season / 10;
  };

  // --- 2) Build all *individual* upgrade suggestions ---
  const baseSuggestions = useMemo<TransferSuggestion[]>(() => {
    if (squad.length === 0) return [];

    const teamCounts = squad.reduce((acc, player) => {
      acc[player.team] = (acc[player.team] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const suggestions: TransferSuggestion[] = [];

    squad.forEach((squadPlayer) => {
      const availablePlayers = allPlayers.filter((p) => {
        if (p.id === squadPlayer.id) return false;
        if (squad.some((sp) => sp.id === p.id)) return false;
        if (p.position !== squadPlayer.position) return false;

        // Team limit if this was the ONLY transfer
        const newTeamCount =
          (teamCounts[p.team] || 0) +
          (p.team !== squadPlayer.team ? 1 : 0);
        if (newTeamCount > 3) return false;

        // Prefer players who actually play
        const minsIn = p.minutesPlayed || 0;
        const minsOut = squadPlayer.minutesPlayed || 0;
        if (minsIn < 600 && minsIn < minsOut * 0.7) return false;

        return true;
      });

      const outScore = playerScore(squadPlayer);

      availablePlayers.forEach((candidate) => {
        const inScore = playerScore(candidate);
        const pointsGain = inScore - outScore;

        if (pointsGain > 1) {
          let reason = "";
          let icon = <TrendingUp className="w-4 h-4" />;

          const avgFdrOut =
            squadPlayer.fixtures
              .slice(0, 5)
              .reduce((sum, f) => sum + f.difficulty, 0) / 5;
          const avgFdrIn =
            candidate.fixtures
              .slice(0, 5)
              .reduce((sum, f) => sum + f.difficulty, 0) / 5;

          if (avgFdrIn < avgFdrOut - 0.5) {
            reason = "Better upcoming fixtures";
            icon = <Target className="w-4 h-4" />;
          } else if (candidate.form > squadPlayer.form + 1) {
            reason = "Higher form";
            icon = <TrendingUp className="w-4 h-4" />;
          } else if (
            candidate.expectedPointsNext >
            squadPlayer.expectedPointsNext + 2
          ) {
            reason = "Higher xPts this week";
            icon = <Zap className="w-4 h-4" />;
          } else {
            reason = "Better overall value";
            icon = <TrendingUp className="w-4 h-4" />;
          }

          suggestions.push({
            out: squadPlayer,
            in: candidate,
            reason,
            pointsGain,
            icon,
          });
        }
      });
    });

    // Sort by single-move gain and keep a reasonable number
    return suggestions
      .sort((a, b) => b.pointsGain - a.pointsGain)
      .slice(0, 20);
  }, [squad, allPlayers]);

  // --- 3) Find best combination respecting team limit + budget ---
  const bestCombo = useMemo<TransferSuggestion[]>(() => {
    const n = baseSuggestions.length;
    if (n === 0) return [];

    const k = Math.min(transferCount, n);
    if (k <= 1) {
      return baseSuggestions.slice(0, 1);
    }

    // Start from actual team counts in the current squad
    const initialCounts: Record<string, number> = {};
    squad.forEach((p) => {
      initialCounts[p.team] = (initialCounts[p.team] || 0) + 1;
    });

    let best: TransferSuggestion[] = [];
    let bestGain = -Infinity;

    const usedOut = new Set<number>();
    const usedIn = new Set<number>();

    const dfs = (
      startIndex: number,
      chosen: TransferSuggestion[],
      gain: number,
      counts: Record<string, number>,
      currentSpent: number
    ) => {
      if (chosen.length > 0 && gain > bestGain) {
        bestGain = gain;
        best = [...chosen];
      }
      if (chosen.length === k) return;

      for (let i = startIndex; i < n; i++) {
        const s = baseSuggestions[i];

        // Don't use the same OUT or IN player twice
        if (usedOut.has(s.out.id) || usedIn.has(s.in.id)) continue;

        const outTeam = s.out.team;
        const inTeam = s.in.team;

        // Simulate team counts after this transfer
        const nextCounts: Record<string, number> = { ...counts };
        nextCounts[outTeam] = (nextCounts[outTeam] || 0) - 1;
        nextCounts[inTeam] = (nextCounts[inTeam] || 0) + 1;

        // Max 3 from any team
        if (nextCounts[inTeam] > 3) continue;

        // Simulate budget after this transfer
        const priceDiff = s.in.price - s.out.price; // positive = more expensive
        const newSpent = currentSpent + priceDiff;
        if (newSpent > totalBudget + 1e-6) continue; // exceed budget

        usedOut.add(s.out.id);
        usedIn.add(s.in.id);
        chosen.push(s);

        dfs(i + 1, chosen, gain + s.pointsGain, nextCounts, newSpent);

        chosen.pop();
        usedOut.delete(s.out.id);
        usedIn.delete(s.in.id);
      }
    };

    dfs(0, [], 0, initialCounts, initialSpent);
    return best;
  }, [baseSuggestions, transferCount, squad, initialSpent, totalBudget]);

  const totalComboGain = bestCombo.reduce((sum, s) => sum + s.pointsGain, 0);
  const comboPriceDiff = bestCombo.reduce(
    (sum, s) => sum + (s.in.price - s.out.price),
    0
  );
  const finalSpent = initialSpent + comboPriceDiff;
  const finalBank = totalBudget - finalSpent;

  if (squad.length === 0) {
    return (
      <div className="glass-card rounded-xl p-6 text-center">
        <p className="text-muted-foreground">
          Add players to your squad to get transfer recommendations
        </p>
      </div>
    );
  }

  if (baseSuggestions.length === 0) {
    return (
      <div className="glass-card rounded-xl p-6 text-center">
        <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
          <TrendingUp className="w-6 h-6 text-primary" />
        </div>
        <p className="text-foreground font-medium mb-2">
          Your squad looks great!
        </p>
        <p className="text-muted-foreground text-sm">
          No significant upgrades found for your current team
        </p>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-xl p-4 lg:p-6 space-y-4">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-1">
            Transfer recommendations
          </h3>
          <p className="text-xs text-muted-foreground">
            Based on xPts (GW), xPts (5GW), season performance, team limits and
            your budget.
          </p>
        </div>

        <div className="flex flex-col items-end gap-2">
          {/* Number of transfers */}
          <div className="flex flex-col items-end gap-1">
            <span className="text-xs text-muted-foreground">
              Number of transfers
            </span>
            <div className="flex items-center gap-3 w-44">
              <Slider
                min={1}
                max={5}
                step={1}
                value={[transferCount]}
                onValueChange={(v) => setTransferCount(v[0] ?? 1)}
              />
              <span className="text-sm font-medium w-5 text-right">
                {transferCount}
              </span>
            </div>
          </div>

          {/* Bank input */}
          <div className="flex items-center gap-2">
            <Label
              htmlFor="bank-transfer-input"
              className="text-xs text-muted-foreground"
            >
              Money in bank
            </Label>
            <Input
              id="bank-transfer-input"
              type="number"
              step="0.1"
              className="w-24 h-8 text-right text-sm"
              value={bankInput}
              onChange={(e) => setBankInput(e.target.value)}
            />
          </div>

          <div className="text-xs text-muted-foreground text-right">
            Squad value: £{initialSpent.toFixed(1)}m • Total budget: £
            {totalBudget.toFixed(1)}m
          </div>
        </div>
      </div>

      {/* Summary of combo gain & cost */}
      <div className="flex flex-wrap items-center justify-between text-sm mb-2 gap-2">
        <Badge variant="outline" className="border-primary/40 text-primary">
          Best combo (+{totalComboGain.toFixed(1)} xPts)
        </Badge>
        {bestCombo.length > 0 && (
          <span className="text-xs text-muted-foreground">
            Net cost:{" "}
            {comboPriceDiff >= 0
              ? `+£${comboPriceDiff.toFixed(1)}m`
              : `-£${Math.abs(comboPriceDiff).toFixed(1)}m`}{" "}
            • Bank after: £{finalBank.toFixed(1)}m
          </span>
        )}
      </div>

      {bestCombo.map((suggestion, idx) => (
        <div
          key={`${suggestion.out.id}-${suggestion.in.id}`}
          className="glass-card rounded-xl p-4 hover:border-primary/50 transition-all duration-300"
          style={{ animationDelay: `${idx * 100}ms` }}
        >
          <div className="flex items-center justify-between gap-4 mb-3">
            <Badge variant="outline" className="border-primary/50 text-primary">
              {suggestion.icon}
              <span className="ml-1">{suggestion.reason}</span>
            </Badge>
            <span className="text-sm font-semibold text-primary">
              +{suggestion.pointsGain.toFixed(1)} xPts
            </span>
          </div>

          <div className="flex items-center gap-4">
            {/* OUT */}
            <div className="flex-1 bg-destructive/10 rounded-lg p-3">
              <p className="text-xs text-destructive mb-1 font-medium">OUT</p>
              <div className="flex items-center gap-2">
                <Badge
                  className={cn(
                    "text-xs border",
                    positionColors[suggestion.out.position]
                  )}
                >
                  {suggestion.out.position}
                </Badge>
                <div className="min-w-0">
                  <p className="font-medium text-foreground truncate text-sm">
                    {suggestion.out.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {suggestion.out.team} • £
                    {suggestion.out.price.toFixed(1)}m
                  </p>
                </div>
              </div>
              <div className="mt-2 text-xs text-muted-foreground space-y-0.5">
                <div>
                  xPts (GW):{" "}
                  {suggestion.out.expectedPointsNext.toFixed(1)}
                </div>
                <div>
                  xPts (5GW):{" "}
                  {suggestion.out.expectedPoints5GW.toFixed(1)}
                </div>
              </div>
            </div>

            <ArrowRight className="w-5 h-5 text-muted-foreground shrink-0" />

            {/* IN */}
            <div className="flex-1 bg-primary/10 rounded-lg p-3">
              <p className="text-xs text-primary mb-1 font-medium">IN</p>
              <div className="flex items-center gap-2">
                <Badge
                  className={cn(
                    "text-xs border",
                    positionColors[suggestion.in.position]
                  )}
                >
                  {suggestion.in.position}
                </Badge>
                <div className="min-w-0">
                  <p className="font-medium text-foreground truncate text-sm">
                    {suggestion.in.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {suggestion.in.team} • £
                    {suggestion.in.price.toFixed(1)}m
                  </p>
                </div>
              </div>
              <div className="mt-2 text-xs text-muted-foreground space-y-0.5">
                <div>
                  xPts (GW):{" "}
                  {suggestion.in.expectedPointsNext.toFixed(1)}
                </div>
                <div>
                  xPts (5GW):{" "}
                  {suggestion.in.expectedPoints5GW.toFixed(1)}
                </div>
              </div>
            </div>
          </div>

          <Button
            className="w-full mt-4 bg-primary hover:bg-primary/90 text-primary-foreground"
            onClick={() => onTransfer(suggestion.out, suggestion.in)}
          >
            Make Transfer
          </Button>
        </div>
      ))}

      {bestCombo.length > 1 && (
        <Button
          className="w-full mt-2"
          variant="outline"
          onClick={() => {
            bestCombo.forEach((s) => onTransfer(s.out, s.in));
          }}
        >
          Apply {bestCombo.length} Transfers (+{totalComboGain.toFixed(1)} xPts)
        </Button>
      )}
    </div>
  );
}
