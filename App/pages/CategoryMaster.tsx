import React, { useState, useRef } from 'react';
import { Layers, Plus, X, Search, FileEdit, Trash2, Image as ImageIcon, CheckCircle2, XCircle, Upload } from 'lucide-react';
import { Category } from '../types';

interface CategoryMasterProps {
  categories: Category[];
  onAddCategory: (form: FormData) => void;
  onUpdateCategory: (id: string, form: FormData) => void;
  onDeleteCategory: (id: string) => void;
}

const API = import.meta.env.VITE_API_URL;

const CategoryMaster: React.FC<CategoryMasterProps> = ({
  categories,
  onAddCategory,
  onUpdateCategory,
  onDeleteCategory
}) => {

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    image: '',
    isActive: true
  });

  const handleOpenModal = (category?: Category) => {
    if (category) {
      setEditingCategory(category);
      setFormData({
        name: category.name,
        description: category.description || '',
        image: category.image || '',
        isActive: category.isActive
      });
    } else {
      setEditingCategory(null);
      setFormData({ name: '', description: '', image: '', isActive: true });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const shopId = localStorage.getItem("shop_id");

    const form = new FormData();
    form.append("id", editingCategory?.id || `cat-${Date.now()}`);
    form.append("name", formData.name);
    form.append("description", formData.description);
    form.append("isActive", String(formData.isActive));
    form.append("shop_id", shopId!);

    if (fileInputRef.current?.files?.[0]) {
      form.append("image", fileInputRef.current.files[0]);
    }

    if (editingCategory) {
      onUpdateCategory(editingCategory.id, form);
    } else {
      onAddCategory(form);
    }

    setIsModalOpen(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData(prev => ({
        ...prev,
        image: file.name // show file name only
      }));
    }
  };

  const filteredCategories = categories.filter(cat =>
    cat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (cat.description && cat.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6">

      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Category Master</h1>
          <p className="text-slate-500 text-sm">Manage fabric groups, images, and visibility.</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search categories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 w-full md:w-64"
            />
          </div>

          <button
            onClick={() => handleOpenModal()}
            className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" /> New Category
          </button>
        </div>
      </div>

      {/* CATEGORY GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">

        {filteredCategories.map(cat => (
          <div key={cat.id} className="bg-white rounded-3xl border shadow-sm group overflow-hidden">

            <div className="relative h-48 bg-slate-100 overflow-hidden">

              {cat.image ? (
                <img
                  src={`${API}/uploads/categories/${cat.image}`}
                  alt={cat.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-300">
                  <Layers className="w-12 h-12" />
                </div>
              )}

              <div className="absolute top-4 right-4 flex gap-2">
                <button
                  onClick={() => handleOpenModal(cat)}
                  className="p-2 bg-white rounded-xl text-slate-600 hover:text-indigo-600"
                >
                  <FileEdit className="w-4 h-4" />
                </button>

                <button
                  onClick={() => {
                    if (window.confirm('Are you sure you want to delete this category?')) {
                      onDeleteCategory(cat.id);
                    }
                  }}
                  className="p-2 bg-white rounded-xl text-slate-600 hover:text-red-600"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="absolute bottom-4 left-4">
                <span className={`px-2 py-1 rounded-lg text-xs font-bold ${
                  cat.isActive ? 'bg-emerald-500 text-white' : 'bg-slate-500 text-white'
                }`}>
                  {cat.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>

            </div>

            <div className="p-6">
              <h3 className="text-lg font-black text-slate-800 mb-1">{cat.name}</h3>
              <p className="text-xs text-slate-500">
                {cat.description || 'No description provided.'}
              </p>
            </div>

          </div>
        ))}

      </div>

    </div>
  );
};

export default CategoryMaster;