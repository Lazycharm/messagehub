// Quick script to check sender_numbers table schema
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkSchema() {
  console.log('Checking sender_numbers table...\n');
  
  // Try to select everything to see what columns exist
  const { data, error } = await supabase
    .from('sender_numbers')
    .select('*')
    .limit(1);
  
  if (error) {
    console.error('Error querying table:', error.message);
    console.error('Full error:', JSON.stringify(error, null, 2));
    
    // Try to get table info from information_schema
    const { data: schemaData, error: schemaError } = await supabase
      .rpc('exec_sql', { 
        sql: `SELECT column_name, data_type, is_nullable 
              FROM information_schema.columns 
              WHERE table_name = 'sender_numbers' 
              ORDER BY ordinal_position;` 
      });
    
    if (schemaError) {
      console.error('Could not get schema info:', schemaError.message);
    } else {
      console.log('Table columns:', schemaData);
    }
  } else {
    console.log('Table exists!');
    console.log('Sample row:', data);
    if (data && data.length > 0) {
      console.log('\nAvailable columns:', Object.keys(data[0]).join(', '));
    } else {
      console.log('Table is empty, attempting insert to check schema...');
      
      // Try inserting with minimal fields
      const { data: insertData, error: insertError } = await supabase
        .from('sender_numbers')
        .insert([{ }])
        .select();
      
      console.log('Insert result:', { insertData, insertError });
    }
  }
}

checkSchema().then(() => process.exit(0)).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
