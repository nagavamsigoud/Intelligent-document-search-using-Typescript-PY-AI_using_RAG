import csv
import os
from io import BytesIO

import requests
from django.http import HttpResponse
from django.utils import timezone
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from rest_framework import generics, permissions, status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import ChatMessage, Document
from .serializers import ChatMessageSerializer, DocumentSerializer

from rest_framework import status
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
AI_API_URL = os.getenv("AI_API_URL", "http://localhost:8001").rstrip("/")


def index_document(document: Document) -> None:
    if not document.file:
        document.status = "failed"
        document.error_message = "No file attached to document."
        document.save(update_fields=["status", "error_message"])
        return

    document.status = "processing"
    document.error_message = ""
    document.save(update_fields=["status", "error_message"])

    with document.file.open("rb") as uploaded_file:
        response = requests.post(
            f"{AI_API_URL}/documents/import",
            files={
                "file": (
                    os.path.basename(document.file.name),
                    uploaded_file,
                    "application/octet-stream",
                )
            },
            data={"document_id": str(document.id), "title": document.title},
            timeout=180,
        )

    response.raise_for_status()
    payload = response.json()

    document.status = payload.get("status", "indexed")
    document.chunk_count = payload.get("chunk_count", 0)
    document.summary = payload.get("summary", "")
    document.file_type = payload.get("file_type", document.file_type)
    document.last_indexed_at = timezone.now()
    document.error_message = ""
    document.save()


class DocumentListCreateView(generics.ListCreateAPIView):
    serializer_class = DocumentSerializer
    parser_classes = (MultiPartParser, FormParser)

    def get_queryset(self):
        return Document.objects.filter(owner=self.request.user).order_by("-created_at")

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["request"] = self.request
        return context

    def perform_create(self, serializer):
        document = serializer.save(owner=self.request.user)
        try:
            index_document(document)
        except requests.RequestException as exc:
            document.status = "failed"
            document.error_message = f"Indexing failed: {exc}"
            document.save(update_fields=["status", "error_message"])


class DocumentDetailView(generics.RetrieveDestroyAPIView):
    serializer_class = DocumentSerializer

    def get_queryset(self):
        return Document.objects.filter(owner=self.request.user)

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["request"] = self.request
        return context

    def perform_destroy(self, instance):
        try:
            requests.delete(f"{AI_API_URL}/documents/{instance.id}", timeout=60)
        except requests.RequestException:
            pass
        instance.delete()


class DocumentReindexView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        document = generics.get_object_or_404(Document, pk=pk, owner=request.user)
        try:
            index_document(document)
        except requests.RequestException as exc:
            document.status = "failed"
            document.error_message = f"Indexing failed: {exc}"
            document.save(update_fields=["status", "error_message"])
            return Response(
                {"detail": document.error_message},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        serializer = DocumentSerializer(document, context={"request": request})
        return Response(serializer.data)


class ChatHistoryView(generics.ListCreateAPIView):
    serializer_class = ChatMessageSerializer

    def get_queryset(self):
        return ChatMessage.objects.filter(owner=self.request.user).order_by("-created_at")

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)


class ChatHistoryExportCSVView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = 'attachment; filename="rag-chat-history.csv"'

        writer = csv.writer(response)
        writer.writerow(["created_at", "mode", "question", "answer", "confidence", "sources"])

        for item in ChatMessage.objects.filter(owner=request.user).order_by("-created_at"):
            sources = " | ".join(source.get("title", "") for source in item.sources_json)
            writer.writerow(
                [
                    item.created_at.isoformat(),
                    item.mode,
                    item.question,
                    item.answer,
                    item.confidence,
                    sources,
                ]
            )

        return response


class ChatHistoryExportPDFView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        buffer = BytesIO()
        pdf = canvas.Canvas(buffer, pagesize=A4)
        width, height = A4
        y = height - 50

        pdf.setFont("Helvetica-Bold", 16)
        pdf.drawString(40, y, "Intelligent Document Search - Chat History")
        y -= 30

        for item in ChatMessage.objects.filter(owner=request.user).order_by("-created_at")[:25]:
            if y < 120:
                pdf.showPage()
                y = height - 50

            pdf.setFont("Helvetica-Bold", 11)
            pdf.drawString(40, y, f"{item.created_at:%Y-%m-%d %H:%M} | {item.mode}")
            y -= 18

            pdf.setFont("Helvetica", 10)
            lines = [
                f"Q: {item.question}",
                f"A: {item.answer}",
                f"Sources: {', '.join(source.get('title', '') for source in item.sources_json[:3])}",
            ]

            for line in lines:
                for part in [line[i:i + 95] for i in range(0, len(line), 95)]:
                    pdf.drawString(40, y, part)
                    y -= 14
            y -= 10

        pdf.save()
        buffer.seek(0)

        response = HttpResponse(buffer.read(), content_type="application/pdf")
        response["Content-Disposition"] = 'attachment; filename="rag-chat-history.pdf"'
        return response
@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_document(request, pk):
    """Deletes a specific document and its associated vector chunks."""
    try:
        # We ensure the document belongs to the logged-in user for security
        document = Document.objects.get(pk=pk, user=request.user)
        document.delete() 
        return Response({"message": "Document deleted"}, status=status.HTTP_204_NO_CONTENT)
    except Document.DoesNotExist:
        return Response({"error": "Document not found"}, status=status.HTTP_404_NOT_FOUND)

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_history_item(request, pk):
    try:
        # Match pk AND owner to ensure security
        item = ChatMessage.objects.get(pk=pk, owner=request.user)
        item.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
    except ChatMessage.DoesNotExist:
        return Response({"error": "Item not found"}, status=status.HTTP_404_NOT_FOUND)