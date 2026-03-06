import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import LorrySales from "./LorrySales";
import { Account, Product } from "../types";

interface LorrySalesEditProps {
  accounts: Account[];
  products: Product[];
  onSubmit: (data: any) => void;
}

const LorrySalesEdit: React.FC<LorrySalesEditProps> = ({ accounts, products, onSubmit }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [saleData, setSaleData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const API = import.meta.env.VITE_API_URL;

  useEffect(() => {
    if (id) {
      fetchSaleData(id);
    }
  }, [id]);

  const fetchSaleData = async (saleId: string) => {
    console.log("LorrySalesEdit: Fetching sale data for ID:", saleId);
    try {
      const response = await fetch(`${API}/api/lorry-sales/${saleId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`
        }
      });

      console.log("LorrySalesEdit: Response status:", response.status);
      console.log("LorrySalesEdit: Response ok:", response.ok);

      if (response.ok) {
        const data = await response.json();
        console.log("LorrySalesEdit: Raw response data:", data);
        
        if (data.success && data.data) {
          console.log("LorrySalesEdit: Setting saleData:", data.data);
          setSaleData(data.data);
        } else {
          console.log("LorrySalesEdit: Setting saleData directly:", data);
          setSaleData(data);
        }
      } else {
        const errorText = await response.text();
        console.error("LorrySalesEdit: Failed to fetch data:", errorText);
        setError("Failed to fetch lorry sale data");
      }
    } catch (error) {
      console.error("LorrySalesEdit: Network error:", error);
      setError("Network error occurred");
    } finally {
      console.log("LorrySalesEdit: Setting loading to false");
      setLoading(false);
    }
  };

  const handleSubmit = async (data: any) => {
    const updatedData = { ...data, id };
    await onSubmit(updatedData);
    navigate("/lorry-sales");
  };

  if (loading) {
    console.log("LorrySalesEdit: Showing loading state");
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-500">Loading lorry sale data...</div>
        <div className="ml-4 text-xs text-slate-400">
          Debug: Loading state active, ID: {id}
        </div>
      </div>
    );
  }

  if (error) {
    console.log("LorrySalesEdit: Showing error state:", error);
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500">{error}</div>
        <div className="ml-4 text-xs text-slate-400">
          Debug: Error occurred
        </div>
      </div>
    );
  }

  console.log("LorrySalesEdit: About to render LorrySales component");
  console.log("LorrySalesEdit: saleData:", saleData);
  console.log("LorrySalesEdit: accounts count:", accounts.length);
  console.log("LorrySalesEdit: products count:", products.length);

  return (
    <LorrySales
      accounts={accounts}
      products={products}
      onSubmit={handleSubmit}
      initialData={saleData}
    />
  );
};

export default LorrySalesEdit;
