# Data Handling and Sources (SOURCES.md)

This document describes the assumptions and parsing logic applied to the three primary data sources in the Breathe ESG ingestion system.

## 1. SAP Fuel Data (Scope 1)
SAP data is notorious for technical column headers and legacy formatting.
- **Parsing Strategy**: We check for both German SAP standard headers (`WERKS`, `MATNR`, `MENGE`, `MEINS`, `BUDAT`) and standard English headers.
- **Transformations**: 
  - `WERKS` (Plant Code) is mapped to physical locations and grid intensities using a lookup dictionary.
  - `MATNR` (Material) is mapped to fuel types (`diesel`, `petrol`, `cng`).
  - Dates (`BUDAT`) are aggressively parsed using multiple formats (e.g., `DD.MM.YYYY`, `YYYY-MM-DD`, `YYYYMMDD`).
- **Anomalies Caught**: Unusually high quantities (>50k), unknown plant codes, and unmapped units. Converts Imperial `GAL` or `BBL` to Metric `L`.

## 2. Utility Electricity (Scope 2)
Utility data often comes from property managers or direct PDF scrapes.
- **Parsing Strategy**: Maps `MeterID`, `Consumption_kWh`, and temporal periods.
- **Transformations**:
  - Automatically translates large units (e.g., `MWh`) down to the standard `kWh` baseline.
  - Computes `co2e_kg` based on regional grid intensities tied to the `Location` string.
  - **Temporal Splitting**: If a billing period crosses month boundaries (e.g., April 15 - May 15), the system divides the consumption and emissions proportionally by day into respective calendar months for accurate trend analysis.
- **Anomalies Caught**: Negative consumption values and massive outliers.

## 3. Corporate Travel (Scope 3)
Travel data exported from internal booking platforms (like Concur) or travel agencies.
- **Parsing Strategy**: Accommodates Flights, Hotel stays, and Ground Transport.
- **Transformations**:
  - **Flights**: Uses IATA airport codes (`From`, `To`). If distance is missing, computes the great-circle Haversine distance. Applies a cabin class multiplier (e.g., Business class has higher emissions per km). Differentiates between short-haul (< 500km) and long-haul factors.
  - **Hotels**: Multiplies number of `Nights` by an average hotel nightly emission factor.
  - **Ground**: Differentiates between `car`, `train`, and `taxi` per-km factors.
- **Anomalies Caught**: Flights over 20,000 km, zero distances, or unknown modes.
