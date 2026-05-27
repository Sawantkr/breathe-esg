from django.db import models
from django.contrib.auth.models import User
from accounts.models import Organization

class EmissionRecord(models.Model):
    SOURCE_CHOICES = [
        ('SAP', 'SAP'),
        ('UTILITY', 'UTILITY'),
        ('TRAVEL', 'TRAVEL'),
    ]

    STATUS_CHOICES = [
        ('PENDING', 'PENDING'),
        ('APPROVED', 'APPROVED'),
        ('REJECTED', 'REJECTED'),
        ('SUSPICIOUS', 'SUSPICIOUS'),
        ('FAILED', 'FAILED'),
    ]

    SCOPE_CHOICES = [
        ('SCOPE_1', 'Scope 1 (Direct)'),
        ('SCOPE_2', 'Scope 2 (Indirect)'),
        ('SCOPE_3', 'Scope 3 (Other Indirect)'),
    ]

    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='emission_records', null=True, blank=True)
    source_type = models.CharField(max_length=20, choices=SOURCE_CHOICES)
    scope = models.CharField(max_length=20, choices=SCOPE_CHOICES, null=True, blank=True)
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='PENDING'
    )
    
    # Raw and normalized structured fields
    raw_quantity = models.FloatField(null=True, blank=True)
    raw_unit = models.CharField(max_length=50, null=True, blank=True)
    normalized_quantity = models.FloatField(null=True, blank=True)
    normalized_unit = models.CharField(max_length=50, null=True, blank=True)
    co2e_kg = models.FloatField(null=True, blank=True)
    location = models.CharField(max_length=255, null=True, blank=True)
    date = models.DateField(null=True, blank=True)
    
    # Specific fields
    billing_start_date = models.DateField(null=True, blank=True)
    billing_end_date = models.DateField(null=True, blank=True)
    
    # Traceability
    source_file_name = models.CharField(max_length=255, null=True, blank=True)
    row_index = models.IntegerField(null=True, blank=True)
    
    # Store full payloads
    raw_data = models.JSONField()
    normalized_data = models.JSONField()
    
    review_comment = models.TextField(null=True, blank=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    last_modified_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name='modified_records')
    last_modified_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.source_type} - {self.scope} - #{self.id}"

class AuditLog(models.Model):
    ACTION_CHOICES = [
        ('UPLOADED', 'UPLOADED'),
        ('EDITED', 'EDITED'),
        ('APPROVED', 'APPROVED'),
        ('REJECTED', 'REJECTED'),
    ]

    record = models.ForeignKey(EmissionRecord, on_delete=models.CASCADE, related_name='audit_logs')
    action = models.CharField(max_length=20, choices=ACTION_CHOICES)
    user = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name='audit_logs')
    timestamp = models.DateTimeField(auto_now_add=True)
    changes = models.JSONField(null=True, blank=True) # stores changes, e.g. {"status": ["PENDING", "APPROVED"]}
    comment = models.TextField(null=True, blank=True)

    def __str__(self):
        return f"{self.action} on Record #{self.record.id} at {self.timestamp}"