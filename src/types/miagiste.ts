export interface MIAGiste {
  id: string;
  fullName: string;
  email: string;
  associationId: string;
  associationName: string;
  profileImage?: string;
  role: 'member' | 'admin' | 'alumni';
  graduationYear?: number;
  specialization?: string;
}
