"""Direct Neon TCP round-trip test — measures raw DB latency per query."""
import psycopg2, time

db_url = ''
for line in open('.env'):
    s = line.strip()
    if s.startswith('DATABASE_URL'):
        db_url = s.split('=',1)[1].strip().strip("'").strip('"')
        break

if not db_url:
    print('No DATABASE_URL in .env')
    exit(1)

host = db_url.split('@')[1].split('/')[0] if '@' in db_url else '?'
print(f'\nNeon host: {host}')
print('Measuring TCP Postgres latency (psycopg2) — 8 queries:')

# Measure new TCP connection each time (worst case)
print('\n  [new connection per query]:')
for i in range(8):
    t0 = time.perf_counter()
    conn = psycopg2.connect(db_url, connect_timeout=10)
    cur = conn.cursor()
    cur.execute('SELECT 1')
    cur.fetchone()
    conn.close()
    ms = int((time.perf_counter()-t0)*1000)
    print(f'    Run {i+1}: {ms}ms')

# Measure reused connection (best case)
print('\n  [single connection, repeated queries]:')
conn = psycopg2.connect(db_url, connect_timeout=10)
cur = conn.cursor()
for i in range(8):
    t0 = time.perf_counter()
    cur.execute('SELECT 1')
    cur.fetchone()
    ms = int((time.perf_counter()-t0)*1000)
    print(f'    Run {i+1}: {ms}ms')
conn.close()
print()
print('Min latency = network RTT to Neon (us-east-1 from your location).')
print('That floor cannot be beaten without changing the region or caching.')
