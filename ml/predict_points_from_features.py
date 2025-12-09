import os

import joblib
import pandas as pd

from .fpl_api import DATA_DIR, get_bootstrap_static

FEATURES_CSV = os.path.join(DATA_DIR, "features_2024_25.csv")
MODEL_DIR = os.path.join(DATA_DIR, "models")
PREDICTIONS_CSV = os.path.join(DATA_DIR, "predictions_2024_25.csv")

POSITION_MAP = {
    1: "GKP",
    2: "DEF",
    3: "MID",
    4: "FWD",
}


def add_position_column(df: pd.DataFrame) -> pd.DataFrame:
    bootstrap = get_bootstrap_static()
    elements = bootstrap["elements"]
    id_to_pos = {e["id"]: POSITION_MAP.get(e["element_type"], "MID") for e in elements}

    df = df.copy()
    df["position"] = df["element_id"].map(id_to_pos)
    return df


def main():
    print("Loading features...")
    df = pd.read_csv(FEATURES_CSV)
    print("Features shape:", df.shape)

    # Lägg till position
    df = add_position_column(df)

    meta_cols = ["element_id", "player_name", "round", "position"]
    target_col = "total_points"
    feature_cols = [c for c in df.columns if c not in meta_cols + [target_col]]

    # För output
    out_rows = []

    # Ladda modeller per position
    models = {}
    for pos in ["GKP", "DEF", "MID", "FWD"]:
        model_path = os.path.join(MODEL_DIR, f"ep_model_rf_{pos}.joblib")
        if os.path.exists(model_path):
            models[pos] = joblib.load(model_path)
            print(f"Loaded model for {pos} from {model_path}")
        else:
            print(f"No model found for {pos}, will skip those rows.")

    for pos, model in models.items():
        df_pos = df[df["position"] == pos].copy()
        if df_pos.empty:
            continue

        X = df_pos[feature_cols].values
        preds = model.predict(X)

        tmp = df_pos[["element_id", "player_name", "round"]].copy()
        tmp["pred_points_rf"] = preds
        out_rows.append(tmp)

    if not out_rows:
        print("No predictions generated – no models or no matching rows.")
        return

    out = pd.concat(out_rows, axis=0).reset_index(drop=True)
    out.to_csv(PREDICTIONS_CSV, index=False)
    print(f"Saved predictions to {PREDICTIONS_CSV}")
    print("Shape:", out.shape)


if __name__ == "__main__":
    main()
