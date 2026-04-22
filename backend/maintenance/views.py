# ============================================================
# FILE: maintenance/views.py
# PURPOSE: Maintenance schedule, log, escalation CRUD
# ============================================================

import json
from datetime import date, timedelta, datetime, timezone
from django.conf import settings as django_settings
from django.core.mail import send_mail
from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from master_data.company_utils import get_active_company
from master_data.models import Company
from .models import MaintenanceTask, MaintenanceEscalation, MaintenanceLog
from masters.models import Machine


# ── helpers ──────────────────────────────────────────────────

def _task_dict(t):
    return {
        'id': t.id,
        'machine_id': t.machine_id,
        'machine_code': t.machine.machine_code,
        'machine_name': t.machine.machine_name,
        'task_name': t.task_name,
        'frequency': t.frequency,
        'task_type': t.task_type,
        'measurement_labels': t.measurement_labels or [],
        'instructions': t.instructions,
        'is_active': t.is_active,
        'image_url': t.task_image.url if t.task_image else None,
    }


def _log_dict(log):
    return {
        'id': log.id,
        'task_id': log.task_id,
        'task_name': log.task.task_name,
        'machine_code': log.task.machine.machine_code,
        'machine_name': log.task.machine.machine_name,
        'frequency': log.task.frequency,
        'task_type': log.task.task_type,
        'measurement_labels': log.task.measurement_labels or [],
        'due_date': str(log.due_date),
        'completed_date': str(log.completed_date) if log.completed_date else None,
        'completed_by': log.completed_by,
        'status': log.status,
        'measurements': log.measurements or {},
        'remarks': log.remarks,
        'escalation_level': log.escalation_level,
        'image_url': log.task.task_image.url if log.task.task_image else None,
    }


def _esc_dict(e):
    return {
        'id': e.id,
        'machine_id': e.machine_id,
        'machine_code': e.machine.machine_code,
        'machine_name': e.machine.machine_name,
        'reminder_days': e.reminder_days,
        'enable_email': e.enable_email,
        'enable_whatsapp': e.enable_whatsapp,
        'level1_name': e.level1_name,
        'level1_email': e.level1_email,
        'level1_phone': e.level1_phone,
        'level1_grace_hours': e.level1_grace_hours,
        'level2_name': e.level2_name,
        'level2_email': e.level2_email,
        'level2_phone': e.level2_phone,
        'level2_grace_hours': e.level2_grace_hours,
        'level3_name': e.level3_name,
        'level3_email': e.level3_email,
        'level3_phone': e.level3_phone,
    }


def _next_due(frequency, from_date=None):
    """Calculate next due date from today based on frequency."""
    today = from_date or date.today()
    delta = {
        'daily':      timedelta(days=1),
        'weekly':     timedelta(weeks=1),
        '15_days':    timedelta(days=15),
        'monthly':    timedelta(days=30),
        '3_monthly':  timedelta(days=90),
        '6_monthly':  timedelta(days=180),
        'yearly':     timedelta(days=365),
        'beam_change': timedelta(days=1),
    }
    return today + delta.get(frequency, timedelta(days=30))


# ── Maintenance Tasks ─────────────────────────────────────────

@csrf_exempt
def task_list(request):
    company = get_active_company(request)

    if request.method == 'GET':
        qs = MaintenanceTask.objects.filter(company=company, is_active=True).select_related('machine')
        machine_id = request.GET.get('machine_id')
        if machine_id:
            qs = qs.filter(machine_id=machine_id)
        freq = request.GET.get('frequency')
        if freq:
            qs = qs.filter(frequency=freq)
        return JsonResponse({'tasks': [_task_dict(t) for t in qs]})

    if request.method == 'POST':
        data = json.loads(request.body)
        try:
            machine = Machine.objects.get(id=data['machine_id'], is_active=True)
        except Machine.DoesNotExist:
            return JsonResponse({'error': 'Machine not found'}, status=400)

        t = MaintenanceTask.objects.create(
            company=company,
            machine=machine,
            task_name=data['task_name'],
            frequency=data['frequency'],
            task_type=data.get('task_type', 'checklist'),
            measurement_labels=data.get('measurement_labels', []),
            instructions=data.get('instructions', ''),
        )
        # Auto-create first log entry (due today or next interval)
        MaintenanceLog.objects.create(
            company=company,
            task=t,
            due_date=date.today(),
        )
        return JsonResponse({'success': True, 'task': _task_dict(t)})


@csrf_exempt
def task_detail(request, pk):
    company = get_active_company(request)
    try:
        t = MaintenanceTask.objects.get(id=pk, company=company)
    except MaintenanceTask.DoesNotExist:
        return JsonResponse({'error': 'Not found'}, status=404)

    if request.method == 'GET':
        return JsonResponse({'task': _task_dict(t)})

    if request.method == 'PUT':
        data = json.loads(request.body)
        t.task_name = data.get('task_name', t.task_name)
        t.frequency = data.get('frequency', t.frequency)
        t.task_type = data.get('task_type', t.task_type)
        t.measurement_labels = data.get('measurement_labels', t.measurement_labels)
        t.instructions = data.get('instructions', t.instructions)
        t.save()
        return JsonResponse({'success': True, 'task': _task_dict(t)})

    if request.method == 'DELETE':
        t.is_active = False
        t.save()
        return JsonResponse({'success': True})


# ── Maintenance Log ───────────────────────────────────────────

@csrf_exempt
def log_list(request):
    company = get_active_company(request)

    if request.method == 'GET':
        qs = MaintenanceLog.objects.filter(company=company).select_related('task', 'task__machine')
        status_filter = request.GET.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)
        machine_id = request.GET.get('machine_id')
        if machine_id:
            qs = qs.filter(task__machine_id=machine_id)
        # Mark overdue
        today = date.today()
        for log in qs:
            if log.status == 'pending' and log.due_date < today:
                log.status = 'overdue'
                log.save(update_fields=['status'])
        qs = qs.order_by('due_date')[:200]
        return JsonResponse({'logs': [_log_dict(l) for l in qs]})


@csrf_exempt
def log_complete(request, pk):
    """Mark a maintenance log as done."""
    company = get_active_company(request)
    if request.method != 'POST':
        return JsonResponse({'error': 'POST required'}, status=405)

    try:
        log = MaintenanceLog.objects.get(id=pk, company=company)
    except MaintenanceLog.DoesNotExist:
        return JsonResponse({'error': 'Not found'}, status=404)

    data = json.loads(request.body)
    log.status = 'done'
    log.completed_date = date.today()
    log.completed_by = data.get('completed_by', '')
    log.measurements = data.get('measurements', {})
    log.remarks = data.get('remarks', '')
    log.save()

    # Auto-create next due log
    next_due = _next_due(log.task.frequency, log.completed_date)
    MaintenanceLog.objects.create(
        company=company,
        task=log.task,
        due_date=next_due,
    )

    return JsonResponse({'success': True, 'next_due': str(next_due)})


# ── Due Today / Alerts ────────────────────────────────────────

def due_alerts(request):
    """Return overdue + due-today tasks for the maintenance alert banner."""
    company = get_active_company(request)
    today = date.today()
    soon = today + timedelta(days=3)

    qs = MaintenanceLog.objects.filter(
        company=company,
        status__in=['pending', 'overdue'],
        due_date__lte=soon,
    ).select_related('task', 'task__machine').order_by('due_date')

    alerts = []
    for log in qs:
        is_overdue = log.due_date < today
        alerts.append({
            'id': log.id,
            'task_name': log.task.task_name,
            'machine_code': log.task.machine.machine_code,
            'frequency': log.task.frequency,
            'due_date': str(log.due_date),
            'is_overdue': is_overdue,
            'days_overdue': (today - log.due_date).days if is_overdue else 0,
            'image_url': log.task.task_image.url if log.task.task_image else None,
        })
    return JsonResponse({'alerts': alerts, 'count': len(alerts)})


# ── Image Upload ──────────────────────────────────────────────

@csrf_exempt
def task_upload_image(request, pk):
    """Upload or replace the reference image for a maintenance task."""
    if request.method != 'POST':
        return JsonResponse({'error': 'POST required'}, status=405)
    company = get_active_company(request)
    try:
        t = MaintenanceTask.objects.get(id=pk, company=company)
    except MaintenanceTask.DoesNotExist:
        return JsonResponse({'error': 'Not found'}, status=404)

    img = request.FILES.get('image')
    if not img:
        return JsonResponse({'error': 'No image file provided'}, status=400)

    if t.task_image:
        t.task_image.delete(save=False)
    t.task_image = img
    t.save(update_fields=['task_image'])
    return JsonResponse({'success': True, 'image_url': t.task_image.url})


# ── Escalation Config ─────────────────────────────────────────

@csrf_exempt
def escalation_list(request):
    company = get_active_company(request)

    if request.method == 'GET':
        qs = MaintenanceEscalation.objects.filter(company=company).select_related('machine')
        return JsonResponse({'escalations': [_esc_dict(e) for e in qs]})

    if request.method == 'POST':
        data = json.loads(request.body)
        try:
            machine = Machine.objects.get(id=data['machine_id'])
        except Machine.DoesNotExist:
            return JsonResponse({'error': 'Machine not found'}, status=400)

        e, _ = MaintenanceEscalation.objects.update_or_create(
            company=company, machine=machine,
            defaults={
                'reminder_days': int(data.get('reminder_days', 1)),
                'enable_email': data.get('enable_email', False),
                'enable_whatsapp': data.get('enable_whatsapp', False),
                'level1_name': data.get('level1_name', ''),
                'level1_email': data.get('level1_email', ''),
                'level1_phone': data.get('level1_phone', ''),
                'level1_grace_hours': int(data.get('level1_grace_hours', 24)),
                'level2_name': data.get('level2_name', ''),
                'level2_email': data.get('level2_email', ''),
                'level2_phone': data.get('level2_phone', ''),
                'level2_grace_hours': int(data.get('level2_grace_hours', 48)),
                'level3_name': data.get('level3_name', ''),
                'level3_email': data.get('level3_email', ''),
                'level3_phone': data.get('level3_phone', ''),
            }
        )
        return JsonResponse({'success': True, 'escalation': _esc_dict(e)})


@csrf_exempt
def escalation_detail(request, pk):
    company = get_active_company(request)
    try:
        e = MaintenanceEscalation.objects.get(id=pk, company=company)
    except MaintenanceEscalation.DoesNotExist:
        return JsonResponse({'error': 'Not found'}, status=404)

    if request.method == 'GET':
        return JsonResponse({'escalation': _esc_dict(e)})

    if request.method in ('PUT', 'POST'):
        data = json.loads(request.body)
        for field in ['reminder_days', 'enable_email', 'enable_whatsapp',
                      'level1_name', 'level1_email', 'level1_phone', 'level1_grace_hours',
                      'level2_name', 'level2_email', 'level2_phone', 'level2_grace_hours',
                      'level3_name', 'level3_email', 'level3_phone']:
            if field in data:
                setattr(e, field, data[field])
        e.save()
        return JsonResponse({'success': True, 'escalation': _esc_dict(e)})

    if request.method == 'DELETE':
        e.delete()
        return JsonResponse({'success': True})


# ── Send Reminders ────────────────────────────────────────────

def _reminder_email_html(log, esc, level, confirm_url, level_name):
    """Build branded HTML email body for a maintenance reminder."""
    overdue_days = (date.today() - log.due_date).days
    status_text = f'OVERDUE by {overdue_days} day{"s" if overdue_days != 1 else ""}' if overdue_days > 0 else 'DUE TODAY'
    status_color = '#ef4444' if overdue_days > 0 else '#f59e0b'
    freq_labels = {
        'daily': 'Daily', 'weekly': 'Weekly', '15_days': 'Every 15 Days',
        'monthly': 'Monthly', '3_monthly': 'Every 3 Months',
        '6_monthly': 'Every 6 Months', 'yearly': 'Yearly', 'beam_change': 'Every Beam Change',
    }
    freq = freq_labels.get(log.task.frequency, log.task.frequency)
    level_labels = {1: 'Primary Responsible', 2: 'Assistant Manager (Escalated)', 3: 'Maintenance Manager (Final Escalation)'}

    return f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Inter,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">

        <!-- Header -->
        <tr><td style="background:#1e293b;padding:24px 32px;">
          <p style="margin:0;color:#fff;font-size:20px;font-weight:700;">MEI TEXZ Technologies</p>
          <p style="margin:4px 0 0;color:#94a3b8;font-size:13px;">Maintenance Reminder — Level {level} ({level_labels.get(level, '')})</p>
        </td></tr>

        <!-- Status banner -->
        <tr><td style="background:{status_color};padding:14px 32px;">
          <p style="margin:0;color:#fff;font-size:15px;font-weight:700;text-align:center;">⚠ {status_text}</p>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:32px;">
          <p style="margin:0 0 8px;color:#475569;font-size:14px;">Dear {level_name},</p>
          <p style="margin:0 0 24px;color:#475569;font-size:14px;">
            The following maintenance task requires your attention and confirmation:
          </p>

          <!-- Details card -->
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;margin-bottom:28px;">
            <tr><td style="padding:20px 24px;">
              {''.join(f'<tr><td style="padding:5px 0;color:#64748b;font-size:13px;width:140px;">{k}</td><td style="padding:5px 0;color:#1e293b;font-size:13px;font-weight:600;">{v}</td></tr>' for k, v in [
                  ('Machine', f"{log.task.machine.machine_code} — {log.task.machine.machine_name}"),
                  ('Task', log.task.task_name),
                  ('Frequency', freq),
                  ('Due Date', str(log.due_date)),
                  ('Status', status_text),
              ])}
            </td></tr>
          </table>

          <!-- Confirm button -->
          <table cellpadding="0" cellspacing="0" style="margin:0 auto 28px;">
            <tr><td style="background:#10b981;border-radius:8px;text-align:center;">
              <a href="{confirm_url}" style="display:inline-block;padding:14px 40px;color:#fff;font-size:15px;font-weight:700;text-decoration:none;">
                ✓ Confirm Task Done
              </a>
            </td></tr>
          </table>

          <p style="margin:0;color:#94a3b8;font-size:12px;text-align:center;">
            Clicking the button above will mark this task as completed and stop further reminders.
          </p>
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:16px 32px;text-align:center;">
          <p style="margin:0;color:#94a3b8;font-size:11px;">
            MEI TEXZ Technologies — Maintenance System · This is an automated reminder.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""


@csrf_exempt
def send_reminders(request):
    """
    Send maintenance reminder emails based on escalation config.
    Called by:
      - Frontend "Send Reminders Now" button (session auth)
      - Windows Task Scheduler via X-Reminder-Key header (key auth)
    """
    if request.method != 'POST':
        return JsonResponse({'error': 'POST required'}, status=405)

    # Auth: session login OR API key
    api_key = request.headers.get('X-Reminder-Key', '')
    use_all_companies = False
    if api_key:
        if api_key != django_settings.REMINDER_API_KEY or not django_settings.REMINDER_API_KEY:
            return JsonResponse({'error': 'Invalid key'}, status=403)
        use_all_companies = True
    elif not request.user.is_authenticated:
        return JsonResponse({'error': 'Login required'}, status=401)

    base_url = django_settings.SITE_BASE_URL.rstrip('/')
    today = date.today()
    now = datetime.now(timezone.utc)
    sent_count = 0
    skipped_count = 0
    errors = []

    # Determine which companies to process
    if use_all_companies:
        companies = list(Company.objects.filter(is_active=True))
    else:
        company = get_active_company(request)
        companies = [company] if company else []

    for company in companies:
        # Get all pending/overdue logs that are due within reminder window
        escalations = {e.machine_id: e for e in MaintenanceEscalation.objects.filter(company=company, enable_email=True)}
        if not escalations:
            continue

        logs = MaintenanceLog.objects.filter(
            company=company,
            status__in=['pending', 'overdue'],
        ).select_related('task', 'task__machine')

        for log in logs:
            esc = escalations.get(log.task.machine_id)
            if not esc:
                skipped_count += 1
                continue

            # Only process if due_date is within reminder window
            days_until_due = (log.due_date - today).days
            if days_until_due > esc.reminder_days:
                skipped_count += 1
                continue

            # Determine escalation level
            current_level = log.escalation_level
            if current_level == 0:
                # First notification → Level 1
                target_level = 1
            elif current_level == 1:
                # Check if L1 grace period has passed
                if log.notified_at and (now - log.notified_at).total_seconds() / 3600 >= esc.level1_grace_hours:
                    target_level = 2
                else:
                    target_level = 1  # Re-send to L1 (not yet time to escalate)
            elif current_level == 2:
                if log.notified_at and (now - log.notified_at).total_seconds() / 3600 >= esc.level2_grace_hours:
                    target_level = 3
                else:
                    target_level = 2
            else:
                target_level = 3  # Max level — keep notifying L3

            # Get contact for this level
            email_map = {
                1: (esc.level1_name, esc.level1_email),
                2: (esc.level2_name, esc.level2_email),
                3: (esc.level3_name, esc.level3_email),
            }
            level_name, level_email = email_map.get(target_level, ('', ''))
            if not level_email:
                skipped_count += 1
                continue

            confirm_url = f"{base_url}/api/maintenance/confirm/{log.confirm_token}/"
            overdue_days = (today - log.due_date).days
            status_text = f'OVERDUE by {overdue_days} day{"s" if overdue_days != 1 else ""}' if overdue_days > 0 else 'DUE TODAY'
            subject = f"[MEI TEXZ] Maintenance Due — {log.task.machine.machine_code} · {log.task.task_name} ({status_text})"

            try:
                send_mail(
                    subject=subject,
                    message=f"Maintenance task {log.task.task_name} on {log.task.machine.machine_code} is {status_text}. Confirm done: {confirm_url}",
                    html_message=_reminder_email_html(log, esc, target_level, confirm_url, level_name),
                    from_email=django_settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[level_email],
                    fail_silently=False,
                )
                log.escalation_level = target_level
                log.notified_at = now
                log.save(update_fields=['escalation_level', 'notified_at'])
                sent_count += 1
            except Exception as exc:
                errors.append(f"{log.task.machine.machine_code}/{log.task.task_name}: {exc}")

    return JsonResponse({
        'success': True,
        'sent': sent_count,
        'skipped': skipped_count,
        'errors': errors,
    })


