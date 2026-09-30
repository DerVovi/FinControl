const API_BASE_URL = '/api/v1';

export class ApiError extends Error {
  public code: string;
  public status: number;
  public issues?: Array<{ field: string; message: string }>;

  constructor(message: string, code: string, status: number, issues?: Array<{ field: string; message: string }>) {
    super(message);
    this.code = code;
    this.status = status;
    this.issues = issues;
  }
}

export async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = localStorage.getItem('access_token');

  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include' // Para trafegar cookies HttpOnly com segurança
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorInfo = data.error || { message: 'Erro na comunicação com a API', code: 'API_ERROR' };
    throw new ApiError(errorInfo.message, errorInfo.code, response.status, errorInfo.issues);
  }

  return data;
}
