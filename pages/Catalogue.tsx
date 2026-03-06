import React, { useState, useEffect, useMemo } from 'react';
import { Product } from '../types';
import {
  Search, Package, ArrowLeft, MessageCircle,
  ChevronRight, Layers, Grid3X3, X, CheckSquare,
  Square, Share2, Copy
} from 'lucide-react';

interface CatalogueProps {
  products: Product[];
}

const API = import.meta.env.VITE_API_URL;

const resolveImage = (img: string | undefined | null, folder = 'categories'): string | null => {
  if (!img) return null;
  if (img.startsWith('http') || img.startsWith('blob:')) return img;
  return `${API}/uploads/${folder}/${img}`;  // ← remove the extension check
};

const GRADIENTS = [
  'linear-gradient(135deg,#667eea,#764ba2)',
  'linear-gradient(135deg,#f093fb,#f5576c)',
  'linear-gradient(135deg,#4facfe,#00f2fe)',
  'linear-gradient(135deg,#43e97b,#38f9d7)',
  'linear-gradient(135deg,#fa709a,#fee140)',
  'linear-gradient(135deg,#a18cd1,#fbc2eb)',
  'linear-gradient(135deg,#fda085,#f6d365)',
  'linear-gradient(135deg,#89f7fe,#66a6ff)',
];

const Catalogue: React.FC<CatalogueProps> = ({ products }) => {
  const [searchTerm, setSearchTerm]             = useState('');
  const [categories, setCategories]             = useState<any[]>([]);
  const [subCategories, setSubCategories]       = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<any | null>(null);
  const [selectedSub, setSelectedSub]           = useState<any | null>(null);
  const [view, setView]                         = useState<'categories' | 'subcategories' | 'products'>('categories');
  const [shareProduct, setShareProduct]         = useState<Product | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode]       = useState(false);
  const [bulkShareMode, setBulkShareMode]       = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const h = { Authorization: `Bearer ${token}` };
    fetch(`${API}/api/categories`, { headers: h })
      .then(r => r.ok ? r.json() : []).then(setCategories).catch(() => {});
    fetch(`${API}/api/sub-categories`, { headers: h })
      .then(r => r.ok ? r.json() : []).then(setSubCategories).catch(() => {});
  }, []);

  const subsByCat = useMemo(() => {
    const map: Record<string, any[]> = {};
    subCategories.forEach(s => {
      const key = s.category_id || s.categoryId || '';
      if (!map[key]) map[key] = [];
      map[key].push(s);
    });
    return map;
  }, [subCategories]);

  const visibleProducts = useMemo(() => {
    let list = products;
    if (selectedSub) {
      list = list.filter(p =>
        (p as any).sub_category_id === selectedSub.id ||
        (p as any).subCategoryId   === selectedSub.id
      );
    } else if (selectedCategory) {
      list = list.filter(p =>
        (p as any).category_id === selectedCategory.id ||
        (p as any).categoryId  === selectedCategory.id
      );
    }
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      list = list.filter(p =>
        p.name?.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q) ||
        p.hsnCode?.toLowerCase().includes(q) ||
        p.designNo?.toLowerCase().includes(q) ||
        (p as any).color?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [products, selectedCategory, selectedSub, searchTerm]);

  const selectCategory = (cat: any) => {
    setSelectedCategory(cat);
    setView((subsByCat[cat.id] || []).length > 0 ? 'subcategories' : 'products');
  };

  const selectSub = (sub: any) => {
    setSelectedSub(sub);
    setView('products');
  };

  const goBack = () => {
    if (view === 'products' && selectedSub) {
      setSelectedSub(null);
      setView('subcategories');
    } else {
      setSelectedCategory(null);
      setSelectedSub(null);
      setView('categories');
    }
  };

  const handleWhatsApp = async (product: Product) => {
    console.log('handleWhatsApp called with product:', product);
    const imgUrl = product.images?.[0] ? resolveImage(product.images[0], 'products') : null;
    console.log('Resolved image URL:', imgUrl);

    // Clean text — no emoji that render as boxes on some devices
    const text =
      `*${product.name}*\n` +
      (product.designNo           ? `Design No: ${product.designNo}\n`       : '') +
      ((product as any).color     ? `Color: ${(product as any).color}\n`     : '') +
      ((product as any).quality   ? `Quality: ${(product as any).quality}\n` : '') +
      ((product as any).hsnCode   ? `HSN: ${(product as any).hsnCode}\n`     : '') +
      `Price: Rs.${product.price}\n` +
      `Stock: ${product.stock} units`;
    
    console.log('Share text:', text);

    // ── Try Web Share API — shares real image file to multiple apps ────────────
    if (imgUrl && typeof navigator !== 'undefined' && navigator.share) {
      console.log('Trying Web Share API...');
      try {
        const res  = await fetch(imgUrl);
        console.log('Image fetch response:', res);
        const blob = await res.blob();
        console.log('Image blob:', blob);
        
        // Fix: Ensure correct image MIME type
        const imageType = blob.type === 'application/octet-stream' ? 'image/jpeg' : blob.type;
        const correctedBlob = blob.type === 'application/octet-stream' 
          ? new Blob([blob], { type: 'image/jpeg' }) 
          : blob;
        
        const ext = correctedBlob.type.split('/')[1] || 'jpg';
        const file = new File(
          [correctedBlob],
          `${product.name.replace(/\s+/g, '_')}.${ext}`,
          { type: correctedBlob.type }
        );
        console.log('Created file:', file);

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          console.log('Can share files, calling navigator.share...');
          // Share to multiple apps (WhatsApp, Instagram, Telegram, etc.)
          await navigator.share({ 
            title: product.name,
            text: text,
            files: [file]
          });
          console.log('Share completed successfully');
          return; // done — native share sheet opened with multiple apps
        }

        console.log('Cannot share files, trying text + url...');
        // canShare true but no file support — share text + url to multiple apps
        await navigator.share({ 
          title: product.name,
          text: text,
          url: imgUrl 
        });
        console.log('Text + url share completed');
        return;
      } catch (err: any) {
        console.error('Web Share API error:', err);
        if (err?.name === 'AbortError') return; // user cancelled
        // else fall through to WhatsApp only
      }
    }

    console.log('Falling back to WhatsApp...');
    // ── Fallback: WhatsApp only (no localhost URL appended) ─
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
    console.log('Opening WhatsApp URL:', whatsappUrl);
    window.open(whatsappUrl, '_blank');
  };

  const handleBulkWhatsApp = async () => {
    const selectedProductsList = visibleProducts.filter(p => selectedProducts.has(p.id));
    if (selectedProductsList.length === 0) return;

    // Try to share actual images with details to multiple apps using Web Share API
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        // Fetch all selected product images
        const imagePromises = selectedProductsList.map(async (product) => {
          const imgUrl = product.images?.[0] ? resolveImage(product.images[0], 'products') : null;
          if (imgUrl) {
            try {
              const res = await fetch(imgUrl);
              const blob = await res.blob();
              
              // Fix: Ensure correct image MIME type
              const correctedBlob = blob.type === 'application/octet-stream' 
                ? new Blob([blob], { type: 'image/jpeg' }) 
                : blob;
              
              const ext = correctedBlob.type.split('/')[1] || 'jpg';
              const file = new File(
                [correctedBlob],
                `${product.name.replace(/\s+/g, '_')}.${ext}`,
                { type: correctedBlob.type }
              );
              return { file, product };
            } catch {
              return { file: null, product };
            }
          }
          return { file: null, product };
        });

        const imageResults = await Promise.all(imagePromises);
        const validFiles = imageResults.filter(result => result.file).map(result => result.file);
        
        // Create text with all product details
        let text = `*Product Catalogue*\n\n`;
        selectedProductsList.forEach((product, index) => {
          text += `${index + 1}. *${product.name}*\n`;
          if (product.designNo) text += `   Design No: ${product.designNo}\n`;
          if ((product as any).color) text += `   Color: ${(product as any).color}\n`;
          text += `   Price: Rs.${product.price}\n`;
          text += `   Stock: ${product.stock} units\n\n`;
        });

        // Try to share files with text to multiple apps
        if (validFiles.length > 0 && navigator.canShare && navigator.canShare({ files: validFiles })) {
          // Share to multiple apps (WhatsApp, Instagram, Telegram, etc.)
          await navigator.share({ 
            title: 'Product Catalogue',
            text: text,
            files: validFiles
          });
          return;
        }
      } catch (error) {
        // Fall back to text-only sharing
      }
    }

    // Fallback: Share text with image URLs to multiple apps
    let text = `*Product Catalogue*\n\n`;
    selectedProductsList.forEach((product, index) => {
      text += `${index + 1}. *${product.name}*\n`;
      if (product.designNo) text += `   Design No: ${product.designNo}\n`;
      if ((product as any).color) text += `   Color: ${(product as any).color}\n`;
      text += `   Price: Rs.${product.price}\n`;
      text += `   Stock: ${product.stock} units`;
      
      const imgUrl = product.images?.[0] ? resolveImage(product.images[0], 'products') : null;
      if (imgUrl) {
        text += `\n   Image: ${imgUrl}`;
      }
      text += `\n\n`;
    });

    // Try to share text to multiple apps
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ 
          title: 'Product Catalogue',
          text: text
        });
        return;
      } catch (error) {
        // Fall back to WhatsApp only
      }
    }

    // Final fallback: WhatsApp only
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleBulkCopy = () => {
    const selectedProductsList = visibleProducts.filter(p => selectedProducts.has(p.id));
    if (selectedProductsList.length === 0) return;

    let text = `Product Catalogue\n\n`;
    selectedProductsList.forEach((product, index) => {
      text += `${index + 1}. ${product.name}\n`;
      if (product.designNo) text += `   Design: ${product.designNo}\n`;
      if ((product as any).color) text += `   Color: ${(product as any).color}\n`;
      text += `   Price: Rs.${product.price}\n`;
      text += `   Stock: ${product.stock} units\n\n`;
    });

    navigator.clipboard.writeText(text);
    alert('Product details copied to clipboard!');
  };

  const toggleProductSelection = (productId: string) => {
    const newSelection = new Set(selectedProducts);
    if (newSelection.has(productId)) {
      newSelection.delete(productId);
    } else {
      newSelection.add(productId);
    }
    setSelectedProducts(newSelection);
  };

  const toggleSelectionMode = () => {
    setSelectionMode(!selectionMode);
    setSelectedProducts(new Set());
  };

  const isSearching = searchTerm.length > 0;
  const pageTitle =
    view === 'categories'    ? 'Product Catalogue'
    : view === 'subcategories' ? selectedCategory?.name
    : selectedSub?.name || selectedCategory?.name || 'Products';

  // ── Category / Sub card — SAME style as CategoryMaster ───────
  const GridCard = ({ item, index, count, subCount, onClick }: {
    item: any; index: number; count: number; subCount?: number; onClick: () => void;
  }) => {
    const imgUrl = resolveImage(item.image);
    const grad   = GRADIENTS[index % GRADIENTS.length];

    return (
      <div onClick={onClick}
        className="bg-white rounded-3xl border border-slate-200 shadow-sm group overflow-hidden cursor-pointer hover:shadow-xl transition-all duration-300">

        <div className="relative h-48 overflow-hidden" style={{ background: grad }}>
          {imgUrl && (
            <img src={imgUrl} alt={item.name}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          )}
          {!imgUrl && (
            <div className="w-full h-full flex items-center justify-center">
              <Layers className="w-12 h-12 text-white/40" />
            </div>
          )}

          <div className="absolute top-4 right-4">
            <span className="bg-white/20 backdrop-blur-sm text-white text-xs font-bold px-2.5 py-1 rounded-full border border-white/30">
              {count} items
            </span>
          </div>

          {subCount !== undefined && subCount > 0 && (
            <div className="absolute bottom-4 left-4">
              <span className="flex items-center gap-1 bg-black/25 backdrop-blur-sm text-white text-xs px-2.5 py-1 rounded-full">
                <Layers className="w-3 h-3" /> {subCount} sub-categories
              </span>
            </div>
          )}
        </div>

        <div className="p-5 flex items-center justify-between">
          <div className="min-w-0">
            <h3 className="text-lg font-black text-slate-800 leading-tight truncate">{item.name}</h3>
            {item.description && (
              <p className="text-xs text-slate-500 mt-0.5 truncate">{item.description}</p>
            )}
          </div>
          <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-indigo-600 shrink-0 ml-2 transition-colors" />
        </div>
      </div>
    );
  };

  // ── Product card — same card shell as CategoryMaster ─────────
  const ProductCard = ({ product }: { product: Product }) => {
    const imgUrl = product.images?.[0] ? resolveImage(product.images[0], 'products') : null;
    const isSelected = selectedProducts.has(product.id);

    return (
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm group overflow-hidden hover:shadow-xl transition-all duration-300 relative">

        {/* Selection Mode Overlay */}
        {selectionMode && (
          <div className="absolute top-4 left-4 z-10">
            <button
              onClick={(e) => { e.stopPropagation(); toggleProductSelection(product.id); }}
              className={`p-2 rounded-xl transition-all ${
                isSelected 
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' 
                  : 'bg-white/90 backdrop-blur-sm text-slate-600 border border-slate-200'
              }`}
            >
              {isSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
            </button>
          </div>
        )}

        <div className="relative h-48 bg-slate-100 overflow-hidden">
          <div 
            onClick={() => {
              // Create image-only view
              const imgUrl = product.images?.[0] ? resolveImage(product.images[0], 'products') : null;
              if (imgUrl) {
                // Create a simple modal to view image
                const imageModal = document.createElement('div');
                imageModal.className = 'fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4';
                imageModal.innerHTML = `
                  <div class="relative max-w-4xl max-h-[90vh]">
                    <button class="absolute -top-12 right-0 text-white hover:text-slate-300 transition-colors">
                      <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                      </svg>
                    </button>
                    <img src="${imgUrl}" alt="${product.name}" class="max-w-full max-h-[90vh] object-contain rounded-lg" />
                  </div>
                `;
                document.body.appendChild(imageModal);
                imageModal.addEventListener('click', () => {
                  document.body.removeChild(imageModal);
                });
              }
            }}
            className="w-full h-full cursor-pointer"
          >
            {imgUrl ? (
              <img src={imgUrl} alt={product.name}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-300">
                <Package className="w-12 h-12" />
              </div>
            )}
          </div>

          {/* Stock badge — same position as Active badge in CategoryMaster */}
          <div className="absolute bottom-4 left-4">
            <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${
              (product.stock || 0) > 0
                ? 'bg-emerald-500 text-white'
                : 'bg-slate-500 text-white'
            }`}>
              {(product.stock || 0) > 0 ? `${product.stock} in stock` : 'Out of stock'}
            </span>
          </div>

          {/* Action buttons — top-right */}
          <div className="absolute top-4 right-4 flex gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); setShareProduct(product); }}
              className="p-2 bg-white/90 backdrop-blur-sm rounded-xl text-green-600 hover:text-white hover:bg-green-500 shadow-sm transition-all"
              title="Share Product"
            >
              <MessageCircle className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Info — same p-6 style */}
        <div className="p-5">
          <h3 className="text-lg font-black text-slate-800 mb-1 truncate">{product.name}</h3>

          <div className="flex flex-wrap gap-1.5 mb-3">
            {product.designNo && (
              <span className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-bold border border-indigo-100">
                #{product.designNo}
              </span>
            )}
            {(product as any).color && (
              <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-semibold">
                {(product as any).color}
              </span>
            )}
            {(product as any).quality && (
              <span className="text-[10px] bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full font-semibold border border-amber-100">
                {(product as any).quality}
              </span>
            )}
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            <p className="text-xl font-black text-indigo-600">₹{product.price.toLocaleString()}</p>
            <button
              onClick={() => setShareProduct(product)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded-xl text-xs font-bold transition-colors"
            >
              <MessageCircle className="w-3.5 h-3.5" /> Share
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">

      {/* ── Bulk Share Modal ─────────────────────────── */}
      {bulkShareMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => setBulkShareMode(false)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
            onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-800">Share Selected Products</h3>
              <button onClick={() => setBulkShareMode(false)}
                className="p-1 hover:bg-slate-100 rounded-full transition-colors">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <div className="p-6">
              <div className="mb-5 p-3 bg-slate-50 rounded-2xl">
                <p className="text-center font-medium text-slate-700">
                  {selectedProducts.size} product{selectedProducts.size !== 1 ? 's' : ''} selected
                </p>
              </div>
              <div className="space-y-3">
                <button
                  onClick={() => { handleBulkWhatsApp(); setBulkShareMode(false); }}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-green-500 hover:bg-green-600 text-white rounded-2xl font-bold transition-colors shadow-lg shadow-green-200 text-sm">
                  <MessageCircle className="w-5 h-5" /> Share on WhatsApp
                </button>
                <button
                  onClick={() => { handleBulkCopy(); setBulkShareMode(false); }}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-2xl font-bold transition-colors shadow-lg shadow-blue-200 text-sm">
                  <Copy className="w-5 h-5" /> Copy to Clipboard
                </button>
                <button
                  onClick={() => setBulkShareMode(false)}
                  className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-bold transition-colors text-sm">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── WhatsApp Share Modal ─────────────────────── */}
      {shareProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => setShareProduct(null)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden"
            onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-800">Share Product</h3>
              <button onClick={() => setShareProduct(null)}
                className="p-1 hover:bg-slate-100 rounded-full transition-colors">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <div className="p-6">
              <div className="flex gap-4 mb-5 p-3 bg-slate-50 rounded-2xl">
                <div className="w-14 h-14 rounded-xl bg-slate-200 overflow-hidden shrink-0">
                  {shareProduct.images?.[0] ? (
                    <img src={resolveImage(shareProduct.images[0], 'products') || ''}
                      alt={shareProduct.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-7 h-7 text-slate-400" />
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-slate-800 truncate">{shareProduct.name}</p>
                  {shareProduct.designNo && <p className="text-xs text-slate-500">Design: {shareProduct.designNo}</p>}
                  <p className="text-indigo-600 font-black mt-1">₹{shareProduct.price.toLocaleString()}</p>
                </div>
              </div>
              <button
                onClick={() => { handleWhatsApp(shareProduct); setShareProduct(null); }}
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-green-500 hover:bg-green-600 text-white rounded-2xl font-bold transition-colors shadow-lg shadow-green-200 text-sm">
                <MessageCircle className="w-5 h-5" /> Share to Apps
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Page Header ─────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {view !== 'categories' && (
            <button onClick={goBack}
              className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 shadow-sm transition-colors">
              <ArrowLeft className="w-4 h-4 text-slate-600" />
            </button>
          )}
          <div>
            {view !== 'categories' && (
              <div className="flex items-center gap-1 text-xs text-slate-400 mb-0.5">
                <button onClick={() => { setSelectedCategory(null); setSelectedSub(null); setView('categories'); }}
                  className="hover:text-indigo-600 transition-colors">Catalogue</button>
                {selectedCategory && (
                  <>
                    <ChevronRight className="w-3 h-3" />
                    <button
                      onClick={() => { setSelectedSub(null); setView((subsByCat[selectedCategory.id] || []).length > 0 ? 'subcategories' : 'products'); }}
                      className="hover:text-indigo-600 transition-colors">
                      {selectedCategory.name}
                    </button>
                  </>
                )}
                {selectedSub && (
                  <>
                    <ChevronRight className="w-3 h-3" />
                    <span className="text-slate-600">{selectedSub.name}</span>
                  </>
                )}
              </div>
            )}
            <h1 className="text-2xl font-bold text-slate-800">{pageTitle}</h1>
            <p className="text-slate-500 text-sm">
              {view === 'categories'    ? 'Browse and search through all your products.'
              : view === 'subcategories' ? 'Select a sub-category to view products.'
              : 'Browse products and share via WhatsApp.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Selection Mode Toggle - Only show in products view */}
          {view === 'products' && (
            <button
              onClick={toggleSelectionMode}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-colors ${
                selectionMode 
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' 
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              {selectionMode ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
              {selectionMode ? 'Selection On' : 'Select'}
            </button>
          )}

          {/* Bulk Share Button - Only show when products are selected */}
          {selectionMode && selectedProducts.size > 0 && (
            <button
              onClick={() => setBulkShareMode(true)}
              className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-xl font-medium transition-colors shadow-lg shadow-green-200"
            >
              <Share2 className="w-4 h-4" />
              Share ({selectedProducts.size})
            </button>
          )}

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" placeholder="Search products..."
              value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 w-56" />
          </div>
        </div>
      </div>

      {/* ── SEARCH ──────────────────────────────────── */}
      {isSearching && (
        <>
          <p className="text-xs text-slate-500">
            Found <span className="font-bold text-slate-700">{visibleProducts.length}</span> products
          </p>
          {visibleProducts.length === 0 ? (
            <div className="col-span-full py-20 flex flex-col items-center justify-center text-slate-400 bg-white rounded-3xl border-2 border-dashed border-slate-200">
              <Package className="w-12 h-12 mb-4 opacity-20" />
              <p className="font-medium">No products match your search</p>
            </div>
          ) : (
            <div
              className="flex gap-4 overflow-x-auto pb-4"
              style={{ scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch' }}
            >
              {visibleProducts.map(p => (
                <div key={p.id}
                  style={{ minWidth: 220, maxWidth: 220, scrollSnapAlign: 'start' }}
                  className="shrink-0">
                  <ProductCard product={p} />
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── CATEGORIES ──────────────────────────────── */}
      {!isSearching && view === 'categories' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {categories.length === 0
            ? products.map(p => <ProductCard key={p.id} product={p} />)
            : categories.map((cat, i) => (
                <GridCard key={cat.id} item={cat} index={i}
                  count={products.filter(p => (p as any).category_id === cat.id || (p as any).categoryId === cat.id).length}
                  subCount={(subsByCat[cat.id] || []).length}
                  onClick={() => selectCategory(cat)} />
              ))
          }
        </div>
      )}

      {/* ── SUB-CATEGORIES ──────────────────────────── */}
      {!isSearching && view === 'subcategories' && selectedCategory && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">

          {/* "All" card */}
          <div onClick={() => { setSelectedSub(null); setView('products'); }}
            className="bg-white rounded-3xl border border-slate-200 shadow-sm group overflow-hidden cursor-pointer hover:shadow-xl transition-all duration-300">
            <div className="relative h-48 overflow-hidden"
              style={{ background: 'linear-gradient(135deg,#1e293b,#334155)' }}>
              <div className="w-full h-full flex items-center justify-center">
                <Grid3X3 className="w-12 h-12 text-white/30" />
              </div>
              <div className="absolute top-4 right-4">
                <span className="bg-white/20 backdrop-blur-sm text-white text-xs font-bold px-2.5 py-1 rounded-full border border-white/30">
                  {products.filter(p => (p as any).category_id === selectedCategory.id || (p as any).categoryId === selectedCategory.id).length} items
                </span>
              </div>
            </div>
            <div className="p-5 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-slate-800">All Products</h3>
                <p className="text-xs text-slate-500">Everything in {selectedCategory.name}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-indigo-600 shrink-0 transition-colors" />
            </div>
          </div>

          {(subsByCat[selectedCategory.id] || []).map((sub, i) => (
            <GridCard key={sub.id} item={sub} index={i + 2}
              count={products.filter(p => (p as any).sub_category_id === sub.id || (p as any).subCategoryId === sub.id).length}
              onClick={() => selectSub(sub)} />
          ))}
        </div>
      )}

      {/* ── PRODUCTS — horizontal scroll like WhatsApp ── */}
      {!isSearching && view === 'products' && (
        visibleProducts.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400 bg-white rounded-3xl border-2 border-dashed border-slate-200">
            <Package className="w-12 h-12 mb-4 opacity-20" />
            <p className="font-medium">No products in this category</p>
            <button onClick={goBack} className="mt-4 text-indigo-600 font-bold hover:underline text-sm">Go back</button>
          </div>
        ) : (
          <div
            className="flex gap-4 overflow-x-auto pb-4"
            style={{ scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch' }}
          >
            {visibleProducts.map(p => (
              <div key={p.id}
                style={{ minWidth: 220, maxWidth: 220, scrollSnapAlign: 'start' }}
                className="shrink-0"
              >
                <ProductCard product={p} />
              </div>
            ))}
          </div>
        )
      )}

    </div>
  );
};

export default Catalogue;