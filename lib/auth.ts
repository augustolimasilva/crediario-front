import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import axios from 'axios';

// Remove trailing slash from API URL
const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || '';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          console.error('❌ Missing credentials');
          return null;
        }

        const apiUrl = `${API_URL}/auth/login`;

        try {
          console.log('🔐 Auth Debug:', {
            apiUrl,
            API_URL,
            NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
            email: credentials.email,
            hasPassword: !!credentials.password,
          });
          
          const response = await axios.post(apiUrl, {
            email: credentials.email,
            password: credentials.password,
          }, {
            timeout: 10000,
            headers: {
              'Content-Type': 'application/json',
            },
          });

          console.log('✅ Login successful:', {
            hasToken: !!response.data.access_token,
            user: response.data.user?.email,
          });

          if (response.data.access_token) {
            return {
              id: response.data.user.id,
              email: response.data.user.email,
              name: response.data.user.name,
              image: response.data.user.avatar || response.data.user.image,
              accessToken: response.data.access_token,
            };
          }
        } catch (error) {
          if (axios.isAxiosError(error)) {
            console.error('❌ Auth error details:', {
              url: apiUrl,
              status: error.response?.status,
              statusText: error.response?.statusText,
              data: error.response?.data,
              message: error.message,
              code: error.code,
            });
          } else {
            console.error('❌ Non-axios error:', error);
          }
        }

        return null;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // Adiciona o access_token ao JWT na primeira autenticação
      if (user) {
        token.accessToken = (user as any).accessToken;
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      // Adiciona o access_token e id à sessão
      if (token) {
        (session as any).accessToken = token.accessToken;
        (session.user as any).id = token.id;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: {
    strategy: 'jwt',
  },
  debug: process.env.NODE_ENV === 'development',
};
