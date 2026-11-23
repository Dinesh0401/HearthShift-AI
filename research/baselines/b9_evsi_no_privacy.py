"""
Baseline B9: Exact EVSI with Interaction Costs but No Additional Privacy Penalty
Evaluates Value of Information using the exact tariff with query cost c_ask,
but sets privacy cost c_priv(q) = 0.
"""

from __future__ import annotations
from baselines.b7_exact_evsi import ExactEVSIAdvisor


class ExactEVSINoPrivacyAdvisor(ExactEVSIAdvisor):
    def __init__(
        self,
        max_queries: int = 3,
        cost_ask_paise: float = 200.0,
        lambda_discomfort_paise: float = 20000.0,
    ):
        super().__init__(
            max_queries=max_queries,
            cost_ask_paise=cost_ask_paise,
            lambda_discomfort_paise=lambda_discomfort_paise,
            enforce_privacy_cost=False,
        )
        self.name = 'B9_EVSINoPrivacy'
