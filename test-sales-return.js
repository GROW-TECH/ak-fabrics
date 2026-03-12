const http = require('http');

// Test sales return API
const testData = {
  original_sale_id: 'test-sale-id',
  customer_id: 'test-customer-id',
  items: [
    {
      product_id: 'test-product-id',
      quantity: 2,
      rate: 100,
      return_reason: 'Defective item'
    }
  ],
  return_reason: 'Customer returned defective goods',
  refund_method: 'CREDIT'
};

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/sales-returns',
  method: 'POST',
  headers: {
    'Authorization': 'Bearer test-token',
    'Content-Type': 'application/json'
  }
};

const req = http.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  console.log(`Headers: ${JSON.stringify(res.headers)}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('Response:', data);
  });
});

req.on('error', (e) => {
  console.error(`Problem with request: ${e.message}`);
});

req.write(JSON.stringify(testData));
req.end();
