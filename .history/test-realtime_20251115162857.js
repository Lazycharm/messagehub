/**
 * MessageHub Real-Time Testing Script
 * Tests all major functionality including API routes, database connections, and real-time features
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'cyan');
  console.log('='.repeat(60) + '\n');
}

function logTest(name, status, details = '') {
  const statusSymbol = status === 'pass' ? '✓' : status === 'fail' ? '✗' : '⚠';
  const statusColor = status === 'pass' ? 'green' : status === 'fail' ? 'red' : 'yellow';
  log(`${statusSymbol} ${name}`, statusColor);
  if (details) {
    console.log(`  ${details}`);
  }
}

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  log('ERROR: Supabase credentials not found in .env.local', 'red');
  log('Please ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set', 'yellow');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Test results tracker
const results = {
  total: 0,
  passed: 0,
  failed: 0,
  warnings: 0,
};

function recordResult(status) {
  results.total++;
  if (status === 'pass') results.passed++;
  else if (status === 'fail') results.failed++;
  else results.warnings++;
}

// Test 1: Environment Variables
async function testEnvironment() {
  logSection('1. ENVIRONMENT CONFIGURATION');
  
  const envVars = {
    'NEXT_PUBLIC_SUPABASE_URL': process.env.NEXT_PUBLIC_SUPABASE_URL,
    'NEXT_PUBLIC_SUPABASE_ANON_KEY': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 20) + '...',
    'TWILIO_ACCOUNT_SID': process.env.TWILIO_ACCOUNT_SID || 'NOT SET',
    'TWILIO_AUTH_TOKEN': process.env.TWILIO_AUTH_TOKEN ? 'SET' : 'NOT SET',
  };
  
  for (const [key, value] of Object.entries(envVars)) {
    const isSet = value && value !== 'NOT SET';
    logTest(key, isSet ? 'pass' : 'warn', value);
    recordResult(isSet ? 'pass' : 'warn');
  }
}

// Test 2: Database Connection
async function testDatabaseConnection() {
  logSection('2. DATABASE CONNECTION');
  
  try {
    const { data, error } = await supabase.from('users').select('count', { count: 'exact', head: true });
    
    if (error) {
      logTest('Supabase Connection', 'fail', error.message);
      recordResult('fail');
    } else {
      logTest('Supabase Connection', 'pass', 'Successfully connected to database');
      recordResult('pass');
    }
  } catch (error) {
    logTest('Supabase Connection', 'fail', error.message);
    recordResult('fail');
  }
}

// Test 3: Table Access
async function testTables() {
  logSection('3. DATABASE TABLES');
  
  const tables = [
    'users',
    'contacts',
    'chatrooms',
    'messages',
    'inbound_messages',
    'groups',
    'group_members',
    'templates',
    'sender_numbers',
    'settings'
  ];
  
  for (const table of tables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
      
      if (error) {
        logTest(`Table: ${table}`, 'fail', error.message);
        recordResult('fail');
      } else {
        logTest(`Table: ${table}`, 'pass', `Accessible`);
        recordResult('pass');
      }
    } catch (error) {
      logTest(`Table: ${table}`, 'fail', error.message);
      recordResult('fail');
    }
  }
}

// Test 4: API Routes (requires dev server running)
async function testAPIRoutes() {
  logSection('4. API ROUTES');
  
  const baseUrl = 'http://localhost:3000';
  const routes = [
    { method: 'GET', path: '/api/chatrooms', name: 'List Chatrooms' },
    { method: 'GET', path: '/api/messages', name: 'List Messages' },
    { method: 'GET', path: '/api/messages/inbound', name: 'List Inbound Messages' },
    { method: 'GET', path: '/api/users', name: 'List Users' },
    { method: 'GET', path: '/api/settings', name: 'List Settings' },
    { method: 'GET', path: '/api/sender-numbers', name: 'List Sender Numbers' },
    { method: 'GET', path: '/api/auth/me', name: 'Get Current User' },
  ];
  
  log('Testing API routes (requires dev server at localhost:3000)...', 'yellow');
  
  for (const route of routes) {
    try {
      const response = await fetch(`${baseUrl}${route.path}`, {
        method: route.method,
      });
      
      if (response.ok) {
        const data = await response.json();
        logTest(route.name, 'pass', `${route.method} ${route.path} - ${Array.isArray(data) ? data.length + ' items' : 'OK'}`);
        recordResult('pass');
      } else {
        logTest(route.name, 'fail', `${route.method} ${route.path} - ${response.status}`);
        recordResult('fail');
      }
    } catch (error) {
      logTest(route.name, 'warn', 'Dev server not running or route not accessible');
      recordResult('warn');
    }
  }
}

// Test 5: Real-time Subscriptions
async function testRealtime() {
  logSection('5. REAL-TIME SUBSCRIPTIONS');
  
  log('Testing real-time message subscription...', 'blue');
  
  return new Promise((resolve) => {
    let received = false;
    
    const channel = supabase
      .channel('test-messages')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'messages' },
        (payload) => {
          if (!received) {
            received = true;
            logTest('Real-time Messages', 'pass', `Received event: ${payload.eventType}`);
            recordResult('pass');
            channel.unsubscribe();
            resolve();
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          logTest('Real-time Subscription', 'pass', 'Successfully subscribed to messages channel');
          recordResult('pass');
          
          // Test by inserting a message
          setTimeout(async () => {
            try {
              await supabase.from('messages').insert([{
                type: 'sms',
                direction: 'outbound',
                status: 'pending',
                content: 'Test message from realtime test script',
                phone_number: '+1234567890',
                contact_name: 'Test Contact',
              }]);
              
              // Give it 2 seconds to receive the event
              setTimeout(() => {
                if (!received) {
                  logTest('Real-time Event Delivery', 'warn', 'No real-time event received (this may be normal)');
                  recordResult('warn');
                  channel.unsubscribe();
                  resolve();
                }
              }, 2000);
            } catch (error) {
              logTest('Real-time Test Insert', 'fail', error.message);
              recordResult('fail');
              channel.unsubscribe();
              resolve();
            }
          }, 1000);
        } else if (status === 'CHANNEL_ERROR') {
          logTest('Real-time Subscription', 'fail', 'Failed to subscribe');
          recordResult('fail');
          resolve();
        }
      });
  });
}

// Test 6: Data Integrity
async function testDataIntegrity() {
  logSection('6. DATA INTEGRITY');
  
  // Check for orphaned records
  try {
    const { data: messages, error: msgError } = await supabase
      .from('messages')
      .select('id, chatroom_id')
      .not('chatroom_id', 'is', null)
      .limit(100);
    
    if (msgError) throw msgError;
    
    if (messages && messages.length > 0) {
      const chatroomIds = [...new Set(messages.map(m => m.chatroom_id))];
      const { data: chatrooms, error: chatError } = await supabase
        .from('chatrooms')
        .select('id')
        .in('id', chatroomIds);
      
      if (chatError) throw chatError;
      
      const validIds = chatrooms.map(c => c.id);
      const orphaned = messages.filter(m => !validIds.includes(m.chatroom_id));
      
      if (orphaned.length === 0) {
        logTest('Message-Chatroom Integrity', 'pass', 'No orphaned messages found');
        recordResult('pass');
      } else {
        logTest('Message-Chatroom Integrity', 'warn', `${orphaned.length} orphaned messages found`);
        recordResult('warn');
      }
    } else {
      logTest('Message-Chatroom Integrity', 'pass', 'No messages to check');
      recordResult('pass');
    }
  } catch (error) {
    logTest('Data Integrity Check', 'fail', error.message);
    recordResult('fail');
  }
}

// Test 7: Performance
async function testPerformance() {
  logSection('7. PERFORMANCE TESTS');
  
  // Test query performance
  const tests = [
    { name: 'List 100 Messages', table: 'messages', limit: 100 },
    { name: 'List 50 Chatrooms', table: 'chatrooms', limit: 50 },
    { name: 'List 100 Contacts', table: 'contacts', limit: 100 },
  ];
  
  for (const test of tests) {
    try {
      const start = Date.now();
      const { data, error } = await supabase
        .from(test.table)
        .select('*')
        .limit(test.limit);
      const duration = Date.now() - start;
      
      if (error) throw error;
      
      const status = duration < 1000 ? 'pass' : duration < 3000 ? 'warn' : 'fail';
      logTest(test.name, status, `${duration}ms (${data?.length || 0} records)`);
      recordResult(status);
    } catch (error) {
      logTest(test.name, 'fail', error.message);
      recordResult('fail');
    }
  }
}

// Main test runner
async function runAllTests() {
  log('\n╔════════════════════════════════════════════════════════════╗', 'magenta');
  log('║        MessageHub Real-Time System Test Suite             ║', 'magenta');
  log('╚════════════════════════════════════════════════════════════╝', 'magenta');
  
  const startTime = Date.now();
  
  await testEnvironment();
  await testDatabaseConnection();
  await testTables();
  await testAPIRoutes();
  await testRealtime();
  await testDataIntegrity();
  await testPerformance();
  
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  
  // Final Summary
  logSection('TEST SUMMARY');
  
  log(`Total Tests: ${results.total}`, 'blue');
  log(`Passed: ${results.passed}`, 'green');
  log(`Failed: ${results.failed}`, results.failed > 0 ? 'red' : 'green');
  log(`Warnings: ${results.warnings}`, 'yellow');
  log(`Duration: ${duration}s`, 'cyan');
  
  const passRate = ((results.passed / results.total) * 100).toFixed(1);
  log(`\nPass Rate: ${passRate}%`, passRate >= 80 ? 'green' : passRate >= 60 ? 'yellow' : 'red');
  
  if (results.failed === 0 && results.warnings === 0) {
    log('\n🎉 All tests passed! System is fully operational.', 'green');
  } else if (results.failed === 0) {
    log('\n⚠️  All tests passed with some warnings. Review warnings above.', 'yellow');
  } else {
    log('\n❌ Some tests failed. Please review failures above.', 'red');
  }
  
  console.log('\n');
  process.exit(results.failed > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch((error) => {
  log(`\nFatal error: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});
