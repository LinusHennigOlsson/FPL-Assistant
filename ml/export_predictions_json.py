import os
import json

import pandas as pd

ROOT_DIR = os.path.dirname(os.path.dirname(__file__))
DATA_DIR = os.path.join(ROOT_DIR, "ml_data")
PUBLIC_DIR = os.path.join(ROOT_DIR, "public")

PREDICTIONS_CSV = os.path.join(DATA_DIR, "predictions_2024_25.csv")
OUTPUT_JSON = os.path.join(PUBLIC_DIR, "ml_predictions_24_25.json")


def main():
    print("Loading predictions from:", PREDICTIONS_CSV)
    df = pd.read_csv(PREDICTIONS_CSV)

    records = {}
    for _, row in df.iterrows():
        key = f"{int(row['element_id'])}_{int(row['round'])}"
        records[key] = {
            "element_id": int(row["element_id"]),
            "round": int(row["round"]),
            "player_name": row["player_name"],
            "pred_points_rf": float(row["pred_points_rf"]),
        }

    os.makedirs(PUBLIC_DIR, exist_ok=True)
    with open(OUTPUT_JSON, "w", encoding="utf-8") as f:
        json.dump(records, f, ensure_ascii=False, indent=2)

    print(f"Saved JSON to {OUTPUT_JSON}")
    print(f"Total records: {len(records)}")


if __name__ == "__main__":
    main()
