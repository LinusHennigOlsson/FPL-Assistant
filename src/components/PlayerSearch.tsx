import { useState, useMemo } from "react";
import { Player } from "@/data/mockPlayers";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, Filter, Plus, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface PlayerSearchProps {
  onAddPlayer: (player: Player) => boolean;
  selectedPlayerIds: number[];
  teamCounts: Record<string, number>;
  allPlayers: Player[];
}

type SortKey = "expectedPointsNext" | "expectedPoints5GW" | "price" | "form" | "totalPoints";

const positionColors: Record<string, string> = {
  GKP: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  DEF: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  MID: "bg-sky-500/20 text-sky-400 border-sky-500/30",
  FWD: "bg-rose-500/20 text-rose-400 border-rose-500/30",
};

export function PlayerSearch({ onAddPlayer, selectedPlayerIds, teamCounts, allPlayers }: PlayerSearchProps) {
  const [search, setSearch] = useState("");
  const [positionFilter, setPositionFilter] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<SortKey>("expectedPointsNext");
  const [sortAsc, setSortAsc] = useState(false);

  const filteredPlayers = useMemo(() => {
    return allPlayers
      .filter((player) => {
        const matchesSearch = player.name.toLowerCase().includes(search.toLowerCase()) ||
          player.team.toLowerCase().includes(search.toLowerCase());
        const matchesPosition = positionFilter === "ALL" || player.position === positionFilter;
        const notSelected = !selectedPlayerIds.includes(player.id);
        return matchesSearch && matchesPosition && notSelected;
      })
      .sort((a, b) => {
        const aVal = a[sortBy];
        const bVal = b[sortBy];
        return sortAsc ? aVal - bVal : bVal - aVal;
      });
  }, [search, positionFilter, sortBy, sortAsc, selectedPlayerIds]);

  const canAddFromTeam = (teamName: string) => {
    return (teamCounts[teamName] || 0) < 3;
  };

  return (
    <div className="glass-card rounded-xl p-4">
      <h3 className="text-lg font-bold font-display text-foreground mb-4 flex items-center gap-2">
        <Search className="w-5 h-5 text-primary" />
        Find Players
      </h3>

      <div className="space-y-3 mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search players..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-secondary/50 border-border"
          />
        </div>

        <div className="flex gap-2">
          <Select value={positionFilter} onValueChange={setPositionFilter}>
            <SelectTrigger className="w-[120px] bg-secondary/50 border-border">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All</SelectItem>
              <SelectItem value="GKP">GKP</SelectItem>
              <SelectItem value="DEF">DEF</SelectItem>
              <SelectItem value="MID">MID</SelectItem>
              <SelectItem value="FWD">FWD</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortKey)}>
            <SelectTrigger className="flex-1 bg-secondary/50 border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="expectedPointsNext">xPts Next</SelectItem>
              <SelectItem value="expectedPoints5GW">xPts 5GW</SelectItem>
              <SelectItem value="price">Price</SelectItem>
              <SelectItem value="form">Form</SelectItem>
              <SelectItem value="totalPoints">Total Pts</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="icon"
            onClick={() => setSortAsc(!sortAsc)}
            className="bg-secondary/50 border-border"
          >
            {sortAsc ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
        {filteredPlayers.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No players found</p>
        ) : (
          filteredPlayers.map((player) => {
            const canAdd = canAddFromTeam(player.team);
            return (
              <div
                key={player.id}
                className={cn(
                  "flex items-center justify-between p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors",
                  !canAdd && "opacity-50"
                )}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Badge className={cn("text-xs font-semibold border", positionColors[player.position])}>
                    {player.position}
                  </Badge>
                  <div className="min-w-0">
                    <p className="font-medium text-foreground truncate">{player.name}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{player.team}</span>
                      <span>•</span>
                      <span>£{player.price.toFixed(1)}m</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-sm font-bold text-gold">{player.expectedPointsNext.toFixed(1)}</p>
                    <p className="text-xs text-muted-foreground">xPts</p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => onAddPlayer(player)}
                    disabled={!canAdd}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
