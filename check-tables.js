const mysql = require('mysql2/promise');

async function checkTables() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'ak_fabrics'
    });

    // Check if sales_returns table exists
    const [tables] = await connection.execute(
      "SHOW TABLES LIKE 'sales_returns'"
    );
    
    console.log('Tables found:', tables);

    if (tables.length > 0) {
      console.log('✅ sales_returns table exists');
      
      // Check table structure
      const [columns] = await connection.execute(
        "DESCRIBE sales_returns"
      );
      console.log('Table structure:', columns);
    } else {
      console.log('❌ sales_returns table does not exist');
    }

    await connection.end();
  } catch (error) {
    console.error('Database error:', error);
  }
}

checkTables();
