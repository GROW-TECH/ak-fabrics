import React from 'react';
import { X, Printer, Download, FileText } from 'lucide-react';

interface LorrySale {
  id: string;
  invoice_no: string;
  lorry_number: string;
  driver_name: string;
  total_qty: number;
  total_amount: number;
  paid_amount: number;
  status: 'NOT_PAID' | 'HALF_PAID' | 'PAID';
  payment_mode: 'CASH' | 'CREDIT' | 'BANK' | 'UPI' | 'CHEQUE';
  notes: string;
  through_agent: string;
  created_at: string;
  customer_name?: string;
  customer_phone?: string;
  customer_address?: string;
  customer_gstin?: string;
}

interface LorrySaleInvoiceViewProps {
  sale: LorrySale | null;
  onClose: () => void;
}

const LorrySaleInvoiceView: React.FC<LorrySaleInvoiceViewProps> = ({ sale, onClose }) => {
  if (!sale) return null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Sample items data - in real app this would come from the API
  const items = [
    {
      description: "COTTON GREY FABRIC - PREMIUM QUALITY",
      hsn_code: "52084290",
      qty: 100,
      unit: "METERS",
      rate: 150.00,
      amount: 15000.00
    },
    {
      description: "COTTON PRINTED FABRIC - DESIGNER COLLECTION",
      hsn_code: "52084290", 
      qty: 50,
      unit: "METERS",
      rate: 200.00,
      amount: 10000.00
    }
  ];

  const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
  const cgst = subtotal * 0.06; // 6% CGST
  const sgst = subtotal * 0.06; // 6% SGST
  const total = subtotal + cgst + sgst;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black bg-opacity-50">
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
          
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5" />
              <h3 className="text-lg font-bold">Tax Invoice</h3>
              <span className="text-sm bg-white/20 px-2 py-1 rounded">{sale.invoice_no}</span>
            </div>
            <div className="flex items-center gap-2">
              <button className="p-2 hover:bg-white/10 rounded transition">
                <Printer className="w-4 h-4" />
              </button>
              <button className="p-2 hover:bg-white/10 rounded transition">
                <Download className="w-4 h-4" />
              </button>
              <button onClick={onClose} className="p-2 hover:bg-white/10 rounded transition">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Invoice Content */}
          <div className="p-6 bg-white overflow-y-auto max-h-[calc(90vh-80px)]">
            
            {/* Company Header */}
            <div className="border-b-2 border-blue-600 pb-4 mb-6">
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="text-2xl font-bold text-blue-900">AK FABRICS</h1>
                  <p className="text-sm text-gray-600">GSTIN: 27AAVPK7184D1ZW</p>
                  <p className="text-sm text-gray-600">Plot No. 13, Rajendra Nagar, Near S. T. Stand, Kalyan - 421301</p>
                  <p className="text-sm text-gray-600">Mobile: 9764937152 | Email: akfabrics786@gmail.com</p>
                </div>
                <div className="text-right">
                  <div className="bg-yellow-50 border-2 border-yellow-400 rounded p-3">
                    <p className="text-xs font-bold text-yellow-800">ORIGINAL RECIPIENT</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Billing Details */}
            <div className="grid grid-cols-2 gap-6 mb-6">
              <div>
                <h4 className="font-semibold text-gray-800 mb-2">Billing Details:</h4>
                <div className="bg-gray-50 p-3 rounded">
                  <p className="font-medium">{sale.customer_name || 'Customer Name'}</p>
                  <p className="text-sm text-gray-600">{sale.customer_address || 'Customer Address'}</p>
                  <p className="text-sm text-gray-600">GSTIN: {sale.customer_gstin || 'N/A'}</p>
                  <p className="text-sm text-gray-600">State: 27 - Maharashtra</p>
                </div>
              </div>
              <div>
                <h4 className="font-semibold text-gray-800 mb-2">Shipping Details:</h4>
                <div className="bg-gray-50 p-3 rounded">
                  <p className="font-medium">{sale.customer_name || 'Customer Name'}</p>
                  <p className="text-sm text-gray-600">{sale.customer_address || 'Customer Address'}</p>
                  <p className="text-sm text-gray-600">State: 27 - Maharashtra</p>
                </div>
              </div>
            </div>

            {/* Lorry Details */}
            <div className="grid grid-cols-3 gap-4 mb-6 bg-blue-50 p-4 rounded">
              <div>
                <p className="text-xs text-blue-600 font-semibold">Lorry Number</p>
                <p className="font-medium">{sale.lorry_number}</p>
              </div>
              <div>
                <p className="text-xs text-blue-600 font-semibold">Driver Name</p>
                <p className="font-medium">{sale.driver_name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-blue-600 font-semibold">Invoice Date</p>
                <p className="font-medium">{formatDate(sale.created_at)}</p>
              </div>
            </div>

            {/* Items Table */}
            <div className="mb-6">
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 px-4 py-2 text-left text-sm font-semibold">Description of Goods</th>
                    <th className="border border-gray-300 px-4 py-2 text-center text-sm font-semibold">HSN Code</th>
                    <th className="border border-gray-300 px-4 py-2 text-center text-sm font-semibold">Qty</th>
                    <th className="border border-gray-300 px-4 py-2 text-center text-sm font-semibold">Unit</th>
                    <th className="border border-gray-300 px-4 py-2 text-right text-sm font-semibold">Rate</th>
                    <th className="border border-gray-300 px-4 py-2 text-right text-sm font-semibold">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="border border-gray-300 px-4 py-2 text-sm">{item.description}</td>
                      <td className="border border-gray-300 px-4 py-2 text-center text-sm">{item.hsn_code}</td>
                      <td className="border border-gray-300 px-4 py-2 text-center text-sm">{item.qty}</td>
                      <td className="border border-gray-300 px-4 py-2 text-center text-sm">{item.unit}</td>
                      <td className="border border-gray-300 px-4 py-2 text-right text-sm">₹{item.rate.toFixed(2)}</td>
                      <td className="border border-gray-300 px-4 py-2 text-right text-sm">₹{item.amount.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Tax Calculation */}
            <div className="grid grid-cols-2 gap-6 mb-6">
              <div>
                <h4 className="font-semibold text-gray-800 mb-2">Bank Details:</h4>
                <div className="bg-gray-50 p-3 rounded text-sm">
                  <p><strong>Bank:</strong> IDFC FIRST BANK LTD</p>
                  <p><strong>Branch:</strong> KALYAN - 421301</p>
                  <p><strong>Account No:</strong> 10124884224</p>
                  <p><strong>IFSC:</strong> IDFB0040438</p>
                  <p><strong>A/c Holder:</strong> AKSHAY KADAM</p>
                </div>
              </div>
              <div>
                <table className="w-full border-collapse border border-gray-300">
                  <tbody>
                    <tr>
                      <td className="border border-gray-300 px-4 py-2 text-sm">Subtotal</td>
                      <td className="border border-gray-300 px-4 py-2 text-right text-sm">₹{subtotal.toFixed(2)}</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 px-4 py-2 text-sm">CGST (6%)</td>
                      <td className="border border-gray-300 px-4 py-2 text-right text-sm">₹{cgst.toFixed(2)}</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 px-4 py-2 text-sm">SGST (6%)</td>
                      <td className="border border-gray-300 px-4 py-2 text-right text-sm">₹{sgst.toFixed(2)}</td>
                    </tr>
                    <tr className="bg-gray-100 font-bold">
                      <td className="border border-gray-300 px-4 py-2 text-sm">Total</td>
                      <td className="border border-gray-300 px-4 py-2 text-right text-sm">₹{total.toFixed(2)}</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 px-4 py-2 text-sm">Total Amount (in Words)</td>
                      <td className="border border-gray-300 px-4 py-2 text-right text-sm text-xs">
                        {numberToWords(total)} Rupees Only
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t-2 border-blue-600 pt-4">
              <div className="grid grid-cols-3 gap-4 text-center text-sm">
                <div>
                  <div className="border-b-2 border-gray-300 mb-8"></div>
                  <p className="font-semibold">Receiver's Signature</p>
                </div>
                <div className="text-center">
                  <div className="mb-4">
                    <div className="inline-block bg-yellow-100 border-2 border-yellow-400 rounded p-2">
                      <p className="text-xs font-bold text-yellow-800">COMPANY'S STAMP</p>
                    </div>
                  </div>
                </div>
                <div>
                  <div className="border-b-2 border-gray-300 mb-8"></div>
                  <p className="font-semibold">for AK FABRICS</p>
                  <p className="text-xs text-gray-600 mt-2">Authorised Signatory</p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

// Helper function to convert number to words
function numberToWords(num: number): string {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  
  if (num === 0) return 'Zero';
  
  if (num < 10) return ones[num];
  if (num < 20) return teens[num - 10];
  if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 ? ' ' + ones[num % 10] : '');
  if (num < 1000) return ones[Math.floor(num / 100)] + ' Hundred' + (num % 100 ? ' ' + numberToWords(num % 100) : '');
  
  // For larger numbers, this is a simplified version
  return num.toLocaleString('en-IN');
}

export default LorrySaleInvoiceView;
