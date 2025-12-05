import { useQuery } from '@tanstack/react-query';
import { fplApi, FPLBootstrapResponse, FPLFixture, FPLPlayer, FPLTeam, FPLEvent } from '@/services/fplApi';
import { Player, Fixture } from '@/data/mockPlayers';

const positionMap: Record<number, 'GKP' | 'DEF' | 'MID' | 'FWD'> = {
  1: 'GKP',
  2: 'DEF',
  3: 'MID',
  4: 'FWD',
};

function calculateExpectedPoints5GW(
  player: FPLPlayer,
  fixtures: FPLFixture[],
  teams: FPLTeam[],
  currentGW: number
): number {
  const playerTeamId = player.team;

  // Upcoming fixtures in the next 5 gameweeks
  const upcomingFixtures = fixtures
    .filter(f => f.event !== null && f.event > currentGW && f.event <= currentGW + 5)
    .filter(f => f.team_h === playerTeamId || f.team_a === playerTeamId)
    .slice(0, 5);

  // FPL + season stats
  const epNext = parseFloat(player.ep_next || "0") || 0;
  const form = parseFloat(player.form || "0") || 0;
  const minutes = player.minutes || 0;
  const totalPoints = player.total_points || 0;

  const gamesPlayed = minutes > 0 ? minutes / 90 : 0;
  const rawPointsPer90 = gamesPlayed > 0 ? totalPoints / gamesPlayed : 0;

  // --- 1) Regularise points per 90 so tiny samples don't explode ---
  const leagueAvgPointsPer90 = 4;      // rough average FPL pts/90
  const regMinutes = 900;              // ~10 full games worth of "trust"

  const regPointsPer90 =
    (rawPointsPer90 * minutes + leagueAvgPointsPer90 * regMinutes) /
    (minutes + regMinutes || 1);

  // --- 2) Baseline EP per game: mix FPL model + season performance ---
  let baseEP: number;

  if (epNext > 0) {
    // Normal case: trust FPL but anchor to season
    baseEP = 0.6 * epNext + 0.4 * regPointsPer90;
  } else if (regPointsPer90 > 0 || form > 0) {
    // No ep_next – use season + form
    baseEP = 0.8 * regPointsPer90 + 0.2 * form;
  } else {
    return 0;
  }

  // --- 3) Minutes / nailedness: favour regular starters, punish rotation ---
  const sampleFactor = Math.max(0, Math.min(1, minutes / 900)); // 0 → no mins, 1 → 10+ full games

  const maxPossibleMinutes = Math.max(currentGW, 1) * 90;
  const nailednessRaw =
    maxPossibleMinutes > 0 ? minutes / maxPossibleMinutes : 0;
  const nailedness = Math.max(0, Math.min(1, nailednessRaw));

  // Strong boost for nailed 90-min players, big nerf on bench fodder
  let availabilityFactor = 0.2 + 0.5 * sampleFactor + 0.3 * nailedness;
  availabilityFactor = Math.max(0.2, Math.min(1, availabilityFactor));

  // --- 4) Injury / suspension chance ---
  const playProb =
    player.chance_of_playing_next_round != null
      ? player.chance_of_playing_next_round / 100
      : 1;

  const effectiveBase = baseEP * availabilityFactor * playProb;

  if (effectiveBase === 0) {
    return 0;
  }

  // --- 5) Fixture difficulty + home/away ---
  const difficultyWeights: Record<number, number> = {
    1: 1.3,
    2: 1.15,
    3: 1.0,
    4: 0.85,
    5: 0.7,
  };

  const homeBonus = 1.05;
  const awayPenalty = 0.95;

  if (upcomingFixtures.length === 0) {
    const projected = effectiveBase * 5;
    return Math.round(projected * 10) / 10;
  }

  let totalExpected = 0;

  upcomingFixtures.forEach(fixture => {
    const isHome = fixture.team_h === playerTeamId;
    const difficulty = isHome ? fixture.team_a_difficulty : fixture.team_h_difficulty;
    const diffFactor = difficultyWeights[difficulty as 1 | 2 | 3 | 4 | 5] ?? 1;
    const venueFactor = isHome ? homeBonus : awayPenalty;

    totalExpected += effectiveBase * diffFactor * venueFactor;
  });

  // If fewer than 5 fixtures (e.g. blanks), assume rest look like the average
  const used = upcomingFixtures.length;
  if (used > 0 && used < 5) {
    const avgPerGW = totalExpected / used;
    totalExpected += avgPerGW * (5 - used);
  }

  return Math.round(totalExpected * 10) / 10;
}




function getPlayerFixtures(
  playerTeamId: number,
  fixtures: FPLFixture[],
  teams: FPLTeam[],
  currentGW: number
): Fixture[] {
  const teamMap = new Map(teams.map(t => [t.id, t]));
  
  return fixtures
    .filter(f => f.event !== null && f.event > currentGW && f.event <= currentGW + 5)
    .filter(f => f.team_h === playerTeamId || f.team_a === playerTeamId)
    .map(f => {
      const isHome = f.team_h === playerTeamId;
      const opponentId = isHome ? f.team_a : f.team_h;
      const opponent = teamMap.get(opponentId);
      const difficulty = isHome ? f.team_h_difficulty : f.team_a_difficulty;
      
      return {
        opponent: opponent?.name || 'Unknown',
        opponentShort: opponent?.short_name || 'UNK',
        difficulty: Math.min(5, Math.max(1, difficulty)) as 1 | 2 | 3 | 4 | 5,
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
  const team = teams.find(t => t.id === fplPlayer.team);
  const playerFixtures = getPlayerFixtures(fplPlayer.team, fixtures, teams, currentGW);
  const expectedPoints5GW = calculateExpectedPoints5GW(fplPlayer, fixtures, teams, currentGW);

  return {
    id: fplPlayer.id,
    name: fplPlayer.web_name,
    team: team?.name || 'Unknown',
    teamShort: team?.short_name || 'UNK',
    position: positionMap[fplPlayer.element_type] || 'MID',
    price: fplPlayer.now_cost / 10,
    form: parseFloat(fplPlayer.form || '0'),
    totalPoints: fplPlayer.total_points,
    expectedPointsNext: parseFloat(fplPlayer.ep_next || '0'),
    expectedPoints5GW,
    fixtures: playerFixtures,
    selectedBy: parseFloat(fplPlayer.selected_by_percent || '0'),
    goalsScored: fplPlayer.goals_scored,
    assists: fplPlayer.assists,
    cleanSheets: fplPlayer.clean_sheets,
    minutesPlayed: fplPlayer.minutes,
    ictIndex: parseFloat(fplPlayer.ict_index || '0'),
  };
}

export function useFPLData() {
  const bootstrapQuery = useQuery({
    queryKey: ['fpl-bootstrap'],
    queryFn: () => fplApi.getBootstrapData(),
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    refetchOnWindowFocus: false,
  });

  const fixturesQuery = useQuery({
    queryKey: ['fpl-fixtures'],
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
  const currentEvent = events.find(e => e.is_current) || events.find(e => e.is_next);
  const currentGW = currentEvent?.id || 1;

  // Transform players
  const players: Player[] = (data?.elements || [])
    .filter(p => p.status !== 'u') // Filter out unavailable players
    .map(p => transformPlayer(p, teams, fixtures, currentGW));

  return {
    players,
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
  
  const nextDeadline = events.find(e => e.is_next)?.deadline_time;
  
  return {
    currentGameweek,
    nextDeadline: nextDeadline ? new Date(nextDeadline) : null,
    isLoading,
  };
}
