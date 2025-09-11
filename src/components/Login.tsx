
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Satellite, Leaf, Mail, Key } from 'lucide-react';
import { setAuthData } from '../utils/auth';

export type UserRole = "manager" | "admin" | "fieldofficer" | "farmer";

interface LoginProps {
  onLoginSuccess: (role: UserRole, token: string) => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [identifier, setIdentifier] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'input' | 'otp'>('input');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Send OTP to the provided email
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('http://192.168.41.73:8000/api/otp/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email: identifier.trim()
        }),
      });

      const responseText = await response.text();
      
      if (!response.ok) {
        throw new Error(responseText || 'Error sending OTP');
      }

      // Successfully sent OTP
      setStep('otp');
      setError('');
      
    } catch (err: any) {
      console.error('OTP sending error:', err);
      setError(err.message || 'Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Verify OTP and authenticate user
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('http://192.168.41.73:8000/api/verify-otp/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email: identifier.trim(),
          otp: otp.trim()
        }),
      });

      const responseText = await response.text();
      
      if (!response.ok) {
        throw new Error(responseText || 'OTP verification failed');
      }

      const result = JSON.parse(responseText);
      const token = result.access || result.token;
      
      if (!token) {
        throw new Error('No authentication token received');
      }

      // Fetch user information
      const userResponse = await fetch('http://192.168.41.73:8000/api/users/me/', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!userResponse.ok) {
        throw new Error('Failed to fetch user information');
      }

      const userData = await userResponse.json();
      console.log('User data received:', userData); // Debug log
      console.log('userData.role:', userData.role, 'type:', typeof userData.role);
      console.log('userData.role_id:', userData.role_id, 'type:', typeof userData.role_id);
      
      // Handle both string roles and numeric role_id
      let userRole: UserRole;
      
      // Create role mapping
      const roleMap: { [key: number]: UserRole } = {
        1: 'farmer',
        2: 'fieldofficer', 
        3: 'manager',
        4: 'admin'
      };
      
      if (userData.role && typeof userData.role === 'object' && userData.role.name) {
        // If role is an object with name property, use the name
        userRole = userData.role.name.toLowerCase() as UserRole;
        console.log('Using role object name:', userRole);
      } else if (userData.role && typeof userData.role === 'object' && userData.role.id) {
        // If role is an object with id property, map the id
        userRole = roleMap[userData.role.id] || 'farmer';
        console.log('Using role object id mapping:', userData.role.id, '->', userRole);
      } else if (userData.role && typeof userData.role === 'string') {
        // If role is a string, use it directly
        userRole = userData.role.toLowerCase() as UserRole;
        console.log('Using string role:', userRole);
      } else if (userData.role_id && typeof userData.role_id === 'number') {
        // If role_id is a number, map it to role string
        userRole = roleMap[userData.role_id] || 'farmer';
        console.log('Using role_id mapping:', userData.role_id, '->', userRole);
      } else if (userData.role && typeof userData.role === 'number') {
        // If role is a number, map it to role string
        userRole = roleMap[userData.role] || 'farmer';
        console.log('Using role number mapping:', userData.role, '->', userRole);
      } else {
        // Log all available properties for debugging
        console.log('All userData properties:', Object.keys(userData));
        console.log('Full userData object:', userData);
        
        // Try to find any role-related property
        const possibleRoleKeys = ['role', 'role_id', 'user_role', 'user_type', 'type'];
        let foundRole = null;
        
        for (const key of possibleRoleKeys) {
          if (userData[key] !== undefined) {
            console.log(`Found ${key}:`, userData[key], 'type:', typeof userData[key]);
            if (typeof userData[key] === 'number' && roleMap[userData[key]]) {
              foundRole = roleMap[userData[key]];
              break;
            } else if (typeof userData[key] === 'string') {
              const lowerRole = userData[key].toLowerCase();
              if (['farmer', 'fieldofficer', 'manager', 'admin'].includes(lowerRole)) {
                foundRole = lowerRole;
                break;
              }
            }
          }
        }
        
        if (foundRole) {
          userRole = foundRole as UserRole;
          console.log('Found role through property search:', foundRole);
        } else {
          console.error('Could not determine user role from userData:', userData);
          throw new Error(`Invalid user role format. Available data: ${JSON.stringify(userData)}`);
        }
      }

      // Validate role
      if (!userRole || !['manager', 'admin', 'fieldofficer', 'farmer'].includes(userRole)) {
        throw new Error('Invalid user role');
      }

      // Store all authentication data using the utility function
      const userDataToStore = {
        first_name: userData.first_name || '',
        last_name: userData.last_name || '',
        email: userData.email || identifier,
        username: userData.username || '',
        id: userData.id || ''
      };
      
      console.log('🔐 Storing authentication data:', {
        token: token ? `${token.substring(0, 20)}...` : 'null',
        role: userRole,
        userData: userDataToStore
      });
      
      setAuthData(token, userRole, userDataToStore);
      
      // Verify token was stored
      const storedToken = localStorage.getItem('token');
      console.log('✅ Token stored verification:', storedToken ? 'Token stored successfully' : 'Token storage failed');
      
      // Success - call the callback with role and token
      onLoginSuccess(userRole, token);

    } catch (err: any) {
      console.error('OTP verification error:', err);
      setError(err.message || 'OTP verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToEmail = () => {
    setStep('input');
    setOtp('');
    setError('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 relative overflow-hidden">
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 0.4 }}
      style={{
        backgroundImage: `url('/src/components/icons/sugarcane main slide.jpg')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
      className="absolute inset-0"
    />
   <div className="absolute top-0 left-0 w-full flex justify-center items-center p-2 md:p-4 z-20">
<img
  src="src/components/icons/cropw.png"
  alt="SmartCropLogo"
  className="w-56 h-48 md:w-72 md:h-60 object-contain max-w-[60vw] md:max-w-[288px]"
  style={{ maxWidth: '60vw', height: 'auto' }}
/>
</div>

<div className="relative min-h-screen flex flex-col md:flex-row items-center justify-center p-1 sm:p-2 md:p-4 overflow-hidden pt-25">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl w-full max-w-5xl flex flex-col md:flex-row overflow-hidden"
        >
          <motion.div
            initial={{ x: -50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="w-full md:w-1/2 bg-emerald-600 p-6 md:p-12 flex flex-col justify-center items-center text-white relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-[url('/src/components/icons/sugarcane-plant.jpg')] bg-cover bg-center opacity-10" />
            <div className="relative z-10">
            <div className="flex items-center justify-center mb-8">
                <h1 className="text-4xl font-bold tracking-wide">CROPEYE</h1>
             </div>
            <p className="text-lg text-emerald-50 mb-6 text-center">Welcome to the future of agriculture</p>
              <div className="flex items-center justify-center space-x-2">
                <Leaf className="w-5 h-5" />
                <span>Intelligent Farming Solutions</span>
              </div>
            </div>
          </motion.div>
          {/* Right Panel - Login Form */}
          <div className="w-full md:w-1/2 p-6 md:p-12">
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <h3 className="text-3xl font-bold text-gray-800 mb-8 text-center">
                {step === 'input' ? 'Login with Email' : 'Enter OTP'}
              </h3>

              {/* Error Display */}
              {/* {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                  {error}
                </div>
              )} */}

              {/* Login Form */}
              <form onSubmit={step === 'input' ? handleSendOtp : handleVerifyOtp} className="space-y-6">
                {step === 'input' ? (
                  <>
                    <div className="relative">
                      <div className="flex items-center border border-gray-300 rounded-lg px-3 py-3 bg-white focus-within:ring-2 focus-within:ring-emerald-500 focus-within:border-emerald-500">
                        <Mail className="w-5 h-5 mr-3 text-gray-500" />
                        <input
                          type="email"
                          placeholder="Enter your email address"
                          value={identifier}
                          onChange={(e) => setIdentifier(e.target.value)}
                          className="w-full outline-none text-gray-700"
                          required
                          disabled={loading}
                        />
                      </div>
                    </div>
                    
                    <button
                      type="submit"
                      disabled={loading || !identifier.trim()}
                      className="w-full bg-emerald-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-emerald-700 focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {loading ? (
                        <div className="flex items-center justify-center">
                          <Satellite className="w-5 h-5 animate-spin mr-2" />
                          Sending OTP...
                        </div>
                      ) : (
                        'Send OTP'
                      )}
                    </button>
                  </>
                ) : (
                  <>
                    <div className="text-center mb-4">
                      <p className="text-gray-600">
                        OTP has been sent to <strong>{identifier}</strong>
                      </p>
                    </div>
                    
                    <div className="relative">
                      <div className="flex items-center border border-gray-300 rounded-lg px-3 py-3 bg-white focus-within:ring-2 focus-within:ring-emerald-500 focus-within:border-emerald-500">
                        <Key className="w-5 h-5 mr-3 text-gray-500" />
                        <input
                          type="text"
                          placeholder="Enter 6-digit OTP"
                          value={otp}
                          onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                          className="w-full outline-none text-gray-700 tracking-wider"
                          maxLength={6}
                          required
                          disabled={loading}
                        />
                      </div>
                    </div>
                    
                    <button
                      type="submit"
                      disabled={loading || otp.length !== 6}
                      className="w-full bg-emerald-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-emerald-700 focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {loading ? (
                        <div className="flex items-center justify-center">
                          <Satellite className="w-5 h-5 animate-spin mr-2" />
                          Verifying...
                        </div>
                      ) : (
                        'Verify OTP'
                      )}
                    </button>
                    
                    <button
                      type="button"
                      onClick={handleBackToEmail}
                      disabled={loading}
                      className="w-full bg-gray-200 text-gray-700 py-3 px-4 rounded-lg font-semibold hover:bg-gray-300 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Change Email
                    </button>
                  </>
                )}
              </form>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;