const { Client } = require('pg');

const client = new Client({
  connectionString: "postgresql://postgres:mysecretpassword@localhost:5432/mydb?schema=public"
});

async function main() {
  await client.connect();
  const res = await client.query('SELECT id, email, name, role FROM "User";');
  console.log(res.rows);
  await client.end();
}

main().catch(console.error);
