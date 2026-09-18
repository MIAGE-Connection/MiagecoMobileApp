export interface User {
  id: string;
  email: string;
  associationName: string;
  associationId: string;
  role: 'member' | 'admin_association' | 'admin_national';
  position_in_association?: string;
  contact_email?: string;
  graduation_year?: number;
  full_name?: string;
  validUntil?: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  error?: string;
}
