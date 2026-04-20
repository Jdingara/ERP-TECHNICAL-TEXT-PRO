from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('master_data', '0001_initial'),
        ('masters', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='MaintenanceTask',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('task_name', models.CharField(max_length=200)),
                ('frequency', models.CharField(choices=[('daily','Daily'),('weekly','Weekly'),('15_days','Every 15 Days'),('monthly','Monthly'),('3_monthly','Every 3 Months'),('6_monthly','Every 6 Months'),('yearly','Yearly'),('beam_change','Every Beam Change')], max_length=20)),
                ('task_type', models.CharField(choices=[('checklist','Checklist (tick done)'),('measurement','Measurement (capture values)')], default='checklist', max_length=20)),
                ('measurement_labels', models.JSONField(blank=True, default=list)),
                ('instructions', models.TextField(blank=True)),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('company', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, to='master_data.company')),
                ('machine', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='maintenance_tasks', to='masters.machine')),
            ],
            options={'ordering': ['machine__machine_code', 'frequency', 'task_name']},
        ),
        migrations.CreateModel(
            name='MaintenanceEscalation',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('reminder_days', models.PositiveIntegerField(default=1)),
                ('enable_email', models.BooleanField(default=False)),
                ('enable_whatsapp', models.BooleanField(default=False)),
                ('level1_name', models.CharField(blank=True, max_length=100)),
                ('level1_email', models.EmailField(blank=True)),
                ('level1_phone', models.CharField(blank=True, max_length=20)),
                ('level1_grace_hours', models.PositiveIntegerField(default=24)),
                ('level2_name', models.CharField(blank=True, max_length=100)),
                ('level2_email', models.EmailField(blank=True)),
                ('level2_phone', models.CharField(blank=True, max_length=20)),
                ('level2_grace_hours', models.PositiveIntegerField(default=48)),
                ('level3_name', models.CharField(blank=True, max_length=100)),
                ('level3_email', models.EmailField(blank=True)),
                ('level3_phone', models.CharField(blank=True, max_length=20)),
                ('company', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, to='master_data.company')),
                ('machine', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='escalation_config', to='masters.machine')),
            ],
            options={'unique_together': {('company', 'machine')}},
        ),
        migrations.CreateModel(
            name='MaintenanceLog',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('due_date', models.DateField()),
                ('completed_date', models.DateField(blank=True, null=True)),
                ('completed_by', models.CharField(blank=True, max_length=100)),
                ('status', models.CharField(choices=[('pending','Pending'),('done','Done'),('overdue','Overdue'),('skipped','Skipped')], default='pending', max_length=20)),
                ('measurements', models.JSONField(blank=True, default=dict)),
                ('remarks', models.TextField(blank=True)),
                ('escalation_level', models.PositiveIntegerField(default=0)),
                ('notified_at', models.DateTimeField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('company', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, to='master_data.company')),
                ('task', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='logs', to='maintenance.maintenancetask')),
            ],
            options={'ordering': ['due_date', 'task__machine__machine_code']},
        ),
    ]
