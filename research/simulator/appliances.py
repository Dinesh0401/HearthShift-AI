"""
Physical Appliance Models and Action Definitions
"""

from __future__ import annotations
from dataclasses import dataclass, field
from typing import Dict, List, Literal, Optional
import numpy as np


@dataclass(frozen=True)
class EnergyAction:
    """
    Feasible energy action with explicit physical categorization.
    Strictly separates reduction actions from load-shifting actions.
    """
    id: str
    appliance_id: str
    action_type: Literal['reduction', 'shift']
    description: str
    delta_kwh: float  # Permanent energy reduction in kWh (>0 for reduction, 0 for shift)
    shift_hours: float  # Hours shifted from baseline (+ for delay, - for advance)
    feature_vector: np.ndarray = field(default_factory=lambda: np.zeros(4))

    def is_reduction(self) -> bool:
        return self.action_type == 'reduction'

    def is_shift(self) -> bool:
        return self.action_type == 'shift'


class Appliance:
    def __init__(self, appliance_id: str, name: str, nominal_power_w: float):
        self.appliance_id = appliance_id
        self.name = name
        self.nominal_power_w = nominal_power_w

    def get_candidate_actions(self) -> List[EnergyAction]:
        raise NotImplementedError


class AirConditioner(Appliance):
    """
    Domestic Inverter AC model.
    Power: 1500W. Typical usage: 6-10 hours/day.
    Actions: setpoint adjustments (+0.5°C, +1°C, +2°C) or 1h duration curtailment.
    """
    def __init__(self, appliance_id: str = 'ac_1', baseline_hours: float = 8.0, baseline_setpoint: float = 23.0):
        super().__init__(appliance_id, 'Air Conditioner', 1500.0)
        self.baseline_hours = baseline_hours
        self.baseline_setpoint = baseline_setpoint

    def get_candidate_actions(self) -> List[EnergyAction]:
        return [
            EnergyAction(
                id=f'{self.appliance_id}_setpoint_plus0_5',
                appliance_id=self.appliance_id,
                action_type='reduction',
                description='Raise AC thermostat by 0.5°C (mild micro-curtailment)',
                delta_kwh=15.0,
                shift_hours=0.0,
                feature_vector=np.array([0.5, 0.0, 0.0, 0.0]),
            ),
            EnergyAction(
                id=f'{self.appliance_id}_setpoint_plus1',
                appliance_id=self.appliance_id,
                action_type='reduction',
                description='Raise AC thermostat by 1°C (23°C -> 24°C)',
                delta_kwh=35.0,
                shift_hours=0.0,
                feature_vector=np.array([1.0, 0.0, 0.0, 0.0]),
            ),
            EnergyAction(
                id=f'{self.appliance_id}_setpoint_plus2',
                appliance_id=self.appliance_id,
                action_type='reduction',
                description='Raise AC thermostat by 2°C (23°C -> 25°C)',
                delta_kwh=70.0,
                shift_hours=0.0,
                feature_vector=np.array([2.0, 0.0, 0.0, 0.0]),
            ),
            EnergyAction(
                id=f'{self.appliance_id}_curtail_1h',
                appliance_id=self.appliance_id,
                action_type='reduction',
                description='Reduce AC cooling by 1 hour per day (use fan for last hour)',
                delta_kwh=90.0,
                shift_hours=0.0,
                feature_vector=np.array([2.5, 0.0, 0.0, 0.0]),
            ),
        ]


class WashingMachine(Appliance):
    """
    Domestic Washing Machine.
    Power: 500W motor, 1500W heater (1.2 kWh per cycle).
    Typical baseline: 19:00 evening peak.
    Actions: shift cycle timing (pure load shifting, delta_kwh == 0).
    """
    def __init__(self, appliance_id: str = 'wm_1', cycles_per_week: int = 4):
        super().__init__(appliance_id, 'Washing Machine', 1200.0)
        self.cycles_per_week = cycles_per_week

    def get_candidate_actions(self) -> List[EnergyAction]:
        return [
            EnergyAction(
                id=f'{self.appliance_id}_shift_morning',
                appliance_id=self.appliance_id,
                action_type='shift',
                description='Shift laundry run from 19:00 to 07:00 (morning off-peak)',
                delta_kwh=0.0,
                shift_hours=-12.0,
                feature_vector=np.array([0.0, 1.0, 0.0, 0.0]),  # 1 unit laundry schedule shift
            ),
            EnergyAction(
                id=f'{self.appliance_id}_shift_afternoon',
                appliance_id=self.appliance_id,
                action_type='shift',
                description='Shift laundry run from 19:00 to 14:00 (solar mid-day)',
                delta_kwh=0.0,
                shift_hours=-5.0,
                feature_vector=np.array([0.0, 0.6, 0.0, 0.0]),
            ),
        ]


class WaterHeater(Appliance):
    """
    Domestic Electric Storage Water Heater (Geyser).
    Power: 2000W. 1.5 hours daily = 3.0 kWh/day = 180 kWh/cycle.
    Actions: Reduce heating duration by 20 minutes (saves 1.0 kWh/day = 60 kWh/cycle).
    """
    def __init__(self, appliance_id: str = 'wh_1'):
        super().__init__(appliance_id, 'Water Heater', 2000.0)

    def get_candidate_actions(self) -> List[EnergyAction]:
        return [
            EnergyAction(
                id=f'{self.appliance_id}_curtail_20m',
                appliance_id=self.appliance_id,
                action_type='reduction',
                description='Set water heater timer 20 minutes shorter',
                delta_kwh=60.0,
                shift_hours=0.0,
                feature_vector=np.array([0.0, 0.0, 1.0, 0.0]),  # 1 unit hot water limitation
            ),
            EnergyAction(
                id=f'{self.appliance_id}_shift_solar',
                appliance_id=self.appliance_id,
                action_type='shift',
                description='Preheat water during morning solar window (09:00)',
                delta_kwh=0.0,
                shift_hours=3.0,
                feature_vector=np.array([0.0, 0.0, 0.4, 0.0]),
            ),
        ]


class StandbyPower(Appliance):
    """
    Domestic standby power and ambient lighting.
    Micro-actions: small energy reductions (3.0 to 6.0 kWh) with minimal discomfort.
    Critical for fine-grained testing around the 500 kWh cliff boundary.
    """
    def __init__(self, appliance_id: str = 'stby_1'):
        super().__init__(appliance_id, 'Standby & Lighting', 120.0)

    def get_candidate_actions(self) -> List[EnergyAction]:
        return [
            EnergyAction(
                id=f'{self.appliance_id}_kill_standby',
                appliance_id=self.appliance_id,
                action_type='reduction',
                description='Power down entertainment center standby on smart strip',
                delta_kwh=3.0,
                shift_hours=0.0,
                feature_vector=np.array([0.0, 0.0, 0.0, 0.2]),
            ),
            EnergyAction(
                id=f'{self.appliance_id}_led_downlight',
                appliance_id=self.appliance_id,
                action_type='reduction',
                description='Replace 2 primary halogen downlights with 9W LEDs',
                delta_kwh=6.0,
                shift_hours=0.0,
                feature_vector=np.array([0.0, 0.0, 0.0, 0.3]),
            ),
        ]

