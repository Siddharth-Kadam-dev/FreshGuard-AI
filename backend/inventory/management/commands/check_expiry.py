
from django.core.management.base import BaseCommand
from django.core.mail import send_mail
from django.utils import timezone

from inventory.models import InventoryItem, ExpiryReminder


class Command(BaseCommand):
    help = "Check inventory items and send expiry reminder emails"

    def handle(self, *args, **options):
        today = timezone.localdate()
        milestones = [15, 7, 3]

        checked = 0
        sent = 0
        skipped = 0

        items = InventoryItem.objects.filter(
            expiry_date__isnull=False
        ).select_related("user")

        for item in items:
            checked += 1
            days_left = (item.expiry_date - today).days

            # No email address means we cannot send a notification.
            recipient = item.user.email
            if not recipient:
                self.stdout.write(
                    f"Skipped {item.name}: user has no email address."
                )
                skipped += 1
                continue

            # Send one expired-item alert per expiry date.
            # days_before=0 is used as the expired-alert marker.
            if days_left < 0:
                already_sent = ExpiryReminder.objects.filter(
                    item=item,
                    expiry_date=item.expiry_date,
                    days_before=0,
                ).exists()

                if already_sent:
                    continue

                try:
                    send_mail(
                        subject=f"FreshGuard AI: {item.name} has expired",
                        message=(
                            f"Hello {item.user.username},\n\n"
                            f"Your inventory item '{item.name}' has expired.\n"
                            f"Expiry date: {item.expiry_date}\n"
                            "Please check the item before using it.\n\n"
                            "FreshGuard AI"
                        ),
                        from_email=None,
                        recipient_list=[recipient],
                        fail_silently=False,
                    )

                    ExpiryReminder.objects.create(
                        user=item.user,
                        item=item,
                        expiry_date=item.expiry_date,
                        days_before=0,
                    )
                    sent += 1
                    self.stdout.write(
                        self.style.SUCCESS(
                            f"Expired-item email sent: {item.name}"
                        )
                    )
                except Exception as error:
                    self.stderr.write(
                        f"Email failed for {item.name}: {error}"
                    )
                continue

            if days_left not in milestones:
                continue

            already_sent = ExpiryReminder.objects.filter(
                item=item,
                expiry_date=item.expiry_date,
                days_before=days_left,
            ).exists()

            if already_sent:
                continue

            try:
                send_mail(
                    subject=(
                        f"FreshGuard AI: {item.name} expires "
                        f"in {days_left} days"
                    ),
                    message=(
                        f"Hello {item.user.username},\n\n"
                        f"Your inventory item '{item.name}' will expire "
                        f"in {days_left} days.\n"
                        f"Expiry date: {item.expiry_date}\n"
                        "Please plan to use it before it expires.\n\n"
                        "FreshGuard AI"
                    ),
                    from_email=None,
                    recipient_list=[recipient],
                    fail_silently=False,
                )

                ExpiryReminder.objects.create(
                    user=item.user,
                    item=item,
                    expiry_date=item.expiry_date,
                    days_before=days_left,
                )
                sent += 1
                self.stdout.write(
                    self.style.SUCCESS(
                        f"Email sent: {item.name} expires "
                        f"in {days_left} days."
                    )
                )

            except Exception as error:
                self.stderr.write(
                    f"Email failed for {item.name}: {error}"
                )

        self.stdout.write(
            self.style.SUCCESS(
                f"Finished. Items checked: {checked}; "
                f"emails sent: {sent}; skipped: {skipped}."
            )
        )
