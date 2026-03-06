
import React from 'react';
import { X, Printer, MessageCircle, Download, Share2 } from 'lucide-react';
import { Transaction, Account, Product, TransactionType } from '../types';
import { BUSINESS_DETAILS } from '../constants';

interface InvoiceModalProps {
  transaction: Transaction;
  account: Account;
  products: Product[];
  onClose: () => void;
}

const InvoiceModal: React.FC<InvoiceModalProps> = ({ transaction, account, products, onClose }) => {
  const isSale = transaction.type === TransactionType.SALE;
  
  const handlePrint = () => window.print();
  
  const handleWhatsApp = () => {
    const text = `Hi ${account.name}, sharing your ${isSale ? 'Tax Invoice' : 'Payment Receipt'} from ${BUSINESS_DETAILS.name}. 
Total Amount: ₹${transaction.amount.toLocaleString()} 
Invoice No: ${transaction.invoiceNo || transaction.id}
Date: ${transaction.date}`;
    window.open(`https://wa.me/${account.phone?.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 print:p-0 print:bg-white">
      <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[90vh] print:h-auto print:rounded-none print:shadow-none">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center print:hidden">
          <h3 className="font-black text-slate-800 uppercase tracking-tighter">Document Preview</h3>
          <div className="flex items-center space-x-2">
            <button onClick={handleWhatsApp} className="flex items-center px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-xl text-xs font-bold hover:bg-emerald-100">
              <MessageCircle className="w-4 h-4 mr-2" /> Share WhatsApp
            </button>
            <button onClick={handlePrint} className="flex items-center px-3 py-1.5 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-200">
              <Printer className="w-4 h-4 mr-2" /> Print PDF
            </button>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full">
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8 md:p-12 print:overflow-visible">
          {/* GST Tax Invoice Layout */}
          <div className="max-w-3xl mx-auto border border-slate-200 p-8 rounded-lg print:border-none print:p-0">
            <div className="text-center mb-8">
              <h1 className="text-4xl font-black text-indigo-600 tracking-tighter">{BUSINESS_DETAILS.name}</h1>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Tax Invoice / Bill of Supply</p>
            </div>

            <div className="grid grid-cols-2 gap-8 mb-8">
              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">From</p>
                <p className="font-bold text-slate-900">{BUSINESS_DETAILS.name}</p>
                <p className="text-xs text-slate-500 leading-relaxed">{BUSINESS_DETAILS.address}</p>
                <p className="text-xs font-bold text-slate-900 mt-2">GSTIN: {BUSINESS_DETAILS.gstin}</p>
                <p className="text-xs text-slate-500">Phone: {BUSINESS_DETAILS.phone}</p>
              </div>
              <div className="text-right space-y-1">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">To (Bill to)</p>
                <p className="font-bold text-slate-900">{account.name}</p>
                <p className="text-xs text-slate-500 leading-relaxed">{account.address}</p>
                <p className="text-xs font-bold text-slate-900 mt-2">GSTIN: {account.gstin || 'Unregistered'}</p>
                <p className="text-xs text-slate-500">State: {account.state || 'N/A'}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 border-y border-slate-100 py-4 mb-8">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">Invoice No</p>
                <p className="text-sm font-bold text-slate-800">{transaction.invoiceNo || transaction.id.slice(-8)}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">Date</p>
                <p className="text-sm font-bold text-slate-800">{transaction.date}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Place of Supply</p>
                <p className="text-sm font-bold text-slate-800">{account.state || 'Gujarat'}</p>
              </div>
            </div>

            <table className="w-full text-left text-sm mb-8 border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-200">
                  <th className="py-2 font-black text-slate-900 uppercase text-[10px]">Description</th>
                  <th className="py-2 text-right font-black text-slate-900 uppercase text-[10px]">Qty</th>
                  <th className="py-2 text-right font-black text-slate-900 uppercase text-[10px]">Rate</th>
                  <th className="py-2 text-right font-black text-slate-900 uppercase text-[10px]">GST %</th>
                  <th className="py-2 text-right font-black text-slate-900 uppercase text-[10px]">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transaction.items?.map((item, i) => {
                  const prod = products.find(p => p.id === item.productId);
                  return (
                    <tr key={i}>
                      <td className="py-3">
                        <p className="font-bold text-slate-800">{prod?.name}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">HSN: {prod?.hsnCode || '5007'}</p>
                      </td>
                      <td className="py-3 text-right">{item.quantity} {prod?.unit}</td>
                      <td className="py-3 text-right">₹{item.rate.toLocaleString()}</td>
                      <td className="py-3 text-right">{prod?.gstRate || 5}%</td>
                      <td className="py-3 text-right font-bold text-slate-800">₹{item.total.toLocaleString()}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            <div className="flex justify-end">
              <div className="w-full max-w-[240px] space-y-2">
                <div className="flex justify-between text-slate-500 font-bold text-xs uppercase">
                  <span>Taxable Value</span>
                  <span className="text-slate-900">₹{(transaction.taxableAmount || transaction.amount).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-slate-500 font-bold text-xs uppercase border-b border-slate-100 pb-2">
                  <span>Total GST ({transaction.gstRate || 5}%)</span>
                  <span className="text-slate-900">₹{(transaction.taxAmount || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <span className="text-sm font-black text-slate-900 uppercase tracking-widest">Grand Total</span>
                  <span className="text-2xl font-black text-indigo-600">₹{transaction.amount.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="mt-12 pt-8 border-t border-slate-100 text-[10px] text-slate-400 font-bold leading-relaxed">
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <p className="uppercase text-slate-500 mb-2">Terms & Conditions</p>
                  <ul className="list-disc pl-4 space-y-1">
                    <li>Certified that the particulars given above are true and correct.</li>
                    <li>Goods once sold will not be taken back.</li>
                    <li>Subject to Surat Jurisdiction.</li>
                  </ul>
                </div>
                <div className="text-right">
                   <p className="uppercase text-slate-500 mb-2">Bank Details</p>
                   <p className="text-slate-800">{BUSINESS_DETAILS.bankName} | A/C: {BUSINESS_DETAILS.accountNo}</p>
                   <p className="text-slate-800">IFSC: {BUSINESS_DETAILS.ifsc}</p>
                   <div className="mt-8 pt-8 border-t border-slate-200">
                     <p className="text-slate-900 uppercase">For {BUSINESS_DETAILS.name}</p>
                     <p className="mt-4 font-bold text-slate-300">Authorised Signatory</p>
                   </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceModal;
