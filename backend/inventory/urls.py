
from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    InventoryViewSet,
    login_api,
    register_api,
    expiry_alerts_api,
)

router = DefaultRouter()
router.register("items", InventoryViewSet, basename="items")

urlpatterns = [
    path("", include(router.urls)),
    path("login/", login_api, name="login"),
    path("register/", register_api, name="register"),
    path("expiry-alerts/", expiry_alerts_api, name="expiry-alerts"),
]
