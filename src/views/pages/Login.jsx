'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { getRoleLandingPage } from '@/lib/auth';
import toast from '@/lib/toast';

// assets
const logo = '/assets/images/logo-dark.svg';

// ==============================|| LOGIN PAGE ||============================== //

export default function LoginPage() {
  const { login, user, loading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (!loading && user) {
      const landingPage = getRoleLandingPage(user.role);
      router.push(landingPage);
    }
  }, [user, loading, router]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Basic validation
    if (!email || !password) {
      toast.error('Please enter both email and password');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await login(email, password);
      if (result.success) {
        toast.success('Login successful!');
        // Router.push is handled in login function
      } else {
        toast.error(result.error);
      }
<<<<<<< HEAD
    } catch {
=======
    } catch (error) {
>>>>>>> 2491ef18437c779306f2654bbcb73ada922063f9
      toast.error('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show loading spinner while checking auth
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="auth-main relative overflow-x-hidden">
      <div className="auth-wrapper v1 flex h-full min-h-screen w-full items-center">
        <div className="auth-form relative flex min-h-screen grow flex-col items-center justify-center px-6 py-3">
          <div className="relative w-full max-w-[350px]">
            <div className="auth-bg">
              <span className="bg-theme-bg-1 absolute top-[-100px] right-[-100px] block h-[300px] w-[300px] animate-[floating_7s_infinite] rounded-full"></span>
              <span className="bg-primary-500 absolute top-[150px] right-[-150px] block h-5 w-5 animate-[floating_9s_infinite] rounded-full"></span>
              <span className="bg-theme-bg-1 absolute bottom-[150px] left-[-150px] block h-5 w-5 animate-[floating_7s_infinite] rounded-full"></span>
              <span className="bg-theme-bg-2 absolute bottom-[-80px] left-[-100px] block h-[300px] w-[300px] animate-[floating_9s_infinite] rounded-full"></span>
            </div>
            <div className="card w-full shadow-none sm:my-12">
              <div className="card-body !p-10">
                <div className="mb-8 text-center">
                  <a href="#">
                    <Image src={logo} alt="Portal Logo" className="auth-logo mx-auto" width={100} height={50} />
                  </a>
                </div>
                <h4 className="mb-4 text-center font-medium">Internal Operations Portal</h4>
                <p className="mb-6 text-center text-sm text-muted">Sign in to your account</p>

                <form onSubmit={handleSubmit}>
                  <div className="mb-3">
                    <input
                      type="email"
                      className="form-control"
                      id="email"
                      placeholder="Email Address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isSubmitting}
                      required
                    />
                  </div>
                  <div className="mb-4">
                    <input
                      type="password"
                      className="form-control"
                      id="password"
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isSubmitting}
                      required
                    />
                  </div>

                  <div className="mt-4 text-center">
                    <button type="submit" className="btn btn-primary mx-auto shadow-2xl" disabled={isSubmitting}>
                      {isSubmitting ? 'Signing in...' : 'Sign In'}
                    </button>
                  </div>
                </form>

                <div className="mt-6 rounded-lg bg-gray-50 p-4">
                  <p className="mb-2 text-xs font-semibold text-gray-600">Test Credentials:</p>
                  <div className="space-y-1 text-xs text-gray-600">
                    <p>
                      <strong>Admin:</strong> admin@portal.com / admin123
                    </p>
                    <p>
                      <strong>Manager:</strong> manager@portal.com / manager123
                    </p>
                    <p>
                      <strong>Employee:</strong> employee@portal.com / employee123
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