def confirm_by_token(request, token):
    """Public endpoint — one-click confirm from email link. Returns HTML page."""
    try:
        log = MaintenanceLog.objects.select_related('task', 'task__machine').get(confirm_token=token)
    except MaintenanceLog.DoesNotExist:
        return HttpResponse(_confirm_page(False, 'Invalid or expired confirmation link.'), content_type='text/html')

    if log.status == 'done':
        return HttpResponse(_confirm_page(True, f'This task was already confirmed on {log.completed_date}.', already_done=True), content_type='text/html')

    log.status = 'done'
    log.completed_date = date.today()
    log.completed_by = 'Email Confirmation'
    log.save(update_fields=['status', 'completed_date', 'completed_by'])

    # Auto-create next due log
    next_due = _next_due(log.task.frequency, log.completed_date)
    MaintenanceLog.objects.create(
        company=log.company,
        task=log.task,
        due_date=next_due,
    )

    machine_label = f"{log.task.machine.machine_code} — {log.task.machine.machine_name}"
    return HttpResponse(_confirm_page(True, f'Task confirmed. Next due: {next_due}', machine=machine_label, task=log.task.task_name), content_type='text/html')


def _confirm_page(success, message, already_done=False, machine='', task=''):
    icon = '✓' if success else '✗'
    color = '#10b981' if success else '#ef4444'
    title = 'Already Done' if already_done else ('Task Confirmed!' if success else 'Error')
    details = ''
    if machine:
        details = f'<p style="color:#475569;font-size:14px;margin:4px 0 0;">{machine} · {task}</p>'
    return f"""<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{title} — MEI TEXZ Maintenance</title></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Inter,Arial,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;">
  <div style="background:#fff;border-radius:16px;padding:48px 40px;text-align:center;max-width:420px;box-shadow:0 4px 16px rgba(0,0,0,.08);">
    <div style="width:72px;height:72px;border-radius:50%;background:{color}18;display:flex;align-items:center;justify-content:center;margin:0 auto 20px;font-size:36px;line-height:72px;">{icon}</div>
    <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#1e293b;">{title}</h1>
    {details}
    <p style="color:#64748b;font-size:14px;margin:16px 0 0;">{message}</p>
    <p style="color:#94a3b8;font-size:12px;margin:32px 0 0;">MEI TEXZ Technologies — Maintenance System</p>
  </div>
</body></html>"""
