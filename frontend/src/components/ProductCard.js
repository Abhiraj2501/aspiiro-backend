import React from 'react';

const ProductCard = ({ product, onClick }) => {
  const discountedPrice = product.discount > 0
    ? product.price - (product.price * product.discount / 100)
    : null;

  return (
    <div
      onClick={onClick}
      className="group cursor-pointer"
      data-testid="product-card"
    >
      <div className="relative overflow-hidden border border-gray-200 hover:border-black transition-colors aspect-[3/4]">
        <img
          src={product.images[0] || 'https://via.placeholder.com/400x600'}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        {product.discount > 0 && (
          <div className="absolute top-4 right-4 bg-brand-accent text-white px-3 py-1 font-heading text-xs font-bold uppercase tracking-widest">
            -{product.discount}%
          </div>
        )}
        {product.is_new_arrival && (
          <div className="absolute top-4 left-4 bg-black text-white px-3 py-1 font-heading text-xs font-bold uppercase tracking-widest">
            New
          </div>
        )}
      </div>

      <div className="mt-4">
        <h3 className="font-heading text-sm font-bold uppercase tracking-wider mb-1" data-testid="product-name">
          {product.name}
        </h3>
        <p className="text-muted-foreground text-xs mb-2">{product.category}</p>
        <div className="flex items-center gap-2">
          {discountedPrice ? (
            <>
              <span className="font-bold text-lg" data-testid="product-price">₹{discountedPrice.toFixed(2)}</span>
              <span className="text-sm text-muted-foreground line-through">₹{product.price.toFixed(2)}</span>
            </>
          ) : (
            <span className="font-bold text-lg" data-testid="product-price">₹{product.price.toFixed(2)}</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductCard;