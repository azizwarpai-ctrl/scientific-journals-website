/**
 * API Client for PHP Backend
 * 
 * This module provides a type-safe interface to communicate with the PHP backend API.
 * All requests include proper error handling, authentication, and CORS support.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  meta?: {
    timestamp: string;
  };
}

export interface LoginResponse {
  twoFactorRequired: boolean;
  tempToken: string;
  message: string;
}

export interface VerifyOTPResponse {
  token: string;
  user: {
    id: number;
    email: string;
    fullName: string;
    role: string;
  };
}

export interface RegisterInput {
  email: string;
  full_name: string;
  password: string;
  password_confirmation: string;
  role?: string;
}

export interface JournalInput {
  title: string;
  abbreviation: string;
  issn?: string;
  field?: string;
  description?: string;
}

export interface FAQInput {
  question: string;
  answer: string;
  category?: string;
  priority?: number;
  is_published?: boolean;
}

export interface MessageInput {
  name: string;
  email: string;
  subject?: string;
  message: string;
}

// Base request function
async function apiRequest<T = any>(
  endpoint: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  const url = `${API_BASE_URL}${endpoint}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...options?.headers,
      },
      credentials: 'include', // Include cookies for auth
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || `HTTP ${response.status}`);
    }

    return data;
  } catch (error) {
    console.error('API Request Error:', error);
    throw error;
  }
}

// Authentication API
export const authAPI = {
  /**
   * Login - Step 1 of 2FA
   */
  async login(email: string, password: string): Promise<LoginResponse> {
    const response = await apiRequest<LoginResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    return response.data!;
  },

  /**
   * Verify OTP - Step 2 of 2FA
   */
  async verify2FA(tempToken: string, otp: string): Promise<VerifyOTPResponse> {
    const response = await apiRequest<VerifyOTPResponse>('/api/auth/verify-2fa', {
      method: 'POST',
      body: JSON.stringify({ tempToken, otp }),
    });
    return response.data!;
  },

  /**
   * Register new user
   */
  async register(data: RegisterInput): Promise<any> {
    const response = await apiRequest('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.data;
  },

  /**
   * Resend OTP code
   */
  async resendOTP(tempToken: string): Promise<any> {
    const response = await apiRequest('/api/auth/resend-otp', {
      method: 'POST',
      body: JSON.stringify({ tempToken }),
    });
    return response.data;
  },

  /**
   * Get current user
   */
  async me(): Promise<any> {
    const response = await apiRequest('/api/auth/me');
    return response.data;
  },

  /**
   * Logout
   */
  async logout(): Promise<void> {
    await apiRequest('/api/auth/logout', { method: 'POST' });
  },
};

// Journals API
export const journalsAPI = {
  /**
   * List all journals
   */
  async list(page = 1, perPage = 20): Promise<any> {
    const response = await apiRequest(`/api/journals?page=${page}&per_page=${perPage}`);
    return response;
  },

  /**
   * Get single journal
   */
  async get(id: number): Promise<any> {
    const response = await apiRequest(`/api/journals/show?id=${id}`);
    return response;
  },

  /**
   * Create journal (protected)
   */
  async create(data: JournalInput): Promise<any> {
    const response = await apiRequest('/api/journals', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.data;
  },
};

// FAQ API
export const faqAPI = {
  /**
   * List all FAQs
   */
  async list(publishedOnly = true): Promise<any> {
    const url = publishedOnly ? '/api/faq?published=true' : '/api/faq';
    const response = await apiRequest(url);
    return response;
  },

  /**
   * Get single FAQ
   */
  async get(id: number): Promise<any> {
    const response = await apiRequest(`/api/faq/show?id=${id}`);
    return response;
  },

  /**
   * Create FAQ (protected)
   */
  async create(data: FAQInput): Promise<any> {
    const response = await apiRequest('/api/faq', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response;
  },
};

// Messages API
export const messagesAPI = {
  /**
   * Submit contact message
   */
  async create(data: MessageInput): Promise<any> {
    const response = await apiRequest('/api/messages', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response;
  },

  /**
   * List messages (admin only)
   */
  async list(page = 1, perPage = 20): Promise<any> {
    const response = await apiRequest(`/api/messages?page=${page}&per_page=${perPage}`);
    return response;
  },
};

// OJS API
export const ojsAPI = {
  /**
   * List submissions from OJS
   */
  async listSubmissions(filters?: Record<string, any>): Promise<any> {
    const params = new URLSearchParams(filters).toString();
    const url = `/api/ojs/submissions${params ? '?' + params : ''}`;
    const response = await apiRequest(url);
    return response;
  },

  /**
   * Get submission details
   */
  async getSubmission(id: number): Promise<any> {
    const response = await apiRequest(`/api/ojs/submissions/show?id=${id}`);
    return response;
  },
};

// Health check
export const healthAPI = {
  async check(): Promise<any> {
    const response = await apiRequest('/api/health');
    return response;
  },
};

// Export default client
export default {
  auth: authAPI,
  journals: journalsAPI,
  faq: faqAPI,
  messages: messagesAPI,
  ojs: ojsAPI,
  health: healthAPI,
};
