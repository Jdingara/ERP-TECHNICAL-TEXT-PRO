# ============================================================
# Management Command: seed_maintenance
# Run: python manage.py seed_maintenance
# Seeds realistic maintenance tasks, logs, and escalation
# configs for all machines. SAFE: uses get_or_create.
# ============================================================

from django.core.management.base import BaseCommand
from django.db import transaction
from datetime import date, timedelta


class Command(BaseCommand):
    help = 'Seed maintenance schedule demo data for all machines.'

    def handle(self, *args, **options):
        self.today = date.today()
        self.stdout.write('\n=== Seeding Maintenance Data ===\n')

        with transaction.atomic():
            company  = self._get_company()
            machines = self._get_machines()
            if not machines:
                self.stdout.write(self.style.ERROR('No machines found. Run seed_tt_data first.'))
                return
            self._seed_tasks(company, machines)
            self._seed_escalation(company, machines)

        self.stdout.write(self.style.SUCCESS('\n=== Maintenance data seeded! ===\n'))

    def _get_company(self):
        from master_data.models import Company
        co = Company.objects.filter(is_default=True).first() or Company.objects.first()
        self.stdout.write(f'  Company: {co.name if co else "None"}')
        return co

    def _get_machines(self):
        from masters.models import Machine
        machines = list(Machine.objects.filter(is_active=True))
        self.stdout.write(f'  Found {len(machines)} machines')
        return machines

    def _seed_tasks(self, company, machines):
        from maintenance.models import MaintenanceTask, MaintenanceLog

        # Task definitions: (task_name, frequency, task_type, measurement_labels, instructions)
        COMMON_TASKS = [
            (
                'Air Filter Checking and Draining of Water',
                'beam_change', 'checklist', [],
                'Check air filter condition. Drain collected water. Replace if blocked.'
            ),
            (
                'Oil Level Check / Top Up',
                'beam_change', 'checklist', [],
                'Check LHS & RHS Gear Box, Let-Off & Take-Up Unit, Leno Gear Unit, Cam Box oil levels. Top up with SAE 40.'
            ),
            (
                'Fly Dust Accumulation Check — Apply Grease',
                'beam_change', 'checklist', [],
                'Check for fly dust accumulation on gears. Apply small amount of grease.'
            ),
            (
                'Reed Cleaning',
                'monthly', 'checklist', [],
                'Clean reed thoroughly. Remove lint and dust buildup. Monthly once per machine.'
            ),
            (
                'Feeler Cleaning and Pulse Check',
                'daily', 'checklist', [],
                'Clean feeler sensor. Verify pulse signal is correct.'
            ),
            (
                'Automatic Greasing System Check',
                'daily', 'checklist', [],
                'Verify automatic greasing pump is operational. Check grease level in reservoir.'
            ),
            (
                'LHS Cutter Oiling',
                'daily', 'checklist', [],
                'Apply oil to LHS cutter mechanism as per oiling chart.'
            ),
            (
                'RHS Cutter Oiling',
                'daily', 'checklist', [],
                'Apply oil to RHS cutter mechanism as per oiling chart.'
            ),
        ]

        WEAVING_TASKS = [
            (
                'Main Belt V-Belt Tension Check',
                '3_monthly', 'measurement',
                [{'label': 'Before (Hz)', 'key': 'before_hz'}, {'label': 'After (Hz)', 'key': 'after_hz'}, {'label': 'Remark', 'key': 'remark'}],
                'Standard 49 to 71 Hz. Measure before and after tensioning.'
            ),
            (
                'Heald Frame Torque Check (4.0 NM)',
                'monthly', 'measurement',
                [{'label': 'LH Top (NM)', 'key': 'lh_top'}, {'label': 'LH Bot (NM)', 'key': 'lh_bot'},
                 {'label': 'RH Top (NM)', 'key': 'rh_top'}, {'label': 'RH Bot (NM)', 'key': 'rh_bot'}],
                'Light weight heald frame: 4.0NM torque. Monthly: loosen 90° then tighten. Do NOT use T-shape or L-shape tools.'
            ),
            (
                'Heald Frame Play Check',
                'monthly', 'measurement',
                [{'label': 'LHS Play (mm)', 'key': 'lhs_play'}, {'label': 'RHS Play (mm)', 'key': 'rhs_play'}, {'label': 'Remark', 'key': 'remark'}],
                'Check heald frame play on both sides. Record LHS and RHS values.'
            ),
            (
                'ESHED Con Rod GC 350 Greasing',
                '15_days', 'measurement',
                [{'label': 'GC Greasing Date', 'key': 'grease_date'}, {'label': 'Con-Rod Tube Condition', 'key': 'tube_condition'}],
                'Apply GC 350 grease to ESHED con rod. Check con-rod grease tube condition.'
            ),
            (
                'Centralized Lubrication System Complete Service',
                '6_monthly', 'checklist', [],
                'Full service of centralized lubrication system. Check all lines and nozzles.'
            ),
            (
                'Main Brake Clearance Check (0.5 ± 0.1mm)',
                '6_monthly', 'measurement',
                [{'label': 'Clearance (mm)', 'key': 'clearance'}, {'label': 'Remark', 'key': 'remark'}],
                'Check main brake clearance. Standard: 0.5 ± 0.1mm. Also check clutch housing tube oil leakage.'
            ),
            (
                'Main Motor Bearing Noise Check',
                '6_monthly', 'checklist', [],
                'Check main motor bearing for abnormal noise or vibration. Replace if worn.'
            ),
            (
                'Complete Oil Change — All Gearboxes including Staubli Cam Box',
                'yearly', 'checklist', [],
                'Drain and replace oil in ALL gearboxes including Staubli Cam Box. Use manufacturer specified grade.'
            ),
            (
                'Easing Rod Bearing Condition Check',
                'yearly', 'checklist', [],
                'Inspect easing rod bearing for wear or damage. Replace if required.'
            ),
            (
                'Easing Lever Pin, Bush, Back Roller Bearing Condition Check',
                'yearly', 'checklist', [],
                'Inspect easing lever pin, bush and back roller bearing. Replace worn parts.'
            ),
            (
                'Condition of Shedding Play',
                'yearly', 'checklist', [],
                'Measure and record shedding play. Compare with standard specification.'
            ),
            (
                'Complete Leno Device Service',
                'yearly', 'checklist', [],
                'Full service of leno device. Clean, inspect, and lubricate all components.'
            ),
            (
                'Air Filter Cleaning',
                '3_monthly', 'checklist', [],
                'Remove and clean air filter element. Replace if damaged or heavily blocked.'
            ),
            (
                'Electrical Control Box / Function Panel Cleaning',
                '3_monthly', 'checklist', [],
                'Clean interior of electrical control box. Remove dust from PCBs and connectors.'
            ),
            (
                'Belt Tension Check',
                '3_monthly', 'checklist', [],
                'Check tension of all belts. Adjust as per specification.'
            ),
            (
                'Check for Freeness (Moving Parts)',
                '3_monthly', 'checklist', [],
                'Manually rotate/move all moving parts. Verify no stiffness or binding.'
            ),
            (
                'Take Up Drive Cleaning and Chain Lubrication',
                '3_monthly', 'checklist', [],
                'Clean take-up drive assembly. Lubricate drive chain with approved chain oil.'
            ),
            (
                'All Air Tube Leakage Check',
                '6_monthly', 'checklist', [],
                'Pressure test all air tubes and connections. Mark and repair any leaks found.'
            ),
            (
                'Leno Bobbin Assembly Condition Check',
                '6_monthly', 'checklist', [],
                'Inspect leno bobbin assembly. Check for wear on bobbin holders and guides.'
            ),
        ]

        STENTER_TASKS = [
            (
                'Temperature Zone Calibration Check',
                'monthly', 'measurement',
                [{'label': 'Zone 1 Set (°C)', 'key': 'z1_set'}, {'label': 'Zone 1 Actual (°C)', 'key': 'z1_actual'},
                 {'label': 'Zone 2 Set (°C)', 'key': 'z2_set'}, {'label': 'Zone 2 Actual (°C)', 'key': 'z2_actual'},
                 {'label': 'Zone 3 Set (°C)', 'key': 'z3_set'}, {'label': 'Zone 3 Actual (°C)', 'key': 'z3_actual'},
                 {'label': 'Zone 4 Set (°C)', 'key': 'z4_set'}, {'label': 'Zone 4 Actual (°C)', 'key': 'z4_actual'}],
                'Verify actual temperature matches set temperature in all 4 zones. Calibrate sensors if deviation > 5°C.'
            ),
            (
                'Chain and Pin Lubrication',
                'weekly', 'checklist', [],
                'Lubricate stenter chain and pin assemblies. Use heat-resistant lubricant.'
            ),
            (
                'Exhaust Fan and Duct Cleaning',
                'monthly', 'checklist', [],
                'Clean exhaust fans and ducts. Remove lint and chemical deposits.'
            ),
            (
                'Width Setting Mechanism Check',
                '3_monthly', 'measurement',
                [{'label': 'LHS Width (cm)', 'key': 'lhs_width'}, {'label': 'RHS Width (cm)', 'key': 'rhs_width'}],
                'Verify width setting on both sides matches actual fabric width. Adjust if needed.'
            ),
        ]

        LAMINATION_TASKS = [
            (
                'Nip Roll Pressure Check',
                'monthly', 'measurement',
                [{'label': 'Pressure (bar)', 'key': 'pressure'}, {'label': 'Remark', 'key': 'remark'}],
                'Check nip roll pressure. Standard range as per product spec.'
            ),
            (
                'Adhesive Pump and Line Cleaning',
                'weekly', 'checklist', [],
                'Flush adhesive pump and lines. Prevent adhesive buildup and blockages.'
            ),
            (
                'Curing Oven Temperature Calibration',
                'monthly', 'measurement',
                [{'label': 'Set Temp (°C)', 'key': 'set_temp'}, {'label': 'Actual Temp (°C)', 'key': 'actual_temp'}],
                'Verify oven temperature accuracy. Calibrate if deviation > 5°C.'
            ),
        ]

        EMBOSSING_TASKS = [
            (
                'Embossing Roll Surface Inspection',
                'monthly', 'checklist', [],
                'Inspect embossing roll surface for scratches, dents or pattern damage. Clean thoroughly.'
            ),
            (
                'Hydraulic Pressure System Check',
                'monthly', 'measurement',
                [{'label': 'System Pressure (bar)', 'key': 'pressure'}, {'label': 'Remark', 'key': 'remark'}],
                'Check hydraulic pressure. Inspect for leaks in hoses and connections.'
            ),
        ]

        WARPING_TASKS = [
            (
                'Beam Flange and Barrel Inspection',
                'beam_change', 'checklist', [],
                'Inspect beam flanges for cracks or deformation. Check barrel surface condition.'
            ),
            (
                'Tensioner and Comb Cleaning',
                'weekly', 'checklist', [],
                'Clean yarn tensioners and reed comb. Remove lint and wax deposits.'
            ),
            (
                'Warp Tension Calibration',
                'monthly', 'measurement',
                [{'label': 'Tension Setting (g)', 'key': 'tension'}, {'label': 'Actual Tension (g)', 'key': 'actual'}],
                'Verify tension settings match actual tension readings across width.'
            ),
        ]

        count = 0
        for machine in machines:
            mt = machine.machine_type
            task_list = list(COMMON_TASKS)

            if mt == 'weaving':
                task_list += WEAVING_TASKS
            elif mt == 'stenter':
                task_list += STENTER_TASKS
            elif mt == 'lamination':
                task_list += LAMINATION_TASKS
            elif mt == 'embossing':
                task_list += EMBOSSING_TASKS
            elif mt == 'warping':
                task_list += WARPING_TASKS

            for task_name, freq, ttype, labels, instructions in task_list:
                task, created = MaintenanceTask.objects.get_or_create(
                    company=company,
                    machine=machine,
                    task_name=task_name,
                    defaults=dict(
                        frequency=freq,
                        task_type=ttype,
                        measurement_labels=labels,
                        instructions=instructions,
                        is_active=True,
                    )
                )
                if created:
                    count += 1
                    # Create initial log
                    due = self._due_date(freq)
                    MaintenanceLog.objects.get_or_create(
                        company=company, task=task, due_date=due,
                        defaults=dict(status='pending')
                    )
                    # Add a few historical completed logs for some tasks
                    if freq in ('daily', 'weekly', 'monthly') and created:
                        prev_due = self._due_date(freq, past=True)
                        log, lc = MaintenanceLog.objects.get_or_create(
                            company=company, task=task, due_date=prev_due,
                            defaults=dict(
                                status='done',
                                completed_date=prev_due,
                                completed_by='Ravi Kumar',
                                remarks='Completed as per schedule.',
                            )
                        )

        self.stdout.write(f'  Created {count} maintenance tasks with initial logs')

    def _due_date(self, frequency, past=False):
        today = self.today
        delta_map = {
            'daily':      timedelta(days=1),
            'weekly':     timedelta(weeks=1),
            '15_days':    timedelta(days=15),
            'monthly':    timedelta(days=30),
            '3_monthly':  timedelta(days=90),
            '6_monthly':  timedelta(days=180),
            'yearly':     timedelta(days=365),
            'beam_change': timedelta(days=1),
        }
        delta = delta_map.get(frequency, timedelta(days=30))
        if past:
            return today - delta
        return today + delta

    def _seed_escalation(self, company, machines):
        from maintenance.models import MaintenanceEscalation

        configs = [
            {
                'level1_name': 'Ravi Kumar',    'level1_email': 'ravi.kumar@meitexz.com',    'level1_phone': '+91 9876543210', 'level1_grace_hours': 24,
                'level2_name': 'Suresh Babu',   'level2_email': 'suresh.babu@meitexz.com',   'level2_phone': '+91 9876543211', 'level2_grace_hours': 48,
                'level3_name': 'Rajesh Menon',  'level3_email': 'rajesh.menon@meitexz.com',  'level3_phone': '+91 9876543212',
            },
            {
                'level1_name': 'Arun Selvam',   'level1_email': 'arun.selvam@meitexz.com',   'level1_phone': '+91 9876543213', 'level1_grace_hours': 24,
                'level2_name': 'Suresh Babu',   'level2_email': 'suresh.babu@meitexz.com',   'level2_phone': '+91 9876543211', 'level2_grace_hours': 48,
                'level3_name': 'Rajesh Menon',  'level3_email': 'rajesh.menon@meitexz.com',  'level3_phone': '+91 9876543212',
            },
        ]
        count = 0
        for i, machine in enumerate(machines):
            cfg = configs[i % len(configs)]
            _, created = MaintenanceEscalation.objects.get_or_create(
                company=company, machine=machine,
                defaults=dict(
                    reminder_days=1,
                    enable_email=True,
                    enable_whatsapp=True,
                    **cfg,
                )
            )
            if created:
                count += 1

        self.stdout.write(f'  Created {count} escalation configs')
