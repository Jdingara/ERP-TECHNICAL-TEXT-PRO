// ============================================================
// FILE: src/utils/messageTemplates.js
// PURPOSE: Fetch saved message templates and fill placeholders.
//          Used by ShareWidget on Quotation, Sales Order, Invoice.
// ============================================================

const API = '/api/master-data/settings/message-templates/';

let _cache = null;  // simple in-memory cache for the session

export async function fetchTemplates() {
    if (_cache) return _cache;
    try {
        const res  = await fetch(API, { credentials: 'include' });
        const data = await res.json();
        const map  = {};
        (data.templates || []).forEach(t => { map[t.document_type] = t; });
        _cache = map;
        return map;
    } catch {
        return {};
    }
}

/**
 * Fill {{placeholder}} tags in a template string.
 * @param {string} text  - template string with {{tags}}
 * @param {object} vars  - { customer_name, document_number, amount, date }
 */
export function fillTemplate(text, vars = {}) {
    return (text || '')
        .replace(/\{\{customer_name\}\}/g,   vars.customer_name    || '')
        .replace(/\{\{document_number\}\}/g, vars.document_number  || '')
        .replace(/\{\{amount\}\}/g,          vars.amount           || '')
        .replace(/\{\{date\}\}/g,            vars.date             || '');
}
