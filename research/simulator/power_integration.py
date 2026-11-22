"""
Power to Energy Integration with Dynamic Gap Handling
Implements trapezoidal integration over instantaneous power samples (Watts -> kWh)
with dynamic, data-driven gap omission to prevent phantom energy accumulation.
"""

from __future__ import annotations
from typing import Sequence, Tuple
import numpy as np


def integrate_power_series(
    timestamps_sec: Sequence[float],
    power_watts: Sequence[float],
    max_gap_multiplier: float = 3.0,
    min_gap_cutoff_sec: float = 300.0,
) -> Tuple[float, int, int]:
    """
    Computes energy in kWh from instantaneous power samples in Watts using trapezoidal rule.
    
    Parameters:
    -----------
    timestamps_sec : Sequence of monotonically increasing timestamps in seconds
    power_watts : Sequence of instantaneous power readings in Watts (non-negative)
    max_gap_multiplier : Multiple of median sampling interval beyond which a gap is omitted
    min_gap_cutoff_sec : Minimum gap duration in seconds to trigger omission
    
    Returns:
    --------
    Tuple[energy_kwh, valid_segments_integrated, gaps_omitted]
    """
    ts = np.asarray(timestamps_sec, dtype=float)
    pw = np.asarray(power_watts, dtype=float)

    if len(ts) < 2 or len(pw) < 2 or len(ts) != len(pw):
        return 0.0, 0, 0

    # Ensure non-negative power
    pw = np.maximum(0.0, pw)

    delta_ts = np.diff(ts)
    if np.any(delta_ts <= 0):
        raise ValueError("Timestamps must be strictly monotonically increasing.")

    # Determine nominal sampling interval using 25th percentile (robust to outliers/gaps)
    # matching the TypeScript engine fix
    sorted_dts = np.sort(delta_ts)
    p25_idx = int(np.floor((len(sorted_dts) - 1) * 0.25))
    nominal_dt = sorted_dts[p25_idx]

    gap_threshold = max(min_gap_cutoff_sec, float(nominal_dt * max_gap_multiplier))

    total_energy_kwh = 0.0
    valid_segments = 0
    gaps_omitted = 0

    for i in range(len(delta_ts)):
        dt = delta_ts[i]
        if dt > gap_threshold:
            # Abnormal gap: omit segment to prevent accumulating false energy
            gaps_omitted += 1
            continue

        # Trapezoidal rule: Area = (P_{i} + P_{i+1}) / 2 * dt (Watt-seconds = Joules)
        # 1 kWh = 3,600,000 Joules
        p_avg = (pw[i] + pw[i + 1]) / 2.0
        segment_kwh = (p_avg * dt) / 3_600_000.0
        total_energy_kwh += segment_kwh
        valid_segments += 1

    return float(total_energy_kwh), valid_segments, gaps_omitted
