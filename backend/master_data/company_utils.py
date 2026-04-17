# ============================================================
# FILE: master_data/company_utils.py
# PURPOSE: Helper to resolve the active company for any request.
#          All views call get_active_company(request) to filter
#          their querysets — ensuring full data isolation between
#          companies in the same database.
# ============================================================

from .models import Company


def get_active_company(request):
    """
    Returns the Company the logged-in user is currently working in.

    Resolution order:
    1. Session: request.session['company_id'] — set when user switches company
    2. Default company: Company with is_default=True
    3. First company: fallback if no default is set
    4. None: if no companies exist (no filtering applied)
    """
    # 1 — Session (explicit switch by user)
    company_id = request.session.get('company_id')
    if company_id:
        try:
            return Company.objects.get(id=company_id, is_active=True)
        except Company.DoesNotExist:
            pass  # stale session value — fall through to default

    # 2 — Default company
    company = Company.objects.filter(is_default=True, is_active=True).first()
    if company:
        return company

    # 3 — Any active company
    return Company.objects.filter(is_active=True).first()
