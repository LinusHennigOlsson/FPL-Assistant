import { useMemo, useState } from "react";
import { Player } from "@/data/mockPlayers";

interface TeamRatingProps {
  squad: Player[];
  allPlayers: Player[];
  budget?: number | null; // in millions
}

const HORIZON_OPTIONS = [1, 2, 3, 4, 5];

function getExpectedPointsForHorizon(player: Player, horizon: number): number {
  const ep1 = Number((player as any).expectedPointsNext ?? 0);
  const ep5 = Number((player as any).expectedPoints5GW ?? ep1 * 5);

  if (horizon <= 1) return ep1;

  // Smooth interpolation between 1GW and 5GW
  const t = (Math.min(Math.max(horizon, 1), 5) - 1) / 4;
  return ep1 + (ep5 - ep1) * t;
}

const POSITION_QUOTAS: Record<Player["position"], number> = {
  GKP: 2,
  DEF: 5,
  MID: 5,
  FWD: 3,
};

function buildDreamTeamWithBudget(
  allPlayers: Player[],
  horizon: number,
  budget?: number | null
): Player[] {
  if (!Array.isArray(allPlayers) || allPlayers.length === 0) return [];

  const targetSize = 15;
  const clubCounts: Record<string, number> = {};
  const posCounts: Record<Player["position"], number> = {
    GKP: 0,
    DEF: 0,
    MID: 0,
    FWD: 0,
  };
  let totalPrice = 0;
  const dreamTeam: Player[] = [];

  // XP sorted list
  const sorted = allPlayers
  .filter((p) => {
    const ep1 = Number((p as any).expectedPointsNext ?? null);
    const ep5 = Number((p as any).expectedPoints5GW ?? null);

    // ignore anyone with no xP OR insane 5-GW total
    return (
      !isNaN(ep1) &&
      !isNaN(ep5) &&
      (ep1 > 0 || ep5 > 0) &&
      ep5 <= 100
    );
  })
  .sort(
    (a, b) =>
      getExpectedPointsForHorizon(b, horizon) -
      getExpectedPointsForHorizon(a, horizon)
  );


  for (const p of sorted) {
    if (dreamTeam.length >= targetSize) break;

    const pos = p.position;
    const teamKey = (p as any).teamShort ?? (p as any).team ?? "";
    const price = Number((p as any).price ?? 0);

    if (posCounts[pos] >= POSITION_QUOTAS[pos]) continue;
    if ((clubCounts[teamKey] ?? 0) >= 3) continue;
    if (budget != null && totalPrice + price > budget) continue;

    dreamTeam.push(p);
    posCounts[pos] += 1;
    clubCounts[teamKey] = (clubCounts[teamKey] ?? 0) + 1;
    totalPrice += price;
  }

  return dreamTeam;
}

