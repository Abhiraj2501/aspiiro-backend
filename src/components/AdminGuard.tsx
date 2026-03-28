import React, { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';

interface AdminGuardProps {
  children: React.ReactNode;
  onUnauthorized: () => void;
}

export const AdminGuard: React.FC<AdminGuardProps> = ({ children, onUnauthorized }) => {
  const { user, isAdmin, token } = useAuth();

  useEffect(() => {
    if (!token || !isAdmin) {
      toast.error('Unauthorized: Admin access only');
      onUnauthorized();
    }
  }, [token, isAdmin, onUnauthorized]);

  if (!token || !isAdmin) {
    return null;
  }

  return <>{children}</>;
};
