
from django.conf import settings
from django.db import models


class InventoryItem(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE
    )
    name = models.CharField(max_length=150)
    category = models.CharField(max_length=50, default="Other")
    quantity = models.DecimalField(max_digits=10, decimal_places=3, default=0)
    unit = models.CharField(max_length=20, default="pieces")
    location = models.CharField(max_length=50, default="Other")
    purchase = models.DateField(null=True, blank=True)
    expiry_date = models.DateField(null=True, blank=True)
    threshold = models.DecimalField(max_digits=10, decimal_places=3, default=1)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name




class ExpiryReminder(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE
    )
    item = models.ForeignKey(
        InventoryItem,
        on_delete=models.CASCADE,
        related_name="expiry_reminders"
    )
    expiry_date = models.DateField(null=True, blank=True)
    days_before = models.PositiveSmallIntegerField()
    sent_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["item", "expiry_date", "days_before"],
                name="unique_expiry_reminder_per_date"
            )
        ]

    def __str__(self):
        return f"{self.item.name} - {self.days_before} day reminder"
