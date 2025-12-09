import os
import json
from typing import Any, Dict, List
import requests

BASE_URL = "https://fantasy.premierleague.com/api"
ROOT_DIR = os.path.dirname(os.path.dirname(__file__))
DATA_DIR = os.path.join(ROOT_DIR, "ml_data")

os.makedirs(DATA_DIR, exist_ok=True)


def _get(url: str) -> Any:
    resp = requests.get(url)
    resp.raise_for_status()
    return resp.json()


def get_bootstrap_static(cache_path: str = None) -> Dict[str, Any]:
    """
    Hämtar bootstrap-static (alla spelare, lag, events).
    Cachar till ml_data/bootstrap_static_2024_25.json
    """
    if cache_path is None:
        cache_path = os.path.join(DATA_DIR, "bootstrap_static_2024_25.json")

    if os.path.exists(cache_path):
        with open(cache_path, "r", encoding="utf-8") as f:
            return json.load(f)

    data = _get(f"{BASE_URL}/bootstrap-static/")
    with open(cache_path, "w", encoding="utf-8") as f:
        json.dump(data, f)
    return data


def get_fixtures(cache_path: str = None) -> List[Dict[str, Any]]:
    """
    Hämtar alla fixtures och cachar till ml_data/fixtures_2024_25.json
    """
    if cache_path is None:
        cache_path = os.path.join(DATA_DIR, "fixtures_2024_25.json")

    if os.path.exists(cache_path):
        with open(cache_path, "r", encoding="utf-8") as f:
            return json.load(f)

    data = _get(f"{BASE_URL}/fixtures/")
    with open(cache_path, "w", encoding="utf-8") as f:
        json.dump(data, f)
    return data


def get_player_history(element_id: int) -> Dict[str, Any]:
    """
    Hämtar element-summary (nuvarande säsongs matcher för spelaren).
    """
    return _get(f"{BASE_URL}/element-summary/{element_id}/")
