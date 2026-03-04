import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Download, Printer } from "lucide-react";

const API = import.meta.env.VITE_API_URL;

const money = (value: number) => `Rs ${Number(value || 0).toLocaleString("en-IN")}`;

const PurchaseInvoicePage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [purchase, setPurchase] = useState<any>(null);

  useEffect(() => {
    const fetchPurchase = async () => {
      if (!id) return;
      const res = await fetch(`${API}/api/purchases/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      if (res.ok) setPurchase(await res.json());
    };
    fetchPurchase();
  }, [id]);

  const total = useMemo(
    () => (purchase?.items || []).reduce((sum: number, item: any) => sum + Number(item.total || 0), 0),
    [purchase]
  );

  const handleDownload = async () => {
    const res = await fetch(`${API}/api/purchases/${id}/download`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    });
    if (!res.ok) return alert("Download failed");
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${purchase?.invoice_no || "purchase-invoice"}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  };

  if (!purchase) return <div className="p-10 text-slate-500">Loading...</div>;

  const createdDate = new Date(purchase.created_at || Date.now());
  const statusText = (purchase.payment_status || "NOT_PAID").replace("_", " ");

  return (
    <div className="max-w-5xl mx-auto">
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .print-sheet, .print-sheet * { visibility: visible !important; }
          .print-sheet { position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: 0; }
          .print-hide { display: none !important; }
          .print-card { box-shadow: none !important; border-radius: 0 !important; margin: 0 !important; }
        }
      `}</style>

      <div className="print-hide flex items-center justify-between mb-4">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <div className="flex items-center gap-2">
         
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
          >
            <Printer className="w-4 h-4" />
            Print
          </button>
        </div>
      </div>

      <div className="print-sheet">
        <div className="print-card bg-white border-2 border-emerald-700 shadow-sm rounded-2xl p-4">
          <div className="border-b-2 border-emerald-700 pb-3 mb-3 text-center">
            <p className="text-xs text-emerald-800 font-semibold tracking-wide">PURCHASE TAX INVOICE</p>
            <h1 className="text-3xl font-extrabold tracking-wide text-emerald-800">AK FABRICS</h1>
            <p className="text-sm text-emerald-700">Cloth Merchant</p>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm mb-3">
            <div className="border border-emerald-700 p-2">
              <p><span className="font-semibold text-emerald-900">Vendor:</span> {purchase.vendor_name || "-"}</p>
              <p><span className="font-semibold text-emerald-900">Address:</span> {purchase.vendor_address || "-"}</p>
              <p><span className="font-semibold text-emerald-900">GSTIN:</span> {purchase.vendor_gstin || "-"}</p>
              <p><span className="font-semibold text-emerald-900">Phone:</span> {purchase.vendor_phone || "-"}</p>
            </div>
            <div className="border border-emerald-700 p-2">
              <p><span className="font-semibold text-emerald-900">Invoice No:</span> {purchase.invoice_no}</p>
              <p><span className="font-semibold text-emerald-900">Invoice Date:</span> {createdDate.toLocaleDateString("en-IN")}</p>
              <p><span className="font-semibold text-emerald-900">Through:</span> {purchase.through_agent || "-"}</p>
              <p><span className="font-semibold text-emerald-900">Payment:</span> {purchase.payment_mode || "-"}</p>
              <p><span className="font-semibold text-emerald-900">Status:</span> {statusText}</p>
            </div>
          </div>

          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-emerald-100 text-emerald-900">
                <th className="border border-emerald-700 p-1.5 w-10">S.No</th>
                <th className="border border-emerald-700 p-1.5">HSN</th>
                <th className="border border-emerald-700 p-1.5">Size</th>
                <th className="border border-emerald-700 p-1.5 text-left">Particulars</th>
                <th className="border border-emerald-700 p-1.5 text-right">Rate</th>
                <th className="border border-emerald-700 p-1.5 text-right">Qty</th>
                <th className="border border-emerald-700 p-1.5 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {(purchase.items || []).map((item: any, idx: number) => (
                <tr key={idx}>
                  <td className="border border-emerald-700 p-1.5 text-center">{idx + 1}</td>
                  <td className="border border-emerald-700 p-1.5 text-center">{item.hsn || "-"}</td>
                  <td className="border border-emerald-700 p-1.5 text-center">{item.size || "-"}</td>
                  <td className="border border-emerald-700 p-1.5">{item.description || "-"}</td>
                  <td className="border border-emerald-700 p-1.5 text-right">{money(item.rate)}</td>
                  <td className="border border-emerald-700 p-1.5 text-right">{Number(item.quantity || item.qty || 0)}</td>
                  <td className="border border-emerald-700 p-1.5 text-right">{money(item.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div className="border border-emerald-700 p-2">
              <p><span className="font-semibold text-emerald-900">Notes:</span> {purchase.notes || "-"}</p>
              <p className="mt-4 text-xs text-slate-600">Subject to Salem jurisdiction.</p>
            </div>
            <div className="border border-emerald-700 p-2">
              <div className="flex justify-between border-b border-emerald-700 py-1">
                <span>Total Amount</span>
                <span className="font-semibold">{money(total)}</span>
              </div>
              <div className="flex justify-between border-b border-emerald-700 py-1">
                <span>Already Paid</span>
                <span className="font-semibold">{money(Number(purchase.paid_amount || 0))}</span>
              </div>
              <div className="flex justify-between py-1 text-base font-bold text-emerald-900">
                <span>Balance</span>
                <span>{money(Number(purchase.balance_amount || total - Number(purchase.paid_amount || 0)))}</span>
              </div>
            </div>
          </div>

          <div className="mt-8 flex justify-between text-sm text-emerald-900">
            <p>For AK FABRICS</p>
            <p>Authorised Signatory</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PurchaseInvoicePage;
