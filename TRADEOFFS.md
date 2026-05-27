# Engineering Tradeoffs (TRADEOFFS.md)

This document discusses the compromises made during development.

## 1. Local Lookup Tables vs External APIs
- **Tradeoff**: We hardcoded emission factors (`FUEL_FACTORS`, `GRID_FACTORS`), airport coordinates (`AIRPORTS`), and SAP plant mappings (`PLANTS`) into `utils.py`.
- **Why we did it**: To maintain robust, offline functionality and fast ingestion speeds. 
- **The Cost**: Hardcoded factors will inevitably go out of date as grid intensities and scientific consensus shift. A real production system should pull these values from a dedicated database table or external ESG factor providers (like DEFRA or EPA APIs).

## 2. In-Memory Pandas Processing
- **Tradeoff**: We use `pd.read_csv` and memory-bound iterations to parse the uploaded datasets.
- **Why we did it**: Pandas easily handles malformed CSVs, deals with `NaN`s, and allows quick transformations without boilerplate code.
- **The Cost**: Extremely large CSV files (> 500 MB) might cause the Django backend to hit Out-Of-Memory (OOM) errors. For massive enterprise workloads, we would need to shift processing to an async Celery worker or stream the file line-by-line using standard Python `csv` tools.

## 3. Basic Audit Trail Implementation
- **Tradeoff**: The `AuditLog` stores JSON diffs directly as python dictionaries stringified in a DB field.
- **Why we did it**: Simplifies querying the timeline of a single row.
- **The Cost**: Searching for historical state across millions of rows is slow. A robust version would use event-sourcing or specialized temporal tables (like PostgreSQL triggers) to avoid the overhead of manual application-layer auditing.

## 4. Normalization Synchrony
- **Tradeoff**: Normalization logic calculates CO2e synchronously in the request-response cycle.
- **Why we did it**: Ensures the user gets immediate feedback and the `saved_records` count represents fully processed rows.
- **The Cost**: Slower upload response times. If the computation grows more complex, it could lead to HTTP timeouts.
