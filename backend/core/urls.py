# ============================================================
# FILE: core/urls.py
# PURPOSE: Main URL configuration for the entire ERP backend.
#          All module URLs are registered here under /api/
# ============================================================

from django.contrib import admin
from django.urls import path, include, re_path
from django.views.generic import TemplateView
from django.conf import settings
from django.views.static import serve as media_serve
import os

urlpatterns = [
    path('admin/', admin.site.urls),

    # Core — authentication, company, chatbot
    path('api/authentication/', include('authentication.urls')),
    path('api/master-data/',    include('master_data.urls')),
    path('api/chat/',           include('chatbot.urls')),

    # Technical Textile ERP modules
    path('api/masters/',        include('masters.urls')),
    path('api/purchase/',       include('purchase.urls')),
    path('api/lot-inventory/',  include('lot_inventory.urls')),
    path('api/planning/',       include('planning.urls')),
    path('api/production/',     include('production_exec.urls')),
    path('api/quality/',        include('quality.urls')),
    path('api/dispatch/',       include('dispatch.urls')),
    path('api/traceability/',   include('traceability.urls')),
    path('api/reports/',        include('reports.urls')),
    path('api/maintenance/',    include('maintenance.urls')),

    # Buying House modules
    path('api/pd/',             include('product_development.urls')),
    path('api/orders/',         include('order_management.urls')),
    path('api/shipment/',       include('shipment.urls')),
    path('api/finance/',        include('bh_finance.urls')),

    # Media files (uploaded images, documents)
    re_path(r'^media/(?P<path>.*)$', media_serve, {'document_root': settings.MEDIA_ROOT}),
]

# ── Serve React frontend in production ───────────────────────
# When deployed on Render, Django serves the React build.
# Any URL that is NOT /api/ or /admin/ goes to React's index.html
# React Router then handles the navigation on the client side.
frontend_build = settings.BASE_DIR / 'frontend_build'
if os.path.exists(frontend_build):
    from django.views.static import serve as static_serve
    urlpatterns += [
        # React static assets (JS, CSS, images)
        re_path(r'^static/(?P<path>.*)$', static_serve,
                {'document_root': frontend_build / 'static'}),
        # All other routes → React index.html (React Router handles it)
        re_path(r'^(?!api/|admin/).*$',
                TemplateView.as_view(template_name='index.html'),
                name='react-app'),
    ]
    # Tell Django where to find the React index.html
    from django.template.loaders.filesystem import Loader
    settings.TEMPLATES[0]['DIRS'] = [frontend_build]
