import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, CalendarDays, User, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';

  const EquipamentoAlocacao = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { toast } = useToast();
    const { user } = useAuth();
    const [equipamento, setEquipamento] = useState(null);
    const [tecnicos, setTecnicos] = useState([]);
    const [currentAllocation, setCurrentAllocation] = useState(null);
    const [formData, setFormData] = useState({ tecnico_id: '', data_retirada: '', data_devolucao: '' });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const statusLabel = {
      disponivel: 'Disponível',
      em_uso: 'Em uso',
      indisponivel: 'Indisponível',
    };

    const resolveCompanyId = async () => {
    const fromUser =
      user?.user_metadata?.xid_empresa ??
      user?.xid_empresa ??
      null;

    if (fromUser) return fromUser;

    if (!user?.id) return null;

    const { data, error } = await supabase
      .from('profiles')
      .select('xid_empresa')
      .eq('id', user.id)
      .maybeSingle();

    if (error) {
      console.warn('Erro ao resolver empresa', error);
      return null;
    }

    return data?.xid_empresa ?? null;
  };


  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      const resolvedCompanyId = await resolveCompanyId();

      const { data: equipamentoData, error: equipamentoError } = await supabase
        .from('equipamentos')
        .select('*')
        .eq('id', id)
        .single();

      if (equipamentoError || !equipamentoData) {
        toast({ title: 'Equipamento não encontrado', description: equipamentoError?.message, variant: 'destructive' });
        navigate('/equipamentos');
        return;
      }

      const { data: tecnicoData, error: tecnicoError } = await supabase
        .from('tecnico')
        .select('id, nome')
        .eq('status', 'ativo')
        .eq('xid_empresa', resolvedCompanyId)
        .order('nome', { ascending: true });

      if (tecnicoError) {
        toast({ title: 'Erro ao carregar técnicos', description: tecnicoError.message, variant: 'destructive' });
      }

      let allocationData = null;
      if (equipamentoData.status === 'em_uso') {
        const { data, error } = await supabase
          .from('alocacoes')
          .select('*')
          .eq('xid_equipamento', id)
          .eq('status', 'em_uso')
          .eq('xid_empresa', resolvedCompanyId)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (!error && data) {
          allocationData = data;
        }
      }

      setEquipamento(equipamentoData);
      setTecnicos(tecnicoData || []);
      setCurrentAllocation(allocationData);
      setFormData({
        tecnico_id: allocationData?.xid_tecnico || '',
        data_retirada: allocationData?.data_retirada || '',
        data_devolucao: allocationData?.data_devolucao || '',
      });
      setLoading(false);
    };

    fetchData();
  }, [id, navigate, toast]);

  const isDisabled = equipamento?.status === 'indisponivel';
  const isEditing = equipamento?.status === 'em_uso' && !!currentAllocation;

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!formData.tecnico_id || !formData.data_retirada) {
      toast({ title: 'Preencha os campos obrigatórios', variant: 'destructive' });
      return;
    }

    const resolvedCompanyId = await resolveCompanyId();    

    setSaving(true);

    const allocationPayload = {
      xid_tecnico: formData.tecnico_id,
      data_retirada: formData.data_retirada,
      data_devolucao: formData.data_devolucao || null,
    };

    if (isEditing) {
      const { error } = await supabase
        .from('alocacoes')
        .update(allocationPayload)
        .eq('id', currentAllocation.id);

      setSaving(false);

      if (error) {
        toast({ title: 'Erro ao atualizar alocação', description: error.message, variant: 'destructive' });
        return;
      }

      toast({ title: 'Alocação atualizada com sucesso!' });
      navigate('/equipamentos');
      return;
    }

    const { error: insertError } = await supabase
      .from('alocacoes')
      .insert([{
        ...allocationPayload,
        xid_equipamento: id,
        xid_empresa: resolvedCompanyId,
        status: 'em_uso',
      }]);

    if (insertError) {
      setSaving(false);
      toast({ title: 'Erro ao criar alocação', description: insertError.message, variant: 'destructive' });
      return;
    }

    const { error: updateError } = await supabase
      .from('equipamentos')
      .update({ status: 'em_uso' })
      .eq('id', id);

    setSaving(false);

    if (updateError) {
      toast({ title: 'Alocação criada, mas falha ao atualizar status do equipamento', description: updateError.message, variant: 'destructive' });
      return;
    }

    toast({ title: 'Alocação registrada com sucesso!' });
    navigate('/equipamentos');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-green-900 to-emerald-900">
        <div className="text-white text-xl">Carregando alocação...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-white">{isEditing ? 'Alterar alocação' : 'Nova alocação'}</h1>
          <p className="text-gray-300 mt-2">Gerencie a alocação do equipamento selecionado.</p>
        </div>
        <Button variant="ghost" onClick={() => navigate('/equipamentos')}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
        </Button>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/10 backdrop-blur-xl rounded-3xl p-6 border border-white/20"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <p className="text-sm text-gray-400">Equipamento</p>
            <p className="text-white font-semibold">{equipamento.nome}</p>
          </div>
          <div className="space-y-2">
            <p className="text-sm text-gray-400">Patrimônio</p>
            <p className="text-white font-semibold">{equipamento.patrimonio || '—'}</p>
          </div>
          <div className="space-y-2">
            <p className="text-sm text-gray-400">Status atual</p>
            <p className="text-white font-semibold">{statusLabel[equipamento.status] || equipamento.status}</p>
          </div>
          <div className="space-y-2">
            <p className="text-sm text-gray-400">Tipo de operação</p>
            <p className="text-white font-semibold">{isEditing ? 'Alteração da alocação' : 'Nova alocação'}</p>
          </div>
        </div>
      </motion.div>

      <motion.form
        onSubmit={handleSubmit}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/5 backdrop-blur-xl rounded-3xl p-6 border border-white/10"
      >
        {isDisabled && (
          <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/5 p-4 text-red-200">
            Este equipamento está indisponível. A alocação não pode ser registrada nem alterada.
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col text-sm text-gray-300">
            Técnico
            <div className="mt-2 relative">
              <User className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <select
                value={formData.tecnico_id}
                onChange={(e) => setFormData((prev) => ({ ...prev, tecnico_id: e.target.value }))}
                disabled={isDisabled}
                className="w-full pl-12 pr-4 py-3 bg-slate-900 border border-slate-700 rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Selecione um técnico</option>
                {tecnicos.map((tecnico) => (
                  <option key={tecnico.id} value={tecnico.id}>{tecnico.nome}</option>
                ))}
              </select>
            </div>
          </label>
          <label className="flex flex-col text-sm text-gray-300">
            Data da Retirada
            <div className="mt-2 relative">
              <CalendarDays className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="date"
                value={formData.data_retirada}
                onChange={(e) => setFormData((prev) => ({ ...prev, data_retirada: e.target.value }))}
                disabled={isDisabled}
                className="w-full pl-12 pr-4 py-3 bg-slate-900 border border-slate-700 rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </label>
          <label className="flex flex-col text-sm text-gray-300">
            Data de Devolução
            <div className="mt-2 relative">
              <CalendarDays className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="date"
                value={formData.data_devolucao}
                onChange={(e) => setFormData((prev) => ({ ...prev, data_devolucao: e.target.value }))}
                disabled={isDisabled}
                className="w-full pl-12 pr-4 py-3 bg-slate-900 border border-slate-700 rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </label>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={() => navigate('/equipamentos')}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isDisabled || saving} className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700">
            <Save className="w-4 h-4 mr-2" />
            {isEditing ? 'Salvar alteração' : 'Confirmar alocação'}
          </Button>
        </div>
      </motion.form>
    </div>
  );
};

export default EquipamentoAlocacao;
