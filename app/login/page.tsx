'use client';

import { useState } from 'react';
import { signIn, getSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Eye, EyeOff, User, Lock } from 'lucide-react';

interface LoginForm {
  usuario: string;
  password: string;
}


export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const loginForm = useForm<LoginForm>();

  const handleLogin = async (data: LoginForm) => {
    setIsLoading(true);
    try {
      const result = await signIn('credentials', {
        usuario: data.usuario,
        password: data.password,
        redirect: false,
      });

      if (result?.error) {
        toast.error('Credenciais inválidas');
      } else {
        toast.success('Login realizado com sucesso!');
        router.push('/dashboard');
      }
    } catch (error) {
      toast.error('Erro ao fazer login');
    } finally {
      setIsLoading(false);
    }
  };



  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Entrar
            </h2>
            <p className="text-gray-600">
              Entre na sua conta para continuar
            </p>
          </div>

          <div className="mt-8">
            <form onSubmit={loginForm.handleSubmit(handleLogin)} className="mt-6 space-y-4">
                <div>
                  <label htmlFor="usuario" className="sr-only">
                    Usuário
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                    <input
                      {...loginForm.register('usuario', { 
                        required: 'Usuário é obrigatório',
                        minLength: { value: 3, message: 'Usuário deve ter pelo menos 3 caracteres' }
                      })}
                      type="text"
                      className="pl-10 w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="Seu usuário"
                    />
                  </div>
                  {loginForm.formState.errors.usuario && (
                    <p className="mt-1 text-sm text-red-600">
                      {loginForm.formState.errors.usuario.message}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="password" className="sr-only">
                    Senha
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                    <input
                      {...loginForm.register('password', { required: 'Senha é obrigatória' })}
                      type={showPassword ? 'text' : 'password'}
                      className="pl-10 pr-10 w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="Sua senha"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 h-5 w-5 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff /> : <Eye />}
                    </button>
                  </div>
                  {loginForm.formState.errors.password && (
                    <p className="mt-1 text-sm text-red-600">
                      {loginForm.formState.errors.password.message}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  {isLoading ? 'Entrando...' : 'Entrar'}
                </button>
              </form>

          </div>
        </div>
      </div>
    </div>
  );
}
