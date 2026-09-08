"""Bounding-box proximity (§42 proximity tasks, §§11–12): distance + line + alignment."""

import math


def center(box: list[float]) -> tuple[float, float]:
    return ((box[0] + box[2]) / 2.0, (box[1] + box[3]) / 2.0)


def _diag(w: float, h: float) -> float:
    return math.hypot(w, h) or 1.0


def norm_distance(a: list[float], b: list[float], w: float, h: float) -> float:
    ax, ay = center(a)
    bx, by = center(b)
    return math.hypot(ax - bx, ay - by) / _diag(w, h)


def same_line(a: list[float], b: list[float], ratio: float = 0.5) -> bool:
    top = max(a[1], b[1])
    bottom = min(a[3], b[3])
    ha, hb = max(a[3] - a[1], 1.0), max(b[3] - b[1], 1.0)
    return (bottom - top) / min(ha, hb) >= ratio


def edge_aligned(a: list[float], b: list[float], w: float, tol: float = 0.03) -> bool:
    return abs(a[0] - b[0]) / max(w, 1.0) <= tol


def anchor_score(dist_norm: float, line: bool, aligned: bool,
                 has_anchor: bool = True) -> float:
    """Lower is better. Never blind first/max (rules 12–14): rank decides, ties by order."""
    if not has_anchor:
        return 1.0 + dist_norm  # unanchored values sink below anchored ones
    return dist_norm - (0.15 if line else 0.0) - (0.10 if aligned else 0.0)
