
import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Home, 
  FileText, 
  ClipboardList, 
  Calendar, 
  Users, 
  CheckCircle, 
  BarChart3, 
  Settings,
  Menu,
  X,
  ChevronDown,
  LogOut,
  Award,
  Flame,
  Package,
  KeyRound,
  Eye,
  EyeOff
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { toast } from '@/components/ui/use-toast';

const allNavigation = [
  { name: 'Dashboard', href: '/', icon: Home, roles: ['administrador', 'tecnico', 'atendente'] },
  { name: 'Agenda', href: '/agenda', icon: Calendar, roles: ['administrador', 'atendente'] },
  { name: 'Pedidos', href: '/pedidos', icon: FileText, roles: ['administrador', 'atendente'] },
  { name: 'Ordem de Serviço', href: '/ordem-servico', icon: ClipboardList, roles: ['administrador', 'tecnico'] },
  { name: 'Técnicos', href: '/tecnicos', icon: Users, roles: ['administrador'] },
  { name: 'Equipamentos', href: '/equipamentos', icon: Package, roles: ['administrador', 'atendente'] },
  { name: 'Validação', href: '/validacao', icon: CheckCircle, roles: ['administrador'] },
  { name: 'Certificados', href: '/certificados', icon: Award, roles: ['administrador'] },
  { name: 'Relatórios', href: '/relatorios', icon: BarChart3, roles: ['administrador'] },
  { name: 'Configurações', href: '/configuracoes', icon: Settings, roles: ['administrador'] },
];

const passwordRulesText = 'A senha deve ter no mínimo 8 caracteres, incluir pelo menos 1 letra minúscula, 1 maiúscula, 1 número e 1 caractere especial.';

const validatePasswordStrength = (value) => {
  if (value.length < 8) return passwordRulesText;
  if (!/[a-z]/.test(value)) return passwordRulesText;
  if (!/[A-Z]/.test(value)) return passwordRulesText;
  if (!/[0-9]/.test(value)) return passwordRulesText;
  if (!/[^A-Za-z0-9]/.test(value)) return passwordRulesText;
  return '';
};

