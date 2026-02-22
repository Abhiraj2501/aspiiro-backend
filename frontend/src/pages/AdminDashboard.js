import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { productAPI, orderAPI, uploadAPI } from '../utils/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Plus, Edit, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [showProductDialog, setShowProductDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [productForm, setProductForm] = useState({
    name: '',
    description: '',
    price: '',
    discount: '0',
    category: 'T-Shirts',
    sizes: ['S', 'M', 'L', 'XL'],
    stock: '',
    images: [],
    is_new_arrival: false,
    is_on_sale: false
  });

  useEffect(() => {
    if (!isAdmin) {
      navigate('/admin');
      return;
    }
    loadData();
  }, [isAdmin]);

  const loadData = async () => {
    try {
      const productsRes = await productAPI.getAll({});
      setProducts(productsRes.data.products);

      const ordersRes = await orderAPI.getAllAdmin();
      setOrders(ordersRes.data.orders);
    } catch (error) {
      toast.error('Failed to load data');
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const res = await uploadAPI.uploadImage(file);
      if (res.data.success) {
        setProductForm(prev => ({
          ...prev,
          images: [...prev.images, res.data.url]
        }));
        toast.success('Image uploaded');
      }
    } catch (error) {
      toast.error('Image upload failed');
    }
    setUploadingImage(false);
  };

  const handleSaveProduct = async () => {
    try {
      const data = {
        ...productForm,
        price: parseFloat(productForm.price),
        discount: parseFloat(productForm.discount),
        stock: parseInt(productForm.stock)
      };

      if (editingProduct) {
        await productAPI.update(editingProduct.id, data);
        toast.success('Product updated');
      } else {
        await productAPI.create(data);
        toast.success('Product created');
      }

      setShowProductDialog(false);
      setEditingProduct(null);
      resetForm();
      loadData();
    } catch (error) {
      toast.error('Failed to save product');
    }
  };

  const handleDeleteProduct = async (id) => {
    if (!window.confirm('Delete this product?')) return;
    try {
      await productAPI.delete(id);
      toast.success('Product deleted');
      loadData();
    } catch (error) {
      toast.error('Failed to delete product');
    }
  };

  const handleEditProduct = (product) => {
    setEditingProduct(product);
    setProductForm({
      name: product.name,
      description: product.description,
      price: product.price.toString(),
      discount: product.discount.toString(),
      category: product.category,
      sizes: product.sizes,
      stock: product.stock.toString(),
      images: product.images,
      is_new_arrival: product.is_new_arrival,
      is_on_sale: product.is_on_sale
    });
    setShowProductDialog(true);
  };

  const handleUpdateOrderStatus = async (orderId, status) => {
    try {
      await orderAPI.updateStatus(orderId, status);
      toast.success('Order status updated');
      loadData();
    } catch (error) {
      toast.error('Failed to update order');
    }
  };

  const resetForm = () => {
    setProductForm({
      name: '',
      description: '',
      price: '',
      discount: '0',
      category: 'T-Shirts',
      sizes: ['S', 'M', 'L', 'XL'],
      stock: '',
      images: [],
      is_new_arrival: false,
      is_on_sale: false
    });
  };

  return (
    <div className="min-h-screen py-12" data-testid="admin-dashboard">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="font-heading text-4xl font-extrabold tracking-tighter mb-12">ADMIN DASHBOARD</h1>

        <Tabs defaultValue="products" className="space-y-8">
          <TabsList className="border-2 border-black p-0">
            <TabsTrigger value="products" className="uppercase tracking-widest font-bold" data-testid="tab-products">
              Products ({products.length})
            </TabsTrigger>
            <TabsTrigger value="orders" className="uppercase tracking-widest font-bold" data-testid="tab-orders">
              Orders ({orders.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="products">
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-heading text-2xl font-bold uppercase tracking-wider">Products</h2>
              <Dialog open={showProductDialog} onOpenChange={setShowProductDialog}>
                <DialogTrigger asChild>
                  <Button
                    onClick={() => { resetForm(); setEditingProduct(null); }}
                    className="bg-black text-white border-2 border-black hover:bg-white hover:text-black uppercase tracking-widest font-bold"
                    data-testid="add-product-button"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Product
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="font-heading uppercase tracking-wider">
                      {editingProduct ? 'Edit Product' : 'Add New Product'}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
                    <div>
                      <Label htmlFor="name">Product Name</Label>
                      <Input
                        id="name"
                        value={productForm.name}
                        onChange={(e) => setProductForm({...productForm, name: e.target.value})}
                        data-testid="product-name-input"
                      />
                    </div>
                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={productForm.description}
                        onChange={(e) => setProductForm({...productForm, description: e.target.value})}
                        rows={4}
                        data-testid="product-description-input"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="price">Price (₹)</Label>
                        <Input
                          id="price"
                          type="number"
                          value={productForm.price}
                          onChange={(e) => setProductForm({...productForm, price: e.target.value})}
                          data-testid="product-price-input"
                        />
                      </div>
                      <div>
                        <Label htmlFor="discount">Discount (%)</Label>
                        <Input
                          id="discount"
                          type="number"
                          value={productForm.discount}
                          onChange={(e) => setProductForm({...productForm, discount: e.target.value})}
                          data-testid="product-discount-input"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="category">Category</Label>
                        <Select value={productForm.category} onValueChange={(val) => setProductForm({...productForm, category: val})}>
                          <SelectTrigger data-testid="product-category-select">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="T-Shirts">T-Shirts</SelectItem>
                            <SelectItem value="Hoodies">Hoodies</SelectItem>
                            <SelectItem value="Pants">Pants</SelectItem>
                            <SelectItem value="Jackets">Jackets</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="stock">Stock</Label>
                        <Input
                          id="stock"
                          type="number"
                          value={productForm.stock}
                          onChange={(e) => setProductForm({...productForm, stock: e.target.value})}
                          data-testid="product-stock-input"
                        />
                      </div>
                    </div>
                    <div>
                      <Label>Images</Label>
                      <div className="border-2 border-dashed border-gray-300 p-4">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                          id="image-upload"
                        />
                        <label htmlFor="image-upload" className="cursor-pointer">
                          <div className="flex items-center justify-center gap-2 text-muted-foreground hover:text-black">
                            <Upload className="w-5 h-5" />
                            <span>{uploadingImage ? 'Uploading...' : 'Click to upload image'}</span>
                          </div>
                        </label>
                        {productForm.images.length > 0 && (
                          <div className="grid grid-cols-4 gap-2 mt-4">
                            {productForm.images.map((img, idx) => (
                              <div key={idx} className="relative border">
                                <img src={img} alt={`Product ${idx}`} className="w-full h-24 object-cover" />
                                <button
                                  onClick={() => setProductForm({...productForm, images: productForm.images.filter((_, i) => i !== idx)})}
                                  className="absolute top-1 right-1 bg-red-500 text-white p-1 text-xs"
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={productForm.is_new_arrival}
                          onChange={(e) => setProductForm({...productForm, is_new_arrival: e.target.checked})}
                          data-testid="product-new-arrival-checkbox"
                        />
                        <span>New Arrival</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={productForm.is_on_sale}
                          onChange={(e) => setProductForm({...productForm, is_on_sale: e.target.checked})}
                          data-testid="product-on-sale-checkbox"
                        />
                        <span>On Sale</span>
                      </label>
                    </div>
                    <Button
                      onClick={handleSaveProduct}
                      className="w-full bg-black text-white hover:bg-white hover:text-black border-2 border-black uppercase tracking-widest font-bold"
                      data-testid="save-product-button"
                    >
                      {editingProduct ? 'Update Product' : 'Create Product'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map(product => (
                <div key={product.id} className="border-2 border-black p-4" data-testid="admin-product-card">
                  <img
                    src={product.images[0] || 'https://via.placeholder.com/300'}
                    alt={product.name}
                    className="w-full h-48 object-cover mb-4"
                  />
                  <h3 className="font-heading font-bold uppercase mb-2">{product.name}</h3>
                  <p className="text-sm text-muted-foreground mb-2">{product.category}</p>
                  <p className="font-bold mb-4">₹{product.price} | Stock: {product.stock}</p>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleEditProduct(product)}
                      variant="outline"
                      size="sm"
                      className="flex-1 border-2 border-black"
                      data-testid="edit-product-button"
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      onClick={() => handleDeleteProduct(product.id)}
                      variant="outline"
                      size="sm"
                      className="border-2 border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
                      data-testid="delete-product-button"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="orders">
            <h2 className="font-heading text-2xl font-bold uppercase tracking-wider mb-6">Orders</h2>
            <div className="space-y-4">
              {orders.map(order => (
                <div key={order.id} className="border-2 border-black p-6" data-testid="admin-order-card">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <p className="font-bold">Order ID: {order.id}</p>
                      <p className="text-sm text-muted-foreground">Customer: {order.user_email}</p>
                      <p className="text-sm text-muted-foreground">
                        Date: {new Date(order.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-heading text-xl font-bold">₹{order.total.toFixed(2)}</p>
                      <Select value={order.status} onValueChange={(val) => handleUpdateOrderStatus(order.id, val)}>
                        <SelectTrigger className="mt-2 w-40" data-testid="order-status-select">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="placed">Placed</SelectItem>
                          <SelectItem value="packed">Packed</SelectItem>
                          <SelectItem value="shipped">Shipped</SelectItem>
                          <SelectItem value="delivered">Delivered</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="border-t pt-4">
                    <p className="font-bold mb-2">Items:</p>
                    {order.items.map((item, idx) => (
                      <p key={idx} className="text-sm text-muted-foreground">
                        {item.name} ({item.size}) x {item.quantity}
                      </p>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;