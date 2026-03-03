import React, { useState, useRef } from 'react';
import { Layers, Plus, X, Search, FileEdit, Trash2, Image as ImageIcon, CheckCircle2, XCircle, Upload, ChevronDown } from 'lucide-react';
import { Category, SubCategory } from '../types';

interface SubCategoryMasterProps {
  categories: Category[];
  subCategories: SubCategory[];
  onAddSubCategory: (form: FormData) => void;
  onUpdateSubCategory: (id: string, form: FormData) => void;
  onDeleteSubCategory: (id: string) => void;
}

const SubCategoryMaster: React.FC<SubCategoryMasterProps> = ({ 
  categories, 
  subCategories, 
  onAddSubCategory, 
  onUpdateSubCategory, 
  onDeleteSubCategory 
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSubCategory, setEditingSubCategory] = useState<SubCategory | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({ 
    categoryId: '',
    name: '', 
    description: '', 
    image: '', 
    isActive: true 
  });

  const handleOpenModal = (subCategory?: SubCategory) => {
    if (subCategory) {
      setEditingSubCategory(subCategory);
      setFormData({
        categoryId: subCategory.categoryId,
        name: subCategory.name,
        description: subCategory.description || '',
        image: subCategory.image || '',
        isActive: subCategory.isActive
      });
    } else {
      setEditingSubCategory(null);
      setFormData({ 
        categoryId: categories.length > 0 ? categories[0].id : '', 
        name: '', 
        description: '', 
        image: '', 
        isActive: true 
      });
    }
    setIsModalOpen(true);
  };

const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault();

  if (!formData.categoryId) {
    alert("Please select a category");
    return;
  }

  const shopId = localStorage.getItem("shop_id");

  const form = new FormData();
  form.append("id", editingSubCategory?.id || `subcat-${Date.now()}`);
  form.append("categoryId", formData.categoryId);
  form.append("name", formData.name);
  form.append("description", formData.description);
  form.append("isActive", String(formData.isActive));
  form.append("shop_id", shopId!);

  if (fileInputRef.current?.files?.[0]) {
    form.append("image", fileInputRef.current.files[0]);
  }

  if (editingSubCategory) {
    onUpdateSubCategory(editingSubCategory.id, form);
  } else {
    onAddSubCategory(form);
  }

  setIsModalOpen(false);
};

     const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (file) {
    setFormData(prev => ({
      ...prev,
      image: file.name
    }));
  }
};

  const filteredSubCategories = subCategories.filter(sub => 
    sub.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (sub.description && sub.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getCategoryName = (id: string) => {
    return categories.find(c => c.id === id)?.name || 'Unknown Category';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Sub-Category Master</h1>
          <p className="text-slate-500 text-sm">Manage sub-groups within your main fabric categories.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search sub-categories..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 w-full md:w-64"
            />
          </div>
          <button 
            onClick={() => handleOpenModal()}
            className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/20 whitespace-nowrap"
          >
            <Plus className="w-4 h-4 mr-2" /> New Sub-Category
          </button>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-slate-800">{editingSubCategory ? 'Edit Sub-Category' : 'Create Sub-Category'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 hover:bg-slate-100 rounded-full transition-colors">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Parent Category</label>
                <div className="relative">
                  <select 
                    required
                    value={formData.categoryId}
                    onChange={e => setFormData({...formData, categoryId: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none appearance-none"
                  >
                    <option value="" disabled>Select a category</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sub-Category Name</label>
                <input 
                  required 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none" 
                  placeholder="e.g. Printed Silk" 
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sub-Category Image</label>
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <div className="relative flex-1">
                      <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input 
                        value={formData.image} 
                        onChange={e => setFormData({...formData, image: e.target.value})} 
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none" 
                        placeholder="Image URL or upload below..." 
                      />
                    </div>
                    {formData.image && (
                      <div className="relative w-10 h-10 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 flex-shrink-0 group">
                        <img src={formData.image} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        <button 
                          type="button"
                          onClick={() => setFormData({...formData, image: ''})}
                          className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="w-4 h-4 text-white" />
                        </button>
                      </div>
                    )}
                  </div>
                  
                  <div className="relative">
                    <input 
                      type="file" 
                      ref={fileInputRef}
                      accept="image/*"
                      onChange={handleFileChange}
                      className="absolute inset-0 w-0 h-0 opacity-0 pointer-events-none" 
                    />
                    <button 
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center justify-center w-full px-4 py-2 bg-white border-2 border-dashed border-slate-200 rounded-xl text-sm text-slate-500 cursor-pointer hover:border-indigo-400 hover:text-indigo-600 transition-all"
                    >
                      <Upload className="w-4 h-4 mr-2" /> Choose from device
                    </button>
                  </div>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Brief Description</label>
                <textarea 
                  rows={3} 
                  value={formData.description} 
                  onChange={e => setFormData({...formData, description: e.target.value})} 
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none" 
                  placeholder="Details about this sub-group..." 
                />
              </div>
              <div className="flex items-center justify-between py-2">
                <label className="text-sm font-medium text-slate-700">Active Status</label>
                <button 
                  type="button"
                  onClick={() => setFormData({...formData, isActive: !formData.isActive})}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${formData.isActive ? 'bg-indigo-600' : 'bg-slate-200'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.isActive ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
              <div className="pt-4 flex gap-3">
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
                  {editingSubCategory ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredSubCategories.map(sub => (
          <div key={sub.id} className="bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl transition-all group overflow-hidden flex flex-col">
            <div className="relative h-48 bg-slate-100 overflow-hidden">
              {sub.image ? (
                <img
  src={`${import.meta.env.VITE_API_URL}/uploads/subcategories/${sub.image}`}
  alt={sub.name}
  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
/>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-300">
                  <Layers className="w-12 h-12" />
                </div>
              )}
              <div className="absolute top-4 right-4 flex gap-2">
                <button 
                  onClick={() => handleOpenModal(sub)}
                  className="p-2 bg-white/90 backdrop-blur-sm rounded-xl text-slate-600 hover:text-indigo-600 shadow-sm transition-colors"
                >
                  <FileEdit className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => {
                    if (window.confirm('Are you sure you want to delete this sub-category?')) {
                      onDeleteSubCategory(sub.id);
                    }
                  }}
                  className="p-2 bg-white/90 backdrop-blur-sm rounded-xl text-slate-600 hover:text-red-600 shadow-sm transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="absolute bottom-4 left-4">
                <span className={`flex items-center px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider shadow-sm ${
                  sub.isActive 
                  ? 'bg-emerald-500 text-white' 
                  : 'bg-slate-500 text-white'
                }`}>
                  {sub.isActive ? (
                    <><CheckCircle2 className="w-3 h-3 mr-1" /> Active</>
                  ) : (
                    <><XCircle className="w-3 h-3 mr-1" /> Inactive</>
                  )}
                </span>
              </div>
            </div>
            <div className="p-6 flex-1 flex flex-col">
              <div className="mb-2">
                <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg uppercase tracking-wider">
                  {getCategoryName(sub.categoryId)}
                </span>
              </div>
              <h3 className="text-lg font-black text-slate-800 mb-1">{sub.name}</h3>
              <p className="text-xs text-slate-500 leading-relaxed flex-1">
                {sub.description || 'No description provided.'}
              </p>
              <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                <span>ID: {sub.id}</span>
                <button 
                  onClick={() => handleOpenModal(sub)}
                  className="text-indigo-600 hover:underline"
                >
                  Manage
                </button>
              </div>
            </div>
          </div>
        ))}
        
        {filteredSubCategories.length === 0 && (
          <div className="col-span-full py-20 flex flex-col items-center justify-center text-slate-400 bg-white rounded-3xl border-2 border-dashed border-slate-200">
            <Layers className="w-12 h-12 mb-4 opacity-20" />
            <p className="font-medium">No sub-categories found</p>
            <button 
              onClick={() => handleOpenModal()}
              className="mt-4 text-indigo-600 font-bold hover:underline"
            >
              Add your first sub-category
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SubCategoryMaster;
