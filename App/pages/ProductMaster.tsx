import React, { useState, useRef, useEffect } from 'react';
import { Package, Plus, X, Search, FileEdit, Trash2, Image as ImageIcon, CheckCircle2, XCircle, Upload, ChevronDown, Layers, Eye } from 'lucide-react';
import { Category, SubCategory, Product } from '../types';

interface ProductMasterProps {
  categories: Category[];
  subCategories: SubCategory[];
  products: Product[];
  onAddProduct: (product: Product) => void;
  onUpdateProduct: (product: Product) => void;
  onDeleteProduct: (id: string) => void;
}

const ProductMaster: React.FC<ProductMasterProps> = ({ 
  categories, 
  subCategories, 
  products, 
  onAddProduct, 
  onUpdateProduct, 
  onDeleteProduct 
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({ 
    categoryId: '',
    subCategoryId: '',
    name: '', 
    description: '', 
    price: 0,
    stock: 0,
    images: [] as string[], 
    isActive: true,
    designNo: '',
    color: '',
    quality: '',
    location: ''
  });

  // Filter sub-categories based on selected category
  const availableSubCategories = subCategories.filter(sub => sub.categoryId === formData.categoryId);

  useEffect(() => {
    // Reset sub-category if it's not in the available list
    if (formData.subCategoryId && !availableSubCategories.find(sub => sub.id === formData.subCategoryId)) {
      setFormData(prev => ({ ...prev, subCategoryId: '' }));
    }
  }, [formData.categoryId, availableSubCategories]);

  const handleOpenModal = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        categoryId: product.categoryId,
        subCategoryId: product.subCategoryId,
        name: product.name,
        description: product.description || '',
        price: product.price,
        stock: product.stock,
        images: product.images || [],
        isActive: product.isActive,
        designNo: product.designNo || '',
        color: product.color || '',
        quality: product.quality || '',
        location: product.location || ''
      });
    } else {
      setEditingProduct(null);
      setFormData({ 
        categoryId: categories.length > 0 ? categories[0].id : '', 
        subCategoryId: '',
        name: '', 
        description: '', 
        price: 0,
        stock: 0,
        images: [], 
        isActive: true,
        designNo: '',
        color: '',
        quality: '',
        location: ''
      });
    }
    setIsModalOpen(true);
  };

const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault();

  if (!formData.categoryId || !formData.subCategoryId) {
    alert("Select category & sub-category");
    return;
  }

  const form = new FormData();

  form.append("id", editingProduct?.id || `prod-${Date.now()}`);
  form.append("categoryId", formData.categoryId);
  form.append("subCategoryId", formData.subCategoryId);
  form.append("name", formData.name);
  form.append("description", formData.description);
  form.append("price", String(formData.price));
  form.append("stock", String(formData.stock));
  form.append("isActive", String(formData.isActive));
  form.append("designNo", formData.designNo);
  form.append("color", formData.color);
  form.append("quality", formData.quality);
  form.append("location", formData.location);

  if (fileInputRef.current?.files) {
    Array.from(fileInputRef.current.files).forEach(file => {
      form.append("images", file);
    });
  }

  if (editingProduct) {
    onUpdateProduct(editingProduct.id, form);
  } else {
    onAddProduct(form);
  }

  setIsModalOpen(false);
};

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach((file: File) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setFormData(prev => ({ 
            ...prev, 
            images: [...prev.images, reader.result as string] 
          }));
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const filteredProducts = products.filter(prod => 
    prod.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (prod.description && prod.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getCategoryName = (id: string) => categories.find(c => c.id === id)?.name || 'Unknown';
  const getSubCategoryName = (id: string) => subCategories.find(s => s.id === id)?.name || 'Unknown';

  const renderImagePopup = (imageUrl: string) => {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-md p-4" onClick={() => setViewingImage(null)}>
        <div className="relative max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl shadow-2xl" onClick={e => e.stopPropagation()}>
          <button 
            onClick={() => setViewingImage(null)} 
            className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/40 rounded-full text-white transition-colors z-10"
          >
            <X className="w-6 h-6" />
          </button>
          <img 
            src={imageUrl} 
            alt="Product Preview" 
            className="w-full h-full object-contain"
            referrerPolicy="no-referrer"
          />
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Product Master</h1>
          <p className="text-slate-500 text-sm">Manage your fabric products, pricing, and stock levels.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search products..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 w-full md:w-64"
            />
          </div>
          <button 
            onClick={() => handleOpenModal()}
            className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/20 whitespace-nowrap"
          >
            <Plus className="w-4 h-4 mr-2" /> New Product
          </button>
        </div>
      </div>

      {viewingImage && renderImagePopup(viewingImage)}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-slate-800">{editingProduct ? 'Edit Product' : 'Create Product'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 hover:bg-slate-100 rounded-full transition-colors">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[80vh]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Category</label>
                  <div className="relative">
                    <select 
                      required
                      value={formData.categoryId}
                      onChange={e => setFormData({...formData, categoryId: e.target.value})}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none appearance-none"
                    >
                      <option value="" disabled>Select Category</option>
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sub-Category</label>
                  <div className="relative">
                    <select 
                      required
                      value={formData.subCategoryId}
                      onChange={e => setFormData({...formData, subCategoryId: e.target.value})}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none appearance-none"
                      disabled={!formData.categoryId}
                    >
                      <option value="" disabled>Select Sub-Category</option>
                      {availableSubCategories.map(sub => (
                        <option key={sub.id} value={sub.id}>{sub.name}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>
                <div className="space-y-1 md:col-span-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Product Name</label>
                  <input 
                    required 
                    value={formData.name} 
                    onChange={e => setFormData({...formData, name: e.target.value})} 
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none" 
                    placeholder="e.g. Premium Silk Satin" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Price</label>
                  <input 
                    type="number"
                    required 
                    value={formData.price} 
                    onChange={e => setFormData({...formData, price: parseFloat(e.target.value)})} 
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none" 
                    placeholder="0.00" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Initial Stock</label>
                  <input 
                    type="number"
                    required 
                    value={formData.stock} 
                    onChange={e => setFormData({...formData, stock: parseFloat(e.target.value)})} 
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none" 
                    placeholder="0" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Design No</label>
                  <input 
                    value={formData.designNo} 
                    onChange={e => setFormData({...formData, designNo: e.target.value})} 
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none" 
                    placeholder="e.g. D-101" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Color</label>
                  <input 
                    value={formData.color} 
                    onChange={e => setFormData({...formData, color: e.target.value})} 
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none" 
                    placeholder="e.g. Royal Blue" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Quality</label>
                  <input 
                    value={formData.quality} 
                    onChange={e => setFormData({...formData, quality: e.target.value})} 
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none" 
                    placeholder="e.g. 60x60" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Location</label>
                  <input 
                    value={formData.location} 
                    onChange={e => setFormData({...formData, location: e.target.value})} 
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none" 
                    placeholder="e.g. Rack A-1" 
                  />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Product Images</label>
                  <div className="space-y-3">
                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
                      {formData.images.map((img, index) => (
                        <div key={index} className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 bg-slate-100 group">
                          <img src={img} alt={`Preview ${index}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          <button 
                            type="button"
                            onClick={() => removeImage(index)}
                            className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="w-4 h-4 text-white" />
                          </button>
                        </div>
                      ))}
                      <button 
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="aspect-square flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-xl text-slate-400 hover:border-indigo-400 hover:text-indigo-600 transition-all"
                      >
                        <Upload className="w-5 h-5 mb-1" />
                        <span className="text-[8px] font-bold uppercase">Add</span>
                      </button>
                    </div>
                    <input 
                      type="file" 
                      ref={fileInputRef}
                      accept="image/*"
                      multiple
                      onChange={handleFileChange}
                      className="hidden" 
                    />
                  </div>
                </div>
                <div className="space-y-1 md:col-span-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Brief Description</label>
                  <textarea 
                    rows={3} 
                    value={formData.description} 
                    onChange={e => setFormData({...formData, description: e.target.value})} 
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none" 
                    placeholder="Details about this product..." 
                  />
                </div>
                <div className="flex items-center justify-between py-2 md:col-span-2">
                  <label className="text-sm font-medium text-slate-700">Active Status</label>
                  <button 
                    type="button"
                    onClick={() => setFormData({...formData, isActive: !formData.isActive})}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${formData.isActive ? 'bg-indigo-600' : 'bg-slate-200'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.isActive ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
              </div>
              <div className="pt-6 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="flex-1 py-3 bg-indigo-600 text-white rounded-2xl font-bold shadow-xl shadow-indigo-500/30 hover:bg-indigo-700 transition-colors"
                >
                  {editingProduct ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredProducts.map(prod => (
          <div key={prod.id} className="bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl transition-all group overflow-hidden flex flex-col">
            <div className="relative h-48 bg-slate-100 overflow-hidden">
              {prod.images && prod.images.length > 0 ? (
                <img 
                  src={prod.images[0]} 
                  alt={prod.name} 
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-300">
                  <Package className="w-12 h-12" />
                </div>
              )}
              <div className="absolute top-4 right-4 flex gap-2">
                {prod.images && prod.images.length > 0 && (
                  <button 
                    onClick={() => setViewingImage(prod.images[0])}
                    className="p-2 bg-white/90 backdrop-blur-sm rounded-xl text-slate-600 hover:text-emerald-600 shadow-sm transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                )}
                <button 
                  onClick={() => handleOpenModal(prod)}
                  className="p-2 bg-white/90 backdrop-blur-sm rounded-xl text-slate-600 hover:text-indigo-600 shadow-sm transition-colors"
                >
                  <FileEdit className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => {
                    if (window.confirm('Are you sure you want to delete this product?')) {
                      onDeleteProduct(prod.id);
                    }
                  }}
                  className="p-2 bg-white/90 backdrop-blur-sm rounded-xl text-slate-600 hover:text-red-600 shadow-sm transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="absolute bottom-4 left-4">
                <span className={`flex items-center px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider shadow-sm ${
                  prod.isActive 
                  ? 'bg-emerald-500 text-white' 
                  : 'bg-slate-500 text-white'
                }`}>
                  {prod.isActive ? (
                    <><CheckCircle2 className="w-3 h-3 mr-1" /> Active</>
                  ) : (
                    <><XCircle className="w-3 h-3 mr-1" /> Inactive</>
                  )}
                </span>
              </div>
              {prod.images && prod.images.length > 1 && (
                <div className="absolute bottom-4 right-4 bg-black/50 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-1 rounded-lg">
                  +{prod.images.length - 1} more
                </div>
              )}
            </div>
            <div className="p-6 flex-1 flex flex-col">
              <div className="flex gap-2 mb-2">
                <span className="text-[8px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg uppercase tracking-wider">
                  {getCategoryName(prod.categoryId)}
                </span>
                <span className="text-[8px] font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded-lg uppercase tracking-wider">
                  {getSubCategoryName(prod.subCategoryId)}
                </span>
              </div>
              <h3 className="text-lg font-black text-slate-800 mb-1">{prod.name}</h3>
              <p className="text-xs text-slate-500 leading-relaxed flex-1 line-clamp-2">
                {prod.description || 'No description provided.'}
              </p>
              
              <div className="mt-4 grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-2 rounded-xl">
                  <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1">Price</p>
                  <p className="text-sm font-black text-slate-800">₹{prod.price.toLocaleString()}</p>
                </div>
                <div className={`p-2 rounded-xl ${prod.stock < 10 ? 'bg-red-50' : 'bg-emerald-50'}`}>
                  <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1">Stock</p>
                  <p className={`text-sm font-black ${prod.stock < 10 ? 'text-red-600' : 'text-emerald-600'}`}>
                    {prod.stock}
                  </p>
                </div>
                {prod.quality && (
                  <div className="bg-slate-50 p-2 rounded-xl">
                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1">Quality</p>
                    <p className="text-[10px] font-bold text-slate-700">{prod.quality}</p>
                  </div>
                )}
                {prod.location && (
                  <div className="bg-slate-50 p-2 rounded-xl">
                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1">Location</p>
                    <p className="text-[10px] font-bold text-slate-700">{prod.location}</p>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                <span>ID: {prod.id}</span>
                <button 
                  onClick={() => handleOpenModal(prod)}
                  className="text-indigo-600 hover:underline"
                >
                  Manage
                </button>
              </div>
            </div>
          </div>
        ))}
        
        {filteredProducts.length === 0 && (
          <div className="col-span-full py-20 flex flex-col items-center justify-center text-slate-400 bg-white rounded-3xl border-2 border-dashed border-slate-200">
            <Package className="w-12 h-12 mb-4 opacity-20" />
            <p className="font-medium">No products found</p>
            <button 
              onClick={() => handleOpenModal()}
              className="mt-4 text-indigo-600 font-bold hover:underline"
            >
              Add your first product
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductMaster;
