import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthDialog } from './AuthDialog';

// Mock supabase
const mockSignInWithPassword = vi.fn();
const mockSignUp = vi.fn();
const mockResetPasswordForEmail = vi.fn();
const mockSignInWithOAuth = vi.fn();
const mockSignInWithOtp = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      signInWithPassword: (...args: unknown[]) => mockSignInWithPassword(...args),
      signUp: (...args: unknown[]) => mockSignUp(...args),
      resetPasswordForEmail: (...args: unknown[]) => mockResetPasswordForEmail(...args),
      signInWithOAuth: (...args: unknown[]) => mockSignInWithOAuth(...args),
      signInWithOtp: (...args: unknown[]) => mockSignInWithOtp(...args),
    },
  },
}));

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'auth.login': 'Log in',
        'auth.signup': 'Create account',
        'auth.forgotPassword': 'Forgot password',
        'auth.forgotPasswordLink': 'Forgot password?',
        'auth.emailPlaceholder': 'Email address',
        'auth.passwordPlaceholder': 'Password',
        'auth.passwordMinHint': 'Password (min. 6 chars)',
        'auth.sendLink': 'Send link',
        'auth.createAccount': 'Create account',
        'auth.signIn': 'Sign in',
        'auth.noAccount': 'No account? Create one',
        'auth.hasAccount': 'Already have an account? Sign in',
        'auth.backToLogin': 'Back to login',
        'auth.continueGuest': 'Continue as guest',
        'auth.emailRequired': 'Please enter your email address.',
        'auth.passwordRequired': 'Please enter your password.',
        'auth.magicLink': 'Sign in without password',
        'auth.checkEmailTitle': 'Check your inbox!',
        'auth.checkEmail': 'Check your inbox to confirm your account.',
        'auth.connected': 'Connected!',
        'common.or': 'or',
        'resetPassword.minLength': 'Password must be at least 6 characters.',
      };
      return translations[key] ?? key;
    },
  }),
}));

vi.mock('@/lib/pushNotifications', () => ({
  updateTutorialStep: vi.fn(() => Promise.resolve()),
  linkUserToSubscription: vi.fn(() => Promise.resolve()),
}));

describe('AuthDialog', () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders login mode by default', () => {
    render(<AuthDialog {...defaultProps} />);
    expect(screen.getByRole('heading', { name: 'Log in' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Email address')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Password')).toBeInTheDocument();
    expect(screen.getByText('Sign in')).toBeInTheDocument();
    expect(screen.getByText('Google')).toBeInTheDocument();
  }, 15000);

  it('shows the app logo', () => {
    render(<AuthDialog {...defaultProps} />);
    const logo = screen.getByAltText('My Volley');
    expect(logo).toBeInTheDocument();
    expect(logo).toHaveAttribute('src', '/favicon.svg');
  });

  it('shows validation error when submitting empty email', async () => {
    const { toast } = await import('sonner');
    render(<AuthDialog {...defaultProps} />);
    fireEvent.click(screen.getByText('Sign in'));
    expect(toast.error).toHaveBeenCalledWith('Please enter your email address.');
  });

  it('shows validation error when submitting empty password', async () => {
    const { toast } = await import('sonner');
    render(<AuthDialog {...defaultProps} />);
    fireEvent.change(screen.getByPlaceholderText('Email address'), { target: { value: 'test@test.com' } });
    fireEvent.click(screen.getByText('Sign in'));
    expect(toast.error).toHaveBeenCalledWith('Please enter your password.');
  });

  it('switches to signup mode', () => {
    render(<AuthDialog {...defaultProps} />);
    fireEvent.click(screen.getByText('No account? Create one'));
    expect(screen.getByRole('heading', { name: 'Create account' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Password (min. 6 chars)')).toBeInTheDocument();
  });

  it('validates minimum password length on signup', async () => {
    const { toast } = await import('sonner');
    render(<AuthDialog {...defaultProps} />);
    fireEvent.click(screen.getByText('No account? Create one'));
    fireEvent.change(screen.getByPlaceholderText('Email address'), { target: { value: 'test@test.com' } });
    fireEvent.change(screen.getByPlaceholderText('Password (min. 6 chars)'), { target: { value: '12345' } });
    // Find the "Create account" button (not the title)
    const buttons = screen.getAllByText('Create account');
    const submitBtn = buttons.find(el => el.tagName === 'BUTTON' && el.closest('.space-y-3'));
    fireEvent.click(submitBtn!);
    expect(toast.error).toHaveBeenCalledWith('Password must be at least 6 characters.');
  });

  it('switches to forgot password mode', () => {
    render(<AuthDialog {...defaultProps} />);
    fireEvent.click(screen.getByText('Forgot password?'));
    expect(screen.getByText('Forgot password')).toBeInTheDocument();
    expect(screen.getByText('Send link')).toBeInTheDocument();
    expect(screen.getByText('Back to login')).toBeInTheDocument();
    // Password field should not be present in forgot mode
    expect(screen.queryByPlaceholderText('Password')).not.toBeInTheDocument();
  });

  it('toggles password visibility', () => {
    render(<AuthDialog {...defaultProps} />);
    const passwordInput = screen.getByPlaceholderText('Password');
    expect(passwordInput).toHaveAttribute('type', 'password');
    // Click the eye toggle button (tabIndex -1)
    const toggleBtn = passwordInput.parentElement!.querySelector('button')!;
    fireEvent.click(toggleBtn);
    expect(passwordInput).toHaveAttribute('type', 'text');
  });

  it('calls signInWithPassword on login submit', async () => {
    mockSignInWithPassword.mockResolvedValueOnce({
      data: { user: { id: 'user-1' }, session: {} },
      error: null,
    });
    render(<AuthDialog {...defaultProps} />);
    fireEvent.change(screen.getByPlaceholderText('Email address'), { target: { value: 'test@test.com' } });
    fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'password123' } });
    fireEvent.click(screen.getByText('Sign in'));
    await waitFor(() => {
      expect(mockSignInWithPassword).toHaveBeenCalledWith({
        email: 'test@test.com',
        password: 'password123',
      });
    });
  });

  it('calls signUp on signup submit', async () => {
    mockSignUp.mockResolvedValueOnce({ data: {}, error: null });
    render(<AuthDialog {...defaultProps} />);
    fireEvent.click(screen.getByText('No account? Create one'));
    fireEvent.change(screen.getByPlaceholderText('Email address'), { target: { value: 'new@test.com' } });
    fireEvent.change(screen.getByPlaceholderText('Password (min. 6 chars)'), { target: { value: 'password123' } });
    const buttons = screen.getAllByText('Create account');
    const submitBtn = buttons.find(el => el.tagName === 'BUTTON' && el.closest('.space-y-3'));
    fireEvent.click(submitBtn!);
    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalled();
    });
  });

  it('shows signup-done confirmation after successful signup', async () => {
    mockSignUp.mockResolvedValueOnce({ data: {}, error: null });
    render(<AuthDialog {...defaultProps} />);
    fireEvent.click(screen.getByText('No account? Create one'));
    fireEvent.change(screen.getByPlaceholderText('Email address'), { target: { value: 'new@test.com' } });
    fireEvent.change(screen.getByPlaceholderText('Password (min. 6 chars)'), { target: { value: 'password123' } });
    const buttons = screen.getAllByText('Create account');
    const submitBtn = buttons.find(el => el.tagName === 'BUTTON' && el.closest('.space-y-3'));
    fireEvent.click(submitBtn!);
    await waitFor(() => {
      expect(screen.getByText('Check your inbox!')).toBeInTheDocument();
    });
  });

  it('calls resetPasswordForEmail on forgot submit', async () => {
    mockResetPasswordForEmail.mockResolvedValueOnce({ error: null });
    render(<AuthDialog {...defaultProps} />);
    fireEvent.click(screen.getByText('Forgot password?'));
    fireEvent.change(screen.getByPlaceholderText('Email address'), { target: { value: 'test@test.com' } });
    fireEvent.click(screen.getByText('Send link'));
    await waitFor(() => {
      expect(mockResetPasswordForEmail).toHaveBeenCalledWith('test@test.com', expect.objectContaining({
        redirectTo: expect.stringContaining('/reset-password'),
      }));
    });
  });

  it('calls signInWithOAuth for Google', () => {
    mockSignInWithOAuth.mockResolvedValueOnce({ error: null });
    render(<AuthDialog {...defaultProps} />);
    fireEvent.click(screen.getByText('Google'));
    expect(mockSignInWithOAuth).toHaveBeenCalledWith(expect.objectContaining({
      provider: 'google',
    }));
  });

  it('shows guest button when onGuest is provided', () => {
    const onGuest = vi.fn();
    render(<AuthDialog {...defaultProps} onGuest={onGuest} />);
    expect(screen.getByText('Continue as guest')).toBeInTheDocument();
  });

  it('shows custom message when provided', () => {
    render(<AuthDialog {...defaultProps} message="Please login first" />);
    expect(screen.getByText('Please login first')).toBeInTheDocument();
  });

  it('clears password when switching modes', () => {
    render(<AuthDialog {...defaultProps} />);
    fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'secret' } });
    fireEvent.click(screen.getByText('No account? Create one'));
    expect(screen.getByPlaceholderText('Password (min. 6 chars)')).toHaveValue('');
  });
});
