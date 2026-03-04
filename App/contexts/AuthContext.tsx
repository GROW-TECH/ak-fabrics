import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  shopName: string;
  login: (token: string, shopId: string, shopName: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [shopName, setShopName] = useState('');

  useEffect(() => {
    // Check for token on mount
    const token = localStorage.getItem("token");
    const shopId = localStorage.getItem("shop_id");
    const savedShopName = localStorage.getItem("shop_name");
    
    if (token && shopId) {
      setIsAuthenticated(true);
      
      // Map shop ID to shop name
      let mappedShopName = savedShopName;
      if (!mappedShopName) {
        if (shopId === "shop1") {
          mappedShopName = "AK Fabrics";
        } else if (shopId === "shop2") {
          mappedShopName = "Kannan Textiles";
        } else {
          mappedShopName = "AK Fabrics"; // fallback
        }
      }
      
      setShopName(mappedShopName);
      localStorage.setItem("shop_name", mappedShopName);
    }
    
    // Set loading to false after checking
    setIsLoading(false);
  }, []);

  const login = (token: string, shopId: string, shopName: string) => {
    localStorage.setItem("token", token);
    localStorage.setItem("shop_id", shopId);
    localStorage.setItem("shop_name", shopName);
    setIsAuthenticated(true);
    setShopName(shopName);
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("shop_id");
    localStorage.removeItem("shop_name");
    setIsAuthenticated(false);
    setShopName('');
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, shopName, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
