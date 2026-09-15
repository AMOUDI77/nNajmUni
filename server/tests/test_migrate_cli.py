import sys

import pytest

from db import migrate_data


def test_engine_setup_error_does_not_print_connection_details(monkeypatch, capsys):
    monkeypatch.setenv('DATABASE_URL', 'postgresql+psycopg://placeholder:placeholder@localhost/test')
    monkeypatch.setattr(sys, 'argv', ['migrate_data', '--sqlite', 'missing-snapshot.db'])
    monkeypatch.setattr(migrate_data, 'create_engine',
                        lambda *args, **kwargs: (_ for _ in ()).throw(
                            ValueError('connection failed at postgresql://secret:secret@private-host/db')))
    with pytest.raises(SystemExit) as result:
        migrate_data.main()
    assert result.value.code == 1
    output = capsys.readouterr().out
    assert 'FAIL: migration aborted' in output
    assert 'secret' not in output and 'private-host' not in output
