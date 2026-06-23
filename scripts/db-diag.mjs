import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  try {
    const uploads = await pool.query(
      `SELECT id, source_type, file_name, status, record_count 
       FROM upload_batches 
       WHERE status != 'removed'
       ORDER BY uploaded_at DESC LIMIT 10`
    );
    console.log('=== UPLOAD BATCHES ===');
    console.table(uploads.rows);

    const docs = await pool.query(
      `SELECT id, upload_batch_id, source_type, status, row_count, 
              extracted_text_status, storage_provider,
              jsonb_typeof(detected_columns) as col_type,
              CASE 
                WHEN detected_columns IS NOT NULL 
                     AND detected_columns ? 'parsedRows' 
                THEN jsonb_array_length(detected_columns->'parsedRows')
                ELSE 0 
              END as parsed_rows_count,
              CASE
                WHEN detected_columns IS NOT NULL AND detected_columns ? 'columns'
                THEN detected_columns->'columns'
                ELSE '[]'::jsonb
              END as columns,
              CASE
                WHEN detected_columns IS NOT NULL AND detected_columns ? 'parser'
                THEN detected_columns->>'parser'
                ELSE null
              END as parser,
              CASE
                WHEN detected_columns IS NOT NULL AND detected_columns ? 'notes'
                THEN detected_columns->'notes'
                ELSE '[]'::jsonb
              END as notes
       FROM documents 
       WHERE status != 'removed'
       ORDER BY created_at DESC LIMIT 10`
    );
    console.log('=== DOCUMENTS ===');
    for (const doc of docs.rows) {
      console.log(`\nDoc #${doc.id} (batch ${doc.upload_batch_id}):`);
      console.log(`  source_type: ${doc.source_type}`);
      console.log(`  status: ${doc.status}`);
      console.log(`  parser: ${doc.parser}`);
      console.log(`  row_count: ${doc.row_count}`);
      console.log(`  parsed_rows_count: ${doc.parsed_rows_count}`);
      console.log(`  extracted_text_status: ${doc.extracted_text_status}`);
      console.log(`  storage_provider: ${doc.storage_provider}`);
      console.log(`  columns: ${JSON.stringify(doc.columns)}`);
      console.log(`  notes: ${JSON.stringify(doc.notes)}`);
    }

    // Check if parsedRows has actual data
    const parsedRowsSample = await pool.query(
      `SELECT id, upload_batch_id, source_type,
              CASE 
                WHEN detected_columns ? 'parsedRows' 
                     AND jsonb_array_length(detected_columns->'parsedRows') > 0
                THEN detected_columns->'parsedRows'->0
                ELSE null
              END as first_parsed_row
       FROM documents 
       WHERE status != 'removed' AND detected_columns ? 'parsedRows'
       ORDER BY created_at DESC LIMIT 5`
    );
    console.log('\n=== FIRST PARSED ROW SAMPLE ===');
    for (const row of parsedRowsSample.rows) {
      console.log(`Doc #${row.id} (batch ${row.upload_batch_id}, ${row.source_type}): ${JSON.stringify(row.first_parsed_row)}`);
    }

    const bank = await pool.query('SELECT COUNT(*) as count FROM bank_transactions');
    const gw = await pool.query('SELECT COUNT(*) as count FROM gateway_settlements');
    const inv = await pool.query('SELECT COUNT(*) as count FROM invoices');
    const ledger = await pool.query('SELECT COUNT(*) as count FROM ledger_entries');
    const payroll = await pool.query('SELECT COUNT(*) as count FROM payroll_entries');
    const gst = await pool.query('SELECT COUNT(*) as count FROM gst_records');

    console.log('\n=== TABLE COUNTS ===');
    console.log('Bank transactions:', bank.rows[0].count);
    console.log('Gateway settlements:', gw.rows[0].count);
    console.log('Invoices:', inv.rows[0].count);
    console.log('Ledger entries:', ledger.rows[0].count);
    console.log('Payroll entries:', payroll.rows[0].count);
    console.log('GST records:', gst.rows[0].count);

  } catch(e) {
    console.error('ERROR:', e.message);
    console.error(e.stack);
  } finally {
    await pool.end();
  }
}

main();
