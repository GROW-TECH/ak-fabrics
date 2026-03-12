import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, QrCode, Building, CreditCard, Eye } from 'lucide-react';

interface Bank {
  id: number;
  bank_name: string;
  ifsc_code: string;
  account_number: string;
  qr_code: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const BanksPage: React.FC = () => {
  const [banks, setBanks] = useState<Bank[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingBank, setEditingBank] = useState<Bank | null>(null);
  const [formData, setFormData] = useState({
    bank_name: '',
    ifsc_code: '',
    account_number: '',
    qr_code: ''
  });
  const [showQrModal, setShowQrModal] = useState(false);
  const [selectedBank, setSelectedBank] = useState<Bank | null>(null);

  const API = import.meta.env.VITE_API_URL;

  useEffect(() => {
    fetchBanks();
  }, []);

  const fetchBanks = async () => {
    try {
      const response = await fetch(`${API}/api/banks`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'x-shop-id': 'shop1'
        }
      });
      const data = await response.json();
      setBanks(data);
    } catch (error) {
      console.error('Error fetching banks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const url = editingBank ? `${API}/api/banks/${editingBank.id}` : `${API}/api/banks`;
      const method = editingBank ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'x-shop-id': 'shop1'
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        await fetchBanks();
        setShowModal(false);
        setEditingBank(null);
        setFormData({
          bank_name: '',
          ifsc_code: '',
          account_number: '',
          qr_code: ''
        });
        alert(editingBank ? 'Bank updated successfully!' : 'Bank added successfully!');
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to save bank');
      }
    } catch (error) {
      console.error('Error saving bank:', error);
      alert('Failed to save bank');
    }
  };

  const handleEdit = (bank: Bank) => {
    setEditingBank(bank);
    setFormData({
      bank_name: bank.bank_name,
      ifsc_code: bank.ifsc_code,
      account_number: bank.account_number,
      qr_code: bank.qr_code || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (bank: Bank) => {
    if (!confirm(`Are you sure you want to delete ${bank.bank_name}?`)) {
      return;
    }

    try {
      const response = await fetch(`${API}/api/banks/${bank.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'x-shop-id': 'shop1'
        }
      });

      if (response.ok) {
        await fetchBanks();
        alert('Bank deleted successfully!');
      } else {
        alert('Failed to delete bank');
      }
    } catch (error) {
      console.error('Error deleting bank:', error);
      alert('Failed to delete bank');
    }
  };

  const handleQrUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, qr_code: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const openQrModal = (bank: Bank) => {
    setSelectedBank(bank);
    setShowQrModal(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading banks...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Building className="w-6 h-6" />
              Banks Management
            </h1>
            <button
              onClick={() => {
                setEditingBank(null);
                setFormData({
                  bank_name: '',
                  ifsc_code: '',
                  account_number: '',
                  qr_code: ''
                });
                setShowModal(true);
              }}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              Add Bank
            </button>
          </div>
        </div>
      </div>

      {/* Banks List */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Banks Table View */}
        {banks.length > 0 && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Bank Accounts</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Bank Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      IFSC Code
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Account Number
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      QR Code
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {banks.map((bank) => (
                    <tr key={bank.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Building className="w-5 h-5 text-blue-600 mr-2" />
                          <span className="text-sm font-medium text-gray-900">{bank.bank_name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900 font-mono">{bank.ifsc_code}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900 font-mono">{bank.account_number}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {bank.qr_code ? (
                          <div className="flex items-center">
                            <QrCode className="w-4 h-4 text-green-600 mr-1" />
                            <span className="text-sm text-green-600">Available</span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">None</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-2">
                          {bank.qr_code && (
                            <button
                              onClick={() => openQrModal(bank)}
                              className="text-blue-600 hover:text-blue-900"
                              title="View QR Code"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleEdit(bank)}
                            className="text-indigo-600 hover:text-indigo-900"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(bank)}
                            className="text-red-600 hover:text-red-900"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        
        {banks.length === 0 && (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <Building className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No banks added</h3>
            <p className="text-gray-600 mb-4">Add your first bank to get started</p>
            <button
              onClick={() => setShowModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              Add Bank
            </button>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">
              {editingBank ? 'Edit Bank' : 'Add New Bank'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bank Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.bank_name}
                  onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., State Bank of India"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  IFSC Code
                </label>
                <input
                  type="text"
                  required
                  value={formData.ifsc_code}
                  onChange={(e) => setFormData({ ...formData, ifsc_code: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., SBIN0000001"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Account Number
                </label>
                <input
                  type="text"
                  required
                  value={formData.account_number}
                  onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., 1234567890123456"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  QR Code (Optional)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleQrUpload}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {formData.qr_code && (
                  <div className="mt-2">
                    <img
                      src={formData.qr_code}
                      alt="QR Code Preview"
                      className="h-20 w-20 object-cover border rounded"
                    />
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, qr_code: '' })}
                      className="mt-1 text-xs text-red-600 hover:text-red-800"
                    >
                      Remove QR Code
                    </button>
                  </div>
                )}
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingBank(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                  {editingBank ? 'Update' : 'Add'} Bank
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {showQrModal && selectedBank && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-sm">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">QR Code</h2>
              <button
                onClick={() => setShowQrModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ×
              </button>
            </div>
            
            <div className="text-center">
              <p className="font-medium mb-4">{selectedBank.bank_name}</p>
              {selectedBank.qr_code ? (
                <img
                  src={selectedBank.qr_code}
                  alt="QR Code"
                  className="mx-auto max-w-full"
                />
              ) : (
                <div className="text-gray-500 py-8">
                  <QrCode className="w-12 h-12 mx-auto mb-2" />
                  <p>No QR Code Available</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BanksPage;
