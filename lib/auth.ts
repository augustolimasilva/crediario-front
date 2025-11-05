import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import axios from 'axios';

// Remove trailing slash from API URL
// Use internal URL for server-side requests if available (for Docker networking)
// Fall back to public URL if internal URL is not set
const API_URL = (
  process.env.API_URL_INTERNAL || 
  process.env.NEXT_PUBLIC_API_URL
)?.replace(/\/$/, '') || '';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        usuario: { label: 'Usuário', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.usuario || !credentials?.password) {
          console.error('❌ Missing credentials');
          return null;
        }

        const apiUrl = `${API_URL}/auth/login`;

        try {
          console.log('🔐 Auth Debug:', {
            apiUrl,
            API_URL,
            API_URL_INTERNAL: process.env.API_URL_INTERNAL,
            NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
            usuario: credentials.usuario,
            hasPassword: !!credentials.password,
          });
          
          const response = await axios.post(apiUrl, {
            usuario: credentials.usuario,
            password: credentials.password,
          }, {
            timeout: 10000,
            headers: {
              'Content-Type': 'application/json',
            },
          });

          console.log('✅ Login successful:', {
            hasToken: !!response.data.access_token,
            user: response.data.user?.usuario,
          });

          if (response.data.access_token) {
            return {
              id: response.data.user.id,
              email: response.data.user.usuario,
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
    async jwt({ token, user, trigger, session }) {
      // Adiciona o access_token ao JWT na primeira autenticação
      if (user) {
        token.accessToken = (user as any).accessToken;
        token.id = user.id;
        token.picture = user.image || (user as any).picture;
      }
      // Atualizar token quando a sessão é atualizada (ex: após atualizar perfil)
      if (trigger === 'update' && session) {
        if ((session as any).image) {
          token.picture = (session as any).image;
        }
        if ((session as any).name) {
          token.name = (session as any).name;
        }
      }
      return token;
    },
    async session({ session, token }) {
      // Adiciona o access_token e id à sessão
      if (token && session.user) {
        (session as any).accessToken = token.accessToken;
        (session.user as any).id = token.id;
        // Atualizar imagem do usuário se disponível no token
        if (token.picture) {
          session.user.image = token.picture as string;
        }
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
