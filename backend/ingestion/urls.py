from django.urls import path

from .views import (
    upload_csv,
    get_records,
    update_status,
    delete_record
)

urlpatterns = [

    path(
        'upload/',
        upload_csv
    ),

    path(
        'records/',
        get_records
    ),

    path(
        'update-status/<int:id>/',
        update_status
    ),

    path(
        'delete-record/<int:id>/',
        delete_record
    ),
]