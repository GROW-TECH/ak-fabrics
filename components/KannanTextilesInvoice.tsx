import React from 'react';
import { ArrowLeft, Printer, Download } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

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

interface KannanTextilesInvoiceProps {
  sale: LorrySale | null;
}

const KannanTextilesInvoice: React.FC<KannanTextilesInvoiceProps> = ({ sale }) => {
  const navigate = useNavigate();

  if (!sale) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500">Invoice not found</p>
          <button 
            onClick={() => navigate('/lorry-sales')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Back to Lorry Sales
          </button>
        </div>
      </div>
    );
  }

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
      sno: 1,
      hsn_code: "52084290",
      size: "120x120",
      particulars: "COTTON GREY FABRIC - PREMIUM QUALITY",
      rate: "150.00",
      qty: 100,
      amount: "15000.00"
    },
    {
      sno: 2,
      hsn_code: "52084290",
      size: "140x140",
      particulars: "COTTON PRINTED FABRIC - DESIGNER COLLECTION",
      rate: "200.00",
      qty: 50,
      amount: "10000.00"
    }
  ];

  const subtotal = items.reduce((sum, item) => sum + parseFloat(item.amount), 0);
  const cgst = subtotal * 0.025; // 2.5% CGST
  const sgst = subtotal * 0.025; // 2.5% SGST
  const totalBeforeTax = subtotal;
  const totalAfterTax = totalBeforeTax + cgst + sgst;
  const roundOff = Math.round(totalAfterTax) - totalAfterTax;
  const finalTotal = Math.round(totalAfterTax);

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    alert('PDF download feature coming soon!');
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4 flex justify-between items-center print:hidden">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/lorry-sales')}
            className="p-2 hover:bg-gray-100 rounded transition flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Lorry Sales
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={handlePrint}
            className="p-2 hover:bg-gray-100 rounded transition flex items-center gap-2"
          >
            <Printer className="w-4 h-4" />
            Print
          </button>
          <button 
            onClick={handleDownload}
            className="p-2 hover:bg-gray-100 rounded transition flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Download
          </button>
        </div>
      </div>

      {/* Invoice Content */}
      <div className="bg-white p-8" id="invoice-content">
        
        {/* Company Header */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold">AK FABRICS</h1>
          <p className="text-sm">Plot No. 13, Rajendra Nagar, Near S. T. Stand, Kalyan - 421301</p>
          <div className="flex justify-center gap-6 mt-2 text-sm">
            <span>GSTIN: 27AAVPK7184D1ZW</span>
            <span>State Code: 27</span>
          </div>
          <div className="flex justify-center gap-6 mt-1 text-sm">
            <span>Proprietor: AKSHAY KADAM</span>
            <span>Mobile: 9764937152</span>
          </div>
          <p className="text-sm mt-1">Email: akfabrics786@gmail.com</p>
        </div>

        {/* Invoice Details */}
        <div className="grid grid-cols-5 gap-4 mb-6 text-sm border-b border-t">
          <div className="py-2">
            <span className="font-semibold">Invoice No:</span>
            <p className="font-bold">{sale.invoice_no}</p>
          </div>
          <div className="py-2">
            <span className="font-semibold">Invoice Date:</span>
            <p>{formatDate(sale.created_at)}</p>
          </div>
          <div className="py-2">
            <span className="font-semibold">Bale No:</span>
            <p>001</p>
          </div>
          <div className="py-2">
            <span className="font-semibold">Through:</span>
            <p>{sale.through_agent || 'Direct'}</p>
          </div>
          <div className="py-2">
            <span className="font-semibold">L.R. No:</span>
            <p>{sale.lorry_number}</p>
          </div>
        </div>

        {/* Customer Details */}
        <div className="grid grid-cols-2 gap-8 mb-6">
          <div>
            <div className="mb-2">
              <span className="font-semibold">To.</span>
              <p className="font-bold">{sale.customer_name || 'Customer Name'}</p>
              <p className="text-sm">{sale.customer_address || 'Customer Address'}</p>
            </div>
          </div>
          <div>
            <div className="mb-2">
              <span className="font-semibold">M/s.</span>
              <p className="font-bold">{sale.customer_name || 'Customer Name'}</p>
              <p className="text-sm">{sale.customer_address || 'Customer Address'}</p>
            </div>
          </div>
        </div>

        {/* GST Details */}
        <div className="grid grid-cols-2 gap-8 mb-6">
          <div>
            <span className="font-semibold">GSTIN:</span>
            <p>{sale.customer_gstin || 'N/A'}</p>
          </div>
          <div>
            <span className="font-semibold">State Code:</span>
            <p>33</p>
          </div>
        </div>

        {/* Items Table */}
        <div className="mb-6">
          <table className="w-full border-collapse border border-black">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-black px-2 py-1 text-center text-xs font-semibold">S.No.</th>
                <th className="border border-black px-2 py-1 text-center text-xs font-semibold">HSN Code</th>
                <th className="border border-black px-2 py-1 text-center text-xs font-semibold">Size</th>
                <th className="border border-black px-2 py-1 text-left text-xs font-semibold">Particulars</th>
                <th className="border border-black px-2 py-1 text-center text-xs font-semibold">Rate (Rs., P)</th>
                <th className="border border-black px-2 py-1 text-center text-xs font-semibold">Qty.</th>
                <th className="border border-black px-2 py-1 text-center text-xs font-semibold">Amount (Rs., P)</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={index}>
                  <td className="border border-black px-2 py-1 text-center text-sm">{item.sno}</td>
                  <td className="border border-black px-2 py-1 text-center text-sm">{item.hsn_code}</td>
                  <td className="border border-black px-2 py-1 text-center text-sm">{item.size}</td>
                  <td className="border border-black px-2 py-1 text-left text-sm">{item.particulars}</td>
                  <td className="border border-black px-2 py-1 text-right text-sm">{item.rate}</td>
                  <td className="border border-black px-2 py-1 text-center text-sm">{item.qty}</td>
                  <td className="border border-black px-2 py-1 text-right text-sm">{item.amount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Financial Summary */}
        <div className="grid grid-cols-2 gap-8 mb-6">
          <div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="font-semibold">Total Amount Before Tax:</span>
                <span>₹{totalBeforeTax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold">CGST (2.5%):</span>
                <span>₹{cgst.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold">SGST (2.5%):</span>
                <span>₹{sgst.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold">IGST (5%):</span>
                <span>₹0.00</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold">Round off:</span>
                <span>{roundOff > 0 ? '+' : ''}{roundOff.toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-t pt-2 font-bold">
                <span className="font-semibold">Total Amount After Tax:</span>
                <span>₹{finalTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>
          
          {/* Bank Details */}
          <div>
            <div className="space-y-1">
              <p className="font-semibold">Bank Details:</p>
              <p><span className="font-semibold">Bank Name:</span> IDFC FIRST BANK LTD</p>
              <p><span className="font-semibold">Bank A/c. No:</span> 10124884224</p>
              <p><span className="font-semibold">IFSC Code:</span> IDFB0040438</p>
              <p><span className="font-semibold">Branch:</span> KALYAN - 421301</p>
            </div>
          </div>
        </div>

        {/* Terms & Conditions */}
        <div className="mb-6">
          <p className="font-semibold mb-2">Terms & Conditions:</p>
          <ol className="list-decimal list-inside space-y-1 text-sm">
            <li>Interest will be charged @ 24% in bill, if payment not received within 30 days.</li>
            <li>We are not responsible for any loss or damage in transit.</li>
            <li>Goods once sold cannot be taken under any circumstances.</li>
            <li>All disputes subject to KALYAN Jurisdiction.</li>
          </ol>
        </div>

        {/* Signature */}
        <div className="grid grid-cols-2 gap-8 mt-12">
          <div className="text-center">
            <div className="border-b-2 border-black mb-2"></div>
            <p className="font-semibold">Receiver's Signature</p>
          </div>
          <div className="text-center">
            <div className="border-b-2 border-black mb-2"></div>
            <p className="font-semibold">for AK FABRICS</p>
            <p className="text-sm">Authorised Signatory</p>
          </div>
        </div>

      </div>

      {/* Print Styles */}
      <style jsx>{`
        @media print {
          body {
            background: white;
          }
          .print\\:hidden {
            display: none !important;
          }
          #invoice-content {
            padding: 20px;
          }
        }
      `}</style>
    </div>
  );
};

export default KannanTextilesInvoice;
