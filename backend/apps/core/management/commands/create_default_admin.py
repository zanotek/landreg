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

        if User.objects.filter(username=username).exists():
            self.stdout.write(f'Admin user "{username}" already exists.')
            return

        user = User.objects.create_superuser(
            username=username, password=password, email=email,
            first_name='System', last_name='Administrator'
        )
        UserProfile.objects.get_or_create(user=user, defaults={'role': 'admin'})
        self.stdout.write(self.style.SUCCESS(f'Created admin user: {username}'))
