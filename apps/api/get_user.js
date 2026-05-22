import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://ixvhrtxvigxhpmkgopcq.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml4dmhydHh2aWd4aHBta2dvcGNxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTM5NDcwMiwiZXhwIjoyMDk0OTcwNzAyfQ.PJ9CKd4JcUYLkQPrjWoJgmeVvZD4iIntSBwFA1iLLF8'
);

async function run() {
  const { data: users, error: usersError } = await supabase.auth.admin.listUsers();
  if (usersError) {
    console.error('Error fetching users:', usersError);
    return;
  }
  
  if (users.users.length > 0) {
    console.log('Found user ID:', users.users[0].id);
  } else {
    console.log('No users found. Creating a test user...');
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email: 'test@fbrzap.com',
      password: 'password123',
      email_confirm: true,
      user_metadata: { display_name: 'Test User' }
    });
    if (createError) {
      console.error('Error creating user:', createError);
    } else {
      console.log('Created new user ID:', newUser.user.id);
    }
  }
}

run();
