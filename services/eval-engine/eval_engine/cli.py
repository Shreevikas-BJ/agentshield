from __future__ import annotations

import json
import sys
from pathlib import Path

from .analytics import analyze_run


def main() -> None:
    payload = json.loads(Path(sys.argv[1]).read_text() if len(sys.argv) > 1 else sys.stdin.read())
    print(json.dumps(analyze_run(payload), indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
