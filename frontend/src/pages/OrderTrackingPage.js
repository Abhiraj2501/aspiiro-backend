import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { orderAPI } from '../utils/api';
import { Package, Truck, CheckCircle } from 'lucide-react';

const OrderTrackingPage = () => {
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

  const statuses = [
    { key: 'placed', label: 'Order Placed', icon: Package },
    { key: 'packed', label: 'Packed', icon: Package },
    { key: 'shipped', label: 'Shipped', icon: Truck },
    { key: 'delivered', label: 'Delivered', icon: CheckCircle }
  ];

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!order) {
    return <div className="min-h-screen flex items-center justify-center">Order not found</div>;
  }

  const currentStatusIndex = statuses.findIndex(s => s.key === order.status);

  return (
    <div className="min-h-screen py-12" data-testid="order-tracking-page">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="font-heading text-4xl md:text-5xl font-extrabold tracking-tighter mb-4">TRACK ORDER</h1>
        <p className="text-muted-foreground mb-12">
          Order ID: <span className="font-bold" data-testid="tracking-order-id">{order.id}</span>
        </p>

        <div className="border-2 border-black p-8 mb-8">
          <div className="relative">
            {statuses.map((status, idx) => {
              const Icon = status.icon;
              const isCompleted = idx <= currentStatusIndex;
              const isActive = idx === currentStatusIndex;

              return (
                <div key={status.key} className="relative flex items-center mb-12 last:mb-0">
                  {idx < statuses.length - 1 && (
                    <div
                      className={`absolute left-6 top-12 w-1 h-full ${
                        isCompleted ? 'bg-black' : 'bg-gray-200'
                      }`}
                    />
                  )}
                  
                  <div className="relative flex items-center gap-6">
                    <div
                      className={`w-12 h-12 border-4 flex items-center justify-center z-10 bg-white ${
                        isCompleted ? 'border-black' : 'border-gray-200'
                      }`}
                      data-testid={`status-${status.key}`}
                    >
                      <Icon className={`w-6 h-6 ${isCompleted ? 'text-black' : 'text-gray-400'}`} />
                    </div>
                    <div>
                      <h3 className={`font-heading text-lg font-bold uppercase tracking-wider ${
                        isCompleted ? 'text-black' : 'text-gray-400'
                      }`}>
                        {status.label}
                      </h3>
                      {isActive && (
                        <p className="text-sm text-brand-accent font-bold mt-1">Current Status</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="border-2 border-black p-8">
          <h2 className="font-heading text-xl font-bold uppercase tracking-wider mb-6">Order Items</h2>
          <div className="space-y-4">
            {order.items.map((item, idx) => (
              <div key={idx} className="flex justify-between items-center pb-4 border-b border-gray-200 last:border-0">
                <div>
                  <p className="font-bold">{item.name}</p>
                  <p className="text-sm text-muted-foreground">Size: {item.size} | Qty: {item.quantity}</p>
                </div>
                <p className="font-bold">₹{(item.price * item.quantity).toFixed(2)}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 pt-6 border-t-2 border-black flex justify-between font-heading font-bold uppercase text-lg">
            <span>Total</span>
            <span data-testid="tracking-order-total">₹{order.total.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderTrackingPage;