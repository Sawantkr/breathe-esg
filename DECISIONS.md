# Key Technical Decisions (DECISIONS.md)

This document outlines the major architectural and design decisions made while building the Breathe ESG ingestion system.

## 1. JSONField for Raw & Normalized Payloads
We used PostgreSQL `JSONField`s (`raw_data` and `normalized_data`) in Django to store the full row context from varying data sources.
- **Why**: Different data sources (SAP, Utility, Travel) have radically different schema columns. Using a single NoSQL-like payload field allows us to store arbitrary metadata without migrating the database schema every time a new data source is added.

## 2. Decoupled Normalizer Utilities
The logic to convert raw CSV inputs to standard `EmissionRecord` objects is abstracted into `backend/ingestion/utils.py` with specific strategies (`normalize_sap`, `normalize_utility`, `normalize_travel`).
- **Why**: This strategy pattern allows developers to add new parsers without modifying the core views or database models, preserving the Single Responsibility Principle.

## 3. Haversine Distance Calculation
For Scope 3 air travel lacking explicit distance data, we use an in-memory dictionary of airport coordinates and the Haversine formula to compute great-circle distance.
- **Why**: It is faster and more reliable than making external API calls to Google Maps or AviationStack for every row during bulk upload, preventing rate limits and ingestion timeouts.

## 4. Proportional Monthly Allocation
Utility bills rarely align perfectly with a calendar month (e.g., April 15 - May 15). We calculate a daily average and allocate emissions proportionally across calendar months.
- **Why**: Standardized monthly trend analysis requires exact calendar alignment.

## 5. Unified Ingestion Endpoint
Instead of separate API routes for each source, we use a single `/api/ingestion/upload/` endpoint that accepts a `source_type` parameter.
- **Why**: It simplifies the frontend UI (one upload component) and standardizes the API response structure.
