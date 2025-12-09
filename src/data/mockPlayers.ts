export interface Player {
  id: number;
  name: string;
  team: string;
  teamShort: string;
  position: 'GKP' | 'DEF' | 'MID' | 'FWD';
  price: number;
  form: number;
  totalPoints: number;
  expectedPointsNext: number;
  expectedPoints5GW: number;
  fixtures: Fixture[];
  selectedBy: number;
  goalsScored: number;
  assists: number;
  cleanSheets: number;
  minutesPlayed: number;
  ictIndex: number;
  mlExpectedPointsThisGW?: number;
  hybridExpectedPointsNext?: number;
}

export interface Fixture {
  opponent: string;
  opponentShort: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  isHome: boolean;
  gameweek: number;
}

export const mockPlayers: Player[] = [];
export const mockFixtures: any[] = [];
