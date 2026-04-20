# ============================================================
# FILE: maintenance/views.py
# PURPOSE: Maintenance schedule, log, escalation CRUD
# ============================================================

import json
from datetime import date, timedelta
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from master_data.company_utils import get_active_company
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
