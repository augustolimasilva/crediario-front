'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import api from '../../lib/axios';
import { ArrowLeft, User, Lock, Image as ImageIcon, Save, Eye, EyeOff } from 'lucide-react';

interface UserProfile {
  id: string;
  usuario: string;
  name: string;
  avatar?: string;
}

interface ProfileForm {
  name: string;
  password?: string;
  confirmPassword?: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Função para comprimir e redimensionar imagem
const compressImage = (file: File, maxWidth: number = 200, maxHeight: number = 200, quality: number = 0.5, maxSizeKB: number = 100): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Calcular novas dimensões mantendo proporção
        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Não foi possível criar contexto do canvas'));
          return;
        }

        // Desenhar imagem redimensionada
        ctx.drawImage(img, 0, 0, width, height);

        // Função para tentar comprimir com diferentes qualidades até atingir o tamanho máximo
        const tryCompress = (currentQuality: number): string => {
          const base64 = canvas.toDataURL('image/jpeg', currentQuality);
          // Tamanho aproximado em KB (base64 é ~33% maior que binário)
          const sizeKB = (base64.length * 3) / 4 / 1024;
          
          if (sizeKB <= maxSizeKB || currentQuality <= 0.3) {
            return base64;
          }
          
          // Reduzir qualidade e tentar novamente
          return tryCompress(currentQuality - 0.1);
        };

        const base64 = tryCompress(quality);
        resolve(base64);
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export default function PerfilPage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const profileForm = useForm<ProfileForm>({
    defaultValues: {
      name: '',
      password: '',
      confirmPassword: '',
    },
  });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (session) {
      loadProfile();
    }
  }, [session]);

  const loadProfile = async () => {
    try {
      const response = await api.get('/user/profile');
      setProfile(response.data);
      profileForm.reset({
        name: response.data.name || '',
        password: '',
        confirmPassword: '',
      });
      
      // Configurar preview do avatar
      if (response.data.avatar) {
        // Se o avatar já é base64 (começa com data:), usar diretamente
        // Se for uma URL, usar como está
        const avatarUrl = response.data.avatar.startsWith('data:') 
          ? response.data.avatar 
          : response.data.avatar.startsWith('http') 
          ? response.data.avatar 
          : `${API_URL}${response.data.avatar}`;
        setAvatarPreview(avatarUrl);
      } else {
        setAvatarPreview(null);
      }
    } catch (error) {
      console.error('Erro ao carregar perfil:', error);
      toast.error('Erro ao carregar perfil');
    }
  };

  const handleUpdateProfile = async (data: ProfileForm) => {
    try {
      setIsLoading(true);

      // Validar senha se foi fornecida
      if (data.password) {
        if (data.password.length < 6) {
          toast.error('A senha deve ter no mínimo 6 caracteres');
          return;
        }
        if (data.password !== data.confirmPassword) {
          toast.error('As senhas não coincidem');
          return;
        }
      }

      // Preparar dados para envio (sem FormData)
      const updateData: any = {
        name: data.name,
      };

      if (data.password) {
        updateData.password = data.password;
      }

      // Converter arquivo para base64 com compressão se houver
      if (avatarFile) {
        try {
          // Comprimir imagem antes de converter para base64
          // Redimensiona para máximo 200x200px, qualidade 0.5, máximo 100KB (muito reduzido para evitar erro 431)
          updateData.avatar = await compressImage(avatarFile, 200, 200, 0.5, 100);
          const sizeKB = (updateData.avatar.length * 3) / 4 / 1024;
          console.log(`Imagem a ser enviada: ${sizeKB.toFixed(2)}KB`);
          
          // Validar tamanho máximo (100KB)
          if (sizeKB > 100) {
            toast.error('Imagem muito grande mesmo após compressão. Tente uma imagem menor.');
            return;
          }
        } catch (error) {
          console.error('Erro ao processar imagem:', error);
          toast.error('Erro ao processar imagem');
          return;
        }
      }

      // Enviar como JSON
      const response = await api.put('/user/profile', updateData);

      if (response.data) {
        const updatedProfile = response.data;
        toast.success('Perfil atualizado com sucesso!');
        
        // Atualizar preview do avatar
        let avatarUrl = null;
        if (updatedProfile.avatar) {
          // Se o avatar já é base64 (começa com data:), usar diretamente
          avatarUrl = updatedProfile.avatar.startsWith('data:') 
            ? updatedProfile.avatar 
            : updatedProfile.avatar.startsWith('http') 
            ? updatedProfile.avatar 
            : `${API_URL}${updatedProfile.avatar}`;
          setAvatarPreview(avatarUrl);
        }
        
        // Limpar campos de senha e arquivo
        profileForm.setValue('password', '');
        profileForm.setValue('confirmPassword', '');
        setAvatarFile(null);

        // Atualizar a sessão do NextAuth para refletir as mudanças
        if (update) {
          const finalAvatarUrl = avatarUrl || (updatedProfile.avatar 
            ? (updatedProfile.avatar.startsWith('data:') 
              ? updatedProfile.avatar 
              : `${API_URL}${updatedProfile.avatar}`)
            : session?.user?.image || null);
          
          await update({
            name: data.name,
            image: finalAvatarUrl,
          });
        }

        // Redirecionar para o dashboard após um pequeno delay para mostrar o toast
        setTimeout(() => {
          router.push('/dashboard');
        }, 500);
      }
    } catch (error: any) {
      console.error('Erro ao atualizar perfil:', error);
      toast.error(error.response?.data?.message || 'Erro ao atualizar perfil');
    } finally {
      setIsLoading(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Voltar</span>
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Meu Perfil</h1>
          <p className="text-gray-600 mt-2">Gerencie suas informações pessoais e senha</p>
        </div>

        {/* Profile Form */}
        <div className="bg-white rounded-lg shadow p-6">
          <form onSubmit={profileForm.handleSubmit(handleUpdateProfile)} className="space-y-6">
            {/* Avatar Section */}
            <div className="flex items-center space-x-6">
              <div className="flex-shrink-0">
                {avatarPreview || profile?.avatar ? (
                  <img
                    src={avatarPreview || (profile?.avatar?.startsWith('data:') ? profile.avatar : profile?.avatar?.startsWith('http') ? profile.avatar : `${API_URL}${profile?.avatar}`) || ''}
                    alt="Avatar"
                    className="w-24 h-24 rounded-full object-cover border-2 border-gray-200"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center">
                    <User className="w-12 h-12 text-gray-400" />
                  </div>
                )}
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <div className="flex items-center space-x-2">
                    <ImageIcon className="h-4 w-4" />
                    <span>Foto (Avatar)</span>
                  </div>
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setAvatarFile(file);
                      try {
                        // Comprimir e mostrar preview (200x200px, qualidade 0.5, máximo 100KB)
                        const compressed = await compressImage(file, 200, 200, 0.5, 100);
                        setAvatarPreview(compressed);
                        const sizeKB = (compressed.length * 3) / 4 / 1024;
                        console.log(`Imagem comprimida: ${sizeKB.toFixed(2)}KB`);
                      } catch (error) {
                        console.error('Erro ao processar imagem:', error);
                        toast.error('Erro ao processar imagem');
                      }
                    }
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Selecione uma imagem do seu computador (JPG, PNG, GIF, WEBP - máximo 5MB)
                </p>
              </div>
            </div>

            {/* Name Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4" />
                  <span>Nome</span>
                </div>
              </label>
              <input
                type="text"
                {...profileForm.register('name', { required: 'Nome é obrigatório' })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
              {profileForm.formState.errors.name && (
                <p className="mt-1 text-sm text-red-600">{profileForm.formState.errors.name.message}</p>
              )}
            </div>

            {/* Username (Read-only) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Usuário
              </label>
              <input
                type="text"
                value={profile?.usuario || ''}
                disabled
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
              />
              <p className="mt-1 text-xs text-gray-500">
                O nome de usuário não pode ser alterado
              </p>
            </div>

            {/* Password Section */}
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                <div className="flex items-center space-x-2">
                  <Lock className="h-5 w-5" />
                  <span>Alterar Senha</span>
                </div>
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Deixe em branco se não desejar alterar a senha
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nova Senha
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      {...profileForm.register('password')}
                      placeholder="Deixe em branco para manter a senha atual"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Confirmar Nova Senha
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      {...profileForm.register('confirmPassword')}
                      placeholder="Confirme a nova senha"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                <Save className="h-4 w-4" />
                <span>{isLoading ? 'Salvando...' : 'Salvar Alterações'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

