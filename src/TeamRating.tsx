import { useMemo, useState } from "react";
import { Player } from "@/data/mockPlayers";

interface TeamRatingProps {
  squad: Player[];
  allPlayers: Player[];
}

const HORIZON_OPTIONS = [1, 2, 3, 4, 5];

function getExpectedPointsForHorizon(player: Player, horizon: number): number {
  const next = Number((player as any).expectedPointsNext ?? 0);
  const total5 = Number((player as any).expectedPoints5GW ?? 0);

  if (horizon <= 1) return next;

  // Simple approximation: distribute 5-GW total over 5 GWs
  const perGW = total5 / 5;
  return perGW * horizon;
}

export function TeamRating({ squad, allPlayers }: TeamRatingProps) {
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
        dreamTeam: [] as Player[],
        squadCaptain: null as Player | null,
        squadVice: null as Player | null,
        dreamCaptain: null as Player | null,
        dreamVice: null as Player | null,
      };
    }

    const safeSquad = Array.isArray(squad) ? squad : [];

    // ----- base totals -----
    const squadBase = safeSquad.reduce(
      (sum, p) => sum + getExpectedPointsForHorizon(p, horizon),
      0
    );

    const pickTop = (position: Player["position"], count: number): Player[] => {
      return allPlayers
        .filter((p) => p.position === position)
        .sort(
          (a, b) =>
            getExpectedPointsForHorizon(b, horizon) -
            getExpectedPointsForHorizon(a, horizon)
        )
        .slice(0, count);
    };

    const dreamKeepers = pickTop("GKP", 2);
    const dreamDefs = pickTop("DEF", 5);
    const dreamMids = pickTop("MID", 5);
    const dreamFwds = pickTop("FWD", 3);

    const dreamTeam = [
      ...dreamKeepers,
      ...dreamDefs,
      ...dreamMids,
      ...dreamFwds,
    ];

    const dreamBase = dreamTeam.reduce(
      (sum, p) => sum + getExpectedPointsForHorizon(p, horizon),
      0
    );

    // ----- captain / vice logic -----
    const withCaptainBonus = (players: Player[], baseTotal: number) => {
      if (players.length === 0) {
        return {
          total: baseTotal,
          captain: null as Player | null,
          vice: null as Player | null,
        };
      }

      const sorted = [...players].sort(
        (a, b) =>
          getExpectedPointsForHorizon(b, horizon) -
          getExpectedPointsForHorizon(a, horizon)
      );

      const captain = sorted[0] ?? null;
      const vice = sorted[1] ?? null;
      const captainXp = captain
        ? getExpectedPointsForHorizon(captain, horizon)
        : 0;

      // captain scores double, so add one extra share of his XP
      const total = baseTotal + captainXp;

      return { total, captain, vice };
    };

    const squadCapInfo = withCaptainBonus(safeSquad, squadBase);
    const dreamCapInfo = withCaptainBonus(dreamTeam, dreamBase);

    const rawRating =
      dreamCapInfo.total > 0
        ? (squadCapInfo.total / dreamCapInfo.total) * 100
        : 0;
    const rating = Math.round(rawRating * 10) / 10; // 1 decimal

    return {
      squadBase,
      squadWithCaptain: squadCapInfo.total,
      dreamBase,
      dreamWithCaptain: dreamCapInfo.total,
      rating,
      dreamTeam,
      squadCaptain: squadCapInfo.captain,
      squadVice: squadCapInfo.vice,
      dreamCaptain: dreamCapInfo.captain,
      dreamVice: dreamCapInfo.vice,
    };
  }, [squad, allPlayers, horizon]);

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h3 className="text-lg font-semibold text-foreground">
            Team rating (CAPTAIN TEST)
          </h3>

          <p className="text-xs text-muted-foreground">
            Based on expected points for the upcoming {horizon} gameweek
            {horizon > 1 ? "s" : ""}. 100% include double points for captain.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Horizon:</span>
          <div className="flex gap-1">
            {HORIZON_OPTIONS.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setHorizon(opt)}
                className={
                  "px-2 py-1 text-xs rounded-full border " +
                  (opt === horizon
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-muted-foreground border-border hover:bg-accent")
                }
              >
                {opt} GW{opt > 1 ? "s" : ""}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Rating Card */}
      <div className="glass-card rounded-xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
            Squad rating (with captain)
          </p>
          <p className="text-4xl font-bold font-display">
            {isNaN(rating) ? "--" : rating.toFixed(1)}%
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Your squad: {squadWithCaptain.toFixed(1)} xp (base{" "}
            {squadBase.toFixed(1)}) • Dream team:{" "}
            {dreamWithCaptain.toFixed(1)} xp (base {dreamBase.toFixed(1)})
          </p>
          {squadCaptain && (
            <p className="text-[11px] text-muted-foreground mt-1">
              Rek. kapten:{" "}
              <span className="font-medium">
                {squadCaptain.name}
              </span>{" "}
              ({getExpectedPointsForHorizon(
                squadCaptain,
                horizon
              ).toFixed(1)}{" "}
              xp) • Vice:{" "}
              <span className="font-medium">
                {squadVice ? squadVice.name : "–"}
              </span>
            </p>
          )}
        </div>

        <div className="w-full md:w-64">
          <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{
                width: `${Math.max(
                  0,
                  Math.min(100, isNaN(rating) ? 0 : rating)
                )}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Dream team */}
      <div className="glass-card rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-semibold text-foreground">
            Dream team (next {horizon} GW{horizon > 1 ? "s" : ""})
          </h4>
          <p className="text-xs text-muted-foreground">
            2 GKP • 5 DEF • 5 MID • 3 FWD • med C/VC
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {dreamTeam.map((p) => {
            const xp = getExpectedPointsForHorizon(p, horizon);
            const isCap = dreamCaptain && p.id === dreamCaptain.id;
            const isVc = !isCap && dreamVice && p.id === dreamVice.id;

            return (
              <div
                key={p.id}
                className="flex items-center justify-between text-xs px-3 py-2 rounded-lg bg-muted/40"
              >
                <div>
                  <p className="font-medium flex items-center gap-1">
                    {p.name}{" "}
                    <span className="text-[10px] text-muted-foreground">
                      ({(p as any).teamShort ?? (p as any).team ?? ""})
                    </span>
                    {isCap && (
                      <span className="text-[10px] px-1.5 py-[1px] rounded-full bg-primary text-primary-foreground">
                        C
                      </span>
                    )}
                    {isVc && (
                      <span className="text-[10px] px-1.5 py-[1px] rounded-full bg-secondary text-secondary-foreground">
                        VC
                      </span>
                    )}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {p.position} • £
                    {typeof (p as any).price === "number"
                      ? (p as any).price.toFixed(1)
                      : "-"}
                    m
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold">
                    {xp.toFixed(1)} xp
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    Next GW:{" "}
                    {Number((p as any).expectedPointsNext ?? 0).toFixed(1)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {dreamTeam.length === 0 && (
          <p className="text-xs text-muted-foreground">
            No players available to build a dream team yet.
          </p>
        )}
      </div>
    </div>
  );
}
