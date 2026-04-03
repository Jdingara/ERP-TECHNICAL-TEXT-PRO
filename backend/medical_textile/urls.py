# ============================================================
# FILE: medical_textile/urls.py
# PURPOSE: URL routes for Medical Textile module.
# ============================================================

from django.urls import path
from . import views

urlpatterns = [
    path('compliance/',                          views.compliance_list,     name='med-compliance-list'),
    path('compliance/<int:rec_id>/',             views.compliance_detail,   name='med-compliance-detail'),
    path('traceability/',                        views.traceability_list,   name='med-trace-list'),
    path('sterility/',                           views.sterility_list,      name='med-sterility-list'),
    path('capa/',                                views.capa_list,           name='med-capa-list'),
    path('capa/<int:capa_id>/close/',            views.capa_close,          name='med-capa-close'),
    path('audit-trail/',                         views.audit_trail_list,    name='med-audit-list'),
    path('shelf-life/',                          views.shelf_life_list,     name='med-shelf-list'),
]
