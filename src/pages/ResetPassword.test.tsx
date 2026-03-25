import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockNavigate = vi.fn();
const mockUpdateUser = vi.fn();
const mockGetSession = vi.fn();

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      updateUser: (...args: unknown[]) => mockUpdateUser(...args),
      getSession: () => mockGetSession(),
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
        'resetPassword.title': 'Reset your password',
        'resetPassword.placeholder': 'New password',
        'resetPassword.confirmPlaceholder': 'Confirm password',
        'resetPassword.update': 'Update password',
        'resetPassword.minLength': 'Password must be at least 6 characters.',
        'resetPassword.mismatch': 'Passwords do not match.',
        'resetPassword.updated': 'Password updated!',
      };
      return translations[key] ?? key;
    },
  }),
}));

// Must import after mocks
import ResetPassword from './ResetPassword';

describe('ResetPassword', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: simulate recovery hash present
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { ...window.location, hash: '#type=recovery&access_token=abc' },
    });
  });

  it('renders the form when recovery hash is present', () => {
    render(<ResetPassword />);
    expect(screen.getByText('Reset your password')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('New password')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Confirm password')).toBeInTheDocument();
    expect(screen.getByText('Update password')).toBeInTheDocument();
  });

  it('validates minimum password length', async () => {
    const { toast } = await import('sonner');
    render(<ResetPassword />);
    fireEvent.change(screen.getByPlaceholderText('New password'), { target: { value: '12345' } });
    fireEvent.change(screen.getByPlaceholderText('Confirm password'), { target: { value: '12345' } });
    fireEvent.click(screen.getByText('Update password'));
    expect(toast.error).toHaveBeenCalledWith('Password must be at least 6 characters.');
  });

  it('validates password mismatch', async () => {
    const { toast } = await import('sonner');
    render(<ResetPassword />);
    fireEvent.change(screen.getByPlaceholderText('New password'), { target: { value: 'password123' } });
    fireEvent.change(screen.getByPlaceholderText('Confirm password'), { target: { value: 'different' } });
    fireEvent.click(screen.getByText('Update password'));
    expect(toast.error).toHaveBeenCalledWith('Passwords do not match.');
  });

  it('calls updateUser with matching passwords', async () => {
    mockUpdateUser.mockResolvedValueOnce({ error: null });
    render(<ResetPassword />);
    fireEvent.change(screen.getByPlaceholderText('New password'), { target: { value: 'newpass123' } });
    fireEvent.change(screen.getByPlaceholderText('Confirm password'), { target: { value: 'newpass123' } });
    fireEvent.click(screen.getByText('Update password'));
    await waitFor(() => {
      expect(mockUpdateUser).toHaveBeenCalledWith({ password: 'newpass123' });
    });
  });

  it('navigates home after successful reset', async () => {
    mockUpdateUser.mockResolvedValueOnce({ error: null });
    render(<ResetPassword />);
    fireEvent.change(screen.getByPlaceholderText('New password'), { target: { value: 'newpass123' } });
    fireEvent.change(screen.getByPlaceholderText('Confirm password'), { target: { value: 'newpass123' } });
    fireEvent.click(screen.getByText('Update password'));
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  it('shows error from supabase on failure', async () => {
    const { toast } = await import('sonner');
    mockUpdateUser.mockResolvedValueOnce({ error: { message: 'Token expired' } });
    render(<ResetPassword />);
    fireEvent.change(screen.getByPlaceholderText('New password'), { target: { value: 'newpass123' } });
    fireEvent.change(screen.getByPlaceholderText('Confirm password'), { target: { value: 'newpass123' } });
    fireEvent.click(screen.getByText('Update password'));
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Token expired');
    });
  });

  it('disables submit when password is empty', () => {
    render(<ResetPassword />);
    const btn = screen.getByText('Update password');
    expect(btn).toBeDisabled();
  });

  it('toggles password visibility', () => {
    render(<ResetPassword />);
    const passwordInput = screen.getByPlaceholderText('New password');
    expect(passwordInput).toHaveAttribute('type', 'password');
    const toggleBtn = passwordInput.parentElement!.querySelector('button')!;
    fireEvent.click(toggleBtn);
    expect(passwordInput).toHaveAttribute('type', 'text');
  });

  it('redirects to home when no session and no recovery hash', async () => {
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { ...window.location, hash: '' },
    });
    mockGetSession.mockResolvedValueOnce({ data: { session: null } });
    render(<ResetPassword />);
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });
});
