const mysql = require('mysql2/promise');
const fs = require('fs');

async function runMigration() {
  const connection = await mysql.createConnection({
    host: 'xiadot.com',
    user: 'ak_fabrics',
    password: 'ak_fabrics',
    database: 'ak_fabrics'
  });

  try {
    console.log('Running image columns migration...');
    
    // Read and execute the SQL file
    const sql = fs.readFileSync('./add-image-columns.sql', 'utf8');
    const statements = sql.split(';').filter(stmt => stmt.trim());
    
    for (const statement of statements) {
      if (statement.trim()) {
        console.log('Executing:', statement.trim());
        await connection.execute(statement);
      }
    }
    
    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await connection.end();
  }
}

runMigration();
