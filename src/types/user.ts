export interface User {
  id: string;
  email: string;
  associationName: string;
  associationId: string;
  role: 'member' | 'admin_association' | 'admin_national';
  position_in_association?: string; // ancien texte libre (repli)
  position_id?: string | null;
  position_label?: string | null;
  position_color?: string | null;
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
