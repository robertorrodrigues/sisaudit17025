import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff, LogIn, Flame } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useLocation, useNavigate } from 'react-router-dom';

const Login = ({ companySlug: companySlugProp }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const companySlug = useMemo(() => {
    if (companySlugProp) return companySlugProp;

    const [firstSegment] = location.pathname.split('/').filter(Boolean);
    return firstSegment && !['login', 'signup'].includes(firstSegment) ? firstSegment : null;
  }, [companySlugProp, location.pathname]);

  const logoSrc = companySlug ? `/images/${companySlug}/logo_audit.png` : '/images/logo_audit.png';

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha email e senha.",
        variant: "destructive",
      });
      return;
    }
    setIsLoading(true);

    const { error } = await signIn(email, password);
    
    if (!error) {
    //if (error) {
      toast({
        title: "Login bem-sucedido!",
        description: "Bem-vindo de volta!",
      });
      navigate(companySlug ? `/${companySlug}` : '/');
    }
    
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 p-4">
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md bg-white/10 backdrop-blur-xl rounded-2xl p-8 border border-white/20 shadow-2xl"
      >
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-6">
            <img
              src={logoSrc}
              alt={companySlug ? `Logo ${companySlug}` : 'Logo Audit+'}
              className="h-36 w-auto rounded-xl object-contain bg-white/10 p-1 shadow-lg"
              onError={(event) => {
                event.currentTarget.src = '/images/logo_audit.png';
              }}
            />
          </div>
          
          <p className="text-gray-300 mt-2">Sistema de Auditoria 17025</p>
          {companySlug && <p className="text-sm text-blue-200 mt-1">Empresa: {companySlug}</p>}
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="text-sm font-medium text-gray-300 block mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-300 block mb-2">Senha</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Sua senha"
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 px-4 flex items-center text-gray-400 hover:text-white"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-bold py-3 rounded-xl text-base"
            disabled={isLoading}
          >
            {isLoading ? 'Entrando...' : (
              <>
                <LogIn className="w-5 h-5 mr-2" />
                Entrar
              </>
            )}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-400">
           
          </p>
          <p className="text-sm text-gray-400 mt-2">
            Não tem conta?{" "}
            <button
              type="button"
              onClick={() => navigate(companySlug ? `/${companySlug}/signup` : '/signup')}
              className="text-white underline"
            >
              Criar conta
            </button>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
