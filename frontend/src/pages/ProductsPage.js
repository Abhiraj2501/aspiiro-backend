import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { productAPI } from '../utils/api';
import ProductCard from '../components/ProductCard';
import { Button } from '../components/ui/button';

const ProductsPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('');

  const categories = ['All', 'Hoodies', 'T-Shirts', 'Pants', 'Jackets'];

  useEffect(() => {
    loadProducts();
  }, [searchParams, selectedCategory]);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const params = {};
      if (searchParams.get('new_arrivals')) params.new_arrivals = true;
      if (searchParams.get('on_sale')) params.on_sale = true;
      if (selectedCategory && selectedCategory !== 'All') params.category = selectedCategory;

      const res = await productAPI.getAll(params);
      setProducts(res.data.products);
    } catch (error) {
      console.error('Failed to load products:', error);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen py-12" data-testid="products-page">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="font-heading text-4xl md:text-5xl font-extrabold tracking-tighter mb-12">
          {searchParams.get('new_arrivals') ? 'NEW ARRIVALS' : searchParams.get('on_sale') ? 'SALE' : 'ALL PRODUCTS'}
        </h1>

        <div className="flex gap-2 mb-12 overflow-x-auto pb-2">
          {categories.map(cat => (
            <Button
              key={cat}
              onClick={() => setSelectedCategory(cat === 'All' ? '' : cat)}
              variant={selectedCategory === (cat === 'All' ? '' : cat) ? 'default' : 'outline'}
              className={`border-2 border-black uppercase tracking-widest font-bold whitespace-nowrap ${
                selectedCategory === (cat === 'All' ? '' : cat)
                  ? 'bg-black text-white'
                  : 'hover:bg-black hover:text-white'
              }`}
              data-testid={`category-filter-${cat.toLowerCase()}`}
            >
              {cat}
            </Button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground">Loading products...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground">No products found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-12">
            {products.map(product => (
              <ProductCard
                key={product.id}
                product={product}
                onClick={() => navigate(`/products/${product.id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductsPage;