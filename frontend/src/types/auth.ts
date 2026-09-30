export interface User {
  id: string;
  email: string;
  fullName: string;
  baseCurrency: string;
  createdAt: string;
  _count?: {
    accounts: number;
    categories: number;
  };
}

export interface AuthResponse {
  success: boolean;
  data: {
    user: User;
    accessToken: string;
    refreshToken: string;
  };
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    issues?: Array<{ field: string; message: string }>;
  };
}
