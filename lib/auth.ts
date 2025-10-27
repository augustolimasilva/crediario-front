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
          return null;
        }

        try {
          console.log('🔐 Attempting login to:', `${API_URL}/auth/login`);
          
          const response = await axios.post(`${API_URL}/auth/login`, {
            email: credentials.email,
            password: credentials.password,
          });

          console.log('✅ Login successful:', response.data);

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
            console.error('❌ Auth error:', {
              url: `${API_URL}/auth/login`,
              status: error.response?.status,
              data: error.response?.data,
              message: error.message,
            });
          } else {
            console.error('❌ Auth error:', error);
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
