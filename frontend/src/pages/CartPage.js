import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { Trash2, Minus, Plus } from 'lucide-react';
import { Button } from '../components/ui/button';

const CartPage = () => {
  const navigate = useNavigate();
  const { cart, removeFromCart, updateQuantity, getTotal } = useCart();

  if (cart.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center" data-testid="empty-cart">
        <h2 className="font-heading text-3xl font-bold mb-4">YOUR CART IS EMPTY</h2>
        <Button
          onClick={() => navigate('/products')}
          className="bg-black text-white border-2 border-black hover:bg-white hover:text-black transition-all uppercase tracking-widest font-bold"
          data-testid="continue-shopping-button"
        >
          Continue Shopping
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12" data-testid="cart-page">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="font-heading text-4xl md:text-5xl font-extrabold tracking-tighter mb-12">YOUR CART</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2 space-y-6">
            {cart.map(item => {
              const price = item.discount > 0 ? item.price - (item.price * item.discount / 100) : item.price;
              return (
                <div key={`${item.id}-${item.size}`} className="flex gap-6 border-2 border-black p-4" data-testid="cart-item">
                  <img
                    src={item.images[0] || 'https://via.placeholder.com/150'}
                    alt={item.name}
                    className="w-32 h-32 object-cover border border-gray-200"
                  />
                  <div className="flex-1">
                    <h3 className="font-heading text-lg font-bold uppercase tracking-wider mb-1" data-testid="cart-item-name">{item.name}</h3>
                    <p className="text-sm text-muted-foreground mb-2">Size: {item.size}</p>
                    <p className="font-bold text-lg mb-4" data-testid="cart-item-price">₹{price.toFixed(2)}</p>

                    <div className="flex items-center gap-4">
                      <div className="flex items-center border-2 border-black">
                        <button
                          onClick={() => updateQuantity(item.id, item.size, item.quantity - 1)}
                          className="px-3 py-2 hover:bg-black hover:text-white transition-colors"
                          data-testid="decrease-quantity"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="px-4 font-bold" data-testid="item-quantity">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, item.size, item.quantity + 1)}
                          className="px-3 py-2 hover:bg-black hover:text-white transition-colors"
                          data-testid="increase-quantity"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                      <button
                        onClick={() => removeFromCart(item.id, item.size)}
                        className="text-destructive hover:text-destructive/80"
                        data-testid="remove-item"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-heading text-xl font-bold" data-testid="cart-item-total">
                      ₹{(price * item.quantity).toFixed(2)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="lg:col-span-1">
            <div className="border-2 border-black p-6 sticky top-24">
              <h2 className="font-heading text-2xl font-bold uppercase tracking-tighter mb-6">Order Summary</h2>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-bold">₹{getTotal().toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Shipping</span>
                  <span className="font-bold">FREE</span>
                </div>
                <div className="border-t-2 border-black pt-3 flex justify-between">
                  <span className="font-heading font-bold uppercase">Total</span>
                  <span className="font-heading text-xl font-bold" data-testid="cart-total">₹{getTotal().toFixed(2)}</span>
                </div>
              </div>

              <Button
                onClick={() => navigate('/checkout')}
                className="w-full bg-black text-white border-2 border-black hover:bg-white hover:text-black transition-all uppercase tracking-widest font-bold py-6"
                data-testid="proceed-to-checkout-button"
              >
                Proceed to Checkout
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CartPage;