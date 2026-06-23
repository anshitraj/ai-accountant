// Quick DB diagnostic — run from lib/db directory
const pg = require('pg');

// Manually load .env from project root
const fs = require('fs');
const path = require('path');
const envPath = path.resolve(__dirname, '../../.env');
const envContent = fs.readFileSync(envPath, 'utf8');
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eqIdx = trimmed.indexOf('=');
  if (eqIdx < 0) continue;
  const key = trimmed.slice(0, eqIdx).trim();
  let val = trimmed.slice(eqIdx + 1).trim();
  if ((val.startsWith("'") && val.endsWith("'")) || (val.startsWith('"') && val.endsWith('"'))) {
    val = val.slice(1, -1);
  }
  if (!process.env[key]) process.env[key] = val;
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  try {
    const u = await pool.query(
      `SELECT id, source_type, file_name, status, record_count 
       FROM upload_batches ORDER BY uploaded_at DESC LIMIT 10`
    );
    console.log('=== UPLOAD BATCHES ===');
    u.rows.forEach(r => console.log(JSON.stringify(r)));

    const d = await pool.query(
      `SELECT id, upload_batch_id, source_type, status, row_count, 
              extracted_text_status, storage_provider,
              detected_columns->>'parser' as parser,
              CASE 
                WHEN detected_columns ? 'parsedRows' 
                THEN jsonb_array_length(detected_columns->'parsedRows')
                ELSE 0 
              END as parsed_rows_count
       FROM documents ORDER BY created_at DESC LIMIT 10`
    );
    console.log('\n=== DOCUMENTS ===');
    d.rows.forEach(r => console.log(JSON.stringify(r)));

    // Show first parsed row from each doc that has any
    const s = await pool.query(
      `SELECT id, upload_batch_id, source_type,
              detected_columns->'parsedRows'->0 as first_row,
              detected_columns->'notes' as notes
       FROM documents 
       WHERE detected_columns ? 'parsedRows'
       ORDER BY created_at DESC LIMIT 5`
    );
    console.log('\n=== PARSED ROW SAMPLES ===');
    s.rows.forEach(r => {
      console.log(`Doc #${r.id} (batch ${r.upload_batch_id}, ${r.source_type}):`);
      console.log('  first_row:', JSON.stringify(r.first_row));
      console.log('  notes:', JSON.stringify(r.notes));
    });

    const c1 = await pool.query('SELECT COUNT(*) as c FROM bank_transactions');
    const c2 = await pool.query('SELECT COUNT(*) as c FROM gateway_settlements');
    const c3 = await pool.query('SELECT COUNT(*) as c FROM invoices');
    const c4 = await pool.query('SELECT COUNT(*) as c FROM ledger_entries');
    const c5 = await pool.query('SELECT COUNT(*) as c FROM payroll_entries');
    const c6 = await pool.query('SELECT COUNT(*) as c FROM gst_records');

    console.log('\n=== TABLE COUNTS ===');
    console.log('bank_transactions:', c1.rows[0].c);
    console.log('gateway_settlements:', c2.rows[0].c);
    console.log('invoices:', c3.rows[0].c);
    console.log('ledger_entries:', c4.rows[0].c);
    console.log('payroll_entries:', c5.rows[0].c);
    console.log('gst_records:', c6.rows[0].c);

  } catch(e) {
    console.error('ERROR:', e.message);
    console.error(e.stack);
  } finally {
    await pool.end();
  }
}

main();
