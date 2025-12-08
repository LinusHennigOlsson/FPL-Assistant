// FPL API service for fetching live data from the 25/26 season
// Using a CORS proxy since the FPL API doesn't support CORS

const CORS_PROXY = "https://corsproxy.io/?";
const FPL_BASE_URL = "https://fantasy.premierleague.com/api";

export interface FPLBootstrapResponse {
  events: FPLEvent[];
  teams: FPLTeam[];
  elements: FPLPlayer[];
  element_types: FPLElementType[];
}

export interface FPLEvent {
  id: number;
  name: string;
  deadline_time: string;
  is_current: boolean;
  is_next: boolean;
  finished: boolean;
}

export interface FPLTeam {
  id: number;
  name: string;
  short_name: string;
  strength_overall_home: number;
  strength_overall_away: number;
  strength_attack_home: number;
  strength_attack_away: number;
  strength_defence_home: number;
  strength_defence_away: number;
}

export interface FPLPlayer {
  id: number;
  first_name: string;
  second_name: string;
  web_name: string;
  team: number;
  element_type: number;
  now_cost: number;
  total_points: number;
  form: string;
  ep_next: string;
  ep_this: string | null;
  selected_by_percent: string;
  goals_scored: number;
  assists: number;
  clean_sheets: number;
  minutes: number;
  ict_index: string;
  chance_of_playing_next_round: number | null;
  chance_of_playing_this_round: number | null;
  news: string;
  status: string;
}

export interface FPLFixture {
  id: number;
  event: number | null;
  team_h: number;
  team_a: number;
  team_h_difficulty: number;
  team_a_difficulty: number;
  finished: boolean;
  kickoff_time: string | null;
}

export interface FPLElementType {
  id: number;
  plural_name: string;
  plural_name_short: string;
  singular_name: string;
  singular_name_short: string;
}

export interface FPLEntryPicks {
  entry: number;
  active_chip: string | null;
  entry_history: {
    event: number;
    points: number;
    total_points: number;
    bank: number; // in 0.1m
    value: number; // in 0.1m
    event_transfers: number;
    event_transfers_cost: number;
  };
  picks: {
    element: number;
    position: number;
    is_captain: boolean;
    is_vice_captain: boolean;
    multiplier: number;
  }[];
}

class FPLApiService {
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes

  private async fetchWithCache<T>(url: string): Promise<T> {
    const cached = this.cache.get(url);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data as T;
    }

    const response = await fetch(`${CORS_PROXY}${encodeURIComponent(url)}`);
    if (!response.ok) {
      throw new Error(`FPL API error: ${response.status}`);
    }

    const data = await response.json();
    this.cache.set(url, { data, timestamp: Date.now() });
    return data as T;
  }

  async getBootstrapData(): Promise<FPLBootstrapResponse> {
    return this.fetchWithCache<FPLBootstrapResponse>(
      `${FPL_BASE_URL}/bootstrap-static/`
    );
  }

  async getFixtures(): Promise<FPLFixture[]> {
    return this.fetchWithCache<FPLFixture[]>(`${FPL_BASE_URL}/fixtures/`);
  }

  async getEntryPicks(
    entryId: number,
    eventId: number
  ): Promise<FPLEntryPicks> {
    return this.fetchWithCache<FPLEntryPicks>(
      `${FPL_BASE_URL}/entry/${entryId}/event/${eventId}/picks/`
    );
  }

  // NEW: get basic info about an entry (team name + manager name)
  async getEntrySummary(entryId: number): Promise<any> {
    return this.fetchWithCache(
      `${FPL_BASE_URL}/entry/${entryId}/`
    );
  }

  clearCache(): void {
    this.cache.clear();
  }
}


export const fplApi = new FPLApiService();
