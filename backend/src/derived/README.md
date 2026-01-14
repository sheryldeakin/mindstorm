# Derived Layer

This folder holds the derived data schemas and services used to power pages without recomputation.

Goals:
- EntrySignals are computed per entry on save.
- All other derived docs are recomputed in background jobs.
- Pages never call LLMs directly; they read cached LLM wording.
