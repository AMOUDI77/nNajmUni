from db.engine import DatabaseConnection


def test_postgres_select_does_not_probe_lastrowid_before_fetch():
    class Result:
        probed_lastrowid = False

        @property
        def lastrowid(self):
            self.probed_lastrowid = True
            raise RuntimeError('psycopg SELECT cursor was closed')

        def fetchall(self):
            assert not self.probed_lastrowid
            return []

    class Connection:
        def exec_driver_sql(self, sql, params):
            assert sql == 'SELECT id FROM universities'
            assert params == ()
            return result

        def in_transaction(self):
            return False

        def close(self):
            pass

    class Engine:
        dialect = type('Dialect', (), {'name': 'postgresql'})()

        def connect(self):
            return Connection()

    result = Result()
    db = DatabaseConnection(Engine())
    try:
        assert db.execute('SELECT id FROM universities').fetchall() == []
        assert not result.probed_lastrowid
    finally:
        db.close()
