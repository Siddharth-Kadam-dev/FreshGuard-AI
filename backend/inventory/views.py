
from django.contrib.auth import authenticate, get_user_model
from rest_framework import status, viewsets, permissions
from rest_framework.authtoken.models import Token
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from .models import InventoryItem
from .serializers import InventoryItemSerializer

from django.utils import timezone
from .models import InventoryItem, ExpiryReminder

User = get_user_model()


class InventoryViewSet(viewsets.ModelViewSet):
    serializer_class = InventoryItemSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return InventoryItem.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


@api_view(["POST"])
@permission_classes([AllowAny])
def login_api(request):
    email = request.data.get("email", "").strip()
    password = request.data.get("password", "")

    user_obj = User.objects.filter(email__iexact=email).first()

    if not user_obj:
        return Response(
            {"error": "Invalid email or password"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    user = authenticate(
        request,
        username=user_obj.get_username(),
        password=password,
    )

    if not user:
        return Response(
            {"error": "Invalid email or password"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    token, _ = Token.objects.get_or_create(user=user)
    return Response({"token": token.key})


@api_view(["POST"])
@permission_classes([AllowAny])
def register_api(request):
    name = request.data.get("name", "").strip()
    email = request.data.get("email", "").strip().lower()
    password = request.data.get("password", "")

    if not name or not email or len(password) < 4:
        return Response(
            {"error": "Enter name, email and a password of at least 4 characters"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if User.objects.filter(email__iexact=email).exists():
        return Response(
            {"error": "An account with this email already exists"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # This simple version uses email as the Django username.
    user = User.objects.create_user(
        username=email,
        email=email,
        password=password,
        first_name=name,
    )

    token, _ = Token.objects.get_or_create(user=user)
    return Response(
        {"token": token.key, "name": name, "email": email},
        status=status.HTTP_201_CREATED,
    )




@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def expiry_alerts_api(request):
    today = timezone.localdate()
    items = InventoryItem.objects.filter(
        user=request.user,
        expiry_date__isnull=False
    ).order_by("expiry_date")

    alerts = []

    for item in items:
        days_left = (item.expiry_date - today).days

        if days_left < 0:
            alert_type = "expired"
            message = f"{item.name} has expired."
        elif days_left in [3, 7, 15]:
            alert_type = "expiring"
            message = f"{item.name} expires in {days_left} days."
        else:
            continue

        alerts.append({
            "item_id": item.id,
            "name": item.name,
            "expiry_date": item.expiry_date.isoformat(),
            "days_left": days_left,
            "alert_type": alert_type,
            "message": message,
        })

    return Response({"alerts": alerts})
