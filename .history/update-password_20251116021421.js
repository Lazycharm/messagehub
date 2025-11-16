const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://yudnnwdvrqcuonjblobr.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl1ZG5ud2R2cnFjdW9uamJsb2JyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzEzNDE3NSwiZXhwIjoyMDc4NzEwMTc1fQ.hGNOhXm1JqPCLTLHTYSwGD73BujXXDqFMPUeBGAc7hg'
);

async function updatePassword() {
  try {
    const { data, error } = await supabase.auth.admin.updateUserById(
      'c0e46884-42ab-44ea-bf81-c1caa41ea943',
      { password: 'Mynew+123123' }
    );
    
    if (error) {
      console.error('Error:', error);
      process.exit(1);
    }
    
    console.log('Password updated successfully!');
    console.log('User:', data.user.email);
    process.exit(0);
  } catch (err) {
    console.error('Exception:', err);
    process.exit(1);
  }
}

updatePassword();
