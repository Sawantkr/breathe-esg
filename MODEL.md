# Data Model Defense (MODEL.md)

This document explains the robustness and high-quality design of our ingestion and ESG tracking data models.

## 1. Multi-Tenancy Architecture
We implemented a multi-tenant environment using the `Organization` and `UserProfile` models. 
Every `EmissionRecord` and `AuditLog` is mapped to an `Organization`. This allows B2B SaaS deployments where multiple corporate tenants can use the system in isolation. 

## 2. EmissionRecord Schema
The `EmissionRecord` model tracks all ESG data ingestions with the following robust characteristics:
- **Raw and Normalized Preservation**: Both raw inputs (`raw_quantity`, `raw_unit`, `raw_data`) and normalized values (`normalized_quantity`, `normalized_unit`, `normalized_data`) are stored. This guarantees data provenance.
- **Traceability**: We store `source_file_name` and `row_index` so data analysts can quickly find the exact problematic row in the original uploaded file.
- **Scope Classification**: Automated tagging of Scope 1 (Direct), Scope 2 (Indirect), and Scope 3 (Value Chain).
- **Temporal Accounting**: Stores `billing_start_date` and `billing_end_date` for proportional allocation of emissions across calendar months.

## 3. Audit Trail
To ensure trust and compliance with reporting standards, we implemented an `AuditLog` model.
- Tracks `UPLOADED`, `EDITED`, `APPROVED`, and `REJECTED` events.
- Captures full JSON differentials (`changes`) when an analyst edits data manually.
- Stores the `user` and a `comment` to maintain full accountability of modifications.

## 4. Status Workflow
Records follow a state machine: `PENDING` -> `APPROVED` | `REJECTED`. 
Anomalies detected automatically are marked `SUSPICIOUS` or `FAILED`. Editing a record automatically transitions it back to `PENDING` for a fresh review.
