"""Build the public catalog from reviewed factual reference rows, never marketing copy.

Input is an explicit research snapshot. This does not fetch sites or alter a database.
"""
import ast
import hashlib
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
tree = ast.parse((ROOT / 'server/app.py').read_text(encoding='utf-8'))
old = next(ast.literal_eval(n.value) for n in tree.body if isinstance(n, ast.Assign)
           and any(isinstance(t, ast.Name) and t.id == 'UNIVERSITIES' for t in n.targets))
keys = 'abbr name type location qs_ranking color description website domain tuition_min tuition_max established students_count'.split()
existing = {row[0]: dict(zip(keys, row)) for row in old}
new = {
    'MSU': ('Management and Science University', 'Shah Alam, Selangor', 'msu.edu.my', 'private'),
    'UCSI': ('UCSI University', 'Kuala Lumpur', 'ucsiuniversity.edu.my', 'private'),
    'UNIKL': ('Universiti Kuala Lumpur', 'Multiple campuses', 'unikl.edu.my', 'private'),
    'UTEM': ('Universiti Teknikal Malaysia Melaka', 'Melaka', 'utem.edu.my', 'public'),
    'UTMSPACE': ('UTM SPACE', 'Johor Bahru / Kuala Lumpur', 'space.utm.my', 'public'),
    'UTP': ('Universiti Teknologi PETRONAS', 'Seri Iskandar, Perak', 'utp.edu.my', 'private'),
    'XIAMEN': ('Xiamen University Malaysia', 'Sepang, Selangor', 'xmu.edu.my', 'foreign_branch'),
}

def level(name):
    n = name.lower()
    if re.search(r'\b(ph\.?d|doctor of philoshopy|doctor of philosophy|doctor of business|doctor of education|doctorate|doctor of engineering|doctor of technology|doctor of professional)\b', n): return 'phd'
    if re.search(r'\b(masters?|mba|msc|m\.sc|mphil)\b', n): return 'master'
    if 'postgraduate diploma' in n: return 'postgraduate_diploma'
    if 'diploma' in n: return 'diploma'
    if 'foundation' in n or 'a-level' in n or 'a level' in n or 'matriculation' in n or 'preparatory programme' in n: return 'foundation'
    if 'certificate' in n: return 'certificate'
    if re.search(r'\b(bachelor|ba|bsc|beng|b\.sc|b\.eng|mbbs|doctor of medicine|doctor of dental|degree transfer)\b', n): return 'bachelor'
    return 'other'

source = json.loads((ROOT / 'docs/catalog-reference-facts-2026-10-15.json').read_text(encoding='utf-8'))
universities, programs = [], []
for entry in source:
    abbr = entry['abbr']
    if abbr in new:
        name, location, domain, kind = new[abbr]
        u = dict(abbr=abbr, name=name, location=location, domain=domain,
                 website='https://' + domain, type=kind, color='#254EA8',
                 description='', established=0, students_count=0, qs_ranking=None)
    else:
        u = existing['IUKL' if abbr == 'KLUST' else abbr].copy()
    u.update(id=entry['id'], abbr=abbr, source_url=entry['source_url'], catalog_version='2026-10-15',
             coverage='reference_catalog', qs_ranking=None, students_count=0,
             description='', established=0)
    if abbr == 'UNITEN': u['type'] = 'private'
    if abbr == 'CYBERJAYA':
        u.update(website='https://cyberjaya.edu.my', domain='cyberjaya.edu.my')
    if abbr == 'KLUST':
        u.update(name='Kuala Lumpur University of Science and Technology', domain='klust.edu.my', website='https://klust.edu.my', description='KLUST — formerly IUKL.')
    if abbr == 'UTMSPACE':
        u['description'] = 'مسار برامج تابع لجامعة UTM؛ تختلف جهة التقديم ونوع الدراسة حسب البرنامج.'
    for p in entry['programs']:
        p = p.copy()
        # IDs remain stable when sources are reordered or new courses are added.
        identity = f"{abbr}|{p['name'].casefold()}"
        pid = 100000 + int(hashlib.sha256(identity.encode()).hexdigest()[:7], 16)
        p.update(id=pid, university_id=u['id'], university_name=u['name'], university_abbr=abbr,
                 university_location=u['location'], level=level(p['name']), description='', intake='',
                 source_url=entry['source_url'], source_name='YourUni', source_checked_at='2026-10-15',
                 verification_status='reference_only')
        # Ambiguous decimal notation in secondary sources is not presented as a precise duration.
        if not p['duration_years'] or p['duration_years'] <= 0 or p['duration_years'] % 1 not in (0, .5):
            p['duration_years'] = None
        if not p['tuition_per_year'] or p['tuition_per_year'] <= 0: p['tuition_per_year'] = None
        programs.append(p)
    fees = [p['tuition_per_year'] for p in programs if p['university_id'] == u['id'] and p['tuition_per_year']]
    u.update(tuition_min=min(fees, default=0), tuition_max=max(fees, default=0))
    universities.append(u)

assert len(universities) == 22
assert len({p['id'] for p in programs}) == len(programs), 'ID collision'
catalog = dict(version='2026-10-15', universities=universities, programs=programs)
encoded = json.dumps(catalog, ensure_ascii=False, indent=2) + '\n'
for target in ('server/partner_catalog.json', 'client/src/partner_catalog.json'):
    (ROOT / target).write_text(encoded, encoding='utf-8')
print(f'Generated {len(universities)} partner institutions and {len(programs)} reference programs')
print('Unclassified levels:', [p['name'] for p in programs if p['level'] == 'other'])
