# ============================================================
# FILE: production/views.py
# PURPOSE: API endpoints for production module.
#          BOM, Work Orders, Batch Tracking, Quality Check.
#          Completing a work order auto-updates stock.
# ============================================================

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.db import transaction
from django.utils import timezone
import json
from datetime import date

from .models import BillOfMaterials, BOMLine, WorkOrder, WorkOrderMaterialConsumption, Batch, QualityCheck, Machine
from inventory.models import Stock, StockMovement
from authentication.audit import log_action, field_diff


# ============================================================
# HELPER FUNCTIONS
# ============================================================

def bom_line_to_dict(line):
    return {
        'id':                   line.id,
        'raw_material_id':      line.raw_material_id,
        'raw_material_code':    line.raw_material.item_code,
        'raw_material_name':    line.raw_material.item_name,
        'unit':                 line.raw_material.unit_of_measure.short_name if line.raw_material.unit_of_measure else '',
        'quantity':             str(line.quantity),
        'waste_percent':        str(line.waste_percent),
        'quantity_with_waste':  str(round(line.quantity_with_waste, 3)),
        'notes':                line.notes,
    }

def bom_to_dict(bom, include_lines=False):
    data = {
        'id':                   bom.id,
        'bom_name':             bom.bom_name,
        'finished_product_id':  bom.finished_product_id,
        'finished_product':     bom.finished_product.item_name,
        'finished_product_code': bom.finished_product.item_code,
        'quantity_produced':    str(bom.quantity_produced),
        'status':               bom.status,
        'notes':                bom.notes,
    }
    if include_lines:
        data['lines'] = [bom_line_to_dict(l) for l in bom.lines.select_related('raw_material', 'raw_material__unit_of_measure').all()]
    return data

def work_order_to_dict(wo, include_lines=False):
    data = {
        'id':                   wo.id,
        'work_order_number':    wo.work_order_number,
        'bom_id':               wo.bom_id,
        'bom_name':             wo.bom.bom_name,
        'finished_product':     wo.finished_product.item_name,
        'finished_product_code': wo.finished_product.item_code,
        'planned_quantity':     str(wo.planned_quantity),
        'actual_quantity':      str(wo.actual_quantity),
        'warehouse':            wo.warehouse.name,
        'warehouse_id':         wo.warehouse_id,
        'planned_start_date':   str(wo.planned_start_date),
        'planned_end_date':     str(wo.planned_end_date) if wo.planned_end_date else '',
        'status':               wo.status,
        'notes':                wo.notes,
        'created_at':           wo.created_at.strftime('%Y-%m-%d'),
    }
    if include_lines:
        data['materials'] = [{
            'raw_material_id':   m.raw_material_id,
            'raw_material_code': m.raw_material.item_code,
            'raw_material_name': m.raw_material.item_name,
            'planned_quantity':  str(m.planned_quantity),
            'actual_quantity':   str(m.actual_quantity),
        } for m in wo.material_consumptions.select_related('raw_material').all()]
    return data


# ============================================================
# BILL OF MATERIALS
# ============================================================

@csrf_exempt
def bom_list_and_create(request):
    if request.method == 'GET':
        boms = BillOfMaterials.objects.select_related('finished_product').all()
        return JsonResponse({'boms': [bom_to_dict(b) for b in boms], 'total': boms.count()})

    if request.method == 'POST':
        data = json.loads(request.body)
        try:
            with transaction.atomic():
                bom = BillOfMaterials.objects.create(
                    bom_name            = data['bom_name'],
                    finished_product_id = data['finished_product_id'],
                    quantity_produced   = data.get('quantity_produced', 1),
                    status              = 'active',
                    notes               = data.get('notes', ''),
                    created_by          = request.user if request.user.is_authenticated else None,
                )
                for line_data in data.get('lines', []):
                    BOMLine.objects.create(
                        bom                 = bom,
                        raw_material_id     = line_data['raw_material_id'],
                        quantity            = line_data['quantity'],
                        waste_percent       = line_data.get('waste_percent', 0),
                        notes               = line_data.get('notes', ''),
                    )
            log_action(request, 'BOM', 'Created', bom.bom_name,
                       {'product': bom.finished_product.item_name, 'lines': len(data.get('lines', []))})
            return JsonResponse({'message': 'BOM created.', 'bom': bom_to_dict(bom, include_lines=True)}, status=201)
        except Exception as e:
            return JsonResponse({'message': str(e)}, status=400)


@csrf_exempt
def bom_detail(request, bom_id):
    try:
        bom = BillOfMaterials.objects.get(id=bom_id)
    except BillOfMaterials.DoesNotExist:
        return JsonResponse({'message': 'BOM not found.'}, status=404)

    if request.method == 'GET':
        return JsonResponse({'bom': bom_to_dict(bom, include_lines=True)})


# ============================================================
# WORK ORDERS
# ============================================================

@csrf_exempt
def work_order_list_and_create(request):
    if request.method == 'GET':
        wos = WorkOrder.objects.select_related('bom', 'finished_product', 'warehouse').all()
        status_filter = request.GET.get('status', '')
        if status_filter:
            wos = wos.filter(status=status_filter)
        return JsonResponse({'work_orders': [work_order_to_dict(w) for w in wos], 'total': wos.count()})

    if request.method == 'POST':
        data = json.loads(request.body)
        try:
            with transaction.atomic():
                bom = BillOfMaterials.objects.get(id=data['bom_id'])
                planned_qty = float(data['planned_quantity'])
                ratio = planned_qty / float(bom.quantity_produced)

                # Auto-generate work order number: WO-YYYYMMDD-001
                today_str = date.today().strftime('%Y%m%d')
                prefix = f'WO-{today_str}-'
                last_wo = WorkOrder.objects.filter(work_order_number__startswith=prefix).order_by('-work_order_number').first()
                next_num = int(last_wo.work_order_number.split('-')[-1]) + 1 if last_wo else 1
                wo_number = f'{prefix}{str(next_num).zfill(3)}'

                wo = WorkOrder.objects.create(
                    work_order_number   = wo_number,
                    bom                 = bom,
                    finished_product    = bom.finished_product,
                    planned_quantity    = planned_qty,
                    warehouse_id        = data['warehouse_id'],
                    planned_start_date  = data['planned_start_date'],
                    planned_end_date    = data.get('planned_end_date') or None,
                    status              = 'confirmed',
                    notes               = data.get('notes', ''),
                    created_by          = request.user if request.user.is_authenticated else None,
                )

                # Calculate material requirements from BOM
                for bom_line in bom.lines.select_related('raw_material').all():
                    WorkOrderMaterialConsumption.objects.create(
                        work_order      = wo,
                        raw_material    = bom_line.raw_material,
                        planned_quantity = round(float(bom_line.quantity_with_waste) * ratio, 3),
                    )

            log_action(request, 'Work Order', 'Created', wo.work_order_number,
                       {'product': wo.finished_product.item_name, 'planned_qty': str(planned_qty), 'bom': bom.bom_name})
            return JsonResponse({'message': 'Work order created.', 'work_order': work_order_to_dict(wo, include_lines=True)}, status=201)
        except Exception as e:
            return JsonResponse({'message': str(e)}, status=400)


@csrf_exempt
def work_order_detail(request, wo_id):
    """ GET = get WO with materials | PUT = update status/notes | DELETE = delete draft WO """
    try:
        wo = WorkOrder.objects.select_related('bom', 'finished_product', 'warehouse').get(id=wo_id)
    except WorkOrder.DoesNotExist:
        return JsonResponse({'message': 'Work order not found.'}, status=404)

    if request.method == 'GET':
        return JsonResponse({'work_order': work_order_to_dict(wo, include_lines=True)})

    if request.method == 'PUT':
        data = json.loads(request.body)
        # Lock: completed/cancelled WO cannot be edited
        if wo.status == 'completed':
            return JsonResponse({'message': 'Cannot edit a completed work order. Batch and stock have been updated.'}, status=400)
        before = {'status': wo.status, 'notes': wo.notes, 'planned_end_date': str(wo.planned_end_date or '')}
        if 'status' in data:
            wo.status = data['status']
        if 'notes' in data:
            wo.notes = data['notes']
        if 'planned_end_date' in data:
            wo.planned_end_date = data['planned_end_date'] or None
        wo.save()
        after = {'status': wo.status, 'notes': wo.notes, 'planned_end_date': str(wo.planned_end_date or '')}
        log_action(request, 'Work Order', 'Updated', wo.work_order_number, {'changes': field_diff(before, after)})
        return JsonResponse({'message': 'Work order updated.', 'work_order': work_order_to_dict(wo)})

    if request.method == 'DELETE':
        if wo.status not in ('draft', 'confirmed'):
            return JsonResponse({'message': f'Cannot delete a {wo.status} work order.'}, status=400)
        log_action(request, 'Work Order', 'Deleted', wo.work_order_number, {'product': wo.finished_product.item_name})
        wo.delete()
        return JsonResponse({'message': 'Work order deleted.'})


