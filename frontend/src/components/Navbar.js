import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, User, LogOut } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { Button } from './ui/button';

const Navbar = () => {
  const { cart } = useCart();
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <nav className="border-b-2 border-black bg-white sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="font-heading text-2xl font-extrabold tracking-tighter">
            ASPIIRO
          </Link>

          <div className="hidden md:flex items-center gap-8">
            <Link to="/products" className="font-heading text-sm font-bold uppercase tracking-widest hover:text-brand-accent transition-colors" data-testid="nav-products-link">
              Products
            </Link>
            <Link to="/products?new_arrivals=true" className="font-heading text-sm font-bold uppercase tracking-widest hover:text-brand-accent transition-colors" data-testid="nav-new-arrivals-link">
              New Arrivals
            </Link>
            <Link to="/products?on_sale=true" className="font-heading text-sm font-bold uppercase tracking-widest hover:text-brand-accent transition-colors" data-testid="nav-sale-link">
              Sale
            </Link>
          </div>

          <div className="flex items-center gap-4">
            {user ? (
              <>
                <Link to="/cart" className="relative" data-testid="nav-cart-button">
                  <ShoppingCart className="w-6 h-6" />
                  {cartCount > 0 && (
                    <span className="absolute -top-2 -right-2 bg-brand-accent text-white w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold">
                      {cartCount}
                    </span>
                  )}
                </Link>
                <Button
                  onClick={handleLogout}
                  variant="ghost"
                  size="icon"
                  data-testid="nav-logout-button"
                >
                  <LogOut className="w-5 h-5" />
                </Button>
                {isAdmin && (
                  <Link to="/admin/dashboard" data-testid="nav-admin-link">
                    <Button variant="outline" className="border-2 border-black uppercase tracking-widest font-bold">
                      Admin
                    </Button>
                  </Link>
                )}
              </>
            ) : (
              <Link to="/auth" data-testid="nav-login-button">
                <Button className="bg-black text-white border-2 border-black hover:bg-white hover:text-black transition-all uppercase tracking-widest font-bold">
                  <User className="w-4 h-4 mr-2" />
                  Login
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;