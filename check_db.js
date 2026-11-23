require('dotenv').config({ path: '.env.development.local' });
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function query(table) {
  const res = await fetch(`${URL}/rest/v1/${table}?select=*`, {
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}` }
  });
  const data = await res.json();
  console.log(table, data);
}
query('shops');
query('profiles');
