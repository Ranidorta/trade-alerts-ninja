import { supabase } from '@/integrations/supabase/client';

interface SecurityEvent {
  type: 'login' | 'logout' | 'failed_login' | 'signup' | 'password_reset' | 'suspicious_activity';
  userId?: string;
  email?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

class SecurityService {
  private static readonly MAX_LOGIN_ATTEMPTS = 5;
  private static readonly LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes
  private static readonly SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
  
  private loginAttempts = new Map<string, { count: number; lastAttempt: Date; lockedUntil?: Date }>();
  private lastActivity = Date.now();
  private sessionTimer: NodeJS.Timeout | null = null;

  // Rate limiting for login attempts
  checkRateLimit(email: string): { allowed: boolean; timeRemaining?: number } {
    const attempts = this.loginAttempts.get(email);
    
    if (!attempts) {
      return { allowed: true };
    }

    if (attempts.lockedUntil && attempts.lockedUntil > new Date()) {
      const timeRemaining = Math.ceil((attempts.lockedUntil.getTime() - Date.now()) / 1000);
      return { allowed: false, timeRemaining };
    }

    if (attempts.count >= SecurityService.MAX_LOGIN_ATTEMPTS) {
      const timeSinceLastAttempt = Date.now() - attempts.lastAttempt.getTime();
      if (timeSinceLastAttempt < SecurityService.LOCKOUT_DURATION) {
        const timeRemaining = Math.ceil((SecurityService.LOCKOUT_DURATION - timeSinceLastAttempt) / 1000);
        return { allowed: false, timeRemaining };
      } else {
        // Reset attempts after lockout period
        this.loginAttempts.delete(email);
        return { allowed: true };
      }
    }

    return { allowed: true };
  }

  recordLoginAttempt(email: string, success: boolean): void {
    if (success) {
      this.loginAttempts.delete(email);
      this.logSecurityEvent({
        type: 'login',
        email,
        timestamp: new Date(),
      });
      this.startSessionTimeout();
    } else {
      const attempts = this.loginAttempts.get(email) || { count: 0, lastAttempt: new Date() };
      attempts.count++;
      attempts.lastAttempt = new Date();
      
      if (attempts.count >= SecurityService.MAX_LOGIN_ATTEMPTS) {
        attempts.lockedUntil = new Date(Date.now() + SecurityService.LOCKOUT_DURATION);
      }
      
      this.loginAttempts.set(email, attempts);
      this.logSecurityEvent({
        type: 'failed_login',
        email,
        timestamp: new Date(),
        metadata: { attemptCount: attempts.count }
      });
    }
  }

  // Session management
  startSessionTimeout(): void {
    this.updateActivity();
    
    if (this.sessionTimer) {
      clearTimeout(this.sessionTimer);
    }
    
    this.sessionTimer = setTimeout(() => {
      this.handleSessionTimeout();
    }, SecurityService.SESSION_TIMEOUT);
  }

  updateActivity(): void {
    this.lastActivity = Date.now();
  }

  private async handleSessionTimeout(): Promise<void> {
    const timeSinceLastActivity = Date.now() - this.lastActivity;
    
    if (timeSinceLastActivity >= SecurityService.SESSION_TIMEOUT) {
      try {
        await supabase.auth.signOut();
        this.logSecurityEvent({
          type: 'logout',
          timestamp: new Date(),
          metadata: { reason: 'session_timeout' }
        });
        
        // Redirect to login or show timeout message
        window.location.href = '/login';
      } catch (error) {
        console.error('Error during session timeout logout:', error);
      }
    } else {
      // Reschedule timeout
      this.sessionTimer = setTimeout(() => {
        this.handleSessionTimeout();
      }, SecurityService.SESSION_TIMEOUT - timeSinceLastActivity);
    }
  }

  // Input sanitization
  static sanitizeInput(input: string): string {
    return input
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .replace(/javascript:/gi, '') // Remove javascript: protocols
      .replace(/on\w+=/gi, '') // Remove event handlers
      .trim();
  }

  // Error message sanitization
  static sanitizeErrorMessage(error: any): string {
    const safeMessages: Record<string, string> = {
      'auth/invalid-credential': 'E-mail ou senha inválidos.',
      'auth/user-not-found': 'Usuário não encontrado.',
      'auth/wrong-password': 'Senha incorreta.',
      'auth/email-already-in-use': 'Este e-mail já está sendo usado.',
      'auth/invalid-email': 'E-mail inválido.',
      'auth/weak-password': 'A senha é muito fraca.',
      'auth/popup-closed-by-user': 'Popup de login fechado antes da conclusão.',
      'auth/popup-blocked': 'O navegador bloqueou o popup. Permita popups para este site.',
      'auth/cancelled-popup-request': 'Operação cancelada. Tente novamente.',
      'auth/account-exists-with-different-credential': 'Este e-mail já está associado a outro método de login.',
      'auth/too-many-requests': 'Muitas tentativas de login. Tente novamente mais tarde.',
    };

    const errorCode = error?.code || 'unknown';
    return safeMessages[errorCode] || 'Erro interno. Tente novamente mais tarde.';
  }

  // Security event logging
  private logSecurityEvent(event: SecurityEvent): void {
    const logEntry = {
      ...event,
      userAgent: navigator.userAgent,
      ip: 'client-side', // In a real app, this would come from server
      sessionId: this.generateSessionId(),
    };

    // Store in localStorage for now (in production, send to secure logging service)
    const existingLogs = JSON.parse(localStorage.getItem('security_logs') || '[]');
    existingLogs.push(logEntry);
    
    // Keep only last 100 events
    if (existingLogs.length > 100) {
      existingLogs.splice(0, existingLogs.length - 100);
    }
    
    localStorage.setItem('security_logs', JSON.stringify(existingLogs));
    
    console.log('Security Event:', logEntry);
  }

  private generateSessionId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  // Enhanced localStorage encryption for sensitive data
  static encryptSensitiveData(data: any): string {
    try {
      // Simple obfuscation (in production, use proper encryption)
      const jsonString = JSON.stringify(data);
      return btoa(jsonString);
    } catch (error) {
      console.error('Error encrypting data:', error);
      return '';
    }
  }

  static decryptSensitiveData(encryptedData: string): any {
    try {
      const jsonString = atob(encryptedData);
      return JSON.parse(jsonString);
    } catch (error) {
      console.error('Error decrypting data:', error);
      return null;
    }
  }

  // Input validation
  static validateEmail(email: string): boolean {
    const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
    return emailRegex.test(email) && email.length <= 254;
  }

  static validatePassword(password: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (password.length < 8) {
      errors.push('A senha deve ter pelo menos 8 caracteres');
    }
    
    if (!/[A-Z]/.test(password)) {
      errors.push('A senha deve conter pelo menos uma letra maiúscula');
    }
    
    if (!/[a-z]/.test(password)) {
      errors.push('A senha deve conter pelo menos uma letra minúscula');
    }
    
    if (!/[0-9]/.test(password)) {
      errors.push('A senha deve conter pelo menos um número');
    }
    
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('A senha deve conter pelo menos um caractere especial');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  // CSRF protection (basic)
  static generateCSRFToken(): string {
    const token = Math.random().toString(36).substring(2) + Date.now().toString(36);
    sessionStorage.setItem('csrf_token', token);
    return token;
  }

  static validateCSRFToken(token: string): boolean {
    const storedToken = sessionStorage.getItem('csrf_token');
    return storedToken === token;
  }
}

export const securityService = new SecurityService();
export { SecurityService };
