import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { UserPlus, Flame } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { useLocation, useNavigate } from 'react-router-dom';

const TEMPORARY_PASSWORD = '123456';

const Signup = ({ companySlug: companySlugProp }) => {
  const [name, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [companies, setCompanies] = useState([]);
  const [companyId, setCompanyId] = useState('');
  const [companiesLoading, setCompaniesLoading] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const companySlug = useMemo(() => {
    if (companySlugProp) return companySlugProp;

    const [firstSegment] = location.pathname.split('/').filter(Boolean);
    return firstSegment && !['login', 'signup'].includes(firstSegment) ? firstSegment : null;
  }, [companySlugProp, location.pathname]);

  const logoSrc = companySlug ? `/images/${companySlug}/logo.png` : '/images/logoSigas.png';

  useEffect(() => {
    const loadCompanies = async () => {
      const { data, error } = await supabase
        .from('empresa')
        .select('id, nome')
        .order('nome', { ascending: true });

      if (error) {
        toast({
          title: 'Não foi possível carregar as empresas',
          description: error.message,
          variant: 'destructive',
        });
      } else {
        setCompanies(data || []);
      }
      setCompaniesLoading(false);
    };

    loadCompanies();
  }, [toast]);

  const handleSignup = async (e) => {
    e.preventDefault();
    if (!email || !name || !companyId) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha nome, email e empresa.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await signUp(email, TEMPORARY_PASSWORD, {
        data: {
          name,
          role: 'atendente',
          enabled: false,
          pending_access: true,
          must_change_password: true,
          xid_empresa: Number(companyId),
        },
      });

      if (!error) {
        toast({
          title: 'Solicitação enviada',
          description: 'Seu acesso será liberado em breve pelo administrador.',
        });
        navigate(companySlug ? `/${companySlug}/login` : '/login');
      } else {
        toast({
          title: /already registered|already exists|user already/i.test(error.message)
            ? 'Email já cadastrado'
            : 'Erro no cadastro',
          description: /already registered|already exists|user already/i.test(error.message)
            ? 'Esse email já está cadastrado no sistema.'
            : error.message || 'Não foi possível criar a conta.',
          variant: 'destructive',
        });
      }
    } finally {
      setIsLoading(false);
    }
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
          <div className="flex items-center justify-center mb-4">
            <img
              src={logoSrc}
              alt={companySlug ? `Logo ${companySlug}` : 'Logo SIGas'}
              className="h-16 w-auto rounded-xl object-contain bg-white/10 p-2 shadow-lg"
              onError={(event) => {
                event.currentTarget.src = '/images/logoSigas.png';
              }}
            />
          </div>
          <div className="flex items-center justify-center gap-2 mb-2">
            <Flame className="w-10 h-10 text-orange-400" />
            <h1 className="text-3xl font-bold text-white">SIGas</h1>
          </div>
          <p className="text-gray-300 mt-2">Crie sua conta</p>
          {companySlug && <p className="text-sm text-blue-200 mt-1">Empresa: {companySlug}</p>}
        </div>

        <form onSubmit={handleSignup} className="space-y-6">
          <div>
            <label className="text-sm font-medium text-gray-300 block mb-2">Nome completo</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Seu nome"
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

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
            <label className="text-sm font-medium text-gray-300 block mb-2">Empresa</label>
            <select
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
              disabled={companiesLoading}
              className="w-full px-4 py-3 bg-slate-800 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">
                {companiesLoading ? 'Carregando empresas...' : 'Selecione a empresa'}
              </option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>{company.nome}</option>
              ))}
            </select>
          </div>

          <Button
            type="submit"
            className="w-full bg-gradient-to-r from-green-500 to-teal-600 hover:from-green-600 hover:to-teal-700 text-white font-bold py-3 rounded-xl text-base"
            disabled={isLoading}
          >
            {isLoading ? 'Cadastrando...' : (
              <>
                <UserPlus className="w-5 h-5 mr-2" />
                Criar conta
              </>
            )}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-400">
            Já possui conta? <button onClick={() => navigate(companySlug ? `/${companySlug}/login` : '/login')} className="text-white underline">Entrar</button>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Signup;