const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();
  const mustChangePassword = user?.user_metadata?.must_change_password === true;

  useEffect(() => {
    if (user?.user_metadata?.must_change_password === true) {
      setShowChangePasswordModal(true);
    }
  }, [user?.user_metadata?.must_change_password]);

  const openChangePasswordModal = () => {
    setPasswordError('');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    setProfileMenuOpen(false);
    setShowChangePasswordModal(true);
  };

  const closeChangePasswordModal = () => {
    if (mustChangePassword) {
      return;
    }

    setShowChangePasswordModal(false);
    setPasswordError('');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    setChangingPassword(false);
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const handlePasswordChange = async (event) => {
    event.preventDefault();

    if (!user?.email) {
      setPasswordError('Não foi possível identificar o usuário logado.');
      return;
    }

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('Preencha a senha atual, a nova senha e a confirmação.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('A confirmação da nova senha não confere.');
      return;
    }

    const strengthError = validatePasswordStrength(newPassword);
    if (strengthError) {
      setPasswordError(strengthError);
      return;
    }

    if (currentPassword === newPassword) {
      setPasswordError('A nova senha deve ser diferente da senha atual.');
      return;
    }

    try {
      setChangingPassword(true);
      setPasswordError('');

      const { error: currentPasswordError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });

      if (currentPasswordError) {
        throw new Error('Senha atual incorreta.');
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
        data: { must_change_password: false },
      });

      if (updateError) {
        throw updateError;
      }

      toast({
        title: 'Senha atualizada',
        description: 'Sua senha foi alterada com sucesso.',
      });

      closeChangePasswordModal();
    } catch (error) {
      console.error('Erro ao trocar senha:', error);
      setPasswordError(error?.message || 'Não foi possível trocar a senha. Tente novamente.');
    } finally {
      setChangingPassword(false);
    }
  };

  const userRole = profile?.role || user?.user_metadata?.role || 'atendente';
  const userName = profile?.name || user?.user_metadata?.name || user?.email || 'Usuário';

  const navigation = allNavigation.filter((item) => item.roles.includes(userRole));

  const sidebarVariants = {
    open: { x: 0 },
    closed: { x: '-100%' },
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-green-900 to-emerald-900 flex flex-col">
      <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 sm:px-6 bg-white/5 backdrop-blur-sm border-b border-white/10 shrink-0">
        <div className="flex items-center gap-4">
          <Link to="/" className="flex items-center gap-2">
            <img src='/images/logo_lupa.png' alt= 'Audit+'
              className="h-14 w-auto  object-contain bg-white/10 p-1 shadow-lg" />
            <h1 className="text-xl font-bold text-white hidden sm:block">Audit+</h1>
          </Link>
        </div>

        <nav className="hidden lg:flex items-center gap-2">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                  isActive
                    ? 'bg-white/20 text-white'
                    : 'text-gray-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                <item.icon className="w-4 h-4 mr-2" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-4">
          <div className="relative">
            <div 
              className="flex items-center space-x-2 cursor-pointer"
              onClick={() => setProfileMenuOpen(!profileMenuOpen)}
            >
              <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center text-white font-bold">
                {userName?.[0]?.toUpperCase() || 'U'}
              </div>
              <div className="hidden sm:block text-white">
                <span className="font-medium">{userName}</span>
              </div>
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${profileMenuOpen ? 'rotate-180' : ''}`} />
            </div>
            <AnimatePresence>
              {profileMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute right-0 mt-2 w-56 bg-white/10 backdrop-blur-xl rounded-lg shadow-lg border border-white/20"
                >
                  <div className="p-2 space-y-1">
                    <button
                      onClick={openChangePasswordModal}
                      className="w-full flex items-center px-3 py-2 text-sm text-white hover:bg-white/10 rounded-md"
                    >
                      <KeyRound className="w-4 h-4 mr-2" />
                      Trocar a senha
                    </button>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center px-3 py-2 text-sm text-red-400 hover:bg-white/10 rounded-md"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Sair
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <Button
            onClick={() => setSidebarOpen(true)}
            variant="ghost"
            size="icon"
            className="lg:hidden text-white hover:bg-white/10"
          >
            <Menu className="w-6 h-6" />
          </Button>
        </div>
      </header>

      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/60 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            <motion.div
              variants={sidebarVariants}
              initial="closed"
              animate="open"
              exit="closed"
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed inset-y-0 left-0 z-50 w-72 bg-slate-900/90 backdrop-blur-xl border-r border-white/20 lg:hidden"
            >
              <div className="flex items-center justify-between h-16 px-6 border-b border-white/20 shrink-0">
                <div className="flex items-center gap-2">
                  <img src='/images/logo_lupa.png' alt= 'Audit+'
              className="h-36 w-auto rounded-xl object-contain bg-white/10 p-1 shadow-lg" />
                  <h1 className="text-xl font-bold text-white">Audit+</h1>
                </div>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="lg:hidden text-white hover:text-gray-300"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <nav className="mt-8 px-4">
                <div className="space-y-2">
                  {navigation.map((item) => {
                    const isActive = location.pathname === item.href;
                    return (
                      <Link
                        key={item.name}
                        to={item.href}
                        onClick={() => setSidebarOpen(false)}
                        className={`flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 ${
                          isActive
                            ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg'
                            : 'text-gray-300 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        <item.icon className="w-5 h-5 mr-3" />
                        {item.name}
                      </Link>
                    );
                  })}
                </div>
              </nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showChangePasswordModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={mustChangePassword ? undefined : closeChangePasswordModal}
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="w-full max-w-md rounded-2xl border border-white/20 bg-slate-900/95 p-6 shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-white">Trocar a senha</h2>
                {!mustChangePassword && (
                  <button
                    type="button"
                    onClick={closeChangePasswordModal}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>

              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-2">Senha atual</label>
                  <div className="relative">
                    <input
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(event) => setCurrentPassword(event.target.value)}
                      className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 pr-10 text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Digite sua senha atual"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword((value) => !value)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                    >
                      {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-2">Nova senha</label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(event) => setNewPassword(event.target.value)}
                      className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 pr-10 text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Digite a nova senha"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword((value) => !value)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-2">Confirmar nova senha</label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 pr-10 text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Repita a nova senha"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((value) => !value)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-2 text-xs text-green-100">
                  {passwordRulesText}
                </div>

                {passwordError && (
                  <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                    {passwordError}
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-2">
                  <Button type="button" variant="outline" onClick={closeChangePasswordModal} className="border-white/20 text-white hover:bg-white/10">
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={changingPassword} className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white">
                    {changingPassword ? 'Salvando...' : 'Salvar senha'}
                  </Button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="flex-1">
        <div className="max-w-7xl mx-auto p-4 sm:p-6">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
