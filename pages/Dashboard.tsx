import React, { useState, useEffect } from 'react';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area,
  BarChart, Bar, PieChart, Pie, Cell
} from 'recharts';
import { 
  TrendingUp, Wallet, Users, ArrowRight, DollarSign, Package, ShoppingCart, 
  Building2, Layers, Activity, RefreshCw, Eye
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface DashboardStats {
  customers: {
    count: number;
    total_balance: number;
  };
  vendors: {
    count: number;
    total_balance: number;
  };
  products: {
    count: number;
    total_stock: number;
  };
  categories: {
    count: number;
  };
  sales: {
    count: number;
    total_amount: number;
    last_30_days: number;
  };
  purchases: {
    count: number;
    total_amount: number;
    last_30_days: number;
  };
  financial: {
    bank_cash_balance: number;
    receivables: number;
    payables: number;
    gross_profit: number;
  };
}

interface TrendData {
  month: string;
  sales: number;
  purchases: number;
  sales_count: number;
  purchase_count: number;
}

interface TopProduct {
  name: string;
  price: number;
  total_sold: number;
  total_revenue: number;
}

interface RecentActivity {
  type: 'sale' | 'purchase';
  reference: string;
  amount: number;
  created_at: string;
  party_name: string;
}

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [trends, setTrends] = useState<TrendData[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const API = import.meta.env.VITE_API_URL;

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      // Fetch all dashboard data in parallel
      const [statsRes, trendsRes, topProductsRes, activitiesRes] = await Promise.all([
        fetch(`${API}/api/dashboard/stats`, { headers }),
        fetch(`${API}/api/dashboard/trends`, { headers }),
        fetch(`${API}/api/dashboard/top-products`, { headers }),
        fetch(`${API}/api/dashboard/recent-activities`, { headers })
      ]);

      if (!statsRes.ok) throw new Error('Failed to fetch stats');
      if (!trendsRes.ok) throw new Error('Failed to fetch trends');
      if (!topProductsRes.ok) throw new Error('Failed to fetch top products');
      if (!activitiesRes.ok) throw new Error('Failed to fetch activities');

      const [statsData, trendsData, topProductsData, activitiesData] = await Promise.all([
        statsRes.json(),
        trendsRes.json(),
        topProductsRes.json(),
        activitiesRes.json()
      ]);

      setStats(statsData);
      setTrends(trendsData);
      setTopProducts(topProductsData);
      setRecentActivities(activitiesData);
    } catch (err: any) {
      console.error('Dashboard fetch error:', err);
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  const statCards = [
    {
      title: 'Total Sales',
      value: stats ? formatCurrency(stats.sales.total_amount) : '₹0',
      subtitle: `${stats?.sales.count || 0} transactions`,
      icon: TrendingUp,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      change: stats?.sales.last_30_days > 0 ? `+${formatCurrency(stats.sales.last_30_days)} (30 days)` : 'No recent sales',
      changeColor: 'text-emerald-600'
    },
    {
      title: 'Bank & Cash',
      value: stats ? formatCurrency(stats.financial.bank_cash_balance) : '₹0',
      subtitle: 'Available balance',
      icon: Wallet,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
      change: 'Liquid assets',
      changeColor: 'text-indigo-600'
    },
    {
      title: 'Receivables',
      value: stats ? formatCurrency(stats.financial.receivables) : '₹0',
      subtitle: `${stats?.customers.count || 0} customers`,
      icon: Users,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      change: 'Outstanding payments',
      changeColor: 'text-amber-600'
    },
    {
      title: 'Gross Profit',
      value: stats ? formatCurrency(stats.financial.gross_profit) : '₹0',
      subtitle: 'Estimated (30% margin)',
      icon: DollarSign,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      change: stats?.financial.gross_profit >= 0 ? 'Positive margin' : 'Negative margin',
      changeColor: stats?.financial.gross_profit >= 0 ? 'text-blue-600' : 'text-red-600'
    }
  ];

  const quickStats = [
    { label: 'Customers', value: stats?.customers.count || 0, icon: Users, color: 'bg-blue-500' },
    { label: 'Vendors', value: stats?.vendors.count || 0, icon: Building2, color: 'bg-purple-500' },
    { label: 'Products', value: stats?.products.count || 0, icon: Package, color: 'bg-green-500' },
    { label: 'Categories', value: stats?.categories.count || 0, icon: Layers, color: 'bg-orange-500' },
    { label: 'Purchases', value: stats?.purchases.count || 0, icon: ShoppingCart, color: 'bg-red-500' },
    { label: 'Total Stock', value: stats?.products.total_stock || 0, icon: Package, color: 'bg-teal-500' }
  ];

  const pieData = [
    { name: 'Receivables', value: stats?.financial.receivables || 0, color: '#f59e0b' },
    { name: 'Bank & Cash', value: stats?.financial.bank_cash_balance || 0, color: '#6366f1' },
    { name: 'Payables', value: stats?.financial.payables || 0, color: '#ef4444' }
  ].filter(item => item.value > 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-500 mb-4">
          <Activity className="w-12 h-12 mx-auto mb-4" />
          <p className="font-medium">Failed to load dashboard data</p>
          <p className="text-sm text-slate-500 mt-2">{error}</p>
        </div>
        <button
          onClick={fetchDashboardData}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <RefreshCw className="w-4 h-4 inline mr-2" />
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Business Overview</h1>
          <p className="text-slate-500">Real-time insights for AK Fabrics Management</p>
        </div>
        <div className="flex space-x-2">
          <button 
            onClick={fetchDashboardData}
            className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
          <Link to="/report-profit" className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-shadow shadow-md">
            Full Report
          </Link>
        </div>
      </div>

      {/* Main Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className={`${stat.bg} p-3 rounded-xl`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
              <span className={`text-xs font-bold ${stat.changeColor} bg-opacity-10 px-2 py-1 rounded-full ${stat.bg}`}>
                {stat.change}
              </span>
            </div>
            <p className="text-slate-500 text-sm font-medium">{stat.title}</p>
            <h3 className="text-2xl font-bold text-slate-800 mt-1">{stat.value}</h3>
            <p className="text-xs text-slate-400 mt-1">{stat.subtitle}</p>
          </div>
        ))}
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {quickStats.map((stat, i) => (
          <div key={i} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3">
              <div className={`${stat.color} p-2 rounded-lg`}>
                <stat.icon className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-xl font-bold text-slate-800">{stat.value}</p>
                <p className="text-xs text-slate-500">{stat.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Financial Trends Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-800">Financial Trends</h3>
            <Link to="/report-profit" className="text-indigo-600 text-xs font-bold hover:underline flex items-center">
              View Details <ArrowRight className="w-3 h-3 ml-1" />
            </Link>
          </div>

          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trends}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip 
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="sales" 
                  stroke="#6366f1" 
                  strokeWidth={3} 
                  fillOpacity={0.1} 
                  fill="#6366f1"
                  name="Sales"
                />
                <Area 
                  type="monotone" 
                  dataKey="purchases" 
                  stroke="#cbd5e1" 
                  strokeWidth={2} 
                  fillOpacity={0.1} 
                  fill="#cbd5e1"
                  name="Purchases"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Financial Distribution Pie Chart */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-6">Financial Distribution</h3>
          
          {pieData.length > 0 ? (
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
              
              <div className="mt-4 space-y-2">
                {pieData.map((item, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                      <span className="text-slate-600">{item.name}</span>
                    </div>
                    <span className="font-medium text-slate-800">{formatCurrency(item.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-slate-400">
              <div className="text-center">
                <Wallet className="w-12 h-12 mx-auto mb-2 opacity-20" />
                <p className="text-sm">No financial data available</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-800">Top Products</h3>
            <Link to="/products" className="text-indigo-600 text-xs font-bold hover:underline flex items-center">
              View All <ArrowRight className="w-3 h-3 ml-1" />
            </Link>
          </div>

          {topProducts.length > 0 ? (
            <div className="space-y-3">
              {topProducts.slice(0, 5).map((product, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600 font-bold text-sm">
                      {i + 1}
                    </div>
                    <div>
                      <p className="font-medium text-slate-800 text-sm">{product.name}</p>
                      <p className="text-xs text-slate-500">{product.total_sold} sold</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-slate-800">{formatCurrency(product.total_revenue)}</p>
                    <p className="text-xs text-slate-500">{formatCurrency(product.price)} each</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-400">
              <Package className="w-12 h-12 mx-auto mb-2 opacity-20" />
              <p className="text-sm">No product sales data available</p>
            </div>
          )}
        </div>

        {/* Recent Activities */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-800">Recent Activities</h3>
            <Link to="/transactions" className="text-indigo-600 text-xs font-bold hover:underline flex items-center">
              View All <ArrowRight className="w-3 h-3 ml-1" />
            </Link>
          </div>

          {recentActivities.length > 0 ? (
            <div className="space-y-3">
              {recentActivities.slice(0, 5).map((activity, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      activity.type === 'sale' ? 'bg-emerald-100' : 'bg-red-100'
                    }`}>
                      {activity.type === 'sale' ? 
                        <TrendingUp className="w-4 h-4 text-emerald-600" /> :
                        <ShoppingCart className="w-4 h-4 text-red-600" />
                      }
                    </div>
                    <div>
                      <p className="font-medium text-slate-800 text-sm capitalize">{activity.type}</p>
                      <p className="text-xs text-slate-500">{activity.party_name}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-slate-800">{formatCurrency(activity.amount)}</p>
                    <p className="text-xs text-slate-500">{activity.reference}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-400">
              <Activity className="w-12 h-12 mx-auto mb-2 opacity-20" />
              <p className="text-sm">No recent activities</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;