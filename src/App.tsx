import React, { useState, useEffect, FormEvent, useRef } from 'react';
import { ShoppingBag, User, Menu, X, Search, ArrowRight, Minus, Plus, Trash2, ChevronLeft, LogOut, Settings, MapPin, Phone, Mail, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, formatPrice } from './lib/utils';
import { useAuth } from './context/AuthContext.tsx';
import { useCart, Product, CartItem, Order } from './hooks/useCart.ts';
import { toast } from 'sonner';
import { AdminGuard } from './components/AdminGuard.tsx';

export default function App() {
  const { user, token, login, logout, updateUser, isAuthenticated, isAdmin } = useAuth();
  const { cart, addToCart, removeFromCart, updateQuantity, clearCart, cartTotal, cartCount } = useCart();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [view, setView] = useState<'home' | 'product' | 'checkout' | 'tracking' | 'payment' | 'profile'>('home');
  const [isAdminView, setIsAdminView] = useState(false);
  const [trackingId, setTrackingId] = useState('');
  const [trackingOrder, setTrackingOrder] = useState<Order | null>(null);
  const [adminOrders, setAdminOrders] = useState<Order[]>([]);
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [address, setAddress] = useState({ street: '', city: '', pincode: '', phone: '' });
  const [paymentMode, setPaymentMode] = useState<'full' | 'deposit'>('deposit');
  const [isLoading, setIsLoading] = useState(false);

  const productsRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const cachedProducts = sessionStorage.getItem('aspiiro_products');
    if (cachedProducts) {
      setProducts(JSON.parse(cachedProducts));
    } else {
      fetch('/api/products')
        .then(res => res.json())
        .then(data => {
          setProducts(data);
          sessionStorage.setItem('aspiiro_products', JSON.stringify(data));
        })
        .catch(err => console.error('Failed to fetch products', err));
    }
  }, []);

  useEffect(() => {
    if (user?.address) {
      try {
        const addr = JSON.parse(user.address);
        setAddress(addr);
      } catch (e) {
        setAddress(prev => ({ ...prev, street: user.address || '' }));
      }
    }
  }, [user]);

  const scrollToProducts = () => {
    setView('home');
    setTimeout(() => {
      productsRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
    setIsMenuOpen(false);
  };

  const authFetch = async (url: string, options: RequestInit = {}) => {
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    };
    const res = await fetch(url, { ...options, headers });
    
    if (res.status === 403 && url.includes('/api/admin')) {
      toast.error('Access denied');
      setView('home');
    }
    
    return res;
  };

  const checkAdminAccess = () => {
    if (!token || !isAdmin) {
      setView('home');
      toast.error('Unauthorized: Admin access only');
      return false;
    }
    return true;
  };

  const handleAuth = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());

    const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/signup';
    
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await res.json();
      if (res.ok) {
        login(result.user, result.token);
        setIsAuthModalOpen(false);
        toast.success(authMode === 'login' ? 'Logged in!' : 'Signed up!');
      } else {
        toast.error(result.error);
      }
    } catch (err) {
      toast.error('Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateProfile = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name'),
      phone: formData.get('phone'),
      address: formData.get('address'),
    };

    try {
      const res = await authFetch('/api/auth/update-profile', {
        method: 'POST',
        body: JSON.stringify(data),
      });

      const result = await res.json();
      if (res.ok) {
        updateUser(result);
        toast.success('Profile updated!');
      } else {
        toast.error(result.error);
      }
    } catch (err) {
      toast.error('Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAdminView && isAdmin) {
      authFetch('/api/admin/orders')
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            setAdminOrders(data);
          } else {
            console.error('Failed to fetch orders:', data.error);
            setIsAdminView(false);
          }
        });
    }
  }, [isAdminView, isAdmin]);

  const handleProductClick = (product: Product) => {
    setSelectedProduct(product);
    setView('product');
    window.scrollTo(0, 0);
  };

  const handleCheckout = async () => {
    if (!selectedSize) {
      toast.error('Please select a size');
      return;
    }
    setView('checkout');
  };

  const proceedToPayment = () => {
    if (!address.street || !address.city || !address.pincode || !address.phone) {
      toast.error('Please fill in all address details');
      return;
    }
    setView('payment');
  };

  const finalizePayment = async () => {
    setIsLoading(true);
    // Mock Payment Logic since user doesn't have Razorpay yet
    const amountToPay = paymentMode === 'deposit' ? cartTotal * 0.2 : cartTotal;
    
    try {
      // Simulate API call
      const res = await fetch('/api/payments/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          razorpay_order_id: 'mock_order_' + Date.now(),
          razorpay_payment_id: 'mock_pay_' + Date.now(),
          razorpay_signature: 'mock_sig',
          cart,
          address: `${address.street}, ${address.city} - ${address.pincode}. Phone: ${address.phone}`,
          isMock: true
        }),
      });

      if (res.ok) {
        toast.success(`Payment of ${formatPrice(amountToPay)} Successful! Order Placed.`);
        clearCart();
        setIsCartOpen(false);
        setView('home');
        setSelectedSize('');
        setAddress({ street: '', city: '', pincode: '', phone: '' });
      } else {
        toast.error('Payment failed. Please try again.');
      }
    } catch (error) {
      toast.error('An error occurred during payment.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchOrderTracking = async (id: string) => {
    if (!id) {
      toast.error('Please enter an Order ID');
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch(`/api/orders/${id}`);
      const order = await res.json();
      if (res.ok) {
        setTrackingOrder(order);
      } else {
        toast.error(order.error || 'Order not found');
      }
    } catch (err) {
      toast.error('An error occurred while tracking');
    } finally {
      setIsLoading(false);
    }
  };

  const updateOrderStatus = async (id: number, status: string) => {
    const res = await authFetch(`/api/admin/orders/${id}/status`, {
      method: 'POST',
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      setAdminOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o));
      toast.success('Status updated');
    } else {
      toast.error('Update failed');
    }
  };

  const deleteProduct = async (id: number) => {
    if (!confirm('Are you sure?')) return;
    const res = await authFetch(`/api/admin/products/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setProducts(prev => prev.filter(p => p.id !== id));
      sessionStorage.removeItem('aspiiro_products');
      toast.success('Product deleted');
    } else {
      toast.error('Delete failed');
    }
  };

  const addProduct = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    const formData = new FormData(e.currentTarget);
    const imagePath = formData.get('imagePath') as string;
    const data = {
      name: formData.get('name'),
      price: Number(formData.get('price')),
      description: formData.get('description'),
      stock: 100,
      category: formData.get('category') || 'T-Shirts',
      images: [imagePath || '/images/placeholder.jpg'],
      is_new: true,
      is_sale: false
    };

    const res = await authFetch('/api/admin/products', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    setIsLoading(false);
    if (res.ok) {
      toast.success('Product Added!');
      const newProducts = await (await fetch('/api/products')).json();
      setProducts(newProducts);
      sessionStorage.setItem('aspiiro_products', JSON.stringify(newProducts));
      e.currentTarget.reset();
    } else {
      const err = await res.json();
      toast.error(err.error || 'Failed to add product');
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F5] font-sans text-[#1A1A1A]">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-black/5">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsMenuOpen(true)} className="p-2 -ml-2 lg:hidden">
              <Menu size={20} />
            </button>
            <h1 
              onClick={() => setView('home')}
              className="text-xl font-bold tracking-tighter uppercase italic cursor-pointer"
            >
              Aspiiro
            </h1>
          </div>

          <div className="hidden lg:flex items-center gap-8 text-sm font-medium uppercase tracking-widest">
            <button onClick={scrollToProducts} className="hover:opacity-50 transition-opacity">New Arrivals</button>
            <button onClick={scrollToProducts} className="hover:opacity-50 transition-opacity">Shop All</button>
            <button onClick={scrollToProducts} className="hover:opacity-50 transition-opacity text-red-500">Sale</button>
          </div>

          <div className="flex items-center gap-2">
            <button className="p-2 hover:bg-black/5 rounded-full transition-colors">
              <Search size={20} />
            </button>
            <button 
              onClick={() => user ? setView('profile') : setIsAuthModalOpen(true)}
              className="p-2 hover:bg-black/5 rounded-full transition-colors"
            >
              <User size={20} />
            </button>
            <button 
              onClick={() => setIsCartOpen(true)}
              className="p-2 hover:bg-black/5 rounded-full transition-colors relative"
            >
              <ShoppingBag size={20} />
              {cart.length > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-black text-white text-[10px] flex items-center justify-center rounded-full">
                  {cart.reduce((s, i) => s + i.quantity, 0)}
                </span>
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMenuOpen(false)}
              className="fixed inset-0 bg-black/40 z-[100] backdrop-blur-sm lg:hidden"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-[80%] max-w-sm bg-white z-[110] flex flex-col lg:hidden"
            >
              <div className="p-6 border-b border-black/5 flex justify-between items-center">
                <h2 className="text-xl font-bold uppercase italic tracking-tight">Menu</h2>
                <button onClick={() => setIsMenuOpen(false)}><X size={24} /></button>
              </div>
              <div className="flex-1 p-6 flex flex-col gap-8">
                <div className="flex flex-col gap-6 text-xl font-bold uppercase italic tracking-tighter">
                  <button onClick={scrollToProducts} className="text-left hover:opacity-50 transition-opacity">New Arrivals</button>
                  <button onClick={scrollToProducts} className="text-left hover:opacity-50 transition-opacity">Shop All</button>
                  <button onClick={scrollToProducts} className="text-left hover:opacity-50 transition-opacity text-red-500">Sale</button>
                </div>
                
                <div className="mt-auto pt-8 border-t border-black/5 flex flex-col gap-4">
                  {user ? (
                    <>
                      <button 
                        onClick={() => { setView('profile'); setIsMenuOpen(false); }}
                        className="flex items-center gap-3 text-sm font-bold uppercase tracking-widest"
                      >
                        <User size={18} /> My Profile
                      </button>
                      {isAdmin && (
                        <button 
                          onClick={() => { setIsAdminView(true); setIsMenuOpen(false); }}
                          className="flex items-center gap-3 text-sm font-bold uppercase tracking-widest"
                        >
                          <Settings size={18} /> Admin Panel
                        </button>
                      )}
                      <button 
                        onClick={() => { logout(); setIsMenuOpen(false); }}
                        className="flex items-center gap-3 text-sm font-bold uppercase tracking-widest text-red-500"
                      >
                        <LogOut size={18} /> Logout
                      </button>
                    </>
                  ) : (
                    <button 
                      onClick={() => { setIsAuthModalOpen(true); setIsMenuOpen(false); }}
                      className="flex items-center gap-3 text-sm font-bold uppercase tracking-widest"
                    >
                      <User size={18} /> Login / Sign Up
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Auth Modal */}
      <AnimatePresence>
        {isAuthModalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAuthModalOpen(false)}
              className="fixed inset-0 bg-black/40 z-[80] backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="fixed inset-0 m-auto w-full max-w-md h-fit bg-white z-[90] p-8 rounded-3xl shadow-2xl"
            >
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-bold uppercase italic tracking-tight">
                  {authMode === 'login' ? 'Welcome Back' : 'Join Aspiiro'}
                </h2>
                <button onClick={() => setIsAuthModalOpen(false)}><X size={24} /></button>
              </div>

              <form onSubmit={handleAuth} className="space-y-4">
                {authMode === 'signup' && (
                  <input 
                    name="name"
                    type="text" 
                    placeholder="Full Name" 
                    required
                    className="w-full bg-stone-100 border-none rounded-full px-6 py-4 text-sm focus:ring-2 focus:ring-black outline-none"
                  />
                )}
                <input 
                  name="email"
                  type="email" 
                  placeholder="Email Address" 
                  required
                  className="w-full bg-stone-100 border-none rounded-full px-6 py-4 text-sm focus:ring-2 focus:ring-black outline-none"
                />
                <input 
                  name="password"
                  type="password" 
                  placeholder="Password" 
                  required
                  className="w-full bg-stone-100 border-none rounded-full px-6 py-4 text-sm focus:ring-2 focus:ring-black outline-none"
                />
                <button 
                  type="submit"
                  className="w-full bg-black text-white py-4 rounded-full font-bold uppercase tracking-widest text-sm hover:bg-black/80 transition-all"
                >
                  {authMode === 'login' ? 'Login' : 'Create Account'}
                </button>
              </form>

              <div className="mt-6 text-center">
                <button 
                  onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}
                  className="text-xs font-bold uppercase tracking-widest text-black/40 hover:text-black transition-colors"
                >
                  {authMode === 'login' ? "Don't have an account? Sign Up" : "Already have an account? Login"}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Cart Sidebar */}
      <AnimatePresence>
        {isCartOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCartOpen(false)}
              className="fixed inset-0 bg-black/40 z-[60] backdrop-blur-sm"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 right-0 w-full max-w-md bg-white z-[70] flex flex-col shadow-2xl"
            >
              <div className="p-6 border-b border-black/5 flex justify-between items-center">
                <h2 className="text-xl font-bold uppercase italic tracking-tight">Your Bag</h2>
                <button onClick={() => setIsCartOpen(false)}><X size={24} /></button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
                {cart.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-black/40 gap-4">
                    <ShoppingBag size={48} strokeWidth={1} />
                    <p className="uppercase tracking-widest text-xs font-bold">Your bag is empty</p>
                    <button 
                      onClick={() => setIsCartOpen(false)}
                      className="bg-black text-white px-8 py-3 rounded-full text-xs font-bold uppercase tracking-widest"
                    >
                      Start Shopping
                    </button>
                  </div>
                ) : (
                  cart.map(item => (
                    <div key={item.id} className="flex gap-4">
                      <div className="w-24 aspect-[3/4] bg-stone-100 rounded-xl overflow-hidden flex-shrink-0">
                        <img src={item.images[0]} alt={item.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 flex flex-col justify-between py-1">
                        <div>
                          <h4 className="font-bold text-sm uppercase tracking-tight">{item.name}</h4>
                          <p className="text-xs text-black/40 uppercase tracking-wider mt-1">{item.category}</p>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 bg-stone-100 rounded-full px-3 py-1">
                            <button onClick={() => updateQuantity(item.id, -1)}><Minus size={14} /></button>
                            <span className="text-sm font-bold w-4 text-center">{item.quantity}</span>
                            <button onClick={() => updateQuantity(item.id, 1)}><Plus size={14} /></button>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="font-bold text-sm">{formatPrice((item.discount_price || item.price) * item.quantity)}</span>
                            <button onClick={() => removeFromCart(item.id)} className="text-red-500"><Trash2 size={16} /></button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {cart.length > 0 && (
                <div className="p-6 border-t border-black/5 bg-stone-50">
                  <div className="flex justify-between items-center mb-6">
                    <span className="text-sm uppercase tracking-widest font-bold text-black/40">Subtotal</span>
                    <span className="text-xl font-bold tracking-tight">{formatPrice(cartTotal)}</span>
                  </div>
                  <button 
                    onClick={handleCheckout}
                    className="w-full bg-black text-white py-4 rounded-full font-bold uppercase tracking-[0.2em] text-sm hover:bg-black/80 transition-all flex items-center justify-center gap-2"
                  >
                    Checkout <ArrowRight size={18} />
                  </button>
                  <p className="text-[10px] text-center text-black/40 uppercase tracking-widest mt-4">Shipping & taxes calculated at checkout</p>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main>
        {!isAdminView && view === 'home' && (
          <>
            {/* Hero Section */}
            <section className="relative h-[80vh] flex items-center justify-center overflow-hidden bg-black">
              <img
                src="https://c1.wallpaperflare.com/preview/924/432/853/store-clothing-shop-bouique.jpg"
                alt="Hero"
                className="absolute inset-0 w-full h-full object-cover opacity-60"
                referrerPolicy="no-referrer"
              />
              <div className="relative z-10 text-center px-4">
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-white/80 text-sm uppercase tracking-[0.3em] mb-4"
                >
                  Spring Summer 2026
                </motion.p>
                <motion.h2
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="text-white text-6xl md:text-8xl font-bold tracking-tighter uppercase italic mb-8"
                >
                  Match Your <br /> Aesthetic
                </motion.h2>
                <motion.button
                  onClick={scrollToProducts}
                  className="bg-white text-black px-8 py-4 rounded-full font-bold uppercase tracking-widest text-sm hover:bg-black hover:text-white transition-all flex items-center gap-2 mx-auto"
                >
                  Shop Collection <ArrowRight size={16} />
                </motion.button>
              </div>
            </section>

            {/* Featured Products */}
            <section ref={productsRef} className="max-w-7xl mx-auto px-4 py-24">
              <div className="flex items-end justify-between mb-12">
                <div>
                  <h3 className="text-3xl font-bold tracking-tight uppercase italic">New Arrivals</h3>
                  <p className="text-black/40 text-sm mt-2 uppercase tracking-wider">The latest from the streets</p>
                </div>
                <button className="text-sm font-bold uppercase tracking-widest border-b border-black pb-1 hover:opacity-50 transition-opacity">View All</button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-8">
                {products.map((product) => (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="group cursor-pointer"
                    onClick={() => handleProductClick(product)}
                  >
                    <div className="relative aspect-[3/4] overflow-hidden bg-stone-200 rounded-2xl mb-4">
                      <img
                        src={product.images[0]}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                        referrerPolicy="no-referrer"
                      />
                      {product.is_sale && (
                        <span className="absolute top-4 left-4 bg-red-500 text-white text-[10px] font-bold uppercase px-2 py-1 rounded-full">Sale</span>
                      )}
                      {product.is_new && (
                        <span className="absolute top-4 right-4 bg-black text-white text-[10px] font-bold uppercase px-2 py-1 rounded-full">New</span>
                      )}
                    </div>
                    <h4 className="font-bold text-sm uppercase tracking-tight group-hover:underline">{product.name}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      {product.discount_price ? (
                        <>
                          <span className="font-bold text-sm">{formatPrice(product.discount_price)}</span>
                          <span className="text-xs text-black/40 line-through">{formatPrice(product.price)}</span>
                        </>
                      ) : (
                        <span className="font-bold text-sm">{formatPrice(product.price)}</span>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </section>
          </>
        )}

        {!isAdminView && view === 'product' && selectedProduct && (
          <section className="max-w-7xl mx-auto px-4 py-12">
            <button 
              onClick={() => setView('home')}
              className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest mb-12 hover:opacity-50 transition-opacity"
            >
              <ChevronLeft size={16} /> Back to Shop
            </button>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              {/* Product Images */}
              <div className="flex flex-col gap-4">
                <div className="aspect-[3/4] bg-stone-100 rounded-3xl overflow-hidden">
                  <img 
                    src={selectedProduct.images[0]} 
                    alt={selectedProduct.name} 
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="grid grid-cols-4 gap-4">
                  {selectedProduct.images.map((img, i) => (
                    <div key={i} className="aspect-square bg-stone-100 rounded-xl overflow-hidden cursor-pointer hover:opacity-80 transition-opacity">
                      <img src={img} alt={`${selectedProduct.name} ${i}`} className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Product Info */}
              <div className="flex flex-col">
                <div className="mb-8">
                  <p className="text-xs font-bold uppercase tracking-[0.3em] text-black/40 mb-2">{selectedProduct.category}</p>
                  <h2 className="text-4xl font-bold tracking-tighter uppercase italic mb-4">{selectedProduct.name}</h2>
                  <div className="flex items-center gap-4">
                    {selectedProduct.discount_price ? (
                      <>
                        <span className="text-2xl font-bold">{formatPrice(selectedProduct.discount_price)}</span>
                        <span className="text-lg text-black/40 line-through">{formatPrice(selectedProduct.price)}</span>
                        <span className="bg-red-500 text-white text-[10px] font-bold uppercase px-2 py-1 rounded-full">
                          Save {Math.round((1 - selectedProduct.discount_price / selectedProduct.price) * 100)}%
                        </span>
                      </>
                    ) : (
                      <span className="text-2xl font-bold">{formatPrice(selectedProduct.price)}</span>
                    )}
                  </div>
                </div>

                <div className="mb-12">
                  <h5 className="text-xs font-bold uppercase tracking-widest mb-4">Description</h5>
                  <p className="text-black/60 leading-relaxed">{selectedProduct.description}</p>
                </div>

                <div className="mb-8">
                  <h5 className="text-xs font-bold uppercase tracking-widest mb-4">Select Size</h5>
                  <div className="flex gap-3">
                    {['S', 'M', 'L', 'XL', 'XXL'].map(size => (
                      <button
                        key={size}
                        onClick={() => setSelectedSize(size)}
                        className={cn(
                          "w-12 h-12 rounded-full border flex items-center justify-center text-sm font-bold transition-all",
                          selectedSize === size ? "bg-black text-white border-black" : "border-black/10 hover:border-black"
                        )}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-4">
                  <button 
                    onClick={() => addToCart(selectedProduct)}
                    className="w-full bg-black text-white py-5 rounded-full font-bold uppercase tracking-[0.2em] text-sm hover:bg-black/80 transition-all flex items-center justify-center gap-2"
                  >
                    Add to Bag <ShoppingBag size={18} />
                  </button>
                  <button 
                    onClick={handleCheckout}
                    className="w-full border border-black py-5 rounded-full font-bold uppercase tracking-[0.2em] text-sm hover:bg-black hover:text-white transition-all"
                  >
                    Buy Now
                  </button>
                </div>

                <div className="mt-12 pt-12 border-t border-black/5 grid grid-cols-2 gap-8">
                  <div>
                    <h6 className="text-[10px] font-bold uppercase tracking-widest mb-2">Shipping</h6>
                    <p className="text-xs text-black/40">Free express shipping on orders above ₹2,999.</p>
                  </div>
                  <div>
                    <h6 className="text-[10px] font-bold uppercase tracking-widest mb-2">Returns</h6>
                    <p className="text-xs text-black/40">7-day easy returns and exchanges.</p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {!isAdminView && view === 'checkout' && (
          <section className="max-w-3xl mx-auto px-4 py-24">
            <h2 className="text-4xl font-bold tracking-tighter uppercase italic mb-12 text-center">Delivery Address</h2>
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-black/5 space-y-6">
              <div className="space-y-4">
                <input 
                  type="text" 
                  placeholder="Street Address / Area" 
                  value={address.street}
                  onChange={(e) => setAddress({ ...address, street: e.target.value })}
                  className="w-full bg-stone-100 border-none rounded-2xl px-6 py-4 text-sm focus:ring-2 focus:ring-black outline-none"
                />
                <div className="grid grid-cols-2 gap-4">
                  <input 
                    type="text" 
                    placeholder="City" 
                    value={address.city}
                    onChange={(e) => setAddress({ ...address, city: e.target.value })}
                    className="w-full bg-stone-100 border-none rounded-2xl px-6 py-4 text-sm focus:ring-2 focus:ring-black outline-none"
                  />
                  <input 
                    type="text" 
                    placeholder="Pincode" 
                    value={address.pincode}
                    onChange={(e) => setAddress({ ...address, pincode: e.target.value })}
                    className="w-full bg-stone-100 border-none rounded-2xl px-6 py-4 text-sm focus:ring-2 focus:ring-black outline-none"
                  />
                </div>
                <input 
                  type="text" 
                  placeholder="Phone Number" 
                  value={address.phone}
                  onChange={(e) => setAddress({ ...address, phone: e.target.value })}
                  className="w-full bg-stone-100 border-none rounded-2xl px-6 py-4 text-sm focus:ring-2 focus:ring-black outline-none"
                />
              </div>
              <button 
                onClick={proceedToPayment}
                className="w-full bg-black text-white py-5 rounded-full font-bold uppercase tracking-[0.2em] text-sm hover:bg-black/80 transition-all"
              >
                Proceed to Payment
              </button>
            </div>
          </section>
        )}

        {!isAdminView && view === 'payment' && (
          <section className="max-w-3xl mx-auto px-4 py-24">
            <h2 className="text-4xl font-bold tracking-tighter uppercase italic mb-12 text-center">Payment Gateway</h2>
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-black/5 space-y-8">
              <div className="space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-widest text-black/40">Select Payment Option</h3>
                <div className="grid grid-cols-1 gap-4">
                  <button 
                    onClick={() => setPaymentMode('deposit')}
                    className={cn(
                      "p-6 rounded-2xl border text-left transition-all",
                      paymentMode === 'deposit' ? "border-black bg-black text-white" : "border-black/10 hover:border-black"
                    )}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-bold uppercase tracking-tight">Pay 20% Deposit Now</span>
                      <span className="text-xl font-bold">{formatPrice(cartTotal * 0.2)}</span>
                    </div>
                    <p className={cn("text-xs mt-2", paymentMode === 'deposit' ? "text-white/60" : "text-black/40")}>
                      Pay 20% now to confirm order. Pay remaining {formatPrice(cartTotal * 0.8)} on delivery.
                    </p>
                  </button>
                  <button 
                    onClick={() => setPaymentMode('full')}
                    className={cn(
                      "p-6 rounded-2xl border text-left transition-all",
                      paymentMode === 'full' ? "border-black bg-black text-white" : "border-black/10 hover:border-black"
                    )}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-bold uppercase tracking-tight">Full Payment</span>
                      <span className="text-xl font-bold">{formatPrice(cartTotal)}</span>
                    </div>
                    <p className={cn("text-xs mt-2", paymentMode === 'full' ? "text-white/60" : "text-black/40")}>
                      Pay full amount now for faster processing.
                    </p>
                  </button>
                </div>
              </div>

              <div className="pt-8 border-t border-black/5">
                <div className="flex justify-between items-center mb-8">
                  <span className="text-sm uppercase tracking-widest font-bold text-black/40">Amount to Pay</span>
                  <span className="text-3xl font-bold tracking-tighter">
                    {formatPrice(paymentMode === 'deposit' ? cartTotal * 0.2 : cartTotal)}
                  </span>
                </div>
                <button 
                  onClick={finalizePayment}
                  className="w-full bg-black text-white py-5 rounded-full font-bold uppercase tracking-[0.2em] text-sm hover:bg-black/80 transition-all flex items-center justify-center gap-2"
                >
                  Pay via UPI / Card / Net Banking <ArrowRight size={18} />
                </button>
              </div>
            </div>
          </section>
        )}

        {!isAdminView && view === 'profile' && user && (
          <section className="max-w-4xl mx-auto px-4 py-24">
            <div className="flex items-center gap-4 mb-12">
              <button onClick={() => setView('home')} className="p-2 hover:bg-black/5 rounded-full transition-colors">
                <ChevronLeft size={24} />
              </button>
              <h2 className="text-4xl font-bold tracking-tighter uppercase italic">My Profile</h2>
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
              <div className="lg:col-span-1 space-y-4">
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-black/5 text-center">
                  <div className="w-24 h-24 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <User size={48} className="text-black/20" />
                  </div>
                  <h3 className="text-xl font-bold uppercase italic tracking-tight">{user.name}</h3>
                  <p className="text-xs text-black/40 uppercase tracking-widest mt-1">{user.email}</p>
                  
                  <div className="mt-8 pt-8 border-t border-black/5 flex flex-col gap-2">
                    {isAdmin && (
                      <button 
                        onClick={() => setIsAdminView(true)}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-stone-50 transition-colors text-sm font-bold uppercase tracking-widest"
                      >
                        <Settings size={18} /> Admin Panel
                      </button>
                    )}
                    <button 
                      onClick={logout}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-50 text-red-500 transition-colors text-sm font-bold uppercase tracking-widest"
                    >
                      <LogOut size={18} /> Logout
                    </button>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-2">
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-black/5">
                  <h4 className="text-lg font-bold uppercase italic tracking-tight mb-8">Account Details</h4>
                  <form onSubmit={handleUpdateProfile} className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-black/40 ml-4">Full Name</label>
                        <input 
                          name="name"
                          type="text" 
                          defaultValue={user.name}
                          required
                          className="w-full bg-stone-100 border-none rounded-full px-6 py-4 text-sm focus:ring-2 focus:ring-black outline-none"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-black/40 ml-4">Phone Number</label>
                        <input 
                          name="phone"
                          type="text" 
                          defaultValue={user.phone || ''}
                          placeholder="Add phone number"
                          className="w-full bg-stone-100 border-none rounded-full px-6 py-4 text-sm focus:ring-2 focus:ring-black outline-none"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-black/40 ml-4">Delivery Address</label>
                      <textarea 
                        name="address"
                        defaultValue={user.address || ''}
                        placeholder="Add your full delivery address"
                        rows={3}
                        className="w-full bg-stone-100 border-none rounded-3xl px-6 py-4 text-sm focus:ring-2 focus:ring-black outline-none resize-none"
                      />
                    </div>
                    <button 
                      type="submit"
                      className="bg-black text-white px-12 py-4 rounded-full font-bold uppercase tracking-widest text-xs hover:bg-black/80 transition-all"
                    >
                      Save Changes
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </section>
        )}

        {!isAdminView && view === 'tracking' && (
          <section className="max-w-3xl mx-auto px-4 py-24">
            <h2 className="text-4xl font-bold tracking-tighter uppercase italic mb-12 text-center">Track Order</h2>
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-black/5">
              <div className="flex gap-4 mb-8">
                <input 
                  type="text" 
                  placeholder="Enter Order ID (e.g. 1)" 
                  value={trackingId}
                  onChange={(e) => setTrackingId(e.target.value)}
                  className="flex-1 bg-stone-100 border-none rounded-full px-6 py-4 text-sm focus:ring-2 focus:ring-black outline-none"
                />
                <button 
                  onClick={() => fetchOrderTracking(trackingId)}
                  className="bg-black text-white px-8 py-4 rounded-full font-bold uppercase tracking-widest text-xs"
                >
                  Track
                </button>
              </div>

              {trackingOrder && (
                <div className="space-y-8">
                  <div className="flex justify-between items-center pb-8 border-b border-black/5">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-black/40 mb-1">Order Status</p>
                      <h4 className="text-2xl font-bold uppercase italic tracking-tight">{trackingOrder.status}</h4>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-black/40 mb-1">Total Paid</p>
                      <h4 className="text-xl font-bold tracking-tight">{formatPrice(trackingOrder.total)}</h4>
                    </div>
                  </div>

                  <div className="relative pt-8">
                    <div className="absolute top-0 left-0 w-full h-1 bg-stone-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-black transition-all duration-1000" 
                        style={{ 
                          width: trackingOrder.status === 'placed' ? '25%' : 
                                 trackingOrder.status === 'packed' ? '50%' : 
                                 trackingOrder.status === 'shipped' ? '75%' : '100%' 
                        }} 
                      />
                    </div>
                    <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest mt-4">
                      <span className={cn(trackingOrder.status === 'placed' ? 'text-black' : 'text-black/20')}>Placed</span>
                      <span className={cn(trackingOrder.status === 'packed' ? 'text-black' : 'text-black/20')}>Packed</span>
                      <span className={cn(trackingOrder.status === 'shipped' ? 'text-black' : 'text-black/20')}>Shipped</span>
                      <span className={cn(trackingOrder.status === 'delivered' ? 'text-black' : 'text-black/20')}>Delivered</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {isAdmin && isAdminView && (
          <AdminGuard onUnauthorized={() => setIsAdminView(false)}>
            <section className="max-w-7xl mx-auto px-4 py-12">
            <div className="flex justify-between items-center mb-12">
              <h2 className="text-4xl font-bold tracking-tighter uppercase italic">Admin Panel</h2>
              <button 
                onClick={() => setIsAdminView(false)}
                className="text-xs font-bold uppercase tracking-widest border border-black/10 px-6 py-3 rounded-full"
              >
                Exit Admin
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
              <div className="lg:col-span-2 space-y-12">
                {/* Orders Management */}
                <div>
                  <h3 className="text-xl font-bold uppercase italic tracking-tight mb-6">Recent Orders</h3>
                  <div className="bg-white rounded-3xl overflow-hidden border border-black/5">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-stone-50 border-b border-black/5">
                        <tr>
                          <th className="px-6 py-4 font-bold uppercase tracking-widest text-[10px]">ID</th>
                          <th className="px-6 py-4 font-bold uppercase tracking-widest text-[10px]">Total</th>
                          <th className="px-6 py-4 font-bold uppercase tracking-widest text-[10px]">Status</th>
                          <th className="px-6 py-4 font-bold uppercase tracking-widest text-[10px]">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {adminOrders.map(order => (
                          <tr key={order.id} className="border-b border-black/5">
                            <td className="px-6 py-4 font-mono">#{order.id}</td>
                            <td className="px-6 py-4 font-bold">{formatPrice(order.total)}</td>
                            <td className="px-6 py-4">
                              <span className="bg-black text-white text-[10px] font-bold uppercase px-2 py-1 rounded-full tracking-widest">{order.status}</span>
                            </td>
                            <td className="px-6 py-4">
                              <select 
                                onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                                value={order.status}
                                className="bg-stone-100 border-none rounded-full px-3 py-1 text-[10px] font-bold uppercase outline-none"
                              >
                                <option value="placed">Placed</option>
                                <option value="packed">Packed</option>
                                <option value="shipped">Shipped</option>
                                <option value="delivered">Delivered</option>
                              </select>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Inventory Management */}
                <div>
                  <h3 className="text-xl font-bold uppercase italic tracking-tight mb-6">Inventory</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {products.map(p => (
                      <div key={p.id} className="bg-white p-4 rounded-2xl flex items-center gap-4 border border-black/5">
                        <img src={p.images[0]} className="w-16 h-16 object-cover rounded-xl" />
                        <div className="flex-1">
                          <h5 className="font-bold text-sm uppercase tracking-tight">{p.name}</h5>
                          <p className="text-[10px] text-black/40 font-mono truncate max-w-[150px]">{p.images[0]}</p>
                          <p className="text-xs text-black/40">Stock: {p.stock} units</p>
                        </div>
                        <button onClick={() => deleteProduct(p.id)} className="text-red-500 p-2"><Trash2 size={16} /></button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-8">
                <div className="bg-black text-white p-8 rounded-3xl">
                  <h3 className="text-xl font-bold uppercase italic tracking-tight mb-6">Add Product</h3>
                  <form onSubmit={addProduct} className="space-y-4">
                    <input name="name" required placeholder="Product Name" className="w-full bg-white/10 border-none rounded-xl px-4 py-3 text-sm outline-none focus:ring-1 focus:ring-white" />
                    <input name="price" type="number" required placeholder="Price" className="w-full bg-white/10 border-none rounded-xl px-4 py-3 text-sm outline-none focus:ring-1 focus:ring-white" />
                    <input name="category" placeholder="Category (e.g. T-Shirts, Outerwear)" className="w-full bg-white/10 border-none rounded-xl px-4 py-3 text-sm outline-none focus:ring-1 focus:ring-white" />
                    <input name="imagePath" placeholder="Image Path (e.g. /images/item.jpg)" className="w-full bg-white/10 border-none rounded-xl px-4 py-3 text-sm outline-none focus:ring-1 focus:ring-white" />
                    <textarea name="description" required placeholder="Description" className="w-full bg-white/10 border-none rounded-xl px-4 py-3 text-sm outline-none focus:ring-1 focus:ring-white h-24" />
                    <p className="text-[10px] text-white/40 uppercase tracking-widest">Note: Place images in /public/images/ folder first.</p>
                    <button type="submit" className="w-full bg-white text-black py-4 rounded-full font-bold uppercase tracking-widest text-xs">Save Product</button>
                  </form>
                </div>
              </div>
            </div>
          </section>
          </AdminGuard>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-black/5 py-24 px-4 mt-24">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="col-span-1 md:col-span-2">
            <h2 className="text-2xl font-bold tracking-tighter uppercase italic mb-6">Aspiiro</h2>
            <p className="text-black/60 max-w-sm leading-relaxed">
              Modern, minimal streetwear inspired by the resilience of the urban landscape. Designed in India, made for the world.
            </p>
          </div>
          <div>
            <h5 className="font-bold uppercase text-xs tracking-widest mb-6">Shop</h5>
            <ul className="flex flex-col gap-4 text-sm text-black/60">
              <li><button onClick={scrollToProducts} className="hover:text-black transition-colors text-left">New Arrivals</button></li>
              <li><button onClick={scrollToProducts} className="hover:text-black transition-colors text-left">T-Shirts</button></li>
              <li><button onClick={scrollToProducts} className="hover:text-black transition-colors text-left">Bottoms</button></li>
              <li><button onClick={scrollToProducts} className="hover:text-black transition-colors text-red-500 text-left">Sale</button></li>
            </ul>
          </div>
          <div>
            <h5 className="font-bold uppercase text-xs tracking-widest mb-6">Support</h5>
            <ul className="flex flex-col gap-4 text-sm text-black/60">
              <li><button onClick={() => setView('tracking')} className="hover:text-black transition-colors">Order Tracking</button></li>
              <li><a href="#" className="hover:text-black transition-colors">Shipping Info</a></li>
              <li><a href="#" className="hover:text-black transition-colors">Returns</a></li>
              {isAdmin && <li><button onClick={() => setIsAdminView(true)} className="hover:text-black transition-colors">Admin Panel</button></li>}
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-24 pt-8 border-t border-black/5 flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] uppercase tracking-[0.2em] text-black/40">
          <p>© 2026 Aspiiro Streetwear. All rights reserved.</p>
          <div className="flex gap-8">
            <a href="#">Privacy Policy</a>
            <a href="#">Terms of Service</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
