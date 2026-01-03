import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { productAPI } from '../utils/api';
import ProductCard from '../components/ProductCard';
import { Button } from '../components/ui/button';

const HomePage = () => {
  const navigate = useNavigate();
  const [newArrivals, setNewArrivals] = useState([]);
  const [saleProducts, setSaleProducts] = useState([]);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const newRes = await productAPI.getAll({ new_arrivals: true });
      setNewArrivals(newRes.data.products.slice(0, 4));

      const saleRes = await productAPI.getAll({ on_sale: true });
      setSaleProducts(saleRes.data.products.slice(0, 4));
    } catch (error) {
      console.error('Failed to load products:', error);
    }
  };

  return (
    <div className="min-h-screen" data-testid="home-page">
      <section className="relative h-[90vh] border-b-2 border-black">
        <div className="absolute inset-0">
          <img
            src="https://images.pexels.com/photos/35465936/pexels-photo-35465936.jpeg"
            alt="Hero"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/40" />
        </div>

        <div className="relative h-full flex flex-col justify-center items-start max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="font-heading text-5xl md:text-7xl lg:text-8xl font-extrabold text-white tracking-tighter mb-6" data-testid="hero-heading">
            ASPIIRO
          </h1>
          <p className="text-white text-lg md:text-xl max-w-md mb-8 leading-relaxed">
            Premium streetwear for the modern urban explorer. Bold designs, uncompromising quality.
          </p>
          <Button
            onClick={() => navigate('/products')}
            className="bg-white text-black border-2 border-white hover:bg-black hover:text-white hover:border-white transition-all uppercase tracking-widest font-bold px-8 py-6 text-sm"
            data-testid="hero-shop-button"
          >
            Shop Now
            <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
        </div>
      </section>

      {newArrivals.length > 0 && (
        <section className="py-24 md:py-32 border-b-2 border-black" data-testid="new-arrivals-section">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center mb-12">
              <h2 className="font-heading text-3xl md:text-4xl font-extrabold tracking-tighter">
                NEW ARRIVALS
              </h2>
              <Button
                onClick={() => navigate('/products?new_arrivals=true')}
                variant="outline"
                className="border-2 border-black uppercase tracking-widest font-bold hover:bg-black hover:text-white"
                data-testid="view-all-arrivals-button"
              >
                View All
              </Button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-12">
              {newArrivals.map(product => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onClick={() => navigate(`/products/${product.id}`)}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {saleProducts.length > 0 && (
        <section className="py-24 md:py-32 bg-secondary" data-testid="sale-section">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center mb-12">
              <h2 className="font-heading text-3xl md:text-4xl font-extrabold tracking-tighter">
                SALE
              </h2>
              <Button
                onClick={() => navigate('/products?on_sale=true')}
                variant="outline"
                className="border-2 border-black uppercase tracking-widest font-bold hover:bg-black hover:text-white"
                data-testid="view-all-sale-button"
              >
                View All
              </Button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-12">
              {saleProducts.map(product => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onClick={() => navigate(`/products/${product.id}`)}
                />
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

export default HomePage;