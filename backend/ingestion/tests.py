from django.test import TestCase
from datetime import date
from ingestion.utils import (
    haversine,
    allocate_billing_period,
    normalize_sap,
    normalize_utility,
    normalize_travel
)

class ESGPlatformAlgorithmsTest(TestCase):
    
    def test_haversine_distance(self):
        # DEL coordinates: (28.5562, 77.1000)
        # BOM coordinates: (19.0896, 72.8656)
        dist = haversine(28.5562, 77.1000, 19.0896, 72.8656)
        # Approximate distance DEL to BOM is ~1137 km
        self.assertAlmostEqual(dist, 1137.0, delta=15.0)

    def test_utility_billing_allocation(self):
        start = date(2026, 4, 15)
        end = date(2026, 5, 15)
        total_val = 3000.0
        
        allocations = allocate_billing_period(start, end, total_val)
        # 16 days in April (April 15 to April 30)
        # 15 days in May (May 1 to May 15)
        # Total = 31 days
        self.assertEqual(len(allocations), 2)
        
        # April Allocation
        self.assertEqual(allocations[0]['month'], '2026-04')
        self.assertEqual(allocations[0]['days'], 16)
        self.assertAlmostEqual(allocations[0]['allocated_value'], 1548.39, delta=1.0)
        
        # May Allocation
        self.assertEqual(allocations[1]['month'], '2026-05')
        self.assertEqual(allocations[1]['days'], 15)
        self.assertAlmostEqual(allocations[1]['allocated_value'], 1451.61, delta=1.0)

    def test_sap_normalization_and_calculations(self):
        # Test Plant 1000 (Stuttgart) & Diesel conversion from liters
        raw_row = {
            'WERKS': '1000',
            'MATNR': 'diesel',
            'MENGE': '1000',
            'MEINS': 'L',
            'BUDAT': '2026-05-24'
        }
        status, comment, data = normalize_sap(raw_row)
        self.assertEqual(status, 'PENDING')
        self.assertEqual(data['normalized_quantity'], 1000.0)
        self.assertEqual(data['normalized_unit'], 'L')
        # Diesel factor is 2.68
        self.assertEqual(data['co2e_kg'], 2680.0)

        # Test Gallon to Liter conversion for Plant 2000 (Austin, USA)
        raw_row_gal = {
            'WERKS': '2000',
            'MATNR': 'diesel',
            'MENGE': '100',
            'MEINS': 'GAL',
            'BUDAT': '24.05.2026'
        }
        _, _, data_gal = normalize_sap(raw_row_gal)
        # 100 GAL = 378.541 Liters
        self.assertAlmostEqual(data_gal['normalized_quantity'], 378.54, delta=0.5)

    def test_travel_distance_lookup_fallback(self):
        # Missing flight distance, DEL to BOM coordinates lookup
        raw_row = {
            'Employee': 'EMP01',
            'From': 'DEL',
            'To': 'BOM',
            'TravelType': 'Flight',
            'CabinClass': 'Business',
            'Date': '2026-05-24'
        }
        status, comment, data = normalize_travel(raw_row)
        self.assertEqual(status, 'PENDING')
        self.assertIsNotNone(data['normalized_quantity'])
        # Long-haul/Medium flight factor 0.11 * multiplier 2.5 * distance (~1137km) = ~312.67 kg
        self.assertGreater(data['co2e_kg'], 200.0)
        self.assertLess(data['co2e_kg'], 400.0)
