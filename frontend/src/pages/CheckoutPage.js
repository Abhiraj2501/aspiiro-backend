import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { orderAPI, paymentAPI } from '../utils/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';

const CheckoutPage = () => {
  const navigate = useNavigate();
  const { cart, getTotal, clearCart } = useCart();
  const [loading, setLoading] = useState(false);
  const [address, setAddress] = useState({
    fullName: '',
    phone: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    pincode: ''
  });

  const handleInputChange = (e) => {
    setAddress({ ...address, [e.target.name]: e.target.value });
  };

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleCheckout = async (e) => {
    e.preventDefault();
    
    if (Object.values(address).some(val => !val.trim())) {
      toast.error('Please fill all address fields');
      return;
    }

    setLoading(true);

    try {
      const orderRes = await orderAPI.create({
        items: cart.map(item => ({
          product_id: item.id,
          name: item.name,
          size: item.size,
          quantity: item.quantity,
          price: item.discount > 0 ? item.price - (item.price * item.discount / 100) : item.price
        })),
        total: getTotal(),
        address
      });

      const order = orderRes.data.order;

      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        toast.error('Failed to load payment gateway');
        setLoading(false);
        return;
      }

      const paymentOrderRes = await paymentAPI.createOrder(getTotal(), order.id);
      const { order_id, amount, currency, key_id } = paymentOrderRes.data;
      
      const options = {
        key: key_id,
        amount,
        currency,
        name: 'Aspiiro',
        description: 'Order Payment',
        order_id,
        handler: async function (response) {
          try {
            await paymentAPI.verify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              order_id: order.id
            });
            clearCart();
            navigate(`/order-confirmation/${order.id}`);
          } catch (error) {
            toast.error('Payment verification failed');
          }
        },
        prefill: {
          name: address.fullName,
          contact: address.phone
        },
        theme: {
          color: '#000000'
        }
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error) {
      toast.error('Checkout failed. Please try again.');
    }

    setLoading(false);
  };

  if (cart.length === 0) {
    navigate('/cart');
    return null;
  }

  return (
    <div className="min-h-screen py-12" data-testid="checkout-page">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="font-heading text-4xl md:text-5xl font-extrabold tracking-tighter mb-12">CHECKOUT</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div>
            <h2 className="font-heading text-xl font-bold uppercase tracking-wider mb-6">Shipping Address</h2>
            <form onSubmit={handleCheckout} className="space-y-4">
              <div>
                <Label htmlFor="fullName" className="uppercase tracking-wider text-sm font-bold">Full Name</Label>
                <Input
                  id="fullName"
                  name="fullName"
                  value={address.fullName}
                  onChange={handleInputChange}
                  required
                  className="border-b-2 border-gray-200 focus:border-black bg-transparent px-0"
                  data-testid="input-fullname"
                />
              </div>
              <div>
                <Label htmlFor="phone" className="uppercase tracking-wider text-sm font-bold">Phone Number</Label>
                <Input
                  id="phone"
                  name="phone"
                  value={address.phone}
                  onChange={handleInputChange}
                  required
                  className="border-b-2 border-gray-200 focus:border-black bg-transparent px-0"
                  data-testid="input-phone"
                />
              </div>
              <div>
                <Label htmlFor="addressLine1" className="uppercase tracking-wider text-sm font-bold">Address Line 1</Label>
                <Input
                  id="addressLine1"
                  name="addressLine1"
                  value={address.addressLine1}
                  onChange={handleInputChange}
                  required
                  className="border-b-2 border-gray-200 focus:border-black bg-transparent px-0"
                  data-testid="input-address1"
                />
              </div>
              <div>
                <Label htmlFor="addressLine2" className="uppercase tracking-wider text-sm font-bold">Address Line 2</Label>
                <Input
                  id="addressLine2"
                  name="addressLine2"
                  value={address.addressLine2}
                  onChange={handleInputChange}
                  className="border-b-2 border-gray-200 focus:border-black bg-transparent px-0"
                  data-testid="input-address2"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="city" className="uppercase tracking-wider text-sm font-bold">City</Label>
                  <Input
                    id="city"
                    name="city"
                    value={address.city}
                    onChange={handleInputChange}
                    required
                    className="border-b-2 border-gray-200 focus:border-black bg-transparent px-0"
                    data-testid="input-city"
                  />
                </div>
                <div>
                  <Label htmlFor="state" className="uppercase tracking-wider text-sm font-bold">State</Label>
                  <Input
                    id="state"
                    name="state"
                    value={address.state}
                    onChange={handleInputChange}
                    required
                    className="border-b-2 border-gray-200 focus:border-black bg-transparent px-0"
                    data-testid="input-state"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="pincode" className="uppercase tracking-wider text-sm font-bold">Pincode</Label>
                <Input
                  id="pincode"
                  name="pincode"
                  value={address.pincode}
                  onChange={handleInputChange}
                  required
                  className="border-b-2 border-gray-200 focus:border-black bg-transparent px-0"
                  data-testid="input-pincode"
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-black text-white border-2 border-black hover:bg-white hover:text-black transition-all uppercase tracking-widest font-bold py-6 mt-8"
                data-testid="place-order-button"
              >
                {loading ? 'Processing...' : 'Place Order & Pay'}
              </Button>
            </form>
          </div>

          <div>
            <h2 className="font-heading text-xl font-bold uppercase tracking-wider mb-6">Order Summary</h2>
            <div className="border-2 border-black p-6">
              <div className="space-y-4 mb-6">
                {cart.map(item => {
                  const price = item.discount > 0 ? item.price - (item.price * item.discount / 100) : item.price;
                  return (
                    <div key={`${item.id}-${item.size}`} className="flex justify-between text-sm">
                      <span>{item.name} ({item.size}) x {item.quantity}</span>
                      <span className="font-bold">₹{(price * item.quantity).toFixed(2)}</span>
                    </div>
                  );
                })}
              </div>
              <div className="border-t-2 border-black pt-4 space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-bold">₹{getTotal().toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Shipping</span>
                  <span className="font-bold">FREE</span>
                </div>
                <div className="flex justify-between text-lg font-heading font-bold uppercase">
                  <span>Total</span>
                  <span data-testid="checkout-total">₹{getTotal().toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;