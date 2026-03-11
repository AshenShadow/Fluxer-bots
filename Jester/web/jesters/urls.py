from django.urls import path
from . import views

urlpatterns = [
    path('', views.index, name='index'),
    path('dashboard/', views.dashboard, name='dashboard'),
    path('create/', views.create_jester, name='create_jester'),
    path('browse/', views.browse_jesters, name='browse_jesters'),
    path('changelog/', views.changelog_view, name='changelog'),
    path('reports/', views.reports_view, name='reports'),
    path('reports/<int:report_id>/', views.report_detail_view, name='report_detail'),
]
