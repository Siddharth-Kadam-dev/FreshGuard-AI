
from rest_framework import serializers
from .models import InventoryItem


class InventoryItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = InventoryItem
        fields = [
            "id",
            "name",
            "category",
            "quantity",
            "unit",
            "location",
            "purchase",
            "expiry_date",
            "threshold",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]