export function TeamRating({ squad, allPlayers, budget }: TeamRatingProps) {
  const [horizon, setHorizon] = useState<number>(1);

  const {
    squadBase,
    squadWithCaptain,
    dreamBase,
    dreamWithCaptain,
    rating,
    dreamTeam,
    squadCaptain,
    squadVice,
    dreamCaptain,
    dreamVice,
  } = useMemo(() => {
    if (!Array.isArray(allPlayers) || allPlayers.length === 0) {
      return {
        squadBase: 0,
        squadWithCaptain: 0,
        dreamBase: 0,
        dreamWithCaptain: 0,
        rating: 0,
        dreamTeam: [],
        squadCaptain: null,
        squadVice: null,
        dreamCaptain: null,
        dreamVice: null,
      };
    }

    const safeSquad = Array.isArray(squad) ? squad : [];

    // ---- SQUAD BASE TOTAL ----
    const squadBase = safeSquad.reduce(
      (sum, p) => sum + getExpectedPointsForHorizon(p, horizon),
      0
    );

    // ---- DREAM TEAM WITH BUDGET ----
    const dreamTeam = buildDreamTeamWithBudget(allPlayers, horizon, budget);

    const dreamBase = dreamTeam.reduce(
      (sum, p) => sum + getExpectedPointsForHorizon(p, horizon),
      0
    );

    // ---- CAPTAIN LOGIC ----
    const applyCaptain = (team: Player[], base: number) => {
      if (team.length === 0) return { total: base, captain: null, vice: null };

      const sorted = [...team].sort(
        (a, b) =>
          getExpectedPointsForHorizon(b, horizon) -
          getExpectedPointsForHorizon(a, horizon)
      );

      const captain = sorted[0] ?? null;
      const vice = sorted[1] ?? null;

      const captainXP = captain
        ? getExpectedPointsForHorizon(captain, horizon)
        : 0;

      // captain doubles → add one extra share
      return {
        total: base + captainXP,
        captain,
        vice,
      };
    };

    const squadCap = applyCaptain(safeSquad, squadBase);
    const dreamCap = applyCaptain(dreamTeam, dreamBase);

    const rating =
      dreamCap.total > 0
        ? Math.round(((squadCap.total / dreamCap.total) * 100) * 10) / 10
        : 0;

    return {
      squadBase,
      squadWithCaptain: squadCap.total,
      dreamBase,
      dreamWithCaptain: dreamCap.total,
      rating,
      dreamTeam,
      squadCaptain: squadCap.captain,
      squadVice: squadCap.vice,
      dreamCaptain: dreamCap.captain,
      dreamVice: dreamCap.vice,
    };
  }, [squad, allPlayers, horizon, budget]);

  return (
    <div className="space-y-6">
      {/* Header + Horizon */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Team Rating</h3>
          <p className="text-xs text-muted-foreground">
            Based on expected points for the next {horizon} GW
            {horizon > 1 ? "s" : ""}. Dream team uses your budget.
          </p>
        </div>

        <div className="flex gap-2 items-center">
          <span className="text-xs text-muted-foreground">Horizon:</span>
          {HORIZON_OPTIONS.map((h) => (
            <button
              key={h}
              onClick={() => setHorizon(h)}
              className={
                "px-2 py-1 text-xs rounded-md border " +
                (h === horizon
                  ? "bg-primary text-primary-foreground"
                  : "bg-background hover:bg-accent")
              }
            >
              {h} GW
            </button>
          ))}
        </div>
      </div>

      {/* Rating Card */}
      <div className="glass-card rounded-xl p-6">
        <p className="text-xs uppercase text-muted-foreground mb-1">
          Rating (with captain)
        </p>
        <p className="text-4xl font-bold">{rating.toFixed(1)}%</p>
        <p className="text-xs text-muted-foreground mt-1">
          Your squad: {squadWithCaptain.toFixed(1)} xp (base {squadBase.toFixed(1)}) •
          Dream team: {dreamWithCaptain.toFixed(1)} xp (base {dreamBase.toFixed(1)})
        </p>

        {squadCaptain && (
          <p className="text-xs text-muted-foreground mt-1">
            Captain: <strong>{squadCaptain.name}</strong> • Vice:{" "}
            <strong>{squadVice?.name ?? "-"}</strong>
          </p>
        )}
      </div>

      {/* Dream Team List */}
      <div className="glass-card rounded-xl p-6">
        <h4 className="text-sm font-semibold mb-3">
          Dream Team
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {dreamTeam.map((p) => {
            const xp = getExpectedPointsForHorizon(p, horizon);
            const isC = dreamCaptain && p.id === dreamCaptain.id;
            const isV = dreamVice && p.id === dreamVice.id;

            return (
              <div
                key={p.id}
                className="flex justify-between px-3 py-2 bg-muted/40 rounded-md text-xs"
              >
                <div>
                  <p className="font-medium flex gap-1 items-center">
                    {p.name}
                    {isC && (
                      <span className="text-[10px] bg-primary text-primary-foreground px-1 rounded">
                        C
                      </span>
                    )}
                    {isV && (
                      <span className="text-[10px] bg-secondary text-secondary-foreground px-1 rounded">
                        VC
                      </span>
                    )}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {p.position} • £{(p as any).price?.toFixed(1) ?? "-"}m
                  </p>
                </div>

                <div className="text-right">
                  <p className="font-semibold">{xp.toFixed(1)} xp</p>
                  <p className="text-[10px] text-muted-foreground">
                    Next: {(p as any).expectedPointsNext?.toFixed?.(1) ?? "0.0"}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
