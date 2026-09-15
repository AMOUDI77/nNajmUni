def test_catalog_crud_and_program_relationship(client, admin_headers):
    uni = client.post('/api/admin/universities', json={
        'abbr': 'TEST', 'name': 'Test University', 'type': 'private', 'location': 'KL'},
        headers=admin_headers)
    assert uni.status_code == 201
    uid = uni.json['university']['id']
    program = client.post(f'/api/admin/universities/{uid}/programs', json={
        'name': 'Computer Science', 'level': 'bachelor', 'duration_years': 3,
        'tuition_per_year': 20000, 'field': 'Technology'}, headers=admin_headers)
    assert program.status_code == 201
    pid = program.json['program']['id']
    assert client.get(f'/api/universities/{uid}').json['programs'][0]['id'] == pid
    assert client.get('/api/programs').json['data'][0]['university_name'] == 'Test University'
    assert client.patch(f'/api/admin/programs/{pid}', json={'tuition_per_year': 23000},
                        headers=admin_headers).json['program']['tuition_per_year'] == 23000
    assert client.patch(f'/api/admin/universities/{uid}', json={'name': 'Updated University'},
                        headers=admin_headers).json['university']['name'] == 'Updated University'
    assert client.delete(f'/api/admin/universities/{uid}', headers=admin_headers).status_code == 200
    assert client.get('/api/programs').json['data'] == []


def test_institute_crud(client, admin_headers):
    response = client.post('/api/admin/institutes', json={
        'abbr': 'ENG', 'name': 'English Institute', 'type': 'language', 'location': 'KL'},
        headers=admin_headers)
    assert response.status_code == 201
    iid = response.json['institute']['id']
    assert client.get('/api/institutes').json['total'] == 1
    assert client.patch(f'/api/admin/institutes/{iid}', json={'name': 'Updated Institute'},
                        headers=admin_headers).json['institute']['name'] == 'Updated Institute'
    assert client.delete(f'/api/admin/institutes/{iid}', headers=admin_headers).status_code == 200


def test_lead_create_update_and_admin_queue(client, admin_headers):
    first = client.post('/api/leads', json={'phone': '+60123456789', 'name': 'First', 'source': 'site'})
    assert first.status_code == 200 and first.json['existing'] is False
    second = client.post('/api/leads', json={'phone': '+60 123456789', 'name': 'Second', 'source': 'campaign'})
    assert second.json['existing'] is True
    lead = client.get('/api/admin/leads', headers=admin_headers).json['data'][0]
    assert lead['name'] == 'Second' and lead['source'] == 'campaign'
    assert client.patch(f"/api/admin/leads/{lead['id']}", json={'status': 'handled'},
                        headers=admin_headers).status_code == 200
    assert client.get('/api/admin/stats', headers=admin_headers).json['pending'] == 0


def test_reservation_create_update(client, admin_headers):
    response = client.post('/api/reservations', json={
        'name': 'Student', 'email': 'student@example.com', 'phone': '+60123456789'})
    assert response.status_code == 200
    row = client.get('/api/admin/reservations', headers=admin_headers).json['data'][0]
    assert row['status'] == 'new'
    assert client.patch(f"/api/admin/reservations/{row['id']}",
                        json={'status': 'handled'}, headers=admin_headers).status_code == 200
    assert client.get('/api/admin/reservations', headers=admin_headers).json['data'][0]['status'] == 'handled'


def test_student_crud_and_access(client, student_headers, admin_headers):
    assert client.get('/api/students').status_code == 401
    assert client.get('/api/admin/stats', headers=student_headers).status_code == 401
    created = client.post('/api/students', json={'full_name': 'Test Student'}, headers=student_headers)
    assert created.status_code == 201
    sid = created.json['student']['id']
    assert client.get('/api/students', headers=admin_headers).json['total'] == 1
    updated = client.patch(f'/api/students/{sid}', json={'status': 'visa', 'notes': 'Ready'},
                           headers=student_headers)
    assert updated.json['student']['status'] == 'visa'
    assert client.get('/api/students?status=visa', headers=student_headers).json['data'][0]['notes'] == 'Ready'
    assert client.delete(f'/api/students/{sid}', headers=student_headers).status_code == 200


def test_uncommitted_db_work_rolls_back(client):
    from app import get_db
    with client.application.app_context():
        db = get_db()
        db.execute("INSERT INTO students (full_name) VALUES (?)", ['Uncommitted'])
    assert client.get('/api/students', headers={'X-Admin-Key': 'test-admin-key'}).json['total'] == 0
