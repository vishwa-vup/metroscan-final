"""Server-side file storage (§27): generated names, no traversal, originals immutable."""

import uuid
from pathlib import Path

from app.core_config import get_settings

IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}


def storage_root() -> Path:
    root = Path(get_settings().storage_dir)
    root.mkdir(parents=True, exist_ok=True)
    return root


def save_original(image_bytes: bytes, ext: str) -> tuple[str, str]:
    """Returns (asset_name, absolute_path). Name is server-generated (rule 1)."""
    asset = f"{uuid.uuid4().hex}{ext.lower()}"
    path = storage_root() / asset
    path.write_bytes(image_bytes)  # original written once, never mutated (rule 4)
    return asset, str(path)


def original_path(asset_name: str) -> Path:
    name = Path(asset_name).name  # strip any directory parts (rule 2: no traversal)
    return storage_root() / name
