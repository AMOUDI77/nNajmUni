def test_persistent_disk_marker_blocks_writes_but_allows_reads(client, student_headers,
                                                               tmp_path, monkeypatch):
    import app as najm_app

    marker = tmp_path / '.najmuni-migration-write-freeze'
    monkeypatch.setattr(najm_app, 'WRITE_FREEZE_MARKER', str(marker))
    marker.touch()

    assert client.get('/api/universities').status_code == 200
    for method, path, payload, headers in (
        ('post', '/api/leads', {'phone': '+60123456789'}, {}),
        ('post', '/api/reservations', {'name': 'Test', 'email': 'test@example.com',
                                     'phone': '+60123456789'}, {}),
        ('post', '/api/students', {'full_name': 'Test'}, student_headers),
    ):
        response = getattr(client, method)(path, json=payload, headers=headers)
        assert response.status_code == 503
        assert response.headers['Retry-After'] == '300'

    marker.unlink()
    assert client.post('/api/students', json={'full_name': 'Test'},
                       headers=student_headers).status_code == 201
