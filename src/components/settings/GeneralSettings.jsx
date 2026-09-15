import React, { useState, useEffect } from 'react';
import { useSettings } from '@/contexts/SettingsContext';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';

const emptyGeneralSettings = {
  companyName: '',
  cnpj: '',
  address: '',
  email: '',
  telefone: '',
  contato: '',
  logo: '',
};

const getCompanyId = (source) =>
  source?.xid_empresa ?? source?.id_empresa ?? source?.empresa_id ?? null;

const GeneralSettings = () => {
  const { settings, updateSettings } = useSettings();
  const { user, profile, loading: authLoading } = useAuth();
  const [general, setGeneral] = useState(emptyGeneralSettings);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const resolveCompanyId = async () => {
    const fromProfile = getCompanyId(profile);

    if (fromProfile) return fromProfile;

    const fromUser = getCompanyId(user?.user_metadata) ?? getCompanyId(user?.app_metadata) ?? getCompanyId(user);
    if (fromUser) return fromUser;

    if (!user?.id) return null;

    const { data, error } = await supabase
      .from('profiles')
      .select('xid_empresa')
      .eq('id', user.id)
      .maybeSingle();

    if (error) {
      console.warn('Não foi possível resolver xid_empresa do perfil do usuário.', error);
    } else {
      const fromDatabaseProfile = getCompanyId(data);
      if (fromDatabaseProfile) return fromDatabaseProfile;
    }

    return null;
  };

  useEffect(() => {
    let cancelled = false;

    const loadCompanyInfo = async () => {
      if (authLoading) return;

      setLoading(true);
      const companyId = await resolveCompanyId();

      if (!companyId) {
        if (!cancelled) {
          setGeneral(emptyGeneralSettings);
          setLoading(false);
        }
        return;
      }

      const { data, error } = await supabase
        .from('empresa')
        .select('*')
        .eq('id', companyId)
        .maybeSingle();

      if (cancelled) return;

      if (!error && data) {
        setGeneral({
          companyName: data.nome || '',
          cnpj: formatCnpj(data.cnpj),
          address: data.endereco || '',
          email: data.email || '',
          telefone: data.telefone || '',
          contato: data.contato || '',
          logo: data.logo || '',
        });
      } else {
        if (error) {
          console.warn('Não foi possível carregar os dados da empresa.', error);
        }
        setGeneral(emptyGeneralSettings);
      }

      setLoading(false);
    };

    loadCompanyInfo();
  }, [authLoading, user, profile]);

  //const formatCnpj = (value) => {
  //  const digits = String(value || '').replace(/\D/g, '').slice(0, 14);

  //  if (digits.length <= 2) return digits;
  //  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  //  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  // if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;

  //  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12, 14)}`;
  //};

  const formatCnpj = (value) => {
  const cnpj = String(value || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 14);

  if (cnpj.length <= 2) return cnpj;
  if (cnpj.length <= 5) return `${cnpj.slice(0, 2)}.${cnpj.slice(2)}`;
  if (cnpj.length <= 8) return `${cnpj.slice(0, 2)}.${cnpj.slice(2, 5)}.${cnpj.slice(5)}`;
  if (cnpj.length <= 12) return `${cnpj.slice(0, 2)}.${cnpj.slice(2, 5)}.${cnpj.slice(5, 8)}/${cnpj.slice(8)}`;

  return `${cnpj.slice(0, 2)}.${cnpj.slice(2, 5)}.${cnpj.slice(5, 8)}/${cnpj.slice(8, 12)}-${cnpj.slice(12, 14)}`;
};

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === 'cnpj') {
      setGeneral(prev => ({ ...prev, [name]: formatCnpj(value) }));
      return;
    }

    setGeneral(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    try {
      const companyId = await resolveCompanyId();

      if (!companyId) {
        toast({
          title: 'Empresa não identificada',
          description: 'Não foi possível localizar a empresa vinculada ao usuário logado.',
          variant: 'destructive',
        });
        return;
      }

      const { error } = await supabase
        .from('empresa')
        .update({
          nome: general.companyName || null,
          cnpj: String(general.cnpj || '').replace(/\D/g, '') || null,
          endereco: general.address || null,
          email: general.email || null,
          telefone: general.telefone || null,
          contato: general.contato || null,
          logo: general.logo || null,
        })
        .eq('id', companyId);

      if (error) {
        toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
        return;
      }

      updateSettings('general', general);
      toast({
        title: 'Configurações salvas!',
        description: 'As informações da empresa foram atualizadas.',
      });
    } catch (err) {
      toast({ title: 'Erro inesperado', description: err.message || String(err), variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-white">Informações da Empresa</h3>
        <p className="text-sm text-gray-400">Dados da sua empresa para relatórios e certificados.</p>
      </div>
      <div className="space-y-4">
        {loading && <p className="text-sm text-blue-200">Carregando dados da empresa...</p>}
        <input 
          type="text" 
          name="companyName"
          placeholder="Nome da Empresa" 
          value={general.companyName}
          onChange={handleChange}
          className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500" 
        />
        <input 
          type="text" 
          name="cnpj"
          placeholder="CNPJ" 
          value={general.cnpj}
          onChange={handleChange}
          className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500" 
        />
        <textarea 
          name="address"
          placeholder="Endereço" 
          rows="3" 
          value={general.address}
          onChange={handleChange}
          className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        ></textarea>
        <input
          type="email"
          name="email"
          placeholder="Email"
          value={general.email || ''}
          onChange={handleChange}
          className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <input
          type="text"
          name="telefone"
          placeholder="Telefone"
          value={general.telefone || ''}
          onChange={handleChange}
          className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <input
          type="text"
          name="contato"
          placeholder="Contato"
          value={general.contato || ''}
          onChange={handleChange}
          className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <Button onClick={handleSave} className="bg-gradient-to-r from-blue-500 to-blue-600">Salvar Alterações</Button>
    </div>
  );
};

export default GeneralSettings;