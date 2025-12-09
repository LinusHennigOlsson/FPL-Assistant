import os
import time
from typing import List, Dict, Any

import pandas as pd

from .fpl_api import get_bootstrap_static, get_fixtures, get_player_history, DATA_DIR

PLAYER_HISTORY_CSV = os.path.join(DATA_DIR, "player_history_2024_25.csv")


def download_player_histories(sleep_sec: float = 0.2) -> pd.DataFrame:
    bootstrap = get_bootstrap_static()
    fixtures = get_fixtures()

    elements = bootstrap["elements"]  # alla spelare
    id_to_name = {e["id"]: e["web_name"] for e in elements}

    rows: List[Dict[str, Any]] = []

    total = len(elements)
    for i, el in enumerate(elements, start=1):
        element_id = el["id"]
        name = el["web_name"]

        try:
            summary = get_player_history(element_id)
        except Exception as e:
            print(f"Misslyckades för player {name} ({element_id}): {e}")
            continue

        for h in summary.get("history", []):
            # H är en match (GW) för den här säsongen
            rows.append(
                {
                    "element_id": element_id,
                    "player_name": name,
                    "round": h["round"],
                    "fixture": h["fixture"],
                    "was_home": h["was_home"],
                    "minutes": h["minutes"],
                    "goals_scored": h["goals_scored"],
                    "assists": h["assists"],
                    "clean_sheets": h["clean_sheets"],
                    "goals_conceded": h["goals_conceded"],
                    "yellow_cards": h["yellow_cards"],
                    "red_cards": h["red_cards"],
                    "bonus": h["bonus"],
                    "bps": h["bps"],
                    "influence": float(h["influence"]),
                    "creativity": float(h["creativity"]),
                    "threat": float(h["threat"]),
                    "ict_index": float(h["ict_index"]),
                    "expected_goals": float(h.get("expected_goals", 0) or 0),
                    "expected_assists": float(h.get("expected_assists", 0) or 0),
                    "expected_goals_conceded": float(
                        h.get("expected_goals_conceded", 0) or 0
                    ),
                    "total_points": h["total_points"],
                }
            )

        if i % 20 == 0:
            print(f"Players: {i}/{total}")
        time.sleep(sleep_sec)

    df = pd.DataFrame(rows)
    return df


def main():
    os.makedirs(DATA_DIR, exist_ok=True)
    df = download_player_histories()
    df.to_csv(PLAYER_HISTORY_CSV, index=False)
    print(f"Sparade player history till {PLAYER_HISTORY_CSV}")
    print("Shape:", df.shape)


if __name__ == "__main__":
    main()