@csrf_exempt
def work_order_complete(request, wo_id):
    """
    POST /api/production/work-orders/<id>/complete/
    Completes work order:
    - Deducts raw materials from stock
    - Adds finished goods to stock
    - Creates batch record
    """
    try:
        wo = WorkOrder.objects.select_related('finished_product', 'warehouse').get(id=wo_id)
    except WorkOrder.DoesNotExist:
        return JsonResponse({'message': 'Work order not found.'}, status=404)

    if wo.status == 'completed':
        return JsonResponse({'message': 'Already completed.'}, status=400)

    data = json.loads(request.body) if request.body else {}
    actual_qty = float(data.get('actual_quantity', wo.planned_quantity))

    try:
        with transaction.atomic():
            ratio = actual_qty / float(wo.planned_quantity)

            # Deduct raw materials from stock
            for material in wo.material_consumptions.select_related('raw_material').all():
                actual_consumed = round(float(material.planned_quantity) * ratio, 3)
                material.actual_quantity = actual_consumed
                material.save()

                stock = Stock.objects.filter(item=material.raw_material, warehouse=wo.warehouse).first()
                if not stock or stock.quantity < actual_consumed:
                    raise ValueError(f'Insufficient stock for {material.raw_material.item_code}')

                stock.quantity -= actual_consumed
                stock.save()

                StockMovement.objects.create(
                    item            = material.raw_material,
                    warehouse       = wo.warehouse,
                    movement_type   = 'production_out',
                    quantity        = actual_consumed,
                    reference_number = wo.work_order_number,
                    reference_type  = 'work_order',
                    notes           = f'Used in WO: {wo.work_order_number}',
                    created_by      = request.user if request.user.is_authenticated else None,
                )

            # Add finished goods to stock
            fin_stock, _ = Stock.objects.get_or_create(
                item=wo.finished_product, warehouse=wo.warehouse,
                defaults={'quantity': 0}
            )
            fin_stock.quantity += actual_qty
            fin_stock.save()

            StockMovement.objects.create(
                item            = wo.finished_product,
                warehouse       = wo.warehouse,
                movement_type   = 'production_in',
                quantity        = actual_qty,
                reference_number = wo.work_order_number,
                reference_type  = 'work_order',
                notes           = f'Produced in WO: {wo.work_order_number}',
                created_by      = request.user if request.user.is_authenticated else None,
            )

            # Create batch record
            batch = Batch.objects.create(
                batch_number        = f'BAT-{wo.work_order_number}',
                work_order          = wo,
                item                = wo.finished_product,
                quantity_produced   = actual_qty,
                production_date     = timezone.now().date(),
            )

            # Update work order
            wo.actual_quantity  = actual_qty
            wo.actual_end_date  = timezone.now().date()
            wo.status           = 'completed'
            wo.save()

        log_action(request, 'Work Order', 'Completed', wo.work_order_number,
                   {'product': wo.finished_product.item_name, 'actual_qty': str(actual_qty), 'batch': batch.batch_number})
        return JsonResponse({
            'message': 'Work order completed. Stock updated.',
            'batch_number': batch.batch_number,
        })
    except ValueError as e:
        return JsonResponse({'message': str(e)}, status=400)
    except Exception as e:
        return JsonResponse({'message': str(e)}, status=400)


# ============================================================
# BATCH LIST
# ============================================================

def batch_list(request):
    batches = Batch.objects.select_related('item', 'work_order').all()
    result = [{
        'id':               b.id,
        'batch_number':     b.batch_number,
        'work_order':       b.work_order.work_order_number,
        'item_code':        b.item.item_code,
        'item_name':        b.item.item_name,
        'quantity_produced': str(b.quantity_produced),
        'production_date':  str(b.production_date),
        'expiry_date':      str(b.expiry_date) if b.expiry_date else '',
    } for b in batches]
    return JsonResponse({'batches': result})


# ============================================================
# QUALITY CHECK
# ============================================================

# ============================================================
# MACHINES
# ============================================================

def machine_to_dict(m):
    return {
        'id':            m.id,
        'machine_code':  m.machine_code,
        'machine_name':  m.machine_name,
        'machine_type':  m.machine_type,
        'capacity':      str(m.capacity) if m.capacity else '',
        'capacity_unit': m.capacity_unit,
        'location':      m.location,
        'status':        m.status,
        'purchase_date': str(m.purchase_date) if m.purchase_date else '',
        'notes':         m.notes,
        'created_at':    m.created_at.strftime('%Y-%m-%d'),
    }

@csrf_exempt
def machine_list_and_create(request):
    if request.method == 'GET':
        machines = Machine.objects.all()
        type_filter = request.GET.get('type', '')
        if type_filter:
            machines = machines.filter(machine_type=type_filter)
        return JsonResponse({'machines': [machine_to_dict(m) for m in machines], 'total': machines.count()})

    if request.method == 'POST':
        data = json.loads(request.body)
        try:
            machine = Machine.objects.create(
                machine_code  = data['machine_code'],
                machine_name  = data['machine_name'],
                machine_type  = data['machine_type'],
                capacity      = data.get('capacity') or None,
                capacity_unit = data.get('capacity_unit', ''),
                location      = data.get('location', ''),
                status        = data.get('status', 'active'),
                purchase_date = data.get('purchase_date') or None,
                notes         = data.get('notes', ''),
            )
            log_action(request, 'Machine', 'Created', machine.machine_code,
                       {'name': machine.machine_name, 'type': machine.machine_type})
            return JsonResponse({'message': 'Machine created.', 'machine': machine_to_dict(machine)}, status=201)
        except Exception as e:
            return JsonResponse({'message': str(e)}, status=400)


@csrf_exempt
def machine_detail(request, machine_id):
    try:
        machine = Machine.objects.get(id=machine_id)
    except Machine.DoesNotExist:
        return JsonResponse({'message': 'Machine not found.'}, status=404)

    if request.method == 'GET':
        return JsonResponse({'machine': machine_to_dict(machine)})

    if request.method == 'PUT':
        data = json.loads(request.body)
        _fields = ['machine_name', 'machine_type', 'capacity_unit', 'location', 'status', 'notes']
        before = {f: str(getattr(machine, f, '') or '') for f in _fields}
        for field in _fields:
            if field in data:
                setattr(machine, field, data[field])
        if 'capacity' in data:
            machine.capacity = data['capacity'] or None
        if 'purchase_date' in data:
            machine.purchase_date = data['purchase_date'] or None
        machine.save()
        after = {f: str(getattr(machine, f, '') or '') for f in _fields}
        log_action(request, 'Machine', 'Updated', machine.machine_code, {'changes': field_diff(before, after)})
        return JsonResponse({'message': 'Machine updated.', 'machine': machine_to_dict(machine)})

    if request.method == 'DELETE':
        log_action(request, 'Machine', 'Deleted', machine.machine_code, {'name': machine.machine_name})
        machine.delete()
        return JsonResponse({'message': 'Machine deleted.'})


# ============================================================
# QUALITY CHECK
# ============================================================

@csrf_exempt
def quality_check_list_and_create(request):
    if request.method == 'GET':
        checks = QualityCheck.objects.select_related('work_order').all()
        return JsonResponse({'quality_checks': [{
            'id':           c.id,
            'work_order':   c.work_order.work_order_number,
            'check_date':   str(c.check_date),
            'checked_by':   c.checked_by,
            'result':       c.result,
            'remarks':      c.remarks,
            'yarn_count_actual': c.yarn_count_actual,
            'strength_value':   str(c.strength_value) if c.strength_value else '',
        } for c in checks]})

    if request.method == 'POST':
        data = json.loads(request.body)
        try:
            qc = QualityCheck.objects.create(
                work_order_id       = data['work_order_id'],
                batch_id            = data.get('batch_id') or None,
                check_date          = data['check_date'],
                checked_by          = data['checked_by'],
                result              = data.get('result', 'pending'),
                remarks             = data.get('remarks', ''),
                yarn_count_actual   = data.get('yarn_count_actual', ''),
                strength_value      = data.get('strength_value') or None,
                elongation_percent  = data.get('elongation_percent') or None,
                unevenness_percent  = data.get('unevenness_percent') or None,
            )
            return JsonResponse({'message': 'Quality check saved.'}, status=201)
        except Exception as e:
            return JsonResponse({'message': str(e)}, status=400)
