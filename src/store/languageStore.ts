/**
 * Language Store - Manages UI language preference
 */

import { create } from 'zustand';

type Language = 'rw' | 'en';

interface LanguageState {
  language: Language;
  toggleLanguage: () => void;
  setLanguage: (lang: Language) => void;
}

export const useLanguageStore = create<LanguageState>((set) => ({
  language: 'rw',
  toggleLanguage: () => set((state) => ({
    language: state.language === 'rw' ? 'en' : 'rw'
  })),
  setLanguage: (lang) => set({ language: lang }),
}));

// Translation helper
export const translations = {
  rw: {
    welcome: 'Murakaza neza kuri',
    tagline: "AI y'Abanyarwanda - Umufasha wawe w'ubwenge",
    signIn: 'Injira',
    signUp: 'Iyandikishe',
    placeholder: 'Baza Bakame ikibazo cyawe...',
    send: 'Ohereza',
    clearChat: 'Siba ibiganiro',
    // Login page
    signInWithGoogle: 'Injira ukoresheje Google',
    signUpWithGoogle: 'Iyandikishe ukoresheje Google',
    or: 'cyangwa',
    email: 'Email (ntibisabwa)',
    emailPlaceholder: 'email@urugero.com',
    phone: 'Telefoni',
    phonePlaceholder: '78X XXX XXX',
    password: 'Ijambo ry\'ibanga',
    confirmPassword: 'Emeza ijambo ry\'ibanga',
    fullName: 'Izina ryawe',
    fullNamePlaceholder: 'Izina Ryombi',
    passwordPlaceholder: 'Nibura inyuguti 6',
    confirmPasswordPlaceholder: 'Ongera wandike',
    backToChat: 'Subira ku kiganiro',
    termsNotice: 'Ukora konti, wemera amabwiriza yacu',
    loading: 'Tegereza...',
    accountCreated: 'Konti yawe yaremewe!',
    checkEmail: 'Reba email yawe kugirango wemeze.',
    checkPhone: 'Reba SMS kuri telefoni yawe.',
    invalidCredentials: 'Email/Telefoni cyangwa ijambo ry\'ibanga sibyo.',
    passwordMismatch: 'Amagambo y\'ibanga ntahura.',
    passwordTooShort: 'Ijambo ry\'ibanga rigomba kuba nibura inyuguti 6.',
    emailExists: 'Iyi email isanzwe iyanditse.',
    phoneExists: 'Iyi telefoni isanzwe iyanditse.',
    phoneRequired: 'Telefoni irasabwa.',
  },
  en: {
    welcome: 'Welcome to',
    tagline: 'Your AI Assistant for Rwanda',
    signIn: 'Sign In',
    signUp: 'Sign Up',
    placeholder: 'Ask Bakame anything...',
    send: 'Send',
    clearChat: 'Clear chat',
    // Login page
    signInWithGoogle: 'Sign in with Google',
    signUpWithGoogle: 'Sign up with Google',
    or: 'or',
    email: 'Email (optional)',
    emailPlaceholder: 'email@example.com',
    phone: 'Phone',
    phonePlaceholder: '78X XXX XXX',
    password: 'Password',
    confirmPassword: 'Confirm Password',
    fullName: 'Your Name',
    fullNamePlaceholder: 'Full Name',
    passwordPlaceholder: 'At least 6 characters',
    confirmPasswordPlaceholder: 'Re-enter password',
    backToChat: 'Back to chat',
    termsNotice: 'By creating an account, you agree to our terms',
    loading: 'Please wait...',
    accountCreated: 'Account created!',
    checkEmail: 'Check your email to verify.',
    checkPhone: 'Check SMS on your phone.',
    invalidCredentials: 'Invalid email/phone or password.',
    passwordMismatch: 'Passwords do not match.',
    passwordTooShort: 'Password must be at least 6 characters.',
    emailExists: 'This email is already registered.',
    phoneExists: 'This phone is already registered.',
    phoneRequired: 'Phone number is required.',
  },
};

export const useTranslation = () => {
  const { language } = useLanguageStore();
  return translations[language];
};
