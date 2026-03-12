import React, { useState } from 'react';

const BankSetup: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [tableExists, setTableExists] = useState<boolean | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const API = import.meta.env.VITE_API_URL;

  const checkTable = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API}/api/setup/check-table`);
      const data = await response.json();
      setTableExists(data.tableExists);
      setMessage(data.message);
    } catch (error) {
      setMessage('Error checking table status');
    } finally {
      setLoading(false);
    }
  };

  const createTable = async () => {
    setIsCreating(true);
    try {
      const response = await fetch(`${API}/api/setup/create-table`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      setMessage(data.message);
      setTableExists(true);
      
      // Refresh the page after successful table creation
      setTimeout(() => {
        window.location.reload();
      }, 2000);
      
    } catch (error) {
      setMessage('Error creating table');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow border">
      <h2 className="text-xl font-bold mb-4">🏦 Bank Database Setup</h2>
      
      <div className="space-y-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> The banks table needs to be created in the database before you can add bank accounts.
          </p>
        </div>
        
        <button
          onClick={checkTable}
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Checking...
            </>
          ) : (
            <>
              <span>🔍</span>
              Check Banks Table Status
            </>
          )}
        </button>
        
        {tableExists === false && (
          <button
            onClick={createTable}
            disabled={isCreating}
            className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isCreating ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Creating...
              </>
            ) : (
              <>
                <span>⚡</span>
                Create Banks Table & Sample Data
              </>
            )}
          </button>
        )}
        
        {message && (
          <div className={`p-3 rounded-lg text-sm ${
            message.includes('successfully') || message.includes('exists') 
              ? 'bg-green-100 text-green-800 border border-green-200' 
              : 'bg-yellow-100 text-yellow-800 border border-yellow-200'
          }`}>
            <div className="flex items-center gap-2">
              <span>{message.includes('successfully') || message.includes('exists') ? '✅' : '⚠️'}</span>
              <span>{message}</span>
            </div>
            {message.includes('successfully') && (
              <p className="text-xs mt-2">Page will refresh automatically...</p>
            )}
          </div>
        )}
        
        {tableExists && (
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <p className="text-sm text-green-800 font-medium">
              ✅ Banks table is ready! You can now add bank accounts using the "Add Bank" button above.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default BankSetup;
