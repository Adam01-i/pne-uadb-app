from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("inscriptions", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="notifications",
            name="lu",
            field=models.BooleanField(default=False),
        ),
    ]
