import os
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from apps.core.models import UserProfile


class Command(BaseCommand):
    help = 'Create default admin user if none exists'

    def handle(self, *args, **options):
        username = os.environ.get('ADMIN_USERNAME', 'admin')
        password = os.environ.get('ADMIN_PASSWORD', 'Admin@Zanzibar2024!')
        email = os.environ.get('ADMIN_EMAIL', 'admin@landreg.go.tz')

        user, created = User.objects.get_or_create(
            username=username,
            defaults={'email': email, 'first_name': 'System', 'last_name': 'Administrator', 'is_staff': True, 'is_superuser': True},
        )
        user.set_password(password)
        user.is_staff = True
        user.is_superuser = True
        user.save()
        UserProfile.objects.get_or_create(user=user, defaults={'role': 'admin'})
        action = 'Created' if created else 'Updated password for'
        self.stdout.write(self.style.SUCCESS(f'{action} admin user: {username}'))
