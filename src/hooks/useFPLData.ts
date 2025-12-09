import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import {
  fplApi,
  FPLBootstrapResponse,
  FPLFixture,
  FPLPlayer,
  FPLTeam,
  FPLEvent,
} from "@/services/fplApi";
import { Player, Fixture } from "@/data/mockPlayers";
import { useMLPredictions } from "@/hooks/useMLPredictions";
import { useModelWeights } from "@/contexts/ModelWeightsContext";

const positionMap: Record<number, "GKP" | "DEF" | "MID" | "FWD"> = {
  1: "GKP",
  2: "DEF",
  3: "MID",
  4: "FWD",
};

function calculateExpectedPoints5GW(
  player: FPLPlayer,
  fixtures: FPLFixture[],
  teams: FPLTeam[],
  currentGW: number
): number {
  const playerTeamId = player.team;

  // Upcoming fixtures for this team in the next 5 GWs
  const nextFixtures = fixtures
    .filter(
      (f) =>
        f.event !== null && f.event > currentGW && f.event <= currentGW + 5
    )
    .filter((f) => f.team_h === playerTeamId || f.team_a === playerTeamId)
    .slice(0, 5);

  // FPL + season stats
  const epNext = parseFloat(player.ep_next || "0") || 0;
  const form = parseFloat(player.form || "0") || 0;
  const minutes = player.minutes || 0;
  const totalPoints = player.total_points || 0;

  const gamesPlayed = minutes > 0 ? minutes / 90 : 0;
  const pointsPerGame = gamesPlayed > 0 ? totalPoints / gamesPlayed : 0;

  // --- 1) Base EP per game ---
  // Prefer FPL ep_next, fall back to season performance / form
  let baseEP = epNext;
  if (baseEP === 0) {
    if (pointsPerGame > 0) {
      baseEP = pointsPerGame;
    } else {
      baseEP = form;
    }
  }

  if (baseEP <= 0) return 0;

  // --- 2) Minutes factor: punish tiny samples, reward regulars ---
  // 0.3 → very low minutes, 1 → ~10 full games or more
  const sampleFactor = Math.max(0.3, Math.min(1, minutes / 900));

  // --- 3) Availability: injury / suspension chance ---
  const playProb =
    player.chance_of_playing_next_round != null
      ? player.chance_of_playing_next_round / 100
      : 1;

  const effectiveBase = baseEP * sampleFactor * playProb;

  // If no fixtures, just project flat
  if (nextFixtures.length === 0) {
    return Number((effectiveBase * 5).toFixed(1));
  }

  // --- 4) Fixture difficulty + home/away ---
  const difficultyWeights: Record<number, number> = {
    1: 1.3,
    2: 1.15,
    3: 1.0,
    4: 0.85,
    5: 0.7,
  };

  const homeBonus = 1.05;
  const awayPenalty = 0.95;

  let total = 0;

  nextFixtures.forEach((fixture) => {
    const isHome = fixture.team_h === playerTeamId;
    const difficulty = isHome
      ? fixture.team_a_difficulty
      : fixture.team_h_difficulty;
    const diffFactor =
      difficultyWeights[difficulty as 1 | 2 | 3 | 4 | 5] ?? 1;
    const venueFactor = isHome ? homeBonus : awayPenalty;

    total += effectiveBase * diffFactor * venueFactor;
  });

  // If <5 fixtures (e.g. blanks), assume the rest look like the average
  if (nextFixtures.length < 5 && nextFixtures.length > 0) {
    const avg = total / nextFixtures.length;
    total += avg * (5 - nextFixtures.length);
  }

  return Number(total.toFixed(1));
}

function getPlayerFixtures(
  playerTeamId: number,
  fixtures: FPLFixture[],
  teams: FPLTeam[],
  currentGW: number
): Fixture[] {
  const teamMap = new Map(teams.map((t) => [t.id, t]));

  return fixtures
    .filter(
      (f) =>
        f.event !== null && f.event > currentGW && f.event <= currentGW + 5
    )
    .filter((f) => f.team_h === playerTeamId || f.team_a === playerTeamId)
    .map((f) => {
      const isHome = f.team_h === playerTeamId;
      const opponentId = isHome ? f.team_a : f.team_h;
      const opponent = teamMap.get(opponentId);
      const difficulty = isHome ? f.team_h_difficulty : f.team_a_difficulty;

      return {
        opponent: opponent?.name || "Unknown",
        opponentShort: opponent?.short_name || "UNK",
        difficulty: Math.min(5, Math.max(1, difficulty)) as
          | 1
          | 2
          | 3
          | 4
          | 5,
        isHome,
        gameweek: f.event!,
      };
    })
    .slice(0, 5);
}

function transformPlayer(
  fplPlayer: FPLPlayer,
  teams: FPLTeam[],
  fixtures: FPLFixture[],
  currentGW: number
): Player {
  const team = teams.find((t) => t.id === fplPlayer.team);
  const playerFixtures = getPlayerFixtures(
    fplPlayer.team,
    fixtures,
    teams,
    currentGW
  );
  const expectedPoints5GW = calculateExpectedPoints5GW(
    fplPlayer,
    fixtures,
    teams,
    currentGW
  );

  return {
    id: fplPlayer.id,
    name: fplPlayer.web_name,
    team: team?.name || "Unknown",
    teamShort: team?.short_name || "UNK",
    position: positionMap[fplPlayer.element_type] || "MID",
    price: fplPlayer.now_cost / 10,
    form: parseFloat(fplPlayer.form || "0"),
    totalPoints: fplPlayer.total_points,
    expectedPointsNext: parseFloat(fplPlayer.ep_next || "0"),
    expectedPoints5GW,
    fixtures: playerFixtures,
    selectedBy: parseFloat(fplPlayer.selected_by_percent || "0"),
    goalsScored: fplPlayer.goals_scored,
    assists: fplPlayer.assists,
    cleanSheets: fplPlayer.clean_sheets,
    minutesPlayed: fplPlayer.minutes,
    ictIndex: parseFloat(fplPlayer.ict_index || "0"),
  };
}

export function useFPLData() {
  const bootstrapQuery = useQuery<FPLBootstrapResponse>({
    queryKey: ["fpl-bootstrap"],
    queryFn: () => fplApi.getBootstrapData(),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const fixturesQuery = useQuery<FPLFixture[]>({
    queryKey: ["fpl-fixtures"],
    queryFn: () => fplApi.getFixtures(),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const isLoading = bootstrapQuery.isLoading || fixturesQuery.isLoading;
  const error = bootstrapQuery.error || fixturesQuery.error;

  const data = bootstrapQuery.data;
  const fixtures = fixturesQuery.data || [];
  const teams = data?.teams || [];
  const events = data?.events || [];

  // Find current gameweek
  const currentEvent =
    events.find((e) => e.is_current) || events.find((e) => e.is_next);
  const currentGW = currentEvent?.id || 1;

  // Base players (no ML)
  const basePlayers: Player[] = (data?.elements || [])
    .filter((p) => p.status !== "u") // Filter out unavailable players
    .map((p) => transformPlayer(p, teams, fixtures, currentGW));

  // ML predictions + weights
  const { predictions } = useMLPredictions();
  const { weightMlNext } = useModelWeights();

  // Attach ML EP for this GW
  const playersWithML: Player[] = useMemo(() => {
    if (!predictions) return basePlayers;

    return basePlayers.map((player) => {
      const key = `${player.id}_${currentGW}`;
      const ml = predictions[key];

      return {
        ...player,
        mlExpectedPointsThisGW: ml ? ml.pred_points_rf : undefined,
      };
    });
  }, [basePlayers, predictions, currentGW]);

  // Blend classic expectedPointsNext + ML → hybridExpectedPointsNext
// useFPLData.ts

  // Blend classic expectedPointsNext + ML → hybridExpectedPointsNext
// Blend classic expectedPointsNext + ML → hybridExpectedPointsNext
  const playersWithHybrid: Player[] = useMemo(() => {
    return playersWithML.map((player) => {
      const base = player.expectedPointsNext ?? 0; // normal model xPts
      const ml = player.mlExpectedPointsThisGW;     // ML model xPts
      const w = weightMlNext; // 0–1, how much ML to use

      const blended =
        ml == null || Number.isNaN(ml) ? base : (1 - w) * base + w * ml;

      return {
        ...player,
        // 🔑 This is now the official "predicted points" everywhere
        expectedPointsNext: blended,
        hybridExpectedPointsNext: blended,
      };
    });
  }, [playersWithML, weightMlNext]);




  return {
    players: playersWithHybrid,
    teams,
    currentGameweek: currentGW,
    events,
    isLoading,
    error,
    refetch: () => {
      fplApi.clearCache();
      bootstrapQuery.refetch();
      fixturesQuery.refetch();
    },
  };
}

export function useCurrentGameweek() {
  const { currentGameweek, events, isLoading } = useFPLData();

  const nextDeadline = events.find((e) => e.is_next)?.deadline_time;

  return {
    currentGameweek,
    nextDeadline: nextDeadline ? new Date(nextDeadline) : null,
    isLoading,
  };
}
