import React from 'react';
import { X, Truck, Calendar, User, DollarSign, Package, CreditCard } from 'lucide-react';

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
}

interface LorrySaleViewModalProps {
  sale: LorrySale | null;
  onClose: () => void;
}

const LorrySaleViewModal: React.FC<LorrySaleViewModalProps> = ({ sale, onClose }) => {
  if (!sale) return null;

  const getStatusBadge = (status: string) => {
    const styles = {
      PAID: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      NOT_PAID: 'bg-red-50 text-red-700 border-red-200',
      HALF_PAID: 'bg-amber-50 text-amber-700 border-amber-200'
    };
    return styles[status as keyof typeof styles] || '';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const balanceAmount = sale.total_amount - sale.paid_amount;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black bg-opacity-50 transition-opacity" onClick={onClose} />
      
      {/* Modal */}
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
          
          {/* Header */}
          <div className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center">
                <Truck className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Lorry Sale Details</h3>
                <p className="text-sm text-slate-500">Invoice: {sale.invoice_no}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-120px)]">
            
            {/* Lorry & Customer Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Lorry Information</h4>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Truck className="w-4 h-4 text-slate-400" />
                    <div>
                      <p className="text-xs text-slate-500">Lorry Number</p>
                      <p className="text-sm font-medium text-slate-900">{sale.lorry_number}</p>
                    </div>
                  </div>
                  {sale.driver_name && (
                    <div className="flex items-center gap-3">
                      <User className="w-4 h-4 text-slate-400" />
                      <div>
                        <p className="text-xs text-slate-500">Driver Name</p>
                        <p className="text-sm font-medium text-slate-900">{sale.driver_name}</p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <div>
                      <p className="text-xs text-slate-500">Date & Time</p>
                      <p className="text-sm font-medium text-slate-900">{formatDate(sale.created_at)}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Customer Information</h4>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <User className="w-4 h-4 text-slate-400" />
                    <div>
                      <p className="text-xs text-slate-500">Customer Name</p>
                      <p className="text-sm font-medium text-slate-900">{sale.customer_name || 'Unknown'}</p>
                    </div>
                  </div>
                  {sale.customer_phone && (
                    <div className="flex items-center gap-3">
                      <User className="w-4 h-4 text-slate-400" />
                      <div>
                        <p className="text-xs text-slate-500">Phone Number</p>
                        <p className="text-sm font-medium text-slate-900">{sale.customer_phone}</p>
                      </div>
                    </div>
                  )}
                  {sale.through_agent && (
                    <div className="flex items-center gap-3">
                      <User className="w-4 h-4 text-slate-400" />
                      <div>
                        <p className="text-xs text-slate-500">Through Agent</p>
                        <p className="text-sm font-medium text-slate-900">{sale.through_agent}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Financial Summary */}
            <div className="bg-slate-50 rounded-xl p-6">
              <h4 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-4">Financial Summary</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-lg p-4 border border-slate-200">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="w-4 h-4 text-slate-400" />
                    <p className="text-xs text-slate-500">Total Amount</p>
                  </div>
                  <p className="text-lg font-bold text-slate-900">₹{sale.total_amount.toLocaleString()}</p>
                </div>
                <div className="bg-white rounded-lg p-4 border border-slate-200">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="w-4 h-4 text-emerald-600" />
                    <p className="text-xs text-slate-500">Paid Amount</p>
                  </div>
                  <p className="text-lg font-bold text-emerald-600">₹{sale.paid_amount.toLocaleString()}</p>
                </div>
                <div className="bg-white rounded-lg p-4 border border-slate-200">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="w-4 h-4 text-amber-600" />
                    <p className="text-xs text-slate-500">Balance Due</p>
                  </div>
                  <p className="text-lg font-bold text-amber-600">₹{balanceAmount.toLocaleString()}</p>
                </div>
              </div>
            </div>

            {/* Status & Payment */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Status</h4>
                <div className="flex items-center gap-3">
                  <span className={`inline-flex px-3 py-2 text-sm font-semibold rounded-full border ${getStatusBadge(sale.status)}`}>
                    {sale.status.replace('_', ' ')}
                  </span>
                </div>
              </div>
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Payment Mode</h4>
                <div className="flex items-center gap-3">
                  <CreditCard className="w-4 h-4 text-slate-400" />
                  <span className="text-sm font-medium text-slate-900">{sale.payment_mode}</span>
                </div>
              </div>
            </div>

            {/* Items Summary */}
            <div className="bg-indigo-50 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <Package className="w-5 h-5 text-indigo-600" />
                <h4 className="text-sm font-semibold text-indigo-700 uppercase tracking-wider">Items Summary</h4>
              </div>
              <div className="bg-white rounded-lg p-4 border border-indigo-100">
                <p className="text-2xl font-bold text-indigo-900">{sale.total_qty}</p>
                <p className="text-sm text-indigo-600">Total Items</p>
              </div>
            </div>

            {/* Notes */}
            {sale.notes && (
              <div className="bg-slate-50 rounded-xl p-6">
                <h4 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-3">Notes</h4>
                <p className="text-sm text-slate-600 bg-white rounded-lg p-4 border border-slate-200">
                  {sale.notes}
                </p>
              </div>
            )}

          </div>

          {/* Footer */}
          <div className="bg-slate-50 px-6 py-4 border-t border-slate-200">
            <button
              onClick={onClose}
              className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium"
            >
              Close
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default LorrySaleViewModal;
