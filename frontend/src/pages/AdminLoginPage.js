import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../utils/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';

const AdminLoginPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await authAPI.adminLogin(email, password);
      if (res.data.success) {
        login(res.data.email, res.data.token, true);
        toast.success('Admin login successful!');
        navigate('/admin/dashboard');
      }
    } catch (error) {
      toast.error('Invalid admin credentials');
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12" data-testid="admin-login-page">
      <div className="max-w-md w-full px-4">
        <div className="border-2 border-black p-8">
          <h1 className="font-heading text-3xl font-extrabold tracking-tighter mb-2 text-center">
            ADMIN LOGIN
          </h1>
          <p className="text-center text-muted-foreground mb-8 text-sm">
            Admin access only
          </p>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <Label htmlFor="email" className="uppercase tracking-wider text-sm font-bold">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="border-b-2 border-gray-200 focus:border-black bg-transparent px-0"
                data-testid="admin-email-input"
              />
            </div>
            <div>
              <Label htmlFor="password" className="uppercase tracking-wider text-sm font-bold">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="border-b-2 border-gray-200 focus:border-black bg-transparent px-0"
                data-testid="admin-password-input"
              />
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-black text-white border-2 border-black hover:bg-white hover:text-black transition-all uppercase tracking-widest font-bold py-6"
              data-testid="admin-login-button"
            >
              {loading ? 'Logging in...' : 'Login'}
            </Button>
          </form>
          
          <div className="mt-6 p-4 bg-secondary border border-gray-200">
            <p className="text-xs text-muted-foreground">
              <strong>Default credentials:</strong><br />
              Email: admin@aspiiro.com<br />
              Password: admin123
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLoginPage;