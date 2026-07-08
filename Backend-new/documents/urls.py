from django.urls import path
from . import views
from .views import (
    ChatHistoryExportCSVView,
    ChatHistoryExportPDFView,
    ChatHistoryView,
    DocumentDetailView,
    DocumentListCreateView,
    DocumentReindexView,
)

urlpatterns = [
    path("", DocumentListCreateView.as_view(), name="document-list-create"),
    path("<int:pk>/", DocumentDetailView.as_view(), name="document-detail"),
    path("<int:pk>/reindex/", DocumentReindexView.as_view(), name="document-reindex"),
    path("history/", ChatHistoryView.as_view(), name="chat-history"),
    path("history/export/csv/", ChatHistoryExportCSVView.as_view(), name="chat-history-export-csv"),
    path("history/export/pdf/", ChatHistoryExportPDFView.as_view(), name="chat-history-export-pdf"),
    path('<int:pk>/', views.delete_document, name='delete-document'),
   path('history/<int:pk>/', views.delete_history_item, name='delete-history-item'),
]
