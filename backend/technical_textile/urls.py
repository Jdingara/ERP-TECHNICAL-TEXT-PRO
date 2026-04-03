# ============================================================
# FILE: technical_textile/urls.py
# PURPOSE: URL routes for Technical Textile module.
# ============================================================

from django.urls import path
from . import views

urlpatterns = [
    # Product Categories
    path('categories/',                         views.category_list,          name='tt-category-list'),
    path('categories/<int:cat_id>/',            views.category_detail,        name='tt-category-detail'),

    # Performance Specifications
    path('specs/',                              views.spec_list,              name='tt-spec-list'),
    path('specs/<int:spec_id>/',               views.spec_detail,            name='tt-spec-detail'),

    # Sample Management
    path('samples/',                            views.sample_list,            name='tt-sample-list'),
    path('samples/<int:sample_id>/status/',    views.sample_update_status,   name='tt-sample-status'),

    # Technical Data Sheets
    path('data-sheets/',                        views.tds_list,               name='tt-tds-list'),
    path('data-sheets/<int:tds_id>/issue/',    views.tds_issue,              name='tt-tds-issue'),

    # Testing Lab
    path('testing-lab/',                        views.lab_list,               name='tt-lab-list'),

    # R&D Projects
    path('rd-projects/',                        views.rd_list,                name='tt-rd-list'),
    path('rd-projects/<int:proj_id>/status/',  views.rd_update_status,       name='tt-rd-status'),
]
