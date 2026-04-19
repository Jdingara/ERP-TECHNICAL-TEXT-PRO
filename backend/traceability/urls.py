from django.urls import path
from . import views

urlpatterns = [
    # Main traceability search (USP screen)
    path('search/',                           views.traceability_search, name='traceability_search'),

    # Full chain for a batch
    path('batch/<str:batch_number>/chain/',   views.batch_chain,         name='batch_chain'),

    # Forward trace from lot
    path('lot/<str:lot_number>/',             views.lot_trace,           name='lot_trace'),
]
