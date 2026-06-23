// Check the latest state of uploads and imports
const { Pool } = require('pg');
require('dotenv').config({ path: '../../.env' });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  // Check latest batches
  const batches = await pool.query(`
    SELECT id, company_id, source_type, file_name, status, record_count 
    FROM upload_batches 
    WHERE company_id = 42
    ORDER BY id DESC LIMIT 10
  `);
  console.log('=== Latest Batches (company 42) ===');
  batches.rows.forEach(r => console.log(`  Batch ${r.id}: ${r.source_type} | ${r.file_name} | status=${r.status} | records=${r.record_count}`));

  // Check latest documents
  const docs = await pool.query(`
    SELECT d.id, d.upload_batch_id, d.status, d.row_count,
           d.storage_provider, d.storage_key,
           jsonb_array_length(COALESCE(d.detected_columns->'parsedRows', '[]'::jsonb)) as parsed_rows_count,
           (d.detected_columns->>'textPreview') IS NOT NULL as has_text,
           length(d.detected_columns->>'textPreview') as text_len
    FROM documents d
    WHERE d.company_id = 42
    ORDER BY d.id DESC LIMIT 10
  `);
  console.log('\n=== Latest Documents (company 42) ===');
  docs.rows.forEach(r => console.log(`  Doc ${r.id} (batch ${r.upload_batch_id}): status=${r.status} | rowCount=${r.row_count} | parsedRows=${r.parsed_rows_count} | hasText=${r.has_text} | textLen=${r.text_len} | storage=${r.storage_provider}`));

  // Check bank_transactions count
  const bt = await pool.query(`SELECT COUNT(*) as cnt FROM bank_transactions WHERE company_id = 42`);
  console.log('\n=== bank_transactions count:', bt.rows[0].cnt);

  // Check gateway_settlements count
  const gs = await pool.query(`SELECT COUNT(*) as cnt FROM gateway_settlements WHERE company_id = 42`);
  console.log('=== gateway_settlements count:', gs.rows[0].cnt);

  // Check the newest document's parsedRows
  const newest = await pool.query(`
    SELECT d.detected_columns->'parsedRows' as rows, d.detected_columns->>'notes' as notes
    FROM documents d WHERE d.company_id = 42 ORDER BY d.id DESC LIMIT 1
  `);
  if (newest.rows[0]) {
    const rows = newest.rows[0].rows || [];
    console.log('\n=== Newest document parsedRows count:', Array.isArray(rows) ? rows.length : 0);
    if (Array.isArray(rows) && rows.length > 0) {
      console.log('  First row:', JSON.stringify(rows[0]));
    }
    console.log('  Notes:', newest.rows[0].notes);
  }

  pool.end();
}

main().catch(console.error);
