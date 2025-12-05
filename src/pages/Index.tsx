import { useState } from "react";
import { Player } from "@/data/mockPlayers";
import { Header } from "@/components/Header";
import { SquadBuilder } from "@/components/SquadBuilder";
import { TransferRecommendations } from "@/components/TransferRecommendations";
import { FixturesOverview } from "@/components/FixturesOverview";
import { ExpectedPointsTable } from "@/components/ExpectedPointsTable";
import { GameweekInfo } from "@/components/GameweekInfo";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, ArrowLeftRight, Calendar, Star, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useFPL } from "@/contexts/FPLContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fplApi } from "@/services/fplApi";

const Index = () => {
  const [squad, setSquad] = useState<Player[]>([]);
  const [entryIdInput, setEntryIdInput] = useState("");
  const [loadingEntry, setLoadingEntry] = useState(false);
  const [entryInfo, setEntryInfo] = useState<{
    bank: number;
    teamValue: number;
    transfersMade: number;
    estimatedFreeTransfers: number;
  } | null>(null);

  const { toast } = useToast();
  const { players, currentGameweek, isLoading, error } = useFPL();

  const handleTransfer = (outPlayer: Player, inPlayer: Player) => {
    setSquad((prev) => {
      const newSquad = prev.filter((p) => p.id !== outPlayer.id);
      return [...newSquad, inPlayer];
    });
    toast({
      title: "Transfer complete",
      description: `${outPlayer.name} → ${inPlayer.name}`,
    });
  };

  const handleLoadTeam = async () => {
    const trimmed = entryIdInput.trim();
    const entryIdNum = Number(trimmed);

    if (!trimmed || Number.isNaN(entryIdNum)) {
      toast({
        title: "Invalid entry ID",
        description: "Please enter your numeric FPL entry ID.",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoadingEntry(true);

      // Fetch picks for current gameweek
      const picks = await fplApi.getEntryPicks(entryIdNum, currentGameweek);

      // Map FPL element ids to our Player objects
      const newSquad: Player[] = [];
      for (const pick of picks.picks) {
        const match = players.find((p) => p.id === pick.element);
        if (match) newSquad.push(match);
      }

      if (newSquad.length === 0) {
        throw new Error("Couldn't match any players from your entry to the current data.");
      }

      setSquad(newSquad);

      const hist = picks.entry_history;
      const bankMillions = (hist.bank ?? 0) / 10;
      const valueMillions = (hist.value ?? 0) / 10;
      const transfersMade = hist.event_transfers ?? 0;
      const estimatedFreeTransfers = transfersMade === 0 ? 2 : 1; // rough guess

      setEntryInfo({
        bank: bankMillions,
        teamValue: valueMillions,
        transfersMade,
        estimatedFreeTransfers,
      });

      toast({
        title: "Team loaded",
        description: `Imported ${newSquad.length} players. Bank £${bankMillions.toFixed(
          1
        )}m, est. free transfers: ${estimatedFreeTransfers}.`,
      });
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Failed to load team",
        description: err?.message ?? "Check that your entry ID is correct.",
        variant: "destructive",
      });
    } finally {
      setLoadingEntry(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pitch-pattern">
      <Header />

      <main className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-8 animate-fade-in">
          <h1 className="text-4xl md:text-5xl font-bold font-display mb-4">
            <span className="text-gradient">Dominate</span> Your FPL League
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-6">
            AI-powered transfer recommendations based on expected points, fixture difficulty, and
            player form. Build your squad and let our algorithm find the best moves.
          </p>
          <div className="flex justify-center">
            <GameweekInfo />
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-16 animate-fade-in">
            <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
            <p className="text-muted-foreground">Loading FPL data for 25/26 season...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="glass-card rounded-xl p-8 text-center animate-fade-in">
            <p className="text-destructive font-medium mb-2">Failed to load FPL data</p>
            <p className="text-muted-foreground text-sm">{error.message}</p>
          </div>
        )}

        {/* Main Content */}
        {!isLoading && !error && (
          <>
            {/* Load FPL team */}
            <div className="glass-card rounded-xl p-4 mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-1">
                  Load your live FPL team
                </h3>
                <p className="text-xs text-muted-foreground max-w-md">
                  Enter your FPL entry ID to import your current squad, bank and transfer info. You
                  can find it in the URL when you view your team on the FPL site.
                </p>
                {entryInfo && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Bank: <span className="font-medium">£{entryInfo.bank.toFixed(1)}m</span> •{" "}
                    Team value:{" "}
                    <span className="font-medium">
                      £{entryInfo.teamValue.toFixed(1)}m
                    </span>{" "}
                    • Transfers made this GW:{" "}
                    <span className="font-medium">{entryInfo.transfersMade}</span> • Est. free
                    transfers:{" "}
                    <span className="font-medium">
                      {entryInfo.estimatedFreeTransfers}
                    </span>
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-2 items-end">
                <div className="flex items-center gap-2">
                  <Label htmlFor="entry-id-input" className="text-xs text-muted-foreground">
                    Entry ID
                  </Label>
                  <Input
                    id="entry-id-input"
                    type="number"
                    className="w-32 h-8 text-sm"
                    value={entryIdInput}
                    onChange={(e) => setEntryIdInput(e.target.value)}
                  />
                  <Button
                    size="sm"
                    onClick={handleLoadTeam}
                    disabled={loadingEntry || !entryIdInput.trim()}
                  >
                    {loadingEntry ? (
                      <span className="flex items-center gap-1">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Loading...
                      </span>
                    ) : (
                      "Load team"
                    )}
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Example: if your team URL is fantasy.premierleague.com/entry/1234567, your ID is
                  1234567.
                </p>
              </div>
            </div>

            <Tabs defaultValue="squad" className="space-y-6">
              <TabsList className="glass-card p-1 w-full max-w-2xl mx-auto grid grid-cols-4">
                <TabsTrigger
                  value="squad"
                  className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  <Users className="w-4 h-4" />
                  <span className="hidden sm:inline">Squad</span>
                </TabsTrigger>
                <TabsTrigger
                  value="transfers"
                  className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  <ArrowLeftRight className="w-4 h-4" />
                  <span className="hidden sm:inline">Transfers</span>
                </TabsTrigger>
                <TabsTrigger
                  value="fixtures"
                  className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  <Calendar className="w-4 h-4" />
                  <span className="hidden sm:inline">Fixtures</span>
                </TabsTrigger>
                <TabsTrigger
                  value="points"
                  className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  <Star className="w-4 h-4" />
                  <span className="hidden sm:inline">xPoints</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="squad" className="animate-slide-up">
                <SquadBuilder squad={squad} setSquad={setSquad} allPlayers={players} />
              </TabsContent>

              <TabsContent value="transfers" className="animate-slide-up">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <TransferRecommendations
                    squad={squad}
                    onTransfer={handleTransfer}
                    allPlayers={players}
                    initialBank={entryInfo?.bank}
                  />
                  <ExpectedPointsTable squad={squad} />
                </div>
              </TabsContent>

              <TabsContent value="fixtures" className="animate-slide-up">
                <FixturesOverview squad={squad} />
              </TabsContent>

              <TabsContent value="points" className="animate-slide-up">
                <ExpectedPointsTable squad={squad} />
              </TabsContent>
            </Tabs>
          </>
        )}

        {/* Info Cards when no squad */}
        {squad.length === 0 && !isLoading && !error && (
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in">
            <div className="glass-card rounded-xl p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-bold font-display text-foreground mb-2">
                Build Your Squad
              </h3>
              <p className="text-sm text-muted-foreground">
                Add your 15 FPL players with max 3 from any team.
              </p>
            </div>
            <div className="glass-card rounded-xl p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-gold/20 flex items-center justify-center mx-auto mb-4">
                <Star className="w-6 h-6 text-gold" />
              </div>
              <h3 className="font-bold font-display text-foreground mb-2">
                Expected Points
              </h3>
              <p className="text-sm text-muted-foreground">
                View xPts for next gameweek and the following 5 based on form & fixtures.
              </p>
            </div>
            <div className="glass-card rounded-xl p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
                <ArrowLeftRight className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-bold font-display text-foreground mb-2">
                Smart Transfers
              </h3>
              <p className="text-sm text-muted-foreground">
                Get AI recommendations for the best transfers to maximize points.
              </p>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 mt-12 py-6">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>FPL AI Assistant • Live data from FPL API • Season 25/26</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
