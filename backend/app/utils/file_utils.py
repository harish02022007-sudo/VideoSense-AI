import os

def is_safe_path(base_dir: str, path: str, follow_symlinks: bool = True) -> bool:
    """Verifies that a target path resolves strictly inside the base directory."""
    if follow_symlinks:
        matchpath = os.path.realpath(path)
        base = os.path.realpath(base_dir)
    else:
        matchpath = os.path.abspath(path)
        base = os.path.abspath(base_dir)
    return matchpath.startswith(base + os.sep) or matchpath == base
