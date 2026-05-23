from __future__ import annotations

import math
from typing import Any, List


def compute_pages(total: int, size: int) -> int:
    if size == 0:
        return 0
    return math.ceil(total / size)


def paginate_response(items: List[Any], total: int, page: int, size: int) -> dict:
    return {
        "items": items,
        "total": total,
        "page": page,
        "size": size,
        "pages": compute_pages(total, size),
    }
