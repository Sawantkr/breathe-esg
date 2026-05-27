# Breathe ESG Data Ingestion Platform

This repository contains the Breathe ESG data ingestion and reporting platform. The system is designed to seamlessly process, normalize, and audit enterprise environmental data from varied and inconsistent sources, calculating accurate carbon footprints across Scopes 1, 2, and 3.

## Project Overview

Corporate environmental data often resides in unstructured, disparate formats. This platform solves the ingestion challenge by providing a centralized hub where analysts can upload raw files (such as SAP exports, Utility bills, and Corporate Travel logs). The system normalizes units, calculates CO2 equivalents (CO2e), identifies anomalies, and provides an audited workflow for data rectification and approval.

## Key Features

- **Intelligent Data Normalization**: Custom parsing strategies automatically translate raw metrics into standardized units (e.g., converting Imperial measurements to Metric, or MWh to kWh).
- **Scope Categorization**: Automatically classifies imported data into Scope 1 (Direct Fuel), Scope 2 (Purchased Electricity), and Scope 3 (Value Chain / Corporate Travel).
- **Temporal Allocation**: Accurately handles utility billing periods that cross calendar months, allocating emissions proportionally by day for precise monthly trend analysis.
- **Data Provenance and Audit Trails**: Preserves the original JSON payload of every uploaded row. The platform maintains an immutable audit log detailing all manual corrections, status changes, and approvals.
- **Multi-Tenant Architecture**: Built from the ground up to support multiple organizations operating in isolation within the same database environment.
- **Interactive Review Dashboard**: Features a side-by-side verification interface where analysts can view raw data alongside calculated normalization factors, making necessary adjustments before saving.

## Technology Stack

### Backend
- **Framework**: Django & Django REST Framework
- **Database**: PostgreSQL (with JSONField support)
- **Data Processing**: Pandas (for rapid in-memory transformation of varied CSV schemas)

### Frontend
- **Framework**: React (Bootstrapped with Vite)
- **Styling**: Tailwind CSS
- **Routing**: React Router DOM
- **HTTP Client**: Axios

## Getting Started

Follow the instructions below to configure and run the platform in a local development environment.

### Prerequisites
- Python 3.9+
- Node.js 18+
- PostgreSQL

### Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows use: venv\Scripts\activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Run database migrations:
   ```bash
   python manage.py migrate
   ```
5. Start the development server:
   ```bash
   python manage.py runserver
   ```

### Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```

## Supporting Documentation

For deep-dives into the architecture, design choices, and data handling strategies, please refer to the following specification documents included in the root directory:

- [Data Model Defense (MODEL.md)](MODEL.md): Explanation of the database schema, multi-tenancy, and audit structures.
- [Data Handling and Sources (SOURCES.md)](SOURCES.md): Detailed breakdown of parsing methodologies for SAP, Utility, and Corporate Travel schemas.
- [Key Technical Decisions (DECISIONS.md)](DECISIONS.md): Architectural choices and design patterns utilized in the system.
- [Engineering Tradeoffs (TRADEOFFS.md)](TRADEOFFS.md): A review of compromises made during the engineering process and plans for production scaling.
