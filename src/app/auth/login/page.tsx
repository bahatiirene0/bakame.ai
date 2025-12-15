/**
 * Login/Signup Page - Premium Design
 *
 * Features:
 * - Tabs for Sign In / Sign Up
 * - Google OAuth login (sign in only)
 * - Phone number with country code
 * - Email optional (for digitally literate users)
 * - Language toggle
 * - Password validation with suggestions
 * - Forgot password placeholder
 */

'use client'
/* eslint-disable */;

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useLanguageStore, useTranslation } from '@/store/languageStore';

type AuthMode = 'signin' | 'signup';

// Country codes for phone
const countryCodes = [
  { code: '+250', country: 'RW', flag: '🇷🇼', name: 'Rwanda' },
  { code: '+254', country: 'KE', flag: '🇰🇪', name: 'Kenya' },
  { code: '+255', country: 'TZ', flag: '🇹🇿', name: 'Tanzania' },
  { code: '+256', country: 'UG', flag: '🇺🇬', name: 'Uganda' },
  { code: '+243', country: 'CD', flag: '🇨🇩', name: 'DR Congo' },
  { code: '+257', country: 'BI', flag: '🇧🇮', name: 'Burundi' },
  { code: '+1', country: 'US', flag: '🇺🇸', name: 'USA' },
  { code: '+44', country: 'GB', flag: '🇬🇧', name: 'UK' },
  { code: '+33', country: 'FR', flag: '🇫🇷', name: 'France' },
  { code: '+49', country: 'DE', flag: '🇩🇪', name: 'Germany' },
];

// Password validation
const validatePassword = (password: string) => {
  return {
    minLength: password.length >= 6,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
  };
};

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslation();
  const { language, toggleLanguage } = useLanguageStore();
  const {
    signInWithGoogle,
    signInWithPassword,
    signInWithPhone,
    signUpWithPassword,
    verifyPhoneOtp,
    resendPhoneOtp,
    resetPasswordForEmail,
    user
  } = useAuthStore();

  // Local loading state for form submissions (not using global isLoading which starts as true)
  const [isSubmitting, setIsSubmitting] = useState(false);

  // OTP verification state
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [pendingPhone, setPendingPhone] = useState('');

  // Forgot password state
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetEmailSent, setResetEmailSent] = useState(false);

  // Modal ref for focus trap
  const forgotPasswordModalRef = useRef<HTMLDivElement>(null);

  // Get mode from URL or default to signin
  const initialMode = (searchParams.get('mode') as AuthMode) || 'signin';
  const [mode, setMode] = useState<AuthMode>(initialMode);

  // Form state
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [countryCode, setCountryCode] = useState('+250');
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [useEmailForSignIn, setUseEmailForSignIn] = useState(false);
  const [showPasswordHints, setShowPasswordHints] = useState(false);

  // Password validation state
  const passwordValidation = validatePassword(password);
  const isPasswordValid = passwordValidation.minLength;

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      router.push('/');
    }
  }, [user, router]);

  // Update mode when URL changes
  useEffect(() => {
    const urlMode = searchParams.get('mode') as AuthMode;
    if (urlMode && (urlMode === 'signin' || urlMode === 'signup')) {
      setMode(urlMode);
    }
  }, [searchParams]);

  // Handle Escape key and focus trap for forgot password modal
  useEffect(() => {
    if (!showForgotPassword) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowForgotPassword(false);
        setResetEmail('');
        setResetEmailSent(false);
        setError(null);
      }
    };

    // Focus trap: trap Tab key within modal
    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !forgotPasswordModalRef.current) return;

      const focusableElements = forgotPasswordModalRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const firstElement = focusableElements[0] as HTMLElement;
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

      if (e.shiftKey) {
        // Shift + Tab: go to last element if on first
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        // Tab: go to first element if on last
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    document.addEventListener('keydown', handleEscape);
    document.addEventListener('keydown', handleTab);

    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('keydown', handleTab);
      document.body.style.overflow = '';
    };
  }, [showForgotPassword]);

  const handleGoogleLogin = async () => {
    setError(null);
    setIsSubmitting(true);
    const { error } = await signInWithGoogle();
    if (error) {
      setError(error.message);
      setIsSubmitting(false);
    }
    // Don't set isSubmitting to false on success - redirecting to OAuth
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    if (useEmailForSignIn) {
      if (!email.trim() || !password.trim()) {
        setIsSubmitting(false);
        return;
      }
      const { error } = await signInWithPassword(email, password);
      setIsSubmitting(false);
      if (error) {
        setError(t.invalidCredentials);
      } else {
        // Success - force a full page reload to ensure cookies are synced
        // This is needed because password sign-in doesn't go through the callback
        window.location.href = '/';
      }
    } else {
      if (!phone.trim() || !password.trim()) {
        setIsSubmitting(false);
        return;
      }
      const fullPhone = `${countryCode}${phone.replace(/^0+/, '')}`;
      const { error } = await signInWithPhone(fullPhone, password);
      setIsSubmitting(false);
      if (error) {
        setError(t.invalidCredentials);
      } else {
        // Success - force a full page reload to ensure cookies are synced
        // This is needed because password sign-in doesn't go through the callback
        window.location.href = '/';
      }
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!phone.trim()) {
      setError(t.phoneRequired);
      return;
    }

    if (password !== confirmPassword) {
      setError(t.passwordMismatch);
      return;
    }

    if (password.length < 6) {
      setError(t.passwordTooShort);
      return;
    }

    setError(null);
    setIsSubmitting(true);
    const fullPhone = `${countryCode}${phone.replace(/^0+/, '')}`;

    const { error } = await signUpWithPassword({
      email: email.trim() || undefined,
      phone: fullPhone,
      password,
      fullName: fullName.trim() || undefined,
    });

    setIsSubmitting(false);

    if (error) {
      if (error.message.includes('already registered')) {
        setError(email ? t.emailExists : t.phoneExists);
      } else {
        setError(error.message);
      }
    } else {
      // If email provided, show check email message
      // If only phone, show OTP input for SMS verification
      if (email.trim()) {
        setSuccess(`${t.accountCreated} ${t.checkEmail}`);
      } else {
        // Phone-only signup - show OTP input
        setPendingPhone(fullPhone);
        setShowOtpInput(true);
        setSuccess(t.checkPhone);
      }
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode.trim() || otpCode.length < 6) {
      setError(language === 'rw' ? 'Injiza kode y\'imibare 6' : 'Enter 6-digit code');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    const { error } = await verifyPhoneOtp(pendingPhone, otpCode);

    setIsSubmitting(false);

    if (error) {
      setError(language === 'rw' ? 'Kode ntiyemewe. Ongera ugerageze.' : 'Invalid code. Please try again.');
    } else {
      // Success - show message briefly then do full page reload
      setSuccess(language === 'rw' ? 'Telefoni yemejwe!' : 'Phone verified!');
      setTimeout(() => {
        window.location.href = '/';
      }, 1000);
    }
  };

  const handleResendOtp = async () => {
    setError(null);
    setIsSubmitting(true);

    const { error } = await resendPhoneOtp(pendingPhone);

    setIsSubmitting(false);

    if (error) {
      setError(error.message);
    } else {
      setSuccess(language === 'rw' ? 'Kode nshya yoherejwe!' : 'New code sent!');
    }
  };

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode);
    setError(null);
    setSuccess(null);
    setPassword('');
    setConfirmPassword('');
    router.push(`/auth/login?mode=${newMode}`, { scroll: false });
  };

  const handleForgotPassword = () => {
    setShowForgotPassword(true);
    setError(null);
    setSuccess(null);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!resetEmail.trim()) {
      setError(language === 'rw' ? 'Injiza email yawe' : 'Enter your email');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    const { error } = await resetPasswordForEmail(resetEmail);

    setIsSubmitting(false);

    if (error) {
      setError(error.message);
    } else {
      setResetEmailSent(true);
    }
  };

  const closeForgotPassword = () => {
    setShowForgotPassword(false);
    setResetEmail('');
    setResetEmailSent(false);
    setError(null);
  };

  const selectedCountry = countryCodes.find(c => c.code === countryCode) || countryCodes[0];

  return (
    <div className="min-h-screen flex items-center justify-center p-4
      bg-gradient-to-br from-gray-50 via-white to-gray-100
      dark:from-[#0a0a0a] dark:via-[#0a0a0a] dark:to-[#111111]">

      <div className="w-full max-w-md">
        {/* Language Toggle - Top Right */}
        <div className="flex justify-end mb-4">
          <button
            type="button"
            onClick={toggleLanguage}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
              text-gray-500 dark:text-gray-400
              hover:bg-gray-100 dark:hover:bg-white/10
              hover:text-gray-700 dark:hover:text-gray-200
              border border-gray-200 dark:border-white/10
              hover:border-gray-300 dark:hover:border-white/20
              hover:shadow-md
              active:scale-95
              transition-all duration-200 cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
            </svg>
            <span>{language === 'rw' ? 'English' : 'Kinyarwanda'}</span>
          </button>
        </div>

        {/* Logo */}
        <div className="text-center mb-8">
          <button
            type="button"
            onClick={() => router.push('/')}
            className="inline-block relative mb-4 group cursor-pointer"
          >
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-green-500 via-yellow-500 to-blue-500
              flex items-center justify-center shadow-2xl shadow-green-500/30
              group-hover:shadow-green-500/50 group-hover:scale-105
              active:scale-95
              animate-float transition-all duration-300">
              <span className="text-4xl">🐰</span>
            </div>
            <div className="absolute inset-0 w-20 h-20 rounded-3xl
              bg-gradient-to-br from-green-500 via-yellow-500 to-blue-500
              blur-2xl opacity-40 group-hover:opacity-60 -z-10 transition-opacity duration-300" />
          </button>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-green-500 via-yellow-500 to-blue-500
            bg-clip-text text-transparent mb-2">
            Bakame AI
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            {t.tagline}
          </p>
        </div>

        {/* Auth Card */}
        <div className="bg-white/80 dark:bg-white/5 backdrop-blur-xl
          rounded-3xl border border-gray-200/50 dark:border-white/10
          shadow-xl shadow-black/5 dark:shadow-black/30
          overflow-hidden">

          {/* Tabs - Hide when OTP verification is showing */}
          {!showOtpInput && (
            <div className="flex border-b border-gray-200/50 dark:border-white/10">
              <button
                type="button"
                onClick={() => switchMode('signin')}
                className={`flex-1 py-4 text-sm font-medium transition-all duration-200 cursor-pointer
                  hover:bg-gray-50 dark:hover:bg-white/5
                  active:bg-gray-100 dark:active:bg-white/10
                  ${mode === 'signin'
                    ? 'text-green-600 dark:text-green-400 border-b-2 border-green-500 bg-green-50/50 dark:bg-green-500/10'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
              >
                {t.signIn}
              </button>
              <button
                type="button"
                onClick={() => switchMode('signup')}
                className={`flex-1 py-4 text-sm font-medium transition-all duration-200 cursor-pointer
                  hover:bg-gray-50 dark:hover:bg-white/5
                  active:bg-gray-100 dark:active:bg-white/10
                  ${mode === 'signup'
                    ? 'text-green-600 dark:text-green-400 border-b-2 border-green-500 bg-green-50/50 dark:bg-green-500/10'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
              >
                {t.signUp}
              </button>
            </div>
          )}

          <div className="p-6">
            {/* Success message */}
            {success && (
              <div className="mb-4 p-3 rounded-xl bg-green-500/10 border border-green-500/20
                text-green-600 dark:text-green-400 text-sm flex items-center gap-2
                animate-fadeIn">
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {success}
              </div>
            )}

            {/* Error message */}
            {error && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20
                text-red-600 dark:text-red-400 text-sm flex items-center gap-2
                animate-fadeIn">
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </div>
            )}

            {/* Google Login Button - Only for Sign In */}
            {mode === 'signin' && (
              <>
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-3 px-4 py-3
                    bg-white dark:bg-white/10 border border-gray-200 dark:border-white/20
                    rounded-xl text-gray-700 dark:text-white font-medium
                    hover:bg-gray-50 dark:hover:bg-white/20
                    hover:border-gray-300 dark:hover:border-white/30
                    hover:shadow-lg hover:-translate-y-0.5
                    active:translate-y-0 active:shadow-md
                    disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0
                    transition-all duration-200 cursor-pointer"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  {t.signInWithGoogle}
                </button>

                {/* Divider */}
                <div className="flex items-center gap-4 my-5">
                  <div className="flex-1 h-px bg-gray-200 dark:bg-white/10" />
                  <span className="text-sm text-gray-400 dark:text-gray-500">{t.or}</span>
                  <div className="flex-1 h-px bg-gray-200 dark:bg-white/10" />
                </div>
              </>
            )}

            {/* Sign In Form */}
            {mode === 'signin' && (
              <form onSubmit={handleSignIn} className="space-y-4">
                {/* Toggle between Phone and Email */}
                <div className="flex justify-center mb-2">
                  <div className="inline-flex rounded-lg bg-gray-100 dark:bg-white/5 p-1">
                    <button
                      type="button"
                      onClick={() => setUseEmailForSignIn(false)}
                      className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all duration-200 cursor-pointer
                        hover:bg-white/50 dark:hover:bg-white/10
                        ${!useEmailForSignIn
                          ? 'bg-white dark:bg-white/20 text-gray-900 dark:text-white shadow-sm'
                          : 'text-gray-500 dark:text-gray-400'
                        }`}
                    >
                      📱 {t.phone}
                    </button>
                    <button
                      type="button"
                      onClick={() => setUseEmailForSignIn(true)}
                      className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all duration-200 cursor-pointer
                        hover:bg-white/50 dark:hover:bg-white/10
                        ${useEmailForSignIn
                          ? 'bg-white dark:bg-white/20 text-gray-900 dark:text-white shadow-sm'
                          : 'text-gray-500 dark:text-gray-400'
                        }`}
                    >
                      ✉️ Email
                    </button>
                  </div>
                </div>

                {useEmailForSignIn ? (
                  <div>
                    <label htmlFor="signin-email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Email
                    </label>
                    <input
                      id="signin-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={t.emailPlaceholder}
                      disabled={isSubmitting}
                      autoComplete="email"
                      className="w-full px-4 py-3 rounded-xl
                        bg-gray-50 dark:bg-white/5
                        border border-gray-200 dark:border-white/10
                        text-gray-900 dark:text-white
                        placeholder-gray-400 dark:placeholder-gray-500
                        hover:border-gray-300 dark:hover:border-white/20
                        focus:outline-none focus:ring-2 focus:ring-green-500/50
                        focus:border-green-500/50
                        disabled:opacity-50 disabled:cursor-not-allowed
                        transition-all duration-200"
                    />
                  </div>
                ) : (
                  <div>
                    <label htmlFor="signin-phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t.phone}
                    </label>
                    <div className="flex gap-2">
                      {/* Country Code Dropdown */}
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setShowCountryDropdown(!showCountryDropdown)}
                          className="flex items-center gap-1 px-3 py-3 rounded-xl
                            bg-gray-50 dark:bg-white/5
                            border border-gray-200 dark:border-white/10
                            text-gray-900 dark:text-white text-sm
                            hover:bg-gray-100 dark:hover:bg-white/10
                            hover:border-gray-300 dark:hover:border-white/20
                            active:bg-gray-200 dark:active:bg-white/15
                            transition-all duration-200 cursor-pointer"
                        >
                          <span>{selectedCountry.flag}</span>
                          <span>{selectedCountry.code}</span>
                          <svg className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${showCountryDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>

                        {showCountryDropdown && (
                          <div className="absolute top-full left-0 mt-1 w-52 py-1 z-50
                            bg-white dark:bg-[#1a1a1a] rounded-xl
                            border border-gray-200 dark:border-white/10
                            shadow-xl max-h-48 overflow-y-auto
                            animate-fadeIn">
                            {countryCodes.map((country) => (
                              <button
                                key={country.code}
                                type="button"
                                onClick={() => {
                                  setCountryCode(country.code);
                                  setShowCountryDropdown(false);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-left
                                  text-gray-700 dark:text-gray-200
                                  hover:bg-gray-100 dark:hover:bg-white/10
                                  active:bg-gray-200 dark:active:bg-white/15
                                  transition-colors duration-150 cursor-pointer"
                              >
                                <span className="text-lg">{country.flag}</span>
                                <span>{country.name}</span>
                                <span className="text-gray-400 ml-auto">{country.code}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Phone Input */}
                      <input
                        id="signin-phone"
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                        placeholder={t.phonePlaceholder}
                        disabled={isSubmitting}
                        autoComplete="tel"
                        className="flex-1 px-4 py-3 rounded-xl
                          bg-gray-50 dark:bg-white/5
                          border border-gray-200 dark:border-white/10
                          text-gray-900 dark:text-white
                          placeholder-gray-400 dark:placeholder-gray-500
                          hover:border-gray-300 dark:hover:border-white/20
                          focus:outline-none focus:ring-2 focus:ring-green-500/50
                          focus:border-green-500/50
                          disabled:opacity-50 disabled:cursor-not-allowed
                          transition-all duration-200"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label htmlFor="signin-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t.password}
                  </label>
                  <div className="relative">
                    <input
                      id="signin-password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      disabled={isSubmitting}
                      autoComplete="current-password"
                      className="w-full px-4 py-3 pr-12 rounded-xl
                        bg-gray-50 dark:bg-white/5
                        border border-gray-200 dark:border-white/10
                        text-gray-900 dark:text-white
                        placeholder-gray-400 dark:placeholder-gray-500
                        hover:border-gray-300 dark:hover:border-white/20
                        focus:outline-none focus:ring-2 focus:ring-green-500/50
                        focus:border-green-500/50
                        disabled:opacity-50 disabled:cursor-not-allowed
                        transition-all duration-200"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg
                        text-gray-400 hover:text-gray-600 dark:hover:text-gray-300
                        hover:bg-gray-100 dark:hover:bg-white/10
                        active:bg-gray-200 dark:active:bg-white/15
                        transition-all duration-200 cursor-pointer"
                    >
                      {showPassword ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>

                  {/* Forgot Password Link */}
                  <div className="flex justify-end mt-2">
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      className="text-xs text-gray-500 dark:text-gray-400
                        hover:text-green-600 dark:hover:text-green-400
                        hover:underline underline-offset-2
                        transition-colors duration-200 cursor-pointer"
                    >
                      {language === 'rw' ? 'Wibagiwe ijambo ry\'ibanga?' : 'Forgot password?'}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || (!useEmailForSignIn && !phone.trim()) || (useEmailForSignIn && !email.trim()) || !password.trim()}
                  className="w-full px-4 py-3 rounded-xl
                    bg-gradient-to-r from-green-500 to-green-600
                    text-white font-medium
                    shadow-lg shadow-green-500/30
                    hover:shadow-xl hover:shadow-green-500/40
                    hover:from-green-600 hover:to-green-700
                    hover:-translate-y-0.5
                    active:translate-y-0 active:shadow-md
                    disabled:opacity-50 disabled:cursor-not-allowed
                    disabled:hover:translate-y-0 disabled:hover:shadow-lg
                    transition-all duration-200 cursor-pointer"
                >
                  {isSubmitting ? t.loading : t.signIn}
                </button>
              </form>
            )}

            {/* Sign Up Form - Hide when OTP verification is showing */}
            {mode === 'signup' && !showOtpInput && (
              <form onSubmit={handleSignUp} className="space-y-4">
                {/* Full Name */}
                <div>
                  <label htmlFor="signup-fullname" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t.fullName}
                  </label>
                  <input
                    id="signup-fullname"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder={t.fullNamePlaceholder}
                    disabled={isSubmitting}
                    autoComplete="name"
                    className="w-full px-4 py-3 rounded-xl
                      bg-gray-50 dark:bg-white/5
                      border border-gray-200 dark:border-white/10
                      text-gray-900 dark:text-white
                      placeholder-gray-400 dark:placeholder-gray-500
                      hover:border-gray-300 dark:hover:border-white/20
                      focus:outline-none focus:ring-2 focus:ring-green-500/50
                      focus:border-green-500/50
                      disabled:opacity-50 disabled:cursor-not-allowed
                      transition-all duration-200"
                  />
                </div>

                {/* Phone Number - Required */}
                <div>
                  <label htmlFor="signup-phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t.phone} <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-2">
                    {/* Country Code Dropdown */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowCountryDropdown(!showCountryDropdown)}
                        className="flex items-center gap-1 px-3 py-3 rounded-xl
                          bg-gray-50 dark:bg-white/5
                          border border-gray-200 dark:border-white/10
                          text-gray-900 dark:text-white text-sm
                          hover:bg-gray-100 dark:hover:bg-white/10
                          hover:border-gray-300 dark:hover:border-white/20
                          active:bg-gray-200 dark:active:bg-white/15
                          transition-all duration-200 cursor-pointer"
                      >
                        <span>{selectedCountry.flag}</span>
                        <span>{selectedCountry.code}</span>
                        <svg className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${showCountryDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>

                      {showCountryDropdown && (
                        <div className="absolute top-full left-0 mt-1 w-52 py-1 z-50
                          bg-white dark:bg-[#1a1a1a] rounded-xl
                          border border-gray-200 dark:border-white/10
                          shadow-xl max-h-48 overflow-y-auto
                          animate-fadeIn">
                          {countryCodes.map((country) => (
                            <button
                              key={country.code}
                              type="button"
                              onClick={() => {
                                setCountryCode(country.code);
                                setShowCountryDropdown(false);
                              }}
                              className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-left
                                text-gray-700 dark:text-gray-200
                                hover:bg-gray-100 dark:hover:bg-white/10
                                active:bg-gray-200 dark:active:bg-white/15
                                transition-colors duration-150 cursor-pointer"
                            >
                              <span className="text-lg">{country.flag}</span>
                              <span>{country.name}</span>
                              <span className="text-gray-400 ml-auto">{country.code}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Phone Input */}
                    <input
                      id="signup-phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                      placeholder={t.phonePlaceholder}
                      disabled={isSubmitting}
                      autoComplete="tel"
                      className="flex-1 px-4 py-3 rounded-xl
                        bg-gray-50 dark:bg-white/5
                        border border-gray-200 dark:border-white/10
                        text-gray-900 dark:text-white
                        placeholder-gray-400 dark:placeholder-gray-500
                        hover:border-gray-300 dark:hover:border-white/20
                        focus:outline-none focus:ring-2 focus:ring-green-500/50
                        focus:border-green-500/50
                        disabled:opacity-50 disabled:cursor-not-allowed
                        transition-all duration-200"
                    />
                  </div>
                </div>

                {/* Email - Optional */}
                <div>
                  <label htmlFor="signup-email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t.email}
                  </label>
                  <input
                    id="signup-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t.emailPlaceholder}
                    disabled={isSubmitting}
                    autoComplete="email"
                    className="w-full px-4 py-3 rounded-xl
                      bg-gray-50 dark:bg-white/5
                      border border-gray-200 dark:border-white/10
                      text-gray-900 dark:text-white
                      placeholder-gray-400 dark:placeholder-gray-500
                      hover:border-gray-300 dark:hover:border-white/20
                      focus:outline-none focus:ring-2 focus:ring-green-500/50
                      focus:border-green-500/50
                      disabled:opacity-50 disabled:cursor-not-allowed
                      transition-all duration-200"
                  />
                </div>

                {/* Password */}
                <div>
                  <label htmlFor="signup-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t.password} <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="signup-password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onFocus={() => setShowPasswordHints(true)}
                      onBlur={() => setTimeout(() => setShowPasswordHints(false), 200)}
                      placeholder={t.passwordPlaceholder}
                      disabled={isSubmitting}
                      autoComplete="new-password"
                      className={`w-full px-4 py-3 pr-12 rounded-xl
                        bg-gray-50 dark:bg-white/5
                        border text-gray-900 dark:text-white
                        placeholder-gray-400 dark:placeholder-gray-500
                        hover:border-gray-300 dark:hover:border-white/20
                        focus:outline-none focus:ring-2 focus:ring-green-500/50
                        focus:border-green-500/50
                        disabled:opacity-50 disabled:cursor-not-allowed
                        transition-all duration-200
                        ${password && !isPasswordValid
                          ? 'border-yellow-500 dark:border-yellow-500/50'
                          : password && isPasswordValid
                            ? 'border-green-500 dark:border-green-500/50'
                            : 'border-gray-200 dark:border-white/10'
                        }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg
                        text-gray-400 hover:text-gray-600 dark:hover:text-gray-300
                        hover:bg-gray-100 dark:hover:bg-white/10
                        active:bg-gray-200 dark:active:bg-white/15
                        transition-all duration-200 cursor-pointer"
                    >
                      {showPassword ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>

                  {/* Password Validation Hints */}
                  {(showPasswordHints || password) && (
                    <div className="mt-2 p-3 rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10
                      animate-fadeIn">
                      <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                        {language === 'rw' ? 'Ijambo ry\'ibanga rigomba:' : 'Password must have:'}
                      </p>
                      <ul className="space-y-1">
                        <li className={`flex items-center gap-2 text-xs transition-colors duration-200
                          ${passwordValidation.minLength ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'}`}>
                          {passwordValidation.minLength ? (
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <circle cx="12" cy="12" r="10" strokeWidth={2} />
                            </svg>
                          )}
                          {language === 'rw' ? 'Nibura inyuguti 6' : 'At least 6 characters'}
                        </li>
                        <li className={`flex items-center gap-2 text-xs transition-colors duration-200
                          ${passwordValidation.hasUppercase ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'}`}>
                          {passwordValidation.hasUppercase ? (
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <circle cx="12" cy="12" r="10" strokeWidth={2} />
                            </svg>
                          )}
                          {language === 'rw' ? 'Inyuguti nkuru (A-Z)' : 'Uppercase letter (A-Z)'}
                        </li>
                        <li className={`flex items-center gap-2 text-xs transition-colors duration-200
                          ${passwordValidation.hasNumber ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'}`}>
                          {passwordValidation.hasNumber ? (
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <circle cx="12" cy="12" r="10" strokeWidth={2} />
                            </svg>
                          )}
                          {language === 'rw' ? 'Umubare (0-9)' : 'Number (0-9)'}
                        </li>
                      </ul>
                    </div>
                  )}
                </div>

                {/* Confirm Password */}
                <div>
                  <label htmlFor="signup-confirm-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t.confirmPassword} <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="signup-confirm-password"
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder={t.confirmPasswordPlaceholder}
                    disabled={isSubmitting}
                    autoComplete="new-password"
                    className={`w-full px-4 py-3 rounded-xl
                      bg-gray-50 dark:bg-white/5
                      border text-gray-900 dark:text-white
                      placeholder-gray-400 dark:placeholder-gray-500
                      hover:border-gray-300 dark:hover:border-white/20
                      focus:outline-none focus:ring-2 focus:ring-green-500/50
                      focus:border-green-500/50
                      disabled:opacity-50 disabled:cursor-not-allowed
                      transition-all duration-200
                      ${confirmPassword && confirmPassword !== password
                        ? 'border-red-500 dark:border-red-500/50'
                        : confirmPassword && confirmPassword === password
                          ? 'border-green-500 dark:border-green-500/50'
                          : 'border-gray-200 dark:border-white/10'
                      }`}
                  />
                  {confirmPassword && confirmPassword !== password && (
                    <p className="mt-1 text-xs text-red-500 animate-fadeIn">
                      {t.passwordMismatch}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || !phone.trim() || !password.trim() || !confirmPassword.trim() || password !== confirmPassword}
                  className="w-full px-4 py-3 rounded-xl
                    bg-gradient-to-r from-green-500 to-green-600
                    text-white font-medium
                    shadow-lg shadow-green-500/30
                    hover:shadow-xl hover:shadow-green-500/40
                    hover:from-green-600 hover:to-green-700
                    hover:-translate-y-0.5
                    active:translate-y-0 active:shadow-md
                    disabled:opacity-50 disabled:cursor-not-allowed
                    disabled:hover:translate-y-0 disabled:hover:shadow-lg
                    transition-all duration-200 cursor-pointer"
                >
                  {isSubmitting ? t.loading : t.signUp}
                </button>
              </form>
            )}

            {/* OTP Verification Form */}
            {showOtpInput && (
              <form onSubmit={handleVerifyOtp} className="space-y-4 animate-fadeIn">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-green-500 to-blue-500
                    flex items-center justify-center">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                    {language === 'rw' ? 'Injiza Kode' : 'Enter Code'}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {language === 'rw'
                      ? `Twoherereje kode kuri ${pendingPhone}`
                      : `We sent a code to ${pendingPhone}`}
                  </p>
                </div>

                {/* OTP Input */}
                <div>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="000000"
                    disabled={isSubmitting}
                    className="w-full px-4 py-4 rounded-xl text-center text-2xl font-mono tracking-[0.5em]
                      bg-gray-50 dark:bg-white/5
                      border border-gray-200 dark:border-white/10
                      text-gray-900 dark:text-white
                      placeholder-gray-300 dark:placeholder-gray-600
                      hover:border-gray-300 dark:hover:border-white/20
                      focus:outline-none focus:ring-2 focus:ring-green-500/50
                      focus:border-green-500/50
                      disabled:opacity-50 disabled:cursor-not-allowed
                      transition-all duration-200"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || otpCode.length < 6}
                  className="w-full px-4 py-3 rounded-xl
                    bg-gradient-to-r from-green-500 to-green-600
                    text-white font-medium
                    shadow-lg shadow-green-500/30
                    hover:shadow-xl hover:shadow-green-500/40
                    hover:from-green-600 hover:to-green-700
                    hover:-translate-y-0.5
                    active:translate-y-0 active:shadow-md
                    disabled:opacity-50 disabled:cursor-not-allowed
                    disabled:hover:translate-y-0 disabled:hover:shadow-lg
                    transition-all duration-200 cursor-pointer"
                >
                  {isSubmitting
                    ? t.loading
                    : (language === 'rw' ? 'Emeza Kode' : 'Verify Code')}
                </button>

                {/* Resend code */}
                <div className="text-center">
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={isSubmitting}
                    className="text-sm text-gray-500 dark:text-gray-400
                      hover:text-green-600 dark:hover:text-green-400
                      disabled:opacity-50
                      transition-colors duration-200 cursor-pointer"
                  >
                    {language === 'rw' ? 'Ntabwo wabonye kode? Ongera wohereze' : "Didn't receive code? Resend"}
                  </button>
                </div>

                {/* Back to signup */}
                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowOtpInput(false);
                      setOtpCode('');
                      setPendingPhone('');
                      setSuccess(null);
                    }}
                    className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300
                      transition-colors duration-200 cursor-pointer"
                  >
                    ← {language === 'rw' ? 'Subira inyuma' : 'Go back'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Back to chat link - hide when modals are open */}
        {!showForgotPassword && (
          <div className="text-center mt-6">
            <button
              type="button"
              onClick={() => {
                console.log('Navigating to home...');
                router.push('/');
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl
                text-gray-600 dark:text-gray-300
                bg-gray-100 dark:bg-white/5
                hover:bg-gray-200 dark:hover:bg-white/10
                hover:text-green-600 dark:hover:text-green-400
                border border-gray-200 dark:border-white/10
                text-sm font-medium transition-all duration-200 cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              {t.backToChat}
            </button>
          </div>
        )}

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-8">
          {t.termsNotice}
        </p>
      </div>

      {/* Click outside to close dropdown */}
      {showCountryDropdown && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowCountryDropdown(false)}
        />
      )}

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn"
          role="dialog"
          aria-modal="true"
          aria-labelledby="forgot-password-title"
          onClick={(e) => {
            // Close on backdrop click (but not on modal content click)
            if (e.target === e.currentTarget) {
              setShowForgotPassword(false);
              setResetEmail('');
              setResetEmailSent(false);
              setError(null);
            }
          }}
        >
          <div
            ref={forgotPasswordModalRef}
            className="w-full max-w-md bg-white dark:bg-[#1a1a1a] rounded-3xl
              border border-gray-200 dark:border-white/10
              shadow-2xl overflow-hidden animate-fadeIn"
            onClick={(e) => e.stopPropagation()}
          >

            {/* Header */}
            <div className="p-6 border-b border-gray-200 dark:border-white/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-blue-500
                    flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                    </svg>
                  </div>
                  <div>
                    <h3 id="forgot-password-title" className="text-lg font-semibold text-gray-900 dark:text-white">
                      {language === 'rw' ? "Wibagiwe ijambo ry'ibanga?" : 'Forgot password?'}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {language === 'rw' ? "Tuguohereza link yo guhindura" : "We'll send you a reset link"}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closeForgotPassword}
                  className="p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200
                    hover:bg-gray-100 dark:hover:bg-white/10
                    transition-all duration-200 cursor-pointer"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              {resetEmailSent ? (
                <div className="text-center animate-fadeIn">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-green-500 to-green-600
                    flex items-center justify-center">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    {language === 'rw' ? 'Email yoherejwe!' : 'Email sent!'}
                  </h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                    {language === 'rw'
                      ? `Twoherereje link yo guhindura ijambo ry'ibanga kuri ${resetEmail}`
                      : `We've sent a password reset link to ${resetEmail}`}
                  </p>
                  <button
                    type="button"
                    onClick={closeForgotPassword}
                    className="px-6 py-2.5 rounded-xl
                      bg-gradient-to-r from-green-500 to-green-600
                      text-white font-medium
                      shadow-lg shadow-green-500/30
                      hover:shadow-xl hover:shadow-green-500/40
                      hover:-translate-y-0.5
                      active:translate-y-0 active:shadow-md
                      transition-all duration-200 cursor-pointer"
                  >
                    {language === 'rw' ? 'Sawa' : 'Got it'}
                  </button>
                </div>
              ) : (
                <form onSubmit={handleResetPassword} className="space-y-4">
                  {/* Error message */}
                  {error && (
                    <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20
                      text-red-600 dark:text-red-400 text-sm flex items-center gap-2
                      animate-fadeIn">
                      <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {error}
                    </div>
                  )}

                  <div>
                    <label htmlFor="reset-email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Email
                    </label>
                    <input
                      id="reset-email"
                      type="email"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      placeholder={t.emailPlaceholder}
                      disabled={isSubmitting}
                      autoFocus
                      autoComplete="email"
                      className="w-full px-4 py-3 rounded-xl
                        bg-gray-50 dark:bg-white/5
                        border border-gray-200 dark:border-white/10
                        text-gray-900 dark:text-white
                        placeholder-gray-400 dark:placeholder-gray-500
                        hover:border-gray-300 dark:hover:border-white/20
                        focus:outline-none focus:ring-2 focus:ring-green-500/50
                        focus:border-green-500/50
                        disabled:opacity-50 disabled:cursor-not-allowed
                        transition-all duration-200"
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={closeForgotPassword}
                      disabled={isSubmitting}
                      className="flex-1 px-4 py-3 rounded-xl
                        bg-gray-100 dark:bg-white/10
                        text-gray-700 dark:text-gray-200 font-medium
                        hover:bg-gray-200 dark:hover:bg-white/20
                        active:scale-95
                        disabled:opacity-50 disabled:cursor-not-allowed
                        transition-all duration-200 cursor-pointer"
                    >
                      {language === 'rw' ? 'Bireke' : 'Cancel'}
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting || !resetEmail.trim()}
                      className="flex-1 px-4 py-3 rounded-xl
                        bg-gradient-to-r from-green-500 to-green-600
                        text-white font-medium
                        shadow-lg shadow-green-500/30
                        hover:shadow-xl hover:shadow-green-500/40
                        hover:from-green-600 hover:to-green-700
                        active:scale-95
                        disabled:opacity-50 disabled:cursor-not-allowed
                        transition-all duration-200 cursor-pointer"
                    >
                      {isSubmitting
                        ? (language === 'rw' ? 'Tegereza...' : 'Sending...')
                        : (language === 'rw' ? 'Ohereza link' : 'Send reset link')}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
