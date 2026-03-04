import React, { useState, useEffect } from 'react';
import { Eye, Pencil, Download, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const API = import.meta.env.VITE_API_URL;

const WhatsAppIcon = () => (
  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

const SalesReceipts: React.FC = () => {
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  const fetchSales = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) { alert('Please login'); return; }
      const res = await fetch(`${API}/api/sales`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setSales(await res.json());
      else alert('Failed to fetch sales');
    } catch (error) {
      console.error('Failed to fetch sales:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSales(); }, []);

  const filteredSales = sales.filter(s =>
    !searchTerm ||
    s.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.invoice_no?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const downloadInvoice = async (id: string, invoiceNo: string) => {
    try {
      const res = await fetch(`${API}/api/sales/${id}/download`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      if (!res.ok) return alert("Download failed");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `${invoiceNo || "invoice"}.pdf`;
      document.body.appendChild(a); a.click(); a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) { alert("Download failed"); }
  };

  const deleteSale = async (id: string) => {
    if (!window.confirm("Delete this sales receipt?")) return;
    try {
      const res = await fetch(`${API}/api/sales/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      if (!res.ok) return alert("Delete failed");
      fetchSales();
    } catch (err) { alert("Delete failed"); }
  };

  // ✅ Same pattern as PurchaseReceipts — navigate to invoice page with ?share=true
  const shareOnWhatsApp = (sale: any) => {
    const cleaned = String(sale.customer_phone || "").replace(/\D/g, "");
    const waPhone = cleaned.length === 10
      ? "91" + cleaned
      : cleaned.length >= 11 && cleaned.startsWith("91")
      ? cleaned
      : cleaned;

    console.log("Sharing to phone:", waPhone);
    navigate(`/sales/${sale.id}?share=true&phone=${waPhone}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Sales Receipts</h1>
          <p className="text-slate-500 text-sm">View and manage sales receipts.</p>
        </div>
        <div className="relative w-full md:w-80">
          <input
            type="text"
            placeholder="Search sales receipts..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <div className="absolute left-3 top-1/2 -translate-y-1/2">
            <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-3 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider w-8">#</th>
                <th className="px-3 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Invoice No</th>
                <th className="px-3 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Customer Name</th>
                <th className="px-3 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-16 text-center text-slate-400 italic text-sm">
                    No sales receipts found.
                  </td>
                </tr>
              ) : (
                filteredSales.map((sale, idx) => (
                  <tr key={sale.id} className="border-b border-slate-50 hover:bg-slate-50/70 transition-colors">
                    <td className="px-3 py-3 text-xs text-slate-400 text-center">{idx + 1}</td>
                    <td className="px-3 py-3">
                      <span className="text-[10px] font-mono text-indigo-500 block">{sale.invoice_no}</span>
                    </td>
                    <td className="px-3 py-3">
                      <p className="font-semibold text-slate-800 text-sm leading-tight">{sale.customer_name}</p>
                      {sale.customer_phone && (
                        <p className="text-[10px] text-slate-400 mt-0.5">{sale.customer_phone}</p>
                      )}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <div className="flex justify-center gap-1">
                        <button
                          onClick={() => navigate(`/sales/${sale.id}`)}
                          className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white transition-colors"
                          title="View"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => navigate(`/sales/${sale.id}/edit`)}
                          className="p-1.5 rounded-lg bg-slate-50 text-slate-600 hover:bg-slate-600 hover:text-white transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => downloadInvoice(sale.id, sale.invoice_no)}
                          className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white transition-colors"
                          title="Download PDF"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => shareOnWhatsApp(sale)}
                          className="p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-600 hover:text-white transition-colors"
                          title="Share on WhatsApp"
                        >
                          <WhatsAppIcon />
                        </button>
                        <button
                          onClick={() => deleteSale(sale.id)}
                          className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-600 hover:text-white transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SalesReceipts;