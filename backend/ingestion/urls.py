from django.urls import path

from .views import (
    upload_csv,
    get_records,
    update_record,
    delete_record,
    get_stats,
    bulk_update
)

urlpatterns = [
    path('upload/', upload_csv),
    path('records/', get_records),
    path('update-record/<int:id>/', update_record),
    path('update-status/<int:id>/', update_record), # backward compatibility
    path('delete-record/<int:id>/', delete_record),
    path('stats/', get_stats),
    path('bulk-update/', bulk_update),
]