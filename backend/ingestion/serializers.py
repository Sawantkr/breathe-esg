from rest_framework import serializers
from .models import EmissionRecord, AuditLog

class AuditLogSerializer(serializers.ModelSerializer):
    user_username = serializers.CharField(source='user.username', read_only=True)
    
    class Meta:
        model = AuditLog
        fields = ['id', 'action', 'user_username', 'timestamp', 'changes', 'comment']

class EmissionRecordSerializer(serializers.ModelSerializer):
    audit_logs = AuditLogSerializer(many=True, read_only=True)
    
    class Meta:
        model = EmissionRecord
        fields = '__all__'