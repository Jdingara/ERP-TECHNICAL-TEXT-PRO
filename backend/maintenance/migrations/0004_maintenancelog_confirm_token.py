import uuid
from django.db import migrations, models


def assign_tokens(apps, schema_editor):
    MaintenanceLog = apps.get_model('maintenance', 'MaintenanceLog')
    for log in MaintenanceLog.objects.filter(confirm_token__isnull=True):
        log.confirm_token = uuid.uuid4()
        log.save(update_fields=['confirm_token'])


class Migration(migrations.Migration):

    dependencies = [
        ('maintenance', '0003_add_task_image'),
    ]

    operations = [
        # Step 1: add nullable (no unique yet)
        migrations.AddField(
            model_name='maintenancelog',
            name='confirm_token',
            field=models.UUIDField(null=True, blank=True),
        ),
        # Step 2: fill unique UUIDs for existing rows
        migrations.RunPython(assign_tokens, migrations.RunPython.noop),
        # Step 3: make it non-null unique
        migrations.AlterField(
            model_name='maintenancelog',
            name='confirm_token',
            field=models.UUIDField(default=uuid.uuid4, editable=False, unique=True),
        ),
    ]
