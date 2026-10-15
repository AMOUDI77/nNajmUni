"""Public catalog projection: research provenance stays in server-side records."""
def public_catalog_record(record):
    result = {key: value for key, value in record.items()
              if key not in {'source_url', 'source_name', 'source_checked_at', 'sourceUrl', 'sourceName'}}
    if 'website' in result:
        result['website'] = ''
    return result
