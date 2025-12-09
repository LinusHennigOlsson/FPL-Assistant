import os
import json

import numpy as np
import pandas as pd

from .fpl_api import DATA_DIR

PLAYER_HISTORY_CSV = os.path.join(DATA_DIR, "player_history_2024_25.csv")
FIXTURES_JSON = os.path.join(DATA_DIR, "fixtures_2024_25.json")
FEATURES_CSV = os.path.join(DATA_DIR, "features_2024_25.csv")


def load_fixtures_map():
    """fixture_id -> svårighetsgrad för hemmalag/bortalag."""
    with open(FIXTURES_JSON, "r", encoding="utf-8") as f:
        fixtures = json.load(f)

    fixture_map = {}
    for fx in fixtures:
        fid = fx["id"]
        fixture_map[fid] = {
            "team_h": fx["team_h"],
            "team_a": fx["team_a"],
            "team_h_difficulty": fx["team_h_difficulty"],
            "team_a_difficulty": fx["team_a_difficulty"],
        }
    return fixture_map


def main():
    # 1) Läs in all player history
    df = pd.read_csv(PLAYER_HISTORY_CSV)
    print("Loaded history:", df.shape)

    # Sortera per spelare + gameweek
    df = df.sort_values(["element_id", "round"]).reset_index(drop=True)

    # 2) Lägg på opponent_difficulty (pre-match info) + is_home
    fixture_map = load_fixtures_map()

    def map_fixture(row):
        info = fixture_map.get(row["fixture"])
        if info is None:
            return 3  # neutral om vi inte hittar
        return (
            info["team_h_difficulty"]
            if row["was_home"]
            else info["team_a_difficulty"]
        )

    df["opponent_difficulty"] = df.apply(map_fixture, axis=1)
    df["is_home"] = df["was_home"].astype(int)

    # 3) Rolling historik per spelare (INGEN läckage: vi använder bara tidigare matcher)
    group = df.groupby("element_id")
    window = 5

    # hur många matcher spelaren hade innan denna
    df["games_played_before"] = group.cumcount()

    # helper: rolling mean/sum på tidigare matcher
    def rolling_mean(col):
        return group[col].transform(
            lambda s: s.shift(1).rolling(window, min_periods=1).mean()
        )

    def rolling_sum(col):
        return group[col].transform(
            lambda s: s.shift(1).rolling(window, min_periods=1).sum()
        )

    # minutes, poäng, xG, xA, ICT, mål, assist från TIDIGARE matcher
    df["prev_minutes_avg"] = rolling_mean("minutes")
    df["prev_points_avg"] = rolling_mean("total_points")
    df["prev_xg_avg"] = rolling_mean("expected_goals")
    df["prev_xa_avg"] = rolling_mean("expected_assists")
    df["prev_ict_avg"] = rolling_mean("ict_index")
    df["prev_goals_sum"] = rolling_sum("goals_scored")
    df["prev_assists_sum"] = rolling_sum("assists")

    # hur ofta spelaren startat (>=60 min) i senaste 5 matcher
    df["played_60"] = (df["minutes"] >= 60).astype(int)
    df["prev_starts_rate"] = group["played_60"].transform(
        lambda s: s.shift(1).rolling(window, min_periods=1).mean()
    )

    # totala säsongspoäng före denna match
    df["season_points_before"] = group["total_points"].transform(
        lambda s: s.shift(1).cumsum().fillna(0)
    )

    # 4) släng bort helt nya spelare (typ första 3 matcher, för lite data)
    df = df[df["games_played_before"] >= 3].copy()

    # 5) Meta + features + target
    meta_cols = ["element_id", "player_name", "round"]
    target_col = "total_points"

    # ENDA features modellen får:
    feature_cols = [
      "is_home",
      "opponent_difficulty",
      "prev_minutes_avg",
      "prev_points_avg",
      "prev_xg_avg",
      "prev_xa_avg",
      "prev_ict_avg",
      "prev_goals_sum",
      "prev_assists_sum",
      "prev_starts_rate",
      "season_points_before",
    ]

    features = df[meta_cols + feature_cols + [target_col]]

    os.makedirs(DATA_DIR, exist_ok=True)
    features.to_csv(FEATURES_CSV, index=False)
    print(f"Saved features to {FEATURES_CSV}")
    print("Final shape:", features.shape)
    print("Columns used as features:", feature_cols)


if __name__ == "__main__":
    main()
