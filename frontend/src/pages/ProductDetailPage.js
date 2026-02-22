import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { productAPI } from '../utils/api';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';

const ProductDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { user } = useAuth();
  const [product, setProduct] = useState(null);
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedImage, setSelectedImage] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProduct();
  }, [id]);

  const loadProduct = async () => {
    try {
      const res = await productAPI.getOne(id);
      setProduct(res.data.product);
      if (res.data.product.sizes.length > 0) {
        setSelectedSize(res.data.product.sizes[0]);
      }
    } catch (error) {
      toast.error('Failed to load product');
    }
    setLoading(false);
  };

  const handleAddToCart = () => {
    if (!user) {
      toast.error('Please login to add items to cart');
      navigate('/auth');
      return;
    }
    if (!selectedSize) {
      toast.error('Please select a size');
      return;
    }
    addToCart(product, selectedSize);
    toast.success('Added to cart!');
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!product) {
    return <div className="min-h-screen flex items-center justify-center">Product not found</div>;
  }

  const discountedPrice = product.discount > 0
    ? product.price - (product.price * product.discount / 100)
    : null;

  return (
    <div className="min-h-screen py-12" data-testid="product-detail-page">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div>
            <div className="border-2 border-black mb-4">
              <img
                src={product.images[selectedImage] || 'https://via.placeholder.com/800'}
                alt={product.name}
                className="w-full aspect-[3/4] object-cover"
                data-testid="product-main-image"
              />
            </div>
            {product.images.length > 1 && (
              <div className="grid grid-cols-4 gap-2">
                {product.images.map((img, idx) => (
                  <div
                    key={idx}
                    onClick={() => setSelectedImage(idx)}
                    className={`border-2 cursor-pointer ${
                      selectedImage === idx ? 'border-black' : 'border-gray-200'
                    }`}
                  >
                    <img src={img} alt={`${product.name} ${idx + 1}`} className="w-full aspect-square object-cover" />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="mb-6">
              {product.is_new_arrival && (
                <span className="inline-block bg-black text-white px-3 py-1 font-heading text-xs font-bold uppercase tracking-widest mb-2">
                  New
                </span>
              )}
              <h1 className="font-heading text-3xl md:text-4xl font-extrabold tracking-tighter mb-2" data-testid="product-detail-name">
                {product.name}
              </h1>
              <p className="text-muted-foreground uppercase tracking-wider text-sm">{product.category}</p>
            </div>

            <div className="mb-8">
              <div className="flex items-baseline gap-3 mb-4">
                {discountedPrice ? (
                  <>
                    <span className="font-heading text-3xl font-bold" data-testid="product-detail-price">₹{discountedPrice.toFixed(2)}</span>
                    <span className="text-xl text-muted-foreground line-through">₹{product.price.toFixed(2)}</span>
                    <span className="bg-brand-accent text-white px-2 py-1 font-heading text-xs font-bold uppercase tracking-widest">
                      {product.discount}% OFF
                    </span>
                  </>
                ) : (
                  <span className="font-heading text-3xl font-bold" data-testid="product-detail-price">₹{product.price.toFixed(2)}</span>
                )}
              </div>
              <p className="leading-relaxed text-muted-foreground">{product.description}</p>
            </div>

            <div className="mb-8">
              <h3 className="font-heading text-sm font-bold uppercase tracking-widest mb-3">Select Size</h3>
              <div className="flex gap-2">
                {product.sizes.map(size => (
                  <Button
                    key={size}
                    onClick={() => setSelectedSize(size)}
                    variant={selectedSize === size ? 'default' : 'outline'}
                    className={`border-2 border-black uppercase tracking-widest font-bold w-16 h-12 ${
                      selectedSize === size ? 'bg-black text-white' : 'hover:bg-black hover:text-white'
                    }`}
                    data-testid={`size-button-${size}`}
                  >
                    {size}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <Button
                onClick={handleAddToCart}
                className="w-full bg-black text-white border-2 border-black hover:bg-white hover:text-black transition-all uppercase tracking-widest font-bold py-6 text-base"
                data-testid="add-to-cart-button"
              >
                Add to Cart
              </Button>
              <p className="text-sm text-muted-foreground text-center">
                Stock: <span className="font-bold">{product.stock} items available</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetailPage;