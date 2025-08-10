export interface AllowedUser {
  uid: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 'admin' | 'member';
  createdAt: string;
  isActive: boolean;
}

// Əvvəlcədən təyin edilmiş ailə üzvləri (UID allowlist)
export const FAMILY_ALLOWLIST: AllowedUser[] = [
  {
    uid: 'family_admin_001',
    firstName: 'Kanan',
    lastName: 'Şirqov',
    email: 'admin@family.com',
    role: 'admin',
    createdAt: '2025-01-01T00:00:00Z',
    isActive: true
  },
  // Əlavə ailə üzvləri buraya əlavə ediləcək
];

export class InviteOnlyAuth {
  private static failedAttempts: Map<string, { count: number; lastAttempt: number }> = new Map();
  private static readonly MAX_ATTEMPTS = 5;
  private static readonly BLOCK_DURATION = 15 * 60 * 1000; // 15 dəqiqə

  // UID allowlist yoxlaması
  static isUserAllowed(firstName: string, lastName: string, email: string): AllowedUser | null {
    return FAMILY_ALLOWLIST.find(user => 
      user.firstName.toLowerCase() === firstName.toLowerCase() &&
      user.lastName.toLowerCase() === lastName.toLowerCase() &&
      user.email.toLowerCase() === email.toLowerCase() &&
      user.isActive
    ) || null;
  }

  // Uğursuz cəhd qeydiyyatı
  static recordFailedAttempt(identifier: string): boolean {
    const now = Date.now();
    const attempts = this.failedAttempts.get(identifier) || { count: 0, lastAttempt: 0 };
    
    // Əgər blok müddəti keçibsə, sayacı sıfırla
    if (now - attempts.lastAttempt > this.BLOCK_DURATION) {
      attempts.count = 0;
    }
    
    attempts.count++;
    attempts.lastAttempt = now;
    this.failedAttempts.set(identifier, attempts);
    
    return attempts.count >= this.MAX_ATTEMPTS;
  }

  // Blok yoxlaması
  static isBlocked(identifier: string): { blocked: boolean; remainingTime?: number } {
    const attempts = this.failedAttempts.get(identifier);
    if (!attempts || attempts.count < this.MAX_ATTEMPTS) {
      return { blocked: false };
    }
    
    const now = Date.now();
    const remainingTime = this.BLOCK_DURATION - (now - attempts.lastAttempt);
    
    if (remainingTime <= 0) {
      this.failedAttempts.delete(identifier);
      return { blocked: false };
    }
    
    return { blocked: true, remainingTime };
  }

  // Uğurlu giriş sonrası təmizləmə
  static clearFailedAttempts(identifier: string): void {
    this.failedAttempts.delete(identifier);
  }
}

export default InviteOnlyAuth;
