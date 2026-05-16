from django.urls import path
from . import views

urlpatterns = [
    # Pre-Shipment Inspection
    path('psi/',                              views.psi_list,            name='psi_list'),
    path('psi/<int:pk>/',                     views.psi_detail,          name='psi_detail'),
    path('psi/<int:psi_pk>/checklist/',       views.psi_checklist,       name='psi_checklist'),
    path('checklist-items/<int:pk>/',         views.checklist_item_detail, name='checklist_item_detail'),

    # Shipments
    path('shipments/',                        views.shipment_list,       name='shipment_list'),
    path('shipments/<int:pk>/',               views.shipment_detail,     name='shipment_detail'),

    # Costing Sheet (per Customer Order)
    path('costing/<int:co_pk>/',              views.costing_sheet,       name='costing_sheet'),
]
