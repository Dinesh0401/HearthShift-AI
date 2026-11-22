"""
Base Advisor Interface & Decision Result Types
"""

from __future__ import annotations
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Dict, List, Literal, Optional, Any
import numpy as np

from simulator.appliances import EnergyAction
from simulator.tariffs import TariffPlan
from simulator.household import SyntheticHousehold


@dataclass(frozen=True)
class DecisionResult:
    action: EnergyAction
    decision_type: Literal['recommend', 'abstain'] = 'recommend'
    questions_asked: List[str] = field(default_factory=list)
    estimated_savings_paise: float = 0.0
    metadata: Dict[str, Any] = field(default_factory=dict)


class BaseAdvisor(ABC):
    """Abstract base class for all energy management advisors."""
    def __init__(self, name: str):
        self.name = name

    @abstractmethod
    def decide(
        self,
        env: Any,  # SimulationEnvironment
        household: SyntheticHousehold,
        tariff: TariffPlan,
    ) -> DecisionResult:
        """
        Executes advisor logic on household via public environment view.
        Must NEVER access private household._theta_star directly (except Oracle B5 benchmark).
        """
        raise NotImplementedError
