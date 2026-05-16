from django.apps import AppConfig


class FinanceConfig(AppConfig):
    name = 'finance'

    def ready(self):
        from finance.signals import connect_all_signals
        connect_all_signals()
