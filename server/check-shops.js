const mysql = require('mysql2/promise');

async function checkShops() {
  try {
    const connection = await mysql.createConnection({
      host: 'xiadot.com',
      user: 'ak_fabrics',
      password: 'ak_fabrics',
      database: 'ak_fabrics'
    });
    
    const [shops] = await connection.execute('SELECT id, name, email FROM shops');
    console.log('Available shops:');
    shops.forEach(shop => {
      console.log(`ID: ${shop.id}, Name: ${shop.name}, Email: ${shop.email}`);
    });
    
    await connection.end();
  } catch (error) {
    console.error('Error:', error);
  }
}

checkShops();
