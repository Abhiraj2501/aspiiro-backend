import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { orderAPI } from '../utils/api';
import { CheckCircle } from 'lucide-react';
import { Button } from '../components/ui/button';

const OrderConfirmationPage = () => {
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrder();
  }, [orderId]);

  const loadOrder = async () => {
    try {
      const res = await orderAPI.getOne(orderId);
      setOrder(res.data.order);
    } catch (error) {
      console.error('Failed to load order:', error);
    }
    setLoading(false);
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!order) {
    return <div className="min-h-screen flex items-center justify-center">Order not found</div>;
  }

  return (
    <div className="min-h-screen py-12" data-testid="order-confirmation-page">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="mb-8">
          <CheckCircle className="w-20 h-20 mx-auto text-success mb-6" />
          <h1 className="font-heading text-4xl md:text-5xl font-extrabold tracking-tighter mb-4" data-testid="confirmation-heading">
            ORDER CONFIRMED!
          </h1>
          <p className="text-lg text-muted-foreground mb-2">Thank you for your purchase</p>
          <p className="text-sm text-muted-foreground">
            Order ID: <span className="font-bold" data-testid="order-id">{order.id}</span>
          </p>
        </div>

        <div className="border-2 border-black p-8 text-left mb-8">
          <h2 className="font-heading text-xl font-bold uppercase tracking-wider mb-6">Order Details</h2>
          
          <div className="space-y-4 mb-6">
            {order.items.map((item, idx) => (
              <div key={idx} className="flex justify-between text-sm">
                <span>{item.name} ({item.size}) x {item.quantity}</span>
                <span className="font-bold">₹{(item.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>

          <div className="border-t-2 border-black pt-4">
            <div className="flex justify-between font-heading font-bold uppercase text-lg">
              <span>Total</span>
              <span data-testid="order-total">₹{order.total.toFixed(2)}</span>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="font-heading text-sm font-bold uppercase tracking-wider mb-3">Shipping Address</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {order.address.fullName}<br />
              {order.address.addressLine1}<br />
              {order.address.addressLine2 && <>{order.address.addressLine2}<br /></>}
              {order.address.city}, {order.address.state} - {order.address.pincode}<br />
              Phone: {order.address.phone}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <Link to={`/order-tracking/${order.id}`}>
            <Button
              className="w-full bg-black text-white border-2 border-black hover:bg-white hover:text-black transition-all uppercase tracking-widest font-bold"
              data-testid="track-order-button"
            >
              Track Order
            </Button>
          </Link>
          <Link to="/products">
            <Button
              variant="outline"
              className="w-full border-2 border-black uppercase tracking-widest font-bold hover:bg-black hover:text-white"
              data-testid="continue-shopping-button"
            >
              Continue Shopping
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default OrderConfirmationPage;