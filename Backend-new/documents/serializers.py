from rest_framework import serializers

from .models import ChatMessage, Document


class DocumentSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = Document
        fields = (
            "id",
            "title",
            "file",
            "file_url",
            "file_type",
            "status",
            "chunk_count",
            "file_size",
            "summary",
            "error_message",
            "last_indexed_at",
            "created_at",
        )
        read_only_fields = (
            "id",
            "file_url",
            "status",
            "chunk_count",
            "file_size",
            "summary",
            "error_message",
            "last_indexed_at",
            "created_at",
        )

    def get_file_url(self, obj):
        request = self.context.get("request")
        if not obj.file:
            return ""
        if request:
            return request.build_absolute_uri(obj.file.url)
        return obj.file.url

    def create(self, validated_data):
        upload = validated_data.get("file")
        validated_data["file_size"] = getattr(upload, "size", 0)
        if upload and "." in upload.name:
            validated_data["file_type"] = upload.name.rsplit(".", 1)[-1].lower()
        return super().create(validated_data)


class ChatMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChatMessage
        fields = (
            "id",
            "document",
            "question",
            "answer",
            "mode",
            "confidence",
            "sources_json",
            "created_at",
        )
        read_only_fields = ("id", "created_at")
