from django.apps import AppConfig


class InscriptionsConfig(AppConfig):
    name = "inscriptions"

    def ready(self):
        import inscriptions.signals  # noqa: F401
