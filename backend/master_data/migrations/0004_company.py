from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('master_data', '0003_message_template'),
    ]

    operations = [
        migrations.CreateModel(
            name='Company',
            fields=[
                ('id',             models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name',           models.CharField(max_length=200)),
                ('tagline',        models.CharField(blank=True, max_length=200)),
                ('address_line1',  models.CharField(blank=True, max_length=255)),
                ('address_line2',  models.CharField(blank=True, max_length=255)),
                ('city',           models.CharField(blank=True, max_length=100)),
                ('state',          models.CharField(blank=True, max_length=100)),
                ('pincode',        models.CharField(blank=True, max_length=10)),
                ('country',        models.CharField(default='India', max_length=100)),
                ('phone',          models.CharField(blank=True, max_length=20)),
                ('email',          models.EmailField(blank=True, max_length=254)),
                ('website',        models.CharField(blank=True, max_length=100)),
                ('gstin',          models.CharField(blank=True, max_length=20)),
                ('pan_number',     models.CharField(blank=True, max_length=20)),
                ('state_code',     models.CharField(blank=True, max_length=5)),
                ('contact_person', models.CharField(blank=True, max_length=100)),
                ('contact_phone',  models.CharField(blank=True, max_length=20)),
                ('contact_email',  models.EmailField(blank=True, max_length=254)),
                ('is_default',     models.BooleanField(default=False)),
                ('is_active',      models.BooleanField(default=True)),
                ('created_at',     models.DateTimeField(auto_now_add=True)),
                ('updated_at',     models.DateTimeField(auto_now=True)),
            ],
            options={'db_table': 'master_company', 'ordering': ['name']},
        ),
    ]
