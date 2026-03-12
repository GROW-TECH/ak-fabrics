const http = require('http');

// Test sales return API
const testData = {
  sale_id: 'test-sale-id',
  items: [
    {
      product_id: 'test-product-id',
      quantity: 5
    }
  ],
  return_reason: 'Customer returned items'
};

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/sales/return',
  method: 'POST',
  headers: {
    'Authorization': 'Bearer test-token',
    'Content-Type': 'application/json'
  }
};

const req = http.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  
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
