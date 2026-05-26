from rest_framework import serializers
from .models import EmissionRecord


class EmissionRecordSerializer(serializers.ModelSerializer):

    class Meta:
        model = EmissionRecord
        fields = '__all__'