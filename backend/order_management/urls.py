from django.urls import path
from . import views

urlpatterns = [
    # Customer Orders
    path('co/',                         views.co_list,            name='co_list'),
    path('co/<int:pk>/',                views.co_detail,          name='co_detail'),
    path('co/<int:co_pk>/items/',       views.co_items,           name='co_items'),
    path('co-items/<int:pk>/',          views.co_item_detail,     name='co_item_detail'),

    # Factory Orders
    path('fo/',                         views.fo_list,            name='fo_list'),
    path('fo/<int:pk>/',                views.fo_detail,          name='fo_detail'),
    path('fo/<int:fo_pk>/items/',       views.fo_items,           name='fo_items'),
    path('fo-items/<int:pk>/',          views.fo_item_detail,     name='fo_item_detail'),

    # T&A Milestones
    path('ta-milestones/',              views.ta_milestone_list,  name='ta_milestone_list'),
    path('ta-milestones/<int:pk>/',     views.ta_milestone_detail,name='ta_milestone_detail'),

    # Buyer Inquiries
    path('inquiries/',                               views.inquiry_list,               name='inquiry_list'),
    path('inquiries/<int:pk>/',                      views.inquiry_detail,             name='inquiry_detail'),
    path('inquiries/<int:inq_pk>/items/',            views.inquiry_items,              name='inquiry_items'),
    path('inquiry-items/<int:pk>/',                  views.inquiry_item_detail,        name='inquiry_item_detail'),
    path('inquiries/<int:inq_pk>/cost-sheet/',       views.inquiry_cost_sheet,         name='inquiry_cost_sheet'),
    path('inquiries/<int:inq_pk>/quotations/',       views.inquiry_quotations,         name='inquiry_quotations'),
    path('inquiry-quotations/<int:pk>/',             views.inquiry_quotation_detail,   name='inquiry_quotation_detail'),
    path('inquiries/<int:inq_pk>/convert-to-co/',   views.inquiry_convert_to_co,      name='inquiry_convert_to_co'),
]
