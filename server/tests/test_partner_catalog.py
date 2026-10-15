import json
from pathlib import Path
from sqlalchemy import create_engine
from db.engine import DatabaseConnection
from db.schema import metadata
from partner_catalog import CATALOG, import_catalog

def test_snapshot_scope_integrity_and_frontend_parity():
    expected = {'APU','CITY','CYBERJAYA','INTI','KLUST','LINCOLN','MAHSA','MSU','MMU','NILAI','SEGI','SUNWAY',"TAYLOR'S",'UCSI','UNIKL','UNITEN','GEOMATIKA','UTEM','UTMSPACE','UTM','UTP','XIAMEN'}
    assert {u['abbr'] for u in CATALOG['universities']} == expected
    ids = {u['id'] for u in CATALOG['universities']}
    assert len({p['id'] for p in CATALOG['programs']}) == len(CATALOG['programs'])
    for p in CATALOG['programs']:
        assert p['university_id'] in ids
        assert p['source_url'].startswith('https://en.your-uni.com/university/')
        assert p['verification_status'] == 'reference_only'
        assert p['tuition_per_year'] is None or p['tuition_per_year'] > 0
    client = Path(__file__).resolve().parents[2] / 'client/src/partner_catalog.json'
    assert json.loads(client.read_text(encoding='utf-8')) == CATALOG

def test_import_preserves_edits_and_nonpartners(tmp_path):
    engine=create_engine('sqlite:///' + str(tmp_path/'catalog.db').replace('\\','/'))
    metadata.create_all(engine)
    db=DatabaseConnection(engine)
    try:
        db.execute("INSERT INTO universities (id,abbr,name) VALUES (1,'UM','Existing university')")
        assert import_catalog(db) == len(CATALOG['programs'])
        pid=CATALOG['programs'][0]['id']
        db.execute('UPDATE programs SET tuition_per_year=? WHERE id=?',[12345,pid])
        assert import_catalog(db) == 0
        assert db.execute('SELECT tuition_per_year FROM programs WHERE id=?',[pid]).fetchone()[0] == 12345
        assert db.execute('SELECT name FROM universities WHERE id=1').fetchone()[0] == 'Existing university'
        db.commit()
    finally:
        db.close();engine.dispose()

def test_nonpartner_public_hidden_admin_record_preserved(client, admin_headers):
    response=client.post('/api/admin/universities',headers=admin_headers,json={'abbr':'OUTSIDE','name':'Stored university','type':'private','location':'KL'})
    uid=response.json['university']['id']
    assert client.get('/api/universities').json['data'] == []
    assert client.get(f'/api/universities/{uid}').status_code == 404
    assert any(u['id'] == uid for u in client.get('/api/admin/universities',headers=admin_headers).json['data'])
