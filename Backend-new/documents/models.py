from django.conf import settings
from django.db import models


class Document(models.Model):
    STATUS_CHOICES = [
        ("uploaded", "Uploaded"),
        ("processing", "Processing"),
        ("indexed", "Indexed"),
        ("failed", "Failed"),
    ]

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="documents",
    )
    title = models.CharField(max_length=255)
    file = models.FileField(upload_to="documents/")
    file_type = models.CharField(max_length=30, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="uploaded")
    chunk_count = models.PositiveIntegerField(default=0)
    file_size = models.PositiveBigIntegerField(default=0)
    summary = models.TextField(blank=True)
    error_message = models.TextField(blank=True)
    last_indexed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title


class ChatMessage(models.Model):
    MODE_CHOICES = [
        ("document", "Document only"),
        ("hybrid", "Hybrid"),
        ("general", "General AI"),
    ]

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="chat_messages",
    )
    document = models.ForeignKey(
        Document,
        on_delete=models.SET_NULL,
        related_name="chat_messages",
        null=True,
        blank=True,
    )
    question = models.TextField()
    answer = models.TextField(blank=True)
    mode = models.CharField(max_length=20, choices=MODE_CHOICES, default="document")
    confidence = models.CharField(max_length=64, blank=True)
    sources_json = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.question[:80]
