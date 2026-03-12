const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'xiadot.com',
  user: process.env.DB_USER || 'ak_fabrics',
  password: process.env.DB_PASSWORD || 'ak_fabrics',
  database: process.env.DB_NAME || 'ak_fabrics',
  multipleStatements: true
};

async function setupBanksTable() {
  let connection;
  
  try {
    // Create connection
    connection = await mysql.createConnection(dbConfig);
    console.log('Connected to database successfully');

    // Read SQL file
    const sqlFilePath = path.join(__dirname, 'create-banks-table.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    
    console.log('Executing SQL file...');
    
    // Execute SQL
    const [results] = await connection.execute(sqlContent);
    console.log('SQL executed successfully');
    
    // Check if table was created
    const [tableCheck] = await connection.execute(
      "SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'banks'"
    );
    
    if (tableCheck[0].count > 0) {
      console.log('✅ Banks table created successfully!');
      
      // Check if sample data exists
      const [dataCheck] = await connection.execute('SELECT COUNT(*) as count FROM banks');
      console.log(`📊 Sample records inserted: ${dataCheck[0].count}`);
      
      // Show sample data
      const [sampleData] = await connection.execute('SELECT * FROM banks LIMIT 3');
      console.log('\n📋 Sample bank data:');
      sampleData.forEach((bank, index) => {
        console.log(`${index + 1}. ${bank.bank_name} - ${bank.ifsc_code} - ${bank.account_number}`);
      });
      
    } else {
      console.log('❌ Failed to create banks table');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('Database connection closed');
    }
  }
}

// Run the setup
setupBanksTable();
