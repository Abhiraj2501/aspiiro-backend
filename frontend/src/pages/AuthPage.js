import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../utils/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';

const AuthPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [step, setStep] = useState('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendOTP = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await authAPI.sendOTP(email);
      if (res.data.success) {
        toast.success('OTP sent to your email');
        if (res.data.test_otp) {
          toast.info(`Test OTP: ${res.data.test_otp}`);
        }
        setStep('otp');
      }
    } catch (error) {
      toast.error('Failed to send OTP');
    }

    setLoading(false);
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await authAPI.verifyOTP(email, otp);
      if (res.data.success) {
        login(res.data.email, res.data.token);
        toast.success('Login successful!');
        navigate('/');
      }
    } catch (error) {
      toast.error('Invalid OTP');
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12" data-testid="auth-page">
      <div className="max-w-md w-full px-4">
        <div className="border-2 border-black p-8">
          <h1 className="font-heading text-3xl font-extrabold tracking-tighter mb-2 text-center">
            {step === 'email' ? 'LOGIN' : 'VERIFY OTP'}
          </h1>
          <p className="text-center text-muted-foreground mb-8 text-sm">
            {step === 'email' ? 'Enter your email to receive OTP' : 'Enter the OTP sent to your email'}
          </p>

          {step === 'email' ? (
            <form onSubmit={handleSendOTP} className="space-y-6">
              <div>
                <Label htmlFor="email" className="uppercase tracking-wider text-sm font-bold">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="border-b-2 border-gray-200 focus:border-black bg-transparent px-0"
                  data-testid="email-input"
                />
              </div>
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-black text-white border-2 border-black hover:bg-white hover:text-black transition-all uppercase tracking-widest font-bold py-6"
                data-testid="send-otp-button"
              >
                {loading ? 'Sending...' : 'Send OTP'}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOTP} className="space-y-6">
              <div>
                <Label htmlFor="otp" className="uppercase tracking-wider text-sm font-bold">OTP Code</Label>
                <Input
                  id="otp"
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  required
                  maxLength={6}
                  className="border-b-2 border-gray-200 focus:border-black bg-transparent px-0 text-center text-2xl tracking-widest"
                  data-testid="otp-input"
                />
              </div>
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-black text-white border-2 border-black hover:bg-white hover:text-black transition-all uppercase tracking-widest font-bold py-6"
                data-testid="verify-otp-button"
              >
                {loading ? 'Verifying...' : 'Verify & Login'}
              </Button>
              <Button
                type="button"
                onClick={() => setStep('email')}
                variant="outline"
                className="w-full border-2 border-black uppercase tracking-widest font-bold hover:bg-black hover:text-white"
                data-testid="back-to-email-button"
              >
                Back
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthPage;