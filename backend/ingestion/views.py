import pandas as pd
import json
from datetime import datetime, date

from django.db import models
from django.db.models import Q, Sum, Count
from rest_framework.response import Response
from rest_framework.decorators import api_view

from .models import EmissionRecord, AuditLog
from .serializers import EmissionRecordSerializer
from .utils import normalize_row
from accounts.models import Organization

# Clean raw dictionary utility (handling NaN and data types)
def clean_json_data(data):
    cleaned = {}
    for key, value in data.items():
        if pd.isna(value):
            cleaned[key] = None
        elif isinstance(value, (float, int, str, bool)):
            cleaned[key] = value
        else:
            cleaned[key] = str(value)
    return cleaned


@api_view(['POST'])
def upload_csv(request):
    file = request.FILES.get('file')
    source_type = request.data.get('source_type')
    org_name = request.data.get('organization_name', 'Default Organization').strip()
    
    if not file:
        return Response({'error': 'No file uploaded'}, status=400)
        
    if not source_type or source_type not in ('SAP', 'UTILITY', 'TRAVEL'):
        return Response({'error': 'Invalid or missing source type'}, status=400)
        
    # Multi-tenancy context
    if request.user.is_authenticated:
        profile = getattr(request.user, 'profile', None)
        if profile:
            org = profile.organization
        else:
            org, _ = Organization.objects.get_or_create(name=org_name)
    else:
        org, _ = Organization.objects.get_or_create(name=org_name)

    try:
        df = pd.read_csv(file, low_memory=False)
        records = df.to_dict(orient='records')
    except Exception as e:
        return Response({'error': f'Failed to parse CSV: {str(e)}'}, status=400)

    objects = []
    
    for idx, row in enumerate(records):
        clean_row = clean_json_data(row)
        status, comment, normalized_data = normalize_row(source_type, clean_row)
        
        # Instantiate EmissionRecord
        record = EmissionRecord(
            organization=org,
            source_type=source_type,
            scope=normalized_data.get('scope', 'SCOPE_1'),
            status=status,
            raw_quantity=normalized_data.get('raw_quantity'),
            raw_unit=normalized_data.get('raw_unit'),
            normalized_quantity=normalized_data.get('normalized_quantity'),
            normalized_unit=normalized_data.get('normalized_unit'),
            co2e_kg=normalized_data.get('co2e_kg'),
            location=normalized_data.get('location'),
            date=normalized_data.get('date'),
            billing_start_date=normalized_data.get('billing_start_date'),
            billing_end_date=normalized_data.get('billing_end_date'),
            source_file_name=file.name,
            row_index=idx + 1,
            raw_data=clean_row,
            normalized_data=normalized_data,
            review_comment=comment
        )
        objects.append(record)
        
    # Bulk create records
    created_records = EmissionRecord.objects.bulk_create(objects, batch_size=1000)
    
    # Audit log bulk create
    audit_logs = [
        AuditLog(
            record=rec,
            action='UPLOADED',
            user=request.user if request.user.is_authenticated else None,
            comment=f"Ingested row #{rec.row_index} from file: {file.name}"
        )
        for rec in created_records
    ]
    AuditLog.objects.bulk_create(audit_logs)
    
    return Response({
        'message': 'CSV uploaded and processed successfully',
        'saved_records': len(created_records)
    })


@api_view(['GET'])
def get_records(request):
    org_name = request.query_params.get('organization_name', 'Default Organization').strip()
    
    if request.user.is_authenticated:
        profile = getattr(request.user, 'profile', None)
        if profile:
            org = profile.organization
        else:
            org, _ = Organization.objects.get_or_create(name=org_name)
    else:
        org, _ = Organization.objects.get_or_create(name=org_name)
        
    records = EmissionRecord.objects.filter(organization=org).order_by('-uploaded_at')
    
    # Backend filtering
    scope = request.query_params.get('scope')
    if scope:
        records = records.filter(scope=scope)
        
    status = request.query_params.get('status')
    if status:
        records = records.filter(status=status)
        
    search = request.query_params.get('search')
    if search:
        records = records.filter(
            Q(location__icontains=search) |
            Q(source_type__icontains=search) |
            Q(review_comment__icontains=search) |
            Q(source_file_name__icontains=search)
        )
        
    serializer = EmissionRecordSerializer(records[:200], many=True)
    return Response(serializer.data)


