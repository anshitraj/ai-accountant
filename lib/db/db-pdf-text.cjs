// Check text preview stored for recent PDF uploads
const pg = require('pg');
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
  if ((val.startsWith("'") && val.endsWith("'")) || (val.startsWith('"') && val.endsWith('"'))) val = val.slice(1, -1);
  if (!process.env[key]) process.env[key] = val;
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  try {
    const d = await pool.query(
      `SELECT id, upload_batch_id, source_type,
              detected_columns->>'parser' as parser,
              detected_columns->>'textPreview' as text_preview,
              (detected_columns->>'textLength')::int as text_length
       FROM documents 
       WHERE detected_columns->>'parser' = 'pdf'
       ORDER BY created_at DESC LIMIT 3`
    );
    for (const row of d.rows) {
      console.log(`\n===== Doc #${row.id} (batch ${row.upload_batch_id}, ${row.source_type}) =====`);
      console.log(`Text length: ${row.text_length}`);
      console.log(`Text preview:\n${row.text_preview}`);
      console.log('='.repeat(80));
    }
  } catch(e) {
    console.error('ERROR:', e.message);
  } finally {
    await pool.end();
  }
}

main();
