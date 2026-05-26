import pandas as pd
import json

from rest_framework.response import Response
from rest_framework.decorators import api_view

from .models import EmissionRecord
from .serializers import EmissionRecordSerializer


def clean_json_data(data):

    cleaned = {}

    for key, value in data.items():

        if pd.isna(value):

            cleaned[key] = None

        elif isinstance(
            value,
            (float, int, str, bool)
        ):

            cleaned[key] = value

        else:

            cleaned[key] = str(value)

    return cleaned


@api_view(['POST'])
def upload_csv(request):

    file = request.FILES.get('file')

    source_type = request.data.get(
        'source_type'
    )

    if not file:

        return Response({
            'error': 'No file uploaded'
        }, status=400)


    # Faster CSV read

    df = pd.read_csv(
        file,
        low_memory=False
    )

    records = df.to_dict(
        orient='records'
    )


    objects = []


    for row in records:

        clean_row = clean_json_data(row)

        json.dumps(clean_row)

        status = "PENDING"

        review_comment = "Looks good"

        errors = []


        # SAP Validation

        if source_type == "SAP":

            quantity = clean_row.get(
                "Quantity"
            )

            fuel_type = clean_row.get(
                "FuelType"
            )

            if (
                quantity is None
                or quantity == ""
            ):

                errors.append(
                    "Fuel quantity missing"
                )

            if (
                fuel_type is None
                or fuel_type == ""
            ):

                errors.append(
                    "Fuel type missing"
                )

            elif (
                quantity is not None
                and quantity > 10000
            ):

                status = "SUSPICIOUS"

                review_comment = (
                    f"Fuel quantity unusually high: {quantity}"
                )


        # Utility Validation

        elif source_type == "UTILITY":

            consumption = clean_row.get(
                "Consumption_kWh"
            )

            unit = clean_row.get(
                "Unit"
            )

            if (
                consumption is None
                or consumption == ""
            ):

                errors.append(
                    "Electricity consumption missing"
                )

            if (
                unit is None
                or unit == ""
            ):

                errors.append(
                    "Utility unit missing"
                )

            elif (
                consumption is not None
                and consumption > 20000
            ):

                status = "SUSPICIOUS"

                review_comment = (
                    f"Electricity usage unusually high: {consumption} kWh"
                )


        # Travel Validation

        elif source_type == "TRAVEL":

            distance = clean_row.get(
                "Distance"
            )

            travel_mode = clean_row.get(
                "TravelMode"
            )

            if (
                distance is None
                or distance == ""
            ):

                errors.append(
                    "Travel distance missing"
                )

            if (
                travel_mode is None
                or travel_mode == ""
            ):

                errors.append(
                    "Travel mode missing"
                )

            elif (
                distance is not None
                and distance > 10000
            ):

                status = "SUSPICIOUS"

                review_comment = (
                    f"Travel distance unusually high: {distance} km"
                )


        # Failed Validation

        if len(errors) > 0:

            status = "FAILED"

            review_comment = (
                ", ".join(errors)
            )


        objects.append(

            EmissionRecord(

                source_type=source_type,

                raw_data=clean_row,

                normalized_data=clean_row,

                status=status,

                review_comment=review_comment
            )
        )


    # BULK INSERT = SUPER FAST

    EmissionRecord.objects.bulk_create(
        objects,
        batch_size=1000
    )


    return Response({

        'message': 'CSV uploaded successfully',

        'saved_records': len(objects)

    })


@api_view(['GET'])
def get_records(request):

    records = (
        EmissionRecord.objects
        .all()
        .order_by('-uploaded_at')[:50]
    )

    serializer = EmissionRecordSerializer(
        records,
        many=True
    )

    return Response(serializer.data)


@api_view(['PATCH'])
def update_status(request, id):

    try:

        record = (
            EmissionRecord.objects
            .get(id=id)
        )

    except EmissionRecord.DoesNotExist:

        return Response({

            "error": "Record not found"

        }, status=404)


    status_value = request.data.get(
        'status'
    )

    record.status = status_value

    record.save()


    return Response({

        "message":
        f"Status changed to {status_value}"

    })


@api_view(['DELETE'])
def delete_record(request, id):

    try:

        record = (
            EmissionRecord.objects
            .get(id=id)
        )

    except EmissionRecord.DoesNotExist:

        return Response({

            "error": "Record not found"

        }, status=404)


    record.delete()


    return Response({

        "message":
        "Record deleted successfully"

    })