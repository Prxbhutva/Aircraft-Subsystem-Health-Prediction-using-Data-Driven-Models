def clamp(v, lo=None, hi=None):
    if lo is not None and v < lo: return lo
    if hi is not None and v > hi: return hi
    return v
