from django.db import models


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

    source_type = models.CharField(max_length=20)

    raw_data = models.JSONField()

    normalized_data = models.JSONField()

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='PENDING'
    )

    review_comment = models.TextField(
        null=True,
        blank=True
    )

    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):

        return self.source_type