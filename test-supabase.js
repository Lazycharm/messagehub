// Comprehensive Supabase API Test Script
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testTable(tableName, testData = null) {
  log(`\n${'='.repeat(60)}`, 'cyan');
  log(`Testing table: ${tableName}`, 'blue');
  log('='.repeat(60), 'cyan');

  try {
    // Test SELECT
    log('\n1. Testing SELECT...', 'yellow');
    const { data: selectData, error: selectError } = await supabase
      .from(tableName)
      .select('*')
      .limit(5);

    if (selectError) {
      log(`❌ SELECT failed: ${selectError.message}`, 'red');
      log(`   Details: ${JSON.stringify(selectError, null, 2)}`, 'red');
      return { success: false, error: selectError };
    }
    log(`✅ SELECT successful - Found ${selectData.length} rows`, 'green');
    if (selectData.length > 0) {
      log(`   Sample columns: ${Object.keys(selectData[0]).join(', ')}`, 'cyan');
    }

    // Test INSERT if test data provided
    if (testData) {
      log('\n2. Testing INSERT...', 'yellow');
      const { data: insertData, error: insertError } = await supabase
        .from(tableName)
        .insert([testData])
        .select()
        .single();

      if (insertError) {
        log(`❌ INSERT failed: ${insertError.message}`, 'red');
        log(`   Details: ${JSON.stringify(insertError, null, 2)}`, 'red');
        return { success: false, error: insertError };
      }
      log(`✅ INSERT successful`, 'green');
      log(`   Created ID: ${insertData.id}`, 'cyan');

      // Test UPDATE
      log('\n3. Testing UPDATE...', 'yellow');
      const updateField = Object.keys(testData).find(k => k !== 'id' && typeof testData[k] === 'string');
      if (updateField) {
        const { data: updateData, error: updateError } = await supabase
          .from(tableName)
          .update({ [updateField]: testData[updateField] + ' (updated)' })
          .eq('id', insertData.id)
          .select()
          .single();

        if (updateError) {
          log(`❌ UPDATE failed: ${updateError.message}`, 'red');
        } else {
          log(`✅ UPDATE successful`, 'green');
        }
      }

      // Test DELETE
      log('\n4. Testing DELETE...', 'yellow');
      const { error: deleteError } = await supabase
        .from(tableName)
        .delete()
        .eq('id', insertData.id);

      if (deleteError) {
        log(`❌ DELETE failed: ${deleteError.message}`, 'red');
      } else {
        log(`✅ DELETE successful`, 'green');
      }
    }

    return { success: true };
  } catch (error) {
    log(`❌ Unexpected error: ${error.message}`, 'red');
    return { success: false, error };
  }
}

async function runAllTests() {
  log('\n' + '='.repeat(60), 'cyan');
  log('SUPABASE DATABASE CONNECTIVITY TEST', 'blue');
  log('='.repeat(60), 'cyan');

  const tests = [
    {
      name: 'users',
      data: {
        email: `test-${Date.now()}@example.com`,
        password_hash: 'dummy_hash',
        name: 'Test User',
        full_name: 'Test User',
        role: 'admin'
      }
    },
    {
      name: 'contacts',
      data: {
        first_name: 'John',
        last_name: 'Doe',
        email: `contact-${Date.now()}@example.com`,
        phone_number: '+1234567890'
      }
    },
    {
      name: 'groups',
      data: {
        name: `Test Group ${Date.now()}`,
        description: 'Test group for API validation'
      }
    },
    {
      name: 'templates',
      data: {
        name: `Test Template ${Date.now()}`,
        content: 'Hello {{name}}, this is a test message.',
        type: 'sms'
      }
    },
    {
      name: 'sender_numbers',
      data: {
        label: `Test Sender ${Date.now()}`,
        number_or_id: `+1${Math.floor(Math.random() * 10000000000)}`,
        type: 'phone',
        region: 'US'
      }
    },
    {
      name: 'settings',
      data: null // Just test read
    },
    {
      name: 'messages',
      data: null // Just test read
    }
  ];

  const results = [];
  for (const test of tests) {
    const result = await testTable(test.name, test.data);
    results.push({ table: test.name, ...result });
  }

  // Summary
  log('\n' + '='.repeat(60), 'cyan');
  log('TEST SUMMARY', 'blue');
  log('='.repeat(60), 'cyan');
  
  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  log(`\nTotal tables tested: ${results.length}`, 'cyan');
  log(`Passed: ${passed}`, passed > 0 ? 'green' : 'reset');
  log(`Failed: ${failed}`, failed > 0 ? 'red' : 'reset');
  
  if (failed > 0) {
    log('\nFailed tables:', 'red');
    results.filter(r => !r.success).forEach(r => {
      log(`  - ${r.table}`, 'red');
    });
  }
  
  log('\n' + '='.repeat(60), 'cyan');
  
  process.exit(failed > 0 ? 1 : 0);
}

runAllTests().catch(err => {
  log(`\nFatal error: ${err.message}`, 'red');
  console.error(err);
  process.exit(1);
});
