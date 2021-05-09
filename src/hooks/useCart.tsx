import { createContext, ReactNode, useContext, useState } from "react";
import { toast } from "react-toastify";
import { api } from "../services/api";
import { Product, Stock } from "../types";

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}
interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem("@RocketShoes:cart");

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      await api.get(`products/${productId}`);
    } catch {
      toast.error("Erro na adição do produto");
    }

    try {
      const { data: stockResponse } = await api.get(`stock/${productId}`);

      const productFound = cart.find((product) => product.id === productId);

      if (productFound) {
        if (stockResponse.amount === productFound.amount) {
          throw new Error("Quantidade solicitada fora de estoque");
        }

        const newCart = [...cart];

        const found = newCart.findIndex((product) => product.id === productId);

        newCart[found].amount++;

        setCart(newCart);

        localStorage.setItem("@RocketShoes:cart", JSON.stringify(newCart));
      } else {
        const { data: productsResponse } = await api.get(
          `products/${productId}`
        );

        const newProduct = {
          ...productsResponse,
          amount: 1,
        };

        setCart((oldState) => [...oldState, newProduct]);

        localStorage.setItem(
          "@RocketShoes:cart",
          JSON.stringify([...cart, newProduct])
        );
      }
    } catch (err) {
      toast.error(err.message);
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const productFound = cart.find((product) => product.id === productId);

      if (!productFound) throw new Error("Erro na remoção do produto");

      const cartFiltered = cart.filter((product) => product.id !== productId);

      setCart([...cartFiltered]);

      localStorage.setItem("@RocketShoes:cart", JSON.stringify(cartFiltered));
    } catch (err) {
      toast.error(err.message);
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) return;

      const productFound = cart.find((product) => product.id === productId);

      if (!productFound)
        throw new Error("Erro na alteração de quantidade do produto");

      const { data: stockResponse } = await api.get(`stock/${productId}`);

      if (amount > stockResponse.amount) {
        throw new Error("Quantidade solicitada fora de estoque");
      }

      const newCart = cart.map((product) =>
        product.id === productId
          ? {
              ...product,
              amount: amount,
            }
          : product
      );

      setCart([...newCart]);

      localStorage.setItem("@RocketShoes:cart", JSON.stringify(newCart));
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
