from django.urls import path

from .views import (

    signup,

    login,

    google_login
)


urlpatterns = [

    path(
        "signup/",
        signup
    ),

    path(
        "login/",
        login
    ),

    path(
        "google-login/",
        google_login
    ),
]