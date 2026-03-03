const mysql = require('mysql2/promise');

async function checkUploads() {
  const connection = await mysql.createConnection({
    host: 'xiadot.com',
    user: 'ak_fabrics',
    password: 'ak_fabrics',
    database: 'ak_fabrics'
  });

  try {
    console.log('Checking sales records with image_path...');
    
    const [sales] = await connection.execute(
      'SELECT id, invoice_no, image_path, created_at FROM sales WHERE image_path IS NOT NULL'
    );
    
    console.log('Sales with images:', sales.length);
    sales.forEach(sale => {
      console.log(`- ${sale.invoice_no}: ${sale.image_path} (${sale.created_at})`);
    });

    console.log('\nChecking purchase records with image_path...');
    
    const [purchases] = await connection.execute(
      'SELECT id, invoice_no, image_path, created_at FROM purchases WHERE image_path IS NOT NULL'
    );
    
    console.log('Purchases with images:', purchases.length);
    purchases.forEach(purchase => {
      console.log(`- ${purchase.invoice_no}: ${purchase.image_path} (${purchase.created_at})`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await connection.end();
  }
}

checkUploads();
