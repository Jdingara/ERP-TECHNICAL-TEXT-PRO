from django.urls import path
from . import views

urlpatterns = [
    # QC Dashboard
    path('dashboard/',              views.qc_dashboard,      name='qc_dashboard'),

    # Inspections
    path('inspections/',            views.inspection_list,   name='inspection_list'),
    path('inspections/<int:pk>/',   views.inspection_detail, name='inspection_detail'),

    # Defect Types
    path('defect-types/',           views.defect_type_list,   name='defect_type_list'),
    path('defect-types/<int:pk>/',  views.defect_type_detail, name='defect_type_detail'),

    # Sample Testing (physical lab tests on finished batches)
    path('sample-tests/',           views.sample_test_list,   name='sample_test_list'),
    path('sample-tests/<int:pk>/',  views.sample_test_detail, name='sample_test_detail'),
]