@api_view(['PATCH'])
def update_record(request, id):
    try:
        record = EmissionRecord.objects.get(id=id)
    except EmissionRecord.DoesNotExist:
        return Response({"error": "Record not found"}, status=404)
        
    old_status = record.status
    changes = {}
    action = 'EDITED'
    
    status_value = request.data.get('status')
    raw_data_updates = request.data.get('raw_data')
    review_comment = request.data.get('review_comment')
    
    if status_value and status_value != record.status:
        changes['status'] = [record.status, status_value]
        record.status = status_value
        if status_value == 'APPROVED':
            action = 'APPROVED'
        elif status_value == 'REJECTED':
            action = 'REJECTED'
            
    if raw_data_updates:
        # Save before/after changes to the raw fields
        for k, v in raw_data_updates.items():
            old_val = record.raw_data.get(k)
            if old_val != v:
                changes[k] = [old_val, v]
                record.raw_data[k] = v
                
        # Recalculate normalized values
        status, comment, normalized_data = normalize_row(record.source_type, record.raw_data)
        
        record.scope = normalized_data.get('scope', record.scope)
        record.raw_quantity = normalized_data.get('raw_quantity')
        record.raw_unit = normalized_data.get('raw_unit')
        record.normalized_quantity = normalized_data.get('normalized_quantity')
        record.normalized_unit = normalized_data.get('normalized_unit')
        record.co2e_kg = normalized_data.get('co2e_kg')
        record.location = normalized_data.get('location')
        record.date = normalized_data.get('date')
        record.billing_start_date = normalized_data.get('billing_start_date')
        record.billing_end_date = normalized_data.get('billing_end_date')
        record.normalized_data = normalized_data
        
        # Reset to pending on manual edits so it can be re-evaluated
        if not status_value:
            record.status = 'PENDING'
            record.review_comment = f"Manually edited: {comment}"
            changes['status'] = [old_status, 'PENDING']
            
    if review_comment is not None:
        record.review_comment = review_comment
        
    record.last_modified_by = request.user if request.user.is_authenticated else None
    record.last_modified_at = datetime.now()
    record.save()
    
    # Log audit entry
    AuditLog.objects.create(
        record=record,
        action=action,
        user=request.user if request.user.is_authenticated else None,
        changes=changes if changes else None,
        comment=review_comment or "Record modified manually"
    )
    
    return Response({
        "message": "Record updated successfully",
        "record": EmissionRecordSerializer(record).data
    })


@api_view(['DELETE'])
def delete_record(request, id):
    try:
        record = EmissionRecord.objects.get(id=id)
    except EmissionRecord.DoesNotExist:
        return Response({"error": "Record not found"}, status=404)
        
    record.delete()
    return Response({"message": "Record deleted successfully"})


@api_view(['GET'])
def get_stats(request):
    org_name = request.query_params.get('organization_name', 'Default Organization').strip()
    
    if request.user.is_authenticated:
        profile = getattr(request.user, 'profile', None)
        if profile:
            org = profile.organization
        else:
            org, _ = Organization.objects.get_or_create(name=org_name)
    else:
        org, _ = Organization.objects.get_or_create(name=org_name)
        
    records = EmissionRecord.objects.filter(organization=org)
    approved_records = records.filter(status='APPROVED')
    
    # 1. Total emissions
    total_co2e = approved_records.aggregate(Sum('co2e_kg'))['co2e_kg__sum'] or 0.0
    
    # 2. Scope breakdown
    scope_breakdown = approved_records.values('scope').annotate(total=Sum('co2e_kg'))
    scope_data = {
        'SCOPE_1': 0.0,
        'SCOPE_2': 0.0,
        'SCOPE_3': 0.0
    }
    for item in scope_breakdown:
        scope_data[item['scope']] = item['total'] or 0.0
        
    # 3. Location breakdown
    location_breakdown = approved_records.values('location').annotate(total=Sum('co2e_kg')).order_by('-total')[:5]
    location_data = [{'location': item['location'] or 'Unknown', 'total': round(item['total'] or 0.0, 2)} for item in location_breakdown]
    
    # 4. Proportional Monthly breakdown (including Utility temporal splits)
    refined_monthly_data = {}
    for rec in approved_records:
        if rec.source_type == 'UTILITY' and rec.normalized_data and 'allocations' in rec.normalized_data:
            allocs = rec.normalized_data['allocations']
            if allocs:
                for alloc in allocs:
                    m = alloc['month']
                    val = alloc.get('co2e_kg') or 0.0
                    refined_monthly_data[m] = refined_monthly_data.get(m, 0.0) + val
                continue
                
        if rec.date:
            m = rec.date.strftime('%Y-%m')
            refined_monthly_data[m] = refined_monthly_data.get(m, 0.0) + (rec.co2e_kg or 0.0)
            
    monthly_chart_data = [{'month': m, 'total': round(refined_monthly_data[m], 2)} for m in sorted(refined_monthly_data.keys())]
    
    # 5. Status distribution
    status_counts = records.values('status').annotate(count=Count('id'))
    status_data = {
        'PENDING': 0,
        'APPROVED': 0,
        'REJECTED': 0,
        'SUSPICIOUS': 0,
        'FAILED': 0
    }
    for item in status_counts:
        status_data[item['status']] = item['count']
        
    return Response({
        'total_co2e_kg': round(total_co2e, 2),
        'scope_breakdown': scope_data,
        'location_breakdown': location_data,
        'monthly_breakdown': monthly_chart_data,
        'status_counts': status_data
    })


@api_view(['POST'])
def bulk_update(request):
    ids = request.data.get('ids', [])
    action = request.data.get('action') # 'APPROVE', 'REJECT', 'DELETE'
    comment = request.data.get('comment', 'Bulk action applied').strip()
    
    if not ids or not action:
        return Response({"error": "Missing ids or action"}, status=400)
        
    records = EmissionRecord.objects.filter(id__in=ids)
    
    if action == 'APPROVE':
        records.update(status='APPROVED', review_comment=comment)
        logs = [
            AuditLog(
                record=rec,
                action='APPROVED',
                user=request.user if request.user.is_authenticated else None,
                comment=comment
            ) for rec in records
        ]
        AuditLog.objects.bulk_create(logs)
    elif action == 'REJECT':
        records.update(status='REJECTED', review_comment=comment)
        logs = [
            AuditLog(
                record=rec,
                action='REJECTED',
                user=request.user if request.user.is_authenticated else None,
                comment=comment
            ) for rec in records
        ]
        AuditLog.objects.bulk_create(logs)
    elif action == 'DELETE':
        records.delete()
        
    return Response({"message": f"Bulk action {action} applied to {len(ids)} records"})