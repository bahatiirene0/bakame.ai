/**
 * Reset Password Page
 *
 * User lands here after clicking the reset password link in their email.
 * Allows them to set a new password.
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useLanguageStore } from '@/store/languageStore';

// Password validation
const validatePassword = (password: string) => {
  return {
    minLength: password.length >= 6,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
  };
};

export default function ResetPasswordPage() {
  const router = useRouter();
  const { language } = useLanguageStore();
  const { updatePassword, user } = useAuthStore();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showPasswordHints, setShowPasswordHints] = useState(false);

  const passwordValidation = validatePassword(password);
  const isPasswordValid = passwordValidation.minLength;

  // Redirect to home if successfully reset (full page reload to sync cookies)
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        window.location.href = '/';
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      setError(language === 'rw' ? "Amagambo y'ibanga ntahura." : 'Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      setError(language === 'rw' ? "Ijambo ry'ibanga rigomba kuba nibura inyuguti 6." : 'Password must be at least 6 characters.');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    const { error } = await updatePassword(password);

    setIsSubmitting(false);

    if (error) {
      setError(error.message);
    } else {
      setSuccess(true);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4
      bg-gradient-to-br from-gray-50 via-white to-gray-100
      dark:from-[#0a0a0a] dark:via-[#0a0a0a] dark:to-[#111111]">

      <div className="w-full max-w-md">
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
            {language === 'rw' ? "Hindura ijambo ry'ibanga" : 'Reset your password'}
          </p>
        </div>

        {/* Reset Password Card */}
        <div className="bg-white/80 dark:bg-white/5 backdrop-blur-xl
          rounded-3xl border border-gray-200/50 dark:border-white/10
          shadow-xl shadow-black/5 dark:shadow-black/30
          overflow-hidden p-6">

          {success ? (
            <div className="text-center animate-fadeIn">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-green-500 to-green-600
                flex items-center justify-center">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {language === 'rw' ? "Ijambo ry'ibanga ryahinduwe!" : 'Password updated!'}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                {language === 'rw'
                  ? 'Uragiye gusubirwamo kuri paji y\'ibanze...'
                  : 'Redirecting you to the home page...'}
              </p>
              <div className="w-8 h-8 mx-auto border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
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

              {/* Info message */}
              <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20
                text-blue-600 dark:text-blue-400 text-sm flex items-center gap-2">
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {language === 'rw'
                  ? "Injiza ijambo ry'ibanga rishya."
                  : 'Enter your new password below.'}
              </div>

              {/* New Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {language === 'rw' ? "Ijambo ry'ibanga rishya" : 'New Password'}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setShowPasswordHints(true)}
                    onBlur={() => setTimeout(() => setShowPasswordHints(false), 200)}
                    placeholder={language === 'rw' ? 'Nibura inyuguti 6' : 'At least 6 characters'}
                    disabled={isSubmitting}
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
                      {language === 'rw' ? "Ijambo ry'ibanga rigomba:" : 'Password must have:'}
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
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {language === 'rw' ? "Emeza ijambo ry'ibanga" : 'Confirm Password'}
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={language === 'rw' ? 'Ongera wandike' : 'Re-enter password'}
                  disabled={isSubmitting}
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
                    {language === 'rw' ? "Amagambo y'ibanga ntahura." : 'Passwords do not match.'}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !password.trim() || !confirmPassword.trim() || password !== confirmPassword}
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
                  ? (language === 'rw' ? 'Tegereza...' : 'Please wait...')
                  : (language === 'rw' ? "Hindura ijambo ry'ibanga" : 'Update Password')}
              </button>
            </form>
          )}
        </div>

        {/* Back to login link */}
        <div className="text-center mt-6">
          <button
            type="button"
            onClick={() => router.push('/auth/login')}
            className="text-gray-500 dark:text-gray-400
              hover:text-green-600 dark:hover:text-green-400
              hover:underline underline-offset-2
              text-sm transition-all duration-200 cursor-pointer"
          >
            ← {language === 'rw' ? 'Subira ku kwinjira' : 'Back to login'}
          </button>
        </div>
      </div>
    </div>
  );
}
