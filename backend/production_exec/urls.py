from django.urls import path
from . import views

urlpatterns = [
    # Process Entries
    path('entries/',                    views.process_entry_list,    name='process_entry_list'),
    path('entries/<int:pk>/',           views.process_entry_detail,  name='process_entry_detail'),
    path('entries/<int:pk>/confirm/',   views.confirm_process_entry, name='confirm_process_entry'),

    # Batches
    path('batches/',                    views.batch_list,            name='batch_list'),
    path('batches/<int:pk>/',           views.batch_detail,          name='batch_detail'),

    # Beam Outward
    path('beams/',                      views.beam_list,             name='beam_list'),

    # Yarn Issue (Warp / Weft)
    path('yarn-issues/',                    views.yarn_issue_list,       name='yarn_issue_list'),
    path('yarn-issues/<int:pk>/confirm/',   views.confirm_yarn_issue,    name='confirm_yarn_issue'),

    # Phase B — Stage Screens
    path('stages/warping/',     views.warping_screen,    name='warping_screen'),
    path('stages/weaving/',     views.weaving_screen,    name='weaving_screen'),
    path('stages/stenter/',     views.stenter_screen,    name='stenter_screen'),
    path('stages/tumbler/',     views.tumbler_screen,    name='tumbler_screen'),
    path('stages/embossing/',   views.embossing_screen,  name='embossing_screen'),
    path('stages/lamination/',  views.lamination_screen, name='lamination_screen'),

    # Delivery Challan
    path('delivery-challans/',          views.delivery_challan_list,   name='delivery_challan_list'),
    path('delivery-challans/<int:pk>/', views.delivery_challan_detail, name='delivery_challan_detail'),
]
