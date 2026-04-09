# pne-uadb-app/backend/users/permissions.py

from rest_framework.permissions import BasePermission

class IsAgent(BasePermission):
    def has_permission(self, request, view):
        return request.user.role == 'agent'