const mysql = require('mysql2/promise');

async function testAPI() {
  const connection = await mysql.createConnection({
    host: 'xiadot.com',
    user: 'ak_fabrics',
    password: 'ak_fabrics',
    database: 'ak_fabrics'
  });

  try {
    // Simulate the API query for sales with images
    const shopId = 'test-shop-id'; // This would normally come from the authenticated user
    
    console.log('Testing sales with images query...');
    
    const [sales] = await connection.execute(
      `SELECT s.*, a.name as customer_name, a.phone as customer_phone, a.address as customer_address, a.gstin as customer_gstin
       FROM sales s
       LEFT JOIN accounts a ON s.customer_id = a.id
       WHERE s.image_path IS NOT NULL
       ORDER BY s.created_at DESC`
    );
    
    console.log('Query result:', sales.length, 'records found');
    
    // Simulate the image URL generation
    const salesData = sales.map((row) => ({
      id: row.id,
      type: "SALE",
      created_at: row.created_at,
      imageUrl: `http://localhost:5000/uploads/sales-invoices/${row.image_path}`,
      invoice_no: row.invoice_no,
      customer_name: row.customer_name || "No Customer",
      total_amount: row.total_amount,
      total_qty: row.total_qty,
      status: row.status,
      payment_mode: row.payment_mode,
    }));
    
    console.log('Formatted data:', JSON.stringify(salesData, null, 2));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await connection.end();
  }
}

testAPI();
