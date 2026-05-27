import math
from datetime import datetime, date, timedelta

# Airport coordinates database
AIRPORTS = {
    'DEL': (28.5562, 77.1000),
    'BOM': (19.0896, 72.8656),
    'BLR': (13.1986, 77.7066),
    'HYD': (17.2403, 78.4294),
    'JFK': (40.6413, -73.7781),
    'LHR': (51.4700, -0.4543),
    'DXB': (25.2532, 55.3657),
    'FRA': (50.0379, 8.5622),
    'CDG': (49.0097, 2.5479),
    'SIN': (1.3644, 103.9915)
}

# SAP Plant lookup database
PLANTS = {
    '1000': {'name': 'Stuttgart Assembly', 'country': 'Germany', 'grid_factor': 0.35},
    '2000': {'name': 'Austin Fab', 'country': 'USA', 'grid_factor': 0.38},
    '3000': {'name': 'Bengaluru HQ', 'country': 'India', 'grid_factor': 0.82},
}

# Emission factors
FUEL_FACTORS = {
    'diesel': {'factor': 2.68, 'std_unit': 'L'}, # kg CO2e / Liter
    'petrol': {'factor': 2.31, 'std_unit': 'L'}, # kg CO2e / Liter
    'cng': {'factor': 2.75, 'std_unit': 'KG'},   # kg CO2e / kg
    'natural gas': {'factor': 1.90, 'std_unit': 'M3'}, # kg CO2e / m3
}

GRID_FACTORS = {
    'germany': 0.35, # kg CO2e / kWh
    'usa': 0.38,
    'india': 0.82,
    'unknown': 0.50
}

TRAVEL_FLIGHT_SHORT_HAUL = 0.15 # kg CO2e / km (under 500km)
TRAVEL_FLIGHT_LONG_HAUL = 0.11  # kg CO2e / km (over 500km)
CABIN_MULTIPLIERS = {
    'economy': 1.0,
    'business': 2.5,
    'first': 4.0
}
HOTEL_FACTOR = 20.0 # kg CO2e / night
GROUND_FACTORS = {
    'car': 0.17,  # kg CO2e / km
    'train': 0.04, # kg CO2e / km
    'taxi': 0.20   # kg CO2e / km
}

def haversine(lat1, lon1, lat2, lon2):
    # Great circle distance in km
    R = 6371.0
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    
    a = math.sin(delta_phi / 2.0)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0)**2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c

def parse_date(date_str):
    if not date_str:
        return None
    date_str = str(date_str).strip()
    for fmt in ('%Y-%m-%d', '%d.%m.%Y', '%Y%m%d', '%d-%m-%Y'):
        try:
            return datetime.strptime(date_str, fmt).date()
        except ValueError:
            pass
    return None

def parse_billing_period(period_str):
    """
    Parses strings like '2026-05' or '2026-04-15 to 2026-05-15'
    Returns (start_date, end_date) or (None, None)
    """
    if not period_str:
        return None, None
    period_str = str(period_str).strip()
    
    # Check if format is YYYY-MM
    if len(period_str) == 7 and '-' in period_str:
        try:
            parts = period_str.split('-')
            year, month = int(parts[0]), int(parts[1])
            start = date(year, month, 1)
            # Find last day of month
            if month == 12:
                end = date(year, 12, 31)
            else:
                end = date(year, month + 1, 1) - timedelta(days=1)
            return start, end
        except ValueError:
            pass
            
    # Check for 'to' or '/' separated dates
    for sep in (' to ', '/', ' - ', ','):
        if sep in period_str:
            parts = period_str.split(sep)
            if len(parts) == 2:
                start = parse_date(parts[0])
                end = parse_date(parts[1])
                if start and end:
                    return start, end
                    
    # Single date
    single = parse_date(period_str)
    if single:
        return single, single
        
    return None, None

def allocate_billing_period(start_date, end_date, total_value):
    """
    Allocates total_value proportionally into calendar months.
    Returns a list of dicts: [{'month': 'YYYY-MM', 'days': int, 'allocated_value': float}]
    """
    if not start_date or not end_date or start_date > end_date:
        return []
        
    total_days = (end_date - start_date).days + 1
    if total_days <= 0:
        return []
        
    allocations = {}
    current = start_date
    while current <= end_date:
        month_key = current.strftime('%Y-%m')
        allocations[month_key] = allocations.get(month_key, 0) + 1
        current += timedelta(days=1)
        
    result = []
    for month, days in sorted(allocations.items()):
        ratio = days / total_days
        allocated = round(total_value * ratio, 2)
        result.append({
            'month': month,
            'days': days,
            'allocated_value': allocated
        })
    return result

def normalize_sap(raw_row):
    """
    SAP normalizer. Expects headers:
    German: WERKS (Plant), MATNR (Material/Fuel), MENGE (Qty), MEINS (Unit), BUDAT (Posting Date)
    English: Plant, FuelType (or Material), Quantity, Unit, Date
    """
    # Header mapping
    plant_raw = raw_row.get('WERKS') or raw_row.get('Plant')
    material_raw = raw_row.get('MATNR') or raw_row.get('FuelType') or raw_row.get('Material')
    qty_raw = raw_row.get('MENGE') or raw_row.get('Quantity')
    unit_raw = raw_row.get('MEINS') or raw_row.get('Unit')
    date_raw = raw_row.get('BUDAT') or raw_row.get('Date')
    
    errors = []
    status = 'PENDING'
    comment = 'Validation success'
    
    # 1. Date check
    parsed_date = parse_date(date_raw)
    if not parsed_date:
        errors.append("Invalid or missing date")
        parsed_date = None
        
    # 2. Plant lookup
    plant_str = str(plant_raw).strip() if plant_raw is not None else ""
    plant_info = PLANTS.get(plant_str)
    location = ""
    if plant_info:
        location = f"{plant_info['name']} ({plant_info['country']})"
    else:
        if plant_str:
            location = f"Plant {plant_str} (Unknown)"
            errors.append(f"Unknown SAP Plant code: {plant_str}")
        else:
            errors.append("Missing plant code")
            
    # 3. Fuel classification
    fuel_key = str(material_raw).strip().lower() if material_raw is not None else ""
    fuel_info = FUEL_FACTORS.get(fuel_key)
    
    # 4. Quantity parsing
    qty = None
    if qty_raw is not None and str(qty_raw).strip() != "":
        try:
            qty = float(qty_raw)
            if qty < 0:
                errors.append("Quantity cannot be negative")
        except ValueError:
            errors.append("Invalid numerical quantity")
    else:
        errors.append("Missing quantity")
        
    # 5. Unit check and normalization
    unit_str = str(unit_raw).strip().upper() if unit_raw is not None else ""
    norm_qty = None
    norm_unit = ""
    co2e_kg = None
    
    if qty is not None:
        if fuel_info:
            norm_unit = fuel_info['std_unit']
            # Convert units if needed
            if unit_str == 'GAL' and norm_unit == 'L':
                norm_qty = round(qty * 3.78541, 2)
            elif unit_str == 'BBL' and norm_unit == 'L':
                norm_qty = round(qty * 158.987, 2)
            elif unit_str == norm_unit:
                norm_qty = qty
            else:
                norm_qty = qty
                errors.append(f"Inconsistent or unmapped unit '{unit_str}' for fuel type '{fuel_key}'")
                
            co2e_kg = round(norm_qty * fuel_info['factor'], 2)
        else:
            errors.append(f"Unknown or unsupported fuel material type: {material_raw}")
            
    # Anomaly checks
    if qty is not None and qty > 50000:
        status = 'SUSPICIOUS'
        comment = f"Quantity unusually high: {qty} {unit_str}"
        
    if errors:
        status = 'FAILED'
        comment = ", ".join(errors)
        
    normalized_data = {
        'source_type': 'SAP',
        'scope': 'SCOPE_1',
        'raw_quantity': qty,
        'raw_unit': unit_str,
        'normalized_quantity': norm_qty,
        'normalized_unit': norm_unit,
        'co2e_kg': co2e_kg,
        'location': location,
        'date': str(parsed_date) if parsed_date else None,
        'errors': errors,
        'comment': comment
    }
    
    return status, comment, normalized_data

def normalize_utility(raw_row):
    """
    Utility normalizer. Expects headers:
    MeterID, Location, Consumption_kWh (or Consumption_Value), BillingPeriod (or BillingStart / BillingEnd), Tariff
    """
    meter_raw = raw_row.get('MeterID') or raw_row.get('MTR_ID') or raw_row.get('Meter_ID')
    loc_raw = raw_row.get('Location')
    cons_raw = raw_row.get('Consumption_kWh') or raw_row.get('Consumption_Value') or raw_row.get('Consumption')
    unit_raw = raw_row.get('Consumption_Unit') or raw_row.get('Unit') or 'kWh'
    period_raw = raw_row.get('BillingPeriod') or raw_row.get('Billing_Period')
    start_raw = raw_row.get('BillingStart') or raw_row.get('Billing_Start') or raw_row.get('BillingStartDate')
    end_raw = raw_row.get('BillingEnd') or raw_row.get('Billing_End') or raw_row.get('BillingEndDate')
    tariff_raw = raw_row.get('Tariff') or raw_row.get('TariffType') or raw_row.get('Tariff_Type')
    
    errors = []
    status = 'PENDING'
    comment = 'Validation success'
    
    # 1. Billing Period parsing
    start_date, end_date = None, None
    if start_raw and end_raw:
        start_date = parse_date(start_raw)
        end_date = parse_date(end_raw)
    elif period_raw:
        start_date, end_date = parse_billing_period(period_raw)
        
    if not start_date or not end_date:
        errors.append("Invalid or missing billing period dates")
    elif start_date > end_date:
        errors.append("Billing start date cannot be after end date")
        
    # 2. Consumption parsing
    consumption = None
    if cons_raw is not None and str(cons_raw).strip() != "":
        try:
            consumption = float(cons_raw)
            if consumption < 0:
                errors.append("Consumption cannot be negative")
        except ValueError:
            errors.append("Invalid numerical consumption value")
    else:
        errors.append("Missing consumption value")
        
    # 3. Unit normalization (Standard is kWh)
    unit_str = str(unit_raw).strip()
    norm_qty = None
    norm_unit = 'kWh'
    if consumption is not None:
        if unit_str.upper() in ('KWH', 'KILOWATT-HOUR'):
            norm_qty = consumption
        elif unit_str.upper() in ('MWH', 'MEGAWATT-HOUR'):
            norm_qty = consumption * 1000.0
        else:
            norm_qty = consumption
            errors.append(f"Unsupported utility unit: {unit_str}")
            
    # 4. Location and Grid Intensity factor lookup
    loc_str = str(loc_raw).strip().lower() if loc_raw is not None else ""
    grid_factor = GRID_FACTORS['unknown']
    location = str(loc_raw).strip() if loc_raw else "Unknown Location"
    
    for key in GRID_FACTORS:
        if key in loc_str:
            grid_factor = GRID_FACTORS[key]
            break
            
    # 5. CO2e Calculation
    co2e_kg = None
    if norm_qty is not None:
        co2e_kg = round(norm_qty * grid_factor, 2)
        
    # Temporal split allocation
    allocations = []
    if start_date and end_date and norm_qty is not None:
        allocations = allocate_billing_period(start_date, end_date, norm_qty)
        # Calculate emissions for each allocation
        for alloc in allocations:
            alloc['co2e_kg'] = round(alloc['allocated_value'] * grid_factor, 2)
            
    # Anomaly checks
    if norm_qty is not None and norm_qty > 500000:
        status = 'SUSPICIOUS'
        comment = f"Consumption unusually high: {norm_qty} kWh"
        
    if errors:
        status = 'FAILED'
        comment = ", ".join(errors)
        
    normalized_data = {
        'source_type': 'UTILITY',
        'scope': 'SCOPE_2',
        'raw_quantity': consumption,
        'raw_unit': unit_str,
        'normalized_quantity': norm_qty,
        'normalized_unit': norm_unit,
        'co2e_kg': co2e_kg,
        'location': location,
        'date': str(start_date) if start_date else None,
        'billing_start_date': str(start_date) if start_date else None,
        'billing_end_date': str(end_date) if end_date else None,
        'tariff_type': str(tariff_raw) if tariff_raw else None,
        'allocations': allocations,
        'errors': errors,
        'comment': comment
    }
    
    return status, comment, normalized_data

def normalize_travel(raw_row):
    """
    Corporate travel normalizer. Expects headers:
    Employee, From, To, TravelType (or TravelMode), Distance (or Distance_km), CabinClass, Nights, GroundMode
    """
    employee = raw_row.get('Employee') or raw_row.get('EmployeeID')
    from_airport = raw_row.get('From') or raw_row.get('From_Airport')
    to_airport = raw_row.get('To') or raw_row.get('To_Airport')
    travel_mode = raw_row.get('TravelType') or raw_row.get('TravelMode') or raw_row.get('Category')
    dist_raw = raw_row.get('Distance') or raw_row.get('Distance_km')
    cabin_raw = raw_row.get('CabinClass') or raw_row.get('Cabin_Class') or 'Economy'
    nights_raw = raw_row.get('Hotel_Nights') or raw_row.get('Nights')
    ground_raw = raw_row.get('Ground_Mode') or raw_row.get('GroundMode') or raw_row.get('Mode')
    date_raw = raw_row.get('Date') or date.today().strftime('%Y-%m-%d')
    
    errors = []
    status = 'PENDING'
    comment = 'Validation success'
    
    # 1. Parse date
    parsed_date = parse_date(date_raw)
    if not parsed_date:
        parsed_date = date.today()
        
    mode_str = str(travel_mode).strip().lower() if travel_mode is not None else ""
    norm_qty = None
    norm_unit = ""
    co2e_kg = None
    location = ""
    
    # Route details
    from_code = str(from_airport).strip().upper() if from_airport is not None else ""
    to_code = str(to_airport).strip().upper() if to_airport is not None else ""
    
    if mode_str in ('flight', 'air'):
        norm_unit = 'km'
        location = f"{from_code} -> {to_code}"
        
        # 1. Distance lookup/calc
        distance = None
        if dist_raw is not None and str(dist_raw).strip() != "":
            try:
                distance = float(dist_raw)
                if distance < 0:
                    errors.append("Flight distance cannot be negative")
            except ValueError:
                errors.append("Invalid flight distance numerical value")
                
        # If distance is missing, compute it from coordinates
        if distance is None:
            if from_code in AIRPORTS and to_code in AIRPORTS:
                lat1, lon1 = AIRPORTS[from_code]
                lat2, lon2 = AIRPORTS[to_code]
                distance = haversine(lat1, lon1, lat2, lon2)
            else:
                if from_code and to_code:
                    errors.append(f"Coordinates not found for airport pair: {from_code} to {to_code}")
                else:
                    errors.append("Flight distance and airport codes both missing")
                    
        norm_qty = distance
        
        # 2. Emissions factors calculation
        if distance is not None:
            factor = TRAVEL_FLIGHT_SHORT_HAUL if distance < 500 else TRAVEL_FLIGHT_LONG_HAUL
            cabin_str = str(cabin_raw).strip().lower()
            multiplier = CABIN_MULTIPLIERS.get(cabin_str, 1.0)
            co2e_kg = round(distance * factor * multiplier, 2)
            
            if distance > 20000:
                status = 'SUSPICIOUS'
                comment = f"Flight distance unusually long: {distance:.2f} km"
                
    elif mode_str in ('hotel', 'stay', 'accommodation'):
        norm_unit = 'nights'
        
        # 1. Nights parsing
        nights = None
        if nights_raw is not None and str(nights_raw).strip() != "":
            try:
                nights = float(nights_raw)
                if nights < 0:
                    errors.append("Hotel nights cannot be negative")
            except ValueError:
                errors.append("Invalid hotel nights numerical value")
        else:
            errors.append("Hotel nights missing")
            
        norm_qty = nights
        location = str(raw_row.get('Location') or raw_row.get('City') or 'Unknown Hotel Location')
        
        if nights is not None:
            co2e_kg = round(nights * HOTEL_FACTOR, 2)
            if nights > 30:
                status = 'SUSPICIOUS'
                comment = f"Hotel nights unusually high: {nights}"
                
    elif mode_str in ('ground', 'car', 'train', 'taxi', 'rail', 'transport'):
        norm_unit = 'km'
        ground_mode = str(ground_raw).strip().lower() if ground_raw is not None else 'car'
        if ground_mode not in GROUND_FACTORS:
            ground_mode = 'car'
            
        # 1. Distance parsing
        distance = None
        if dist_raw is not None and str(dist_raw).strip() != "":
            try:
                distance = float(dist_raw)
                if distance < 0:
                    errors.append("Ground distance cannot be negative")
            except ValueError:
                errors.append("Invalid ground distance numerical value")
        else:
            errors.append("Ground distance missing")
            
        norm_qty = distance
        location = str(raw_row.get('Location') or raw_row.get('Route') or 'Ground Transport')
        
        if distance is not None:
            co2e_kg = round(distance * GROUND_FACTORS[ground_mode], 2)
            if distance > 1000:
                status = 'SUSPICIOUS'
                comment = f"Ground distance unusually high: {distance} km"
    else:
        errors.append(f"Unknown travel category: {travel_mode}")
        
    if errors:
        status = 'FAILED'
        comment = ", ".join(errors)
        
    normalized_data = {
        'source_type': 'TRAVEL',
        'scope': 'SCOPE_3',
        'raw_quantity': dist_raw or nights_raw,
        'raw_unit': 'km' if mode_str != 'hotel' else 'nights',
        'normalized_quantity': norm_qty,
        'normalized_unit': norm_unit,
        'co2e_kg': co2e_kg,
        'location': location,
        'date': str(parsed_date) if parsed_date else None,
        'cabin_class': str(cabin_raw) if mode_str == 'flight' else None,
        'travel_mode': str(travel_mode),
        'from_airport': from_code if mode_str == 'flight' else None,
        'to_airport': to_code if mode_str == 'flight' else None,
        'errors': errors,
        'comment': comment
    }
    
    return status, comment, normalized_data

def normalize_row(source_type, raw_row):
    """
    Dispatches to the correct normalizer based on source_type
    Returns: (status, comment, normalized_dict)
    """
    if source_type == 'SAP':
        return normalize_sap(raw_row)
    elif source_type == 'UTILITY':
        return normalize_utility(raw_row)
    elif source_type == 'TRAVEL':
        return normalize_travel(raw_row)
    else:
        return 'FAILED', f"Unsupported source type: {source_type}", {}
