import { useState, useMemo } from "react";
import { Player } from "@/data/mockPlayers";
import { PlayerCard } from "./PlayerCard";
import { PlayerSearch } from "./PlayerSearch";
import { Badge } from "@/components/ui/badge";
import { Users, AlertTriangle, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface SquadBuilderProps {
  squad: Player[];
  setSquad: (squad: Player[]) => void;
  allPlayers: Player[];
}

const SQUAD_STRUCTURE = {
  GKP: { min: 2, max: 2 },
  DEF: { min: 5, max: 5 },
  MID: { min: 5, max: 5 },
  FWD: { min: 3, max: 3 },
};

export function SquadBuilder({ squad, setSquad, allPlayers }: SquadBuilderProps) {
  const { toast } = useToast();
  const [bankInput, setBankInput] = useState<string>("0.0");

  const bank = parseFloat(bankInput) || 0;

  const positionCounts = useMemo(() => {
    return squad.reduce((acc, player) => {
      acc[player.position] = (acc[player.position] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [squad]);

  const teamCounts = useMemo(() => {
    return squad.reduce((acc, player) => {
      acc[player.team] = (acc[player.team] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [squad]);

  const totalSpent = useMemo(() => {
    return squad.reduce((sum, player) => sum + player.price, 0);
  }, [squad]);

  const totalBudget = totalSpent + bank;

  const handleAddPlayer = (player: Player): boolean => {
    // Check max 3 from same team
    if ((teamCounts[player.team] || 0) >= 3) {
      toast({
        title: "Team limit reached",
        description: `You can only have 3 players from ${player.team}`,
        variant: "destructive",
      });
      return false;
    }

    // Check position limits
    const posCount = positionCounts[player.position] || 0;
    if (posCount >= SQUAD_STRUCTURE[player.position].max) {
      toast({
        title: "Position full",
        description: `You already have ${posCount} ${player.position}s`,
        variant: "destructive",
      });
      return false;
    }

    // ✅ No budget restriction anymore

    setSquad([...squad, player]);
    toast({
      title: "Player added",
      description: `${player.name} added to your squad`,
    });
    return true;
  };

  const handleRemovePlayer = (playerId: number) => {
    setSquad(squad.filter((p) => p.id !== playerId));
  };

  const squadByPosition = useMemo(() => {
    const grouped: Record<string, Player[]> = {
      GKP: [],
      DEF: [],
      MID: [],
      FWD: [],
    };
    squad.forEach((player) => {
      grouped[player.position].push(player);
    });
    return grouped;
  }, [squad]);

  const isSquadComplete = squad.length === 15;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Squad Overview */}
      <div className="lg:col-span-2 space-y-6">
        {/* Budget & Stats */}
        <div className="glass-card rounded-xl p-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                <span className="text-lg font-bold font-display text-foreground">
                  {squad.length}/15
                </span>
                <span className="text-muted-foreground">Players</span>
              </div>
              {!isSquadComplete && (
                <Badge variant="outline" className="border-warning text-warning">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  Incomplete
                </Badge>
              )}
            </div>

            {/* 💰 Team value + bank + total */}
            <div className="flex flex-col gap-2 items-end text-right">
              <div className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-gold" />
                <span className="text-sm text-muted-foreground">Squad value</span>
                <span className="text-lg font-bold font-display text-foreground">
                  £{totalSpent.toFixed(1)}m
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Label htmlFor="bank-input" className="text-xs text-muted-foreground">
                  Money in bank
                </Label>
                <Input
                  id="bank-input"
                  type="number"
                  step="0.1"
                  className="w-24 h-8 text-right text-sm"
                  value={bankInput}
                  onChange={(e) => setBankInput(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Total budget</span>
                <span className="text-sm font-semibold font-display text-foreground">
                  £{totalBudget.toFixed(1)}m
                </span>
              </div>
            </div>
          </div>

          {/* Position breakdown */}
          <div className="flex gap-4 mt-4 flex-wrap">
            {(Object.keys(SQUAD_STRUCTURE) as Array<keyof typeof SQUAD_STRUCTURE>).map((pos) => {
              const count = positionCounts[pos] || 0;
              const { max } = SQUAD_STRUCTURE[pos];
              const isFull = count >= max;
              return (
                <div
                  key={pos}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-sm font-medium",
                    isFull ? "bg-primary/20 text-primary" : "bg-secondary text-muted-foreground"
                  )}
                >
                  {pos}: {count}/{max}
                </div>
              );
            })}
          </div>
        </div>

        {/* Squad by position */}
        {(["GKP", "DEF", "MID", "FWD"] as const).map((position) => (
          <div key={position}>
            <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
              {position === "GKP"
                ? "Goalkeepers"
                : position === "DEF"
                ? "Defenders"
                : position === "MID"
                ? "Midfielders"
                : "Forwards"}
              ({squadByPosition[position].length}/{SQUAD_STRUCTURE[position].max})
            </h3>
            <div className="grid gap-2">
              {squadByPosition[position].length === 0 ? (
                <div className="glass-card rounded-lg p-4 border-dashed border-2 border-border/50 text-center text-muted-foreground">
                  Add {SQUAD_STRUCTURE[position].max} {position}s to your squad
                </div>
              ) : (
                squadByPosition[position].map((player) => (
                  <PlayerCard
                    key={player.id}
                    player={player}
                    onRemove={() => handleRemovePlayer(player.id)}
                    variant="compact"
                  />
                ))
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Player Search */}
      <div className="lg:col-span-1">
        <div className="sticky top-4">
          <PlayerSearch
            onAddPlayer={handleAddPlayer}
            selectedPlayerIds={squad.map((p) => p.id)}
            teamCounts={teamCounts}
            allPlayers={allPlayers}
          />
        </div>
      </div>
    </div>
  );
}
