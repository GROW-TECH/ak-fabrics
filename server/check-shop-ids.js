const mysql = require('mysql2/promise');

async function checkShopIds() {
  const connection = await mysql.createConnection({
    host: 'xiadot.com',
    user: 'ak_fabrics',
    password: 'ak_fabrics',
    database: 'ak_fabrics'
  });

  try {
    console.log('Checking shop_id for sales with images...');
    
    const [sales] = await connection.execute(
      'SELECT id, invoice_no, image_path, shop_id, created_at FROM sales WHERE image_path IS NOT NULL'
    );
    
    console.log('Sales with images:', sales.length);
    sales.forEach(sale => {
      console.log(`- ${sale.invoice_no}: shop_id=${sale.shop_id}, image=${sale.image_path}`);
    });

    console.log('\nChecking all shop_ids in accounts table...');
    
    const [shops] = await connection.execute(
      'SELECT DISTINCT shop_id FROM accounts LIMIT 10'
    );
    
    console.log('Available shop_ids:');
    shops.forEach(shop => {
      console.log(`- ${shop.shop_id}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await connection.end();
  }
}

checkShopIds();
