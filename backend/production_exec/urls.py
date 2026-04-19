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
]
