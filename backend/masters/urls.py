from django.urls import path
from . import views

urlpatterns = [
    # UOM
    path('uom/',                    views.uom_list,            name='uom_list'),
    path('uom/<int:pk>/',           views.uom_detail,          name='uom_detail'),

    # Locations
    path('locations/',              views.location_list,       name='location_list'),
    path('locations/<int:pk>/',     views.location_detail,     name='location_detail'),

    # Yarn Master
    path('yarn/',                   views.yarn_list,           name='yarn_list'),
    path('yarn/<int:pk>/',          views.yarn_detail,         name='yarn_detail'),

    # Item Master
    path('items/',                  views.item_list,           name='item_list'),
    path('items/<int:pk>/',         views.item_detail,         name='item_detail'),

    # Machines
    path('machines/',               views.machine_list,        name='machine_list'),
    path('machines/<int:pk>/',      views.machine_detail,      name='machine_detail'),

    # Processes
    path('processes/',              views.process_list,        name='process_list'),
    path('processes/<int:pk>/',     views.process_detail,      name='process_detail'),

    # Product / Design
    path('products/',               views.product_list,        name='product_list'),
    path('products/<int:pk>/',      views.product_detail,      name='product_detail'),

    # BOM
    path('bom/',                    views.bom_list,            name='bom_list'),
    path('bom/<int:pk>/',           views.bom_detail,          name='bom_detail'),

    # Vendors
    path('vendors/',                views.vendor_list,         name='vendor_list'),
    path('vendors/<int:pk>/',       views.vendor_detail,       name='vendor_detail'),

    # Customers
    path('customers/',              views.customer_list,       name='customer_list'),
    path('customers/<int:pk>/',     views.customer_detail,     name='customer_detail'),

    # Brands
    path('brands/',                 views.brand_list,          name='brand_list'),
    path('brands/<int:pk>/',        views.brand_detail,        name='brand_detail'),

    # Categories
    path('categories/',             views.category_list,       name='category_list'),
    path('categories/<int:pk>/',    views.category_detail,     name='category_detail'),

    # Fabric Types
    path('fabric-types/',           views.fabric_list,         name='fabric_list'),
    path('fabric-types/<int:pk>/',  views.fabric_detail,       name='fabric_detail'),

    # Testing Parameters
    path('testing-params/',         views.testing_param_list,  name='testing_param_list'),
    path('testing-params/<int:pk>/',views.testing_param_detail,name='testing_param_detail'),
]
