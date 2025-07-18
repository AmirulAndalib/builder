import { component$ } from '@builder.io/qwik';

export type Product = {
  id: number;
  title: string;
  price: number;
  description: string;
  category: string;
  image: string;
  rating: {
    rate: number;
    count: number;
  };
};

export const ProductInfo = component$(({ product }: { product: Product }) => {
  if (!product) return null;
  return (
    <div>
      <div class="product-image">
        <img src={product.image} alt={product.title} />
      </div>
      <div class="product-info">
        <h2>{product.title}</h2>
        <p>{product.description}</p>
        <p>Price: {product.price} $</p>
        <p>Rating: {product.rating?.rate} / 5</p>
        <button>Buy now</button>
      </div>
    </div>
  );
});
