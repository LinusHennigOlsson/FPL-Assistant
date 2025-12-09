import os
from typing import Dict, List, Tuple

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error
from sklearn.model_selection import train_test_split

from .fpl_api import DATA_DIR, get_bootstrap_static

FEATURES_CSV = os.path.join(DATA_DIR, "features_2024_25.csv")
MODEL_DIR = os.path.join(DATA_DIR, "models")

# Map FPL element_type -> position string
POSITION_MAP = {
    1: "GKP",
    2: "DEF",
    3: "MID",
    4: "FWD",
}

# Lite olika RF-inställningar per position (tweakade, men inte galet)
RF_PARAMS_BY_POS: Dict[str, Dict] = {
    "GKP": {
        "n_estimators": 500,
        "max_depth": 10,
        "min_samples_split": 4,
        "min_samples_leaf": 2,
        "n_jobs": -1,
        "random_state": 42,
    },
    "DEF": {
        "n_estimators": 600,
        "max_depth": 12,
        "min_samples_split": 4,
        "min_samples_leaf": 2,
        "n_jobs": -1,
        "random_state": 42,
    },
    "MID": {
        "n_estimators": 700,
        "max_depth": 14,
        "min_samples_split": 4,
        "min_samples_leaf": 1,
        "n_jobs": -1,
        "random_state": 42,
    },
    "FWD": {
        "n_estimators": 600,
        "max_depth": 12,
        "min_samples_split": 4,
        "min_samples_leaf": 1,
        "n_jobs": -1,
        "random_state": 42,
    },
}


def add_position_column(df: pd.DataFrame) -> pd.DataFrame:
    """
    Lägg till en 'position'-kolumn baserat på element_id via bootstrap-static.
    """
    bootstrap = get_bootstrap_static()
    elements = bootstrap["elements"]
    id_to_pos = {e["id"]: POSITION_MAP.get(e["element_type"], "MID") for e in elements}

    df = df.copy()
    df["position"] = df["element_id"].map(id_to_pos)
    return df


def train_for_position(
    df_pos: pd.DataFrame, pos: str, feature_cols: List[str]
) -> Tuple[RandomForestRegressor, float]:
    """
    Träna en RF-modell för en position, returnera (modell, val_MAE).
    """
    target_col = "total_points"

    X = df_pos[feature_cols].values
    y = df_pos[target_col].values

    X_train, X_val, y_train, y_val = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    params = RF_PARAMS_BY_POS.get(pos, RF_PARAMS_BY_POS["MID"])
    model = RandomForestRegressor(**params)

    print(f"\nTraining RF for position {pos} with {len(df_pos)} samples...")
    model.fit(X_train, y_train)

    y_pred = model.predict(X_val)
    mae = mean_absolute_error(y_val, y_pred)
    print(f"{pos} Validation MAE: {mae:.3f} points per game")

    return model, mae


def main():
    print(f"Loading features from: {FEATURES_CSV}")
    df = pd.read_csv(FEATURES_CSV)
    print("Loaded shape:", df.shape)

    # Lägg på position
    df = add_position_column(df)

    meta_cols = ["element_id", "player_name", "round", "position"]
    target_col = "total_points"
    feature_cols = [c for c in df.columns if c not in meta_cols + [target_col]]

    os.makedirs(MODEL_DIR, exist_ok=True)

    overall_y_true: List[float] = []
    overall_y_pred: List[float] = []

    maes: Dict[str, float] = {}

    for pos in ["GKP", "DEF", "MID", "FWD"]:
        df_pos = df[df["position"] == pos].copy()
        if len(df_pos) < 50:
            print(f"\nSkipping {pos}: too few samples ({len(df_pos)})")
            continue

        model, mae = train_for_position(df_pos, pos, feature_cols)
        maes[pos] = mae

        # spara modellen
        model_path = os.path.join(MODEL_DIR, f"ep_model_rf_{pos}.joblib")
        joblib.dump(model, model_path)
        print(f"Saved RF model for {pos} to {model_path}")

        # samla val-data för en approx "overall" MAE
        X_pos = df_pos[feature_cols].values
        y_pos = df_pos[target_col].values
        y_pos_pred = model.predict(X_pos)

        overall_y_true.append(y_pos)
        overall_y_pred.append(y_pos_pred)

    if overall_y_true:
        y_true_all = np.concatenate(overall_y_true)
        y_pred_all = np.concatenate(overall_y_pred)
        overall_mae = mean_absolute_error(y_true_all, y_pred_all)
        print("\n====================")
        print("Per-position MAE:")
        for pos, m in maes.items():
            print(f"  {pos}: {m:.3f}")
        print(f"Approx overall MAE (all positions): {overall_mae:.3f} points per game")
        print("====================")


if __name__ == "__main__":
    main()
