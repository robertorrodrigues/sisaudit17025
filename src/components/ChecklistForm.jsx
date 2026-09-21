import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Camera, Save, Send, ChevronLeft, ChevronRight, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import PhotoCapture from '@/components/PhotoCapture';
import { supabase } from '@/lib/customSupabaseClient';
import { checklistItems } from '@/lib/checklistData';

const ChecklistForm = ({ os, onClose, onSubmit }) => {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(0); // <-- corrigido
  const [showPhotoCapture, setShowPhotoCapture] = useState(false);
  const [currentPhotoItem, setCurrentPhotoItem] = useState(null);
  const [checklistData, setChecklistData] = useState({});
  const [photos, setPhotos] = useState({});
  const [observations, setObservations] = useState({});
  const [clienteNome, setClienteNome] = useState('');
  const [loading, setLoading] = useState(false);
  const [showDadosGerais, setShowDadosGerais] = useState(false);
  const [showAparelhos, setShowAparelhos] = useState(false);
  const [loadingDadosGerais, setLoadingDadosGerais] = useState(false);
  const [loadingAparelhos, setLoadingAparelhos] = useState(false);
  const [savingDadosGerais, setSavingDadosGerais] = useState(false);
  const [savingAparelho, setSavingAparelho] = useState(false);

  // Fotos de aparelhos: mapa aparelhoId -> array de { dataUrl, metadata, descricao, observacao }
  const [aparelhoPhotos, setAparelhoPhotos] = useState({});
  const [showAparelhoPhotoCapture, setShowAparelhoPhotoCapture] = useState(false);
  const [currentAparelhoForPhoto, setCurrentAparelhoForPhoto] = useState(null);
  const [showAparelhoPhotosModal, setShowAparelhoPhotosModal] = useState(false);
  const [viewingAparelhoPhoto, setViewingAparelhoPhoto] = useState(null);
  const [viewingAparelhoPhotoIndex, setViewingAparelhoPhotoIndex] = useState(null);
  const [dadosGeraisData, setDadosGeraisData] = useState({
    abastecimento: '',
    material_inst_interna: '',
    tipo_inst_interna: '',
    numero_medidor: '',
    tipo_medidor: '',
    marca_medidor: '',
    leitura_medidor: '',
    pi_estanqueidade: '',
    pf_estanqueidade: '',
    tempo_estanqueidade: '',
    diametro_estanqueidade: '',
    pi_abaco: '',
    pf_abaco: '',
    volume_abaco: '',
    resultado_abaco: '',
  });
  const blankAparelhoForm = {
    local: '',
    tipo: '',
    marca: '',
    modelo: '',
    queimadores: '',
    circuito: '',
    exaustao: '',
    pot_nominal: '',
    co_amb: '',
    tempo: '',
    co_n: '',
  };
  const [aparelhoForm, setAparelhoForm] = useState(blankAparelhoForm);
  const [aparelhosList, setAparelhosList] = useState([]);
  const [editingAparelhoId, setEditingAparelhoId] = useState(null);

  
// TIMESTAMP local (para coluna TIMESTAMP sem timezone)
 const nowLocalTimestamp = () => {
   const d = new Date();
   const pad = (n) => String(n).padStart(2, '0');
   return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} `
        + `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
 };

  // Itens que queremos sincronizar com o banco
  const itemIds = [
    '1.1','1.2','1.3','1.4','1.5','1.6','1.7',
    '2.1','2.2','2.3','2.4','2.5',
    '3.1','3.2','4.1','4.2',
    '5.1','6.1','6.2','6.3',
    '7.1','8.1','9.1','9.2',
    '10.1','10.2','10.3',
    '11.1','11.2',
    '12.1','12.2','12.3',
    '13.1','14.1','14.2',
    '15.1','15.2','16.1','17.1',
    '18.1','18.2','19.1','19.2','19.3',
    '20.1','20.2','21.1',
    '22.1','22.2','22.3',
    '23.1','24.1','25.1','26.1'
  ];

  // Total de itens do checklist para calcular status de conclusão
  const TOTAL_ITEMS = 54;

  const resolveCompanyId = async () => {
    const fromUser = user?.user_metadata?.xid_empresa ?? user?.xid_empresa ?? null;

    if (fromUser) return fromUser;
    if (!user?.id) return null;

    const { data, error } = await supabase
      .from('profiles')
      .select('xid_empresa')
      .eq('id', user.id)
      .maybeSingle();

    if (error) {
      console.warn('Não foi possível resolver xid_empresa do perfil do usuário.', error);
      return null;
    }

    return data?.xid_empresa ?? null;
  };

  // Mapeamento entre texto no BD e opção selecionada na UI
  const dbResultadoToUI = (r) => {
    if (r === 'Conforme') return 'conforme';
    if (r === 'Não Conforme' || r === 'Não conforme') return 'nao_conforme';
    if (r === 'Não Se Aplica' || r === 'Não se Aplica' || r === 'Não se aplica') return 'nao_aplicavel';
    return undefined;
  };

  const uiResultadoToDB = (v) => {
    if (v === 'conforme') return 'Conforme';
    if (v === 'nao_conforme') return 'Não Conforme';
    if (v === 'nao_aplicavel') return 'Não Se Aplica';
    return null;
  };

  // === ⚠️ Hook no nível do componente (NÃO dentro de funções) ===
  useEffect(() => {
    let cancelado = false;

    const fetchClienteJoin = async () => {
      try {
        if (!os?.numero) return;
        setLoading(true);

        // Join: ordem_servico -> pedidos(cliente_nome)
        // Requer FK ordem_servico.cliente_id -> pedidos.id definida no Supabase
        const { data, error } = await supabase
          .from('ordem_servico')
          .select('id, numero, pedido_id, pedidos(cliente_nome)')
          .eq('numero', os.numero)
          .single(); // esperamos uma única OS pelo número

        if (error) throw error;

        toast({
            title: 'cliente',
            description: data?.pedidos?.cliente_nome || 'não encontrado',
          });

        const nome = data?.pedidos?.cliente_nome ?? '';
        if (!cancelado) setClienteNome(nome);
      } catch (err) {
        if (!cancelado) {
          setClienteNome('');
          toast({
            title: 'Erro ao buscar cliente',
            description: err?.message ?? 'Falha na consulta.',
            variant: 'destructive',
          });
        }
      } finally {
        if (!cancelado) setLoading(false);
      }
    };

    fetchClienteJoin();
    
    const carregarChecklistSeEmProgresso = async () => {
      try {
        if (os?.status !== 'em_progresso' || !os?.id) return;

        const { data, error } = await supabase
          .from('checklist')
          .select('os_id,item_id,resultado,observacao,foto_url,foto_metadata')
          .eq('os_id', os.id)
          .in('item_id', itemIds);

        if (error) throw error;

        const nextChecklistData = {};
        const nextObservations = {};
        const nextPhotos = {};

        (data ?? []).forEach((row) => {
          const id = row.item_id;
          if (!itemIds.includes(id)) return;

          const uiVal = dbResultadoToUI(row.resultado);
          if (uiVal) nextChecklistData[id] = uiVal;

          if (row.observacao) nextObservations[id] = row.observacao;

          if (row.foto_url) {
            let meta = undefined;
            try {
              meta = row.foto_metadata ? JSON.parse(row.foto_metadata) : undefined;
            } catch {
              meta = undefined;
            }
            nextPhotos[id] = { dataUrl: row.foto_url, metadata: meta };
          }
        });

        if (!cancelado) {
          setChecklistData((prev) => ({ ...prev, ...nextChecklistData }));
          setObservations((prev) => ({ ...prev, ...nextObservations }));
          setPhotos((prev) => ({ ...prev, ...nextPhotos }));
          toast({
            title: 'Checklist carregado',
            description: `Itens preenchidos automaticamente para OS #${os.id}.`,
          });
        }
      } catch (err) {
        if (!cancelado) {
          toast({
            title: 'Erro ao carregar checklist',
            description: err?.message ?? 'Falha ao buscar dados.',
            variant: 'destructive',
          });
        }
      }
    };

    carregarChecklistSeEmProgresso();
    return () => { cancelado = true; };
  }, [os?.id, os?.status]);

  useEffect(() => {
    let cancelado = false;

    const carregarAparelhos = async () => {
      if (!showAparelhos || !os?.numero) {
        if (!cancelado) setAparelhosList([]);
        return;
      }

      try {
        setLoadingAparelhos(true);
        const { data, error } = await supabase
          .from('aparelhos_insp')
          .select('*')
          .eq('num_os', os.numero)
          .order('created_at', { ascending: true });

        if (error) throw error;

        if (!cancelado) {
          setAparelhosList(data ?? []);

          // carregar fotos relacionadas a estes aparelhos a partir da tabela fotos_apar_insp
          try {
            const aparelhoIds = (data ?? []).map((a) => a.id).filter(Boolean);
            if (aparelhoIds.length > 0) {
              const { data: fotosRows, error: fotosError } = await supabase
                .from('fotos_apar_insp')
                .select('*')
                .in('aparelhos_insp_id', aparelhoIds);

              if (fotosError) throw fotosError;

              const map = {};
              (fotosRows ?? []).forEach((row) => {
                const aid = row.aparelhos_insp_id;
                if (!map[aid]) map[aid] = [];
                map[aid].push({
                  id: row.id,
                  dataUrl: row.foto_url,
                  metadata: row.foto_metadata ?? undefined,
                  descricao: row.descricao ?? '',
                  observacao: row.observacao ?? '',
                });
              });

              setAparelhoPhotos((prev) => ({ ...prev, ...map }));
            } else {
              setAparelhoPhotos({});
            }
          } catch (errFotos) {
            console.warn('Erro ao carregar fotos de aparelhos:', errFotos);
          }
        }
      } catch (err) {
        if (!cancelado) {
          toast({
            title: 'Erro ao carregar aparelhos',
            description: err?.message ?? 'Não foi possível recuperar os aparelhos cadastrados.',
            variant: 'destructive',
          });
        }
      } finally {
        if (!cancelado) setLoadingAparelhos(false);
      }
    };

    carregarAparelhos();
    return () => { cancelado = true; };
  }, [os?.numero, showAparelhos]);

  useEffect(() => {
    let cancelado = false;

    const carregarDadosGerais = async () => {
      if (!showDadosGerais || !os?.numero) return;

      try {
        setLoadingDadosGerais(true);
        const { data, error } = await supabase
          .from('insp_dados_gerais')
          .select('*')
          .eq('num_os', os.numero)
          .maybeSingle();

        if (error) throw error;

        if (!cancelado && data) {
          setDadosGeraisData({
            abastecimento: data.abastecimento ?? '',
            material_inst_interna: data.material_inst_interna ?? '',
            tipo_inst_interna: data.tipo_inst_interna ?? '',
            numero_medidor: data.numero_medidor ?? '',
            tipo_medidor: data.tipo_medidor ?? '',
            marca_medidor: data.marca_medidor ?? '',
            leitura_medidor: data.leitura_medidor ?? '',
            pi_estanqueidade: data.pi_estanqueidade ?? '',
            pf_estanqueidade: data.pf_estanqueidade ?? '',
            tempo_estanqueidade: data.tempo_estanqueidade ?? '',
            diametro_estanqueidade: data.diametro_estanqueidade ?? '',
            pi_abaco: data.pi_abaco ?? '',
            pf_abaco: data.pf_abaco ?? '',
            volume_abaco: data.volume_abaco ?? '',
            resultado_abaco: data.resultado_abaco ?? '',
          });
        }
      } catch (err) {
        if (!cancelado) {
          toast({
            title: 'Erro ao carregar dados gerais',
            description: err?.message ?? 'Não foi possível recuperar os dados da inspeção.',
            variant: 'destructive',
          });
        }
      } finally {
        if (!cancelado) setLoadingDadosGerais(false);
      }
    };

    carregarDadosGerais();
    return () => { cancelado = true; };
  }, [os?.numero, showDadosGerais]);

  // Sincroniza fotos vindas do banco (se houver campo 'fotos' ou 'foto_url') para o estado aparelhoPhotos
  useEffect(() => {
    if (!aparelhosList || aparelhosList.length === 0) return;
    const map = {};
    aparelhosList.forEach((item) => {
      if (!item) return;
      if (item.fotos) {
        try {
          const parsed = typeof item.fotos === 'string' ? JSON.parse(item.fotos) : item.fotos;
          if (Array.isArray(parsed)) map[item.id] = parsed;
        } catch {
          // ignore parse errors
        }
      } else if (item.foto_url) {
        try {
          const meta = item.foto_metadata ? JSON.parse(item.foto_metadata) : undefined;
          map[item.id] = [{ dataUrl: item.foto_url, metadata: meta, descricao: '', observacao: '' }];
        } catch {
          map[item.id] = [{ dataUrl: item.foto_url, metadata: undefined, descricao: '', observacao: '' }];
        }
      }
    });
    setAparelhoPhotos((prev) => ({ ...prev, ...map }));
  }, [aparelhosList]);

  const handleItemChange = (itemId, value) => {
    setChecklistData((prev) => ({ ...prev, [itemId]: value }));
  };

  const handleObservationChange = (itemId, value) => {
    setObservations((prev) => ({ ...prev, [itemId]: value }));
  };

  const handlePhotoCapture = (itemId) => {
    setCurrentPhotoItem(itemId);
    setShowPhotoCapture(true);
  };

  const handlePhotoSave = (photoData) => {
    setPhotos((prev) => ({ ...prev, [currentPhotoItem]: photoData }));
    setShowPhotoCapture(false);
    setCurrentPhotoItem(null);
    toast({ title: 'Foto capturada!', description: 'Foto anexada ao item do checklist.' });
  };

  //nova funcionalidade
  const handleSaveDraft = async () => {
  try {
    const resolvedCompanyId = await resolveCompanyId();
    const draftEntries = [];

    checklistItems.forEach((category) => {
      category.items.forEach((item) => {
        const rawResultado = checklistData[item.id];
        const rawObs = observations[item.id];
        const photo = photos[item.id];

        const hasResultado = !!rawResultado;
        const hasObs = !!rawObs?.trim();
        const hasPhoto = !!photo;

        if (hasResultado || hasObs || hasPhoto) {
          const resultado = uiResultadoToDB(rawResultado);
          const observacao =
            rawResultado === 'conforme' || rawResultado === 'nao_aplicavel'
              ? ''
              : (typeof rawObs === 'string' ? rawObs.trim() : '');

          const foto_url = photo ? photo.dataUrl : null;
          const foto_metadata = photo ? JSON.stringify(photo.metadata ?? {}) : null;

          draftEntries.push({
            os_id: os.id,
            os_numero: os.numero,
            xid_empresa: resolvedCompanyId,
            item_id: item.id,
            categoria: category.category,
            descricao: item.criterio_aceitacao,
            resultado,
            observacao,
            foto_url,
            foto_metadata,
            created_at: new Date().toISOString(),
          });
        }
      });
    });

    if (draftEntries.length === 0) {
      toast({
        title: 'Nenhum dado para salvar',
        description: 'Preencha algum item, observação ou foto para salvar um rascunho.'
      });
      return;
    }

    const { error: upsertError } = await supabase
      .from('checklist')
      .upsert(draftEntries, { onConflict: 'os_id,item_id' });

    if (upsertError) throw upsertError;

    const { count, error: countError } = await supabase
      .from('checklist')
      .select('*', { count: 'exact' })
      .eq('os_id', os.id);

    if (countError) throw countError;

    const novoStatus =
      count === TOTAL_ITEMS ? 'em_progresso' :
      count > 0             ? 'em_progresso' :
                              null;

    if (novoStatus) {
      const updatePayload = { status: novoStatus };

      if (novoStatus === 'concluido') {
        updatePayload.data_conclusao = nowLocalTimestamp();
      }

      const { error: updateError } = await supabase
        .from('ordem_servico')
        .update(updatePayload)
        .eq('id', os.id);

      if (updateError) throw updateError;
    }

    // ✅ ✅ ✅ NOVA REGRA ROBUSTA APLICADA AQUI ✅ ✅ ✅
    // Sempre que houver salvamento, atualiza o pedido para "em_andamento"
    if (draftEntries.length > 0 && os.pedido_id) {
      const { error: pedidoError } = await supabase
        .from('pedidos')
        .update({ status: 'em_andamento' })
        .eq('id', os.pedido_id)
        .neq('status', 'em_andamento'); // evita update desnecessário

      if (pedidoError) throw pedidoError;
    }

    toast({
      title: 'Rascunho salvo!',
      description: `Salvamos ${draftEntries.length} item(ns). Total na OS: ${count ?? 0}. ${novoStatus ? `Status: ${novoStatus}.` : ''}`
    });

  } catch (error) {
    console.error('Erro ao salvar rascunho:', error);
    toast({
      title: 'Erro ao salvar rascunho',
      description: error?.message ?? 'Não foi possível salvar o rascunho. Tente novamente.',
      variant: 'destructive'
    });
  }
};


  /*
  const handleSaveDraft = async () => {
    try {
      const resolvedCompanyId = await resolveCompanyId();
      const draftEntries = [];

      checklistItems.forEach((category) => {
        category.items.forEach((item) => {
          const rawResultado = checklistData[item.id];
          const rawObs = observations[item.id];
          const photo = photos[item.id];

          const hasResultado = !!rawResultado;
          const hasObs = !!rawObs?.trim();
          const hasPhoto = !!photo;

          if (hasResultado || hasObs || hasPhoto) {
            const resultado = uiResultadoToDB(rawResultado);
            const observacao =
              rawResultado === 'conforme' || rawResultado === 'nao_aplicavel'
                ? ''
                : (typeof rawObs === 'string' ? rawObs.trim() : '');

            const foto_url = photo ? photo.dataUrl : null;
            const foto_metadata = photo ? JSON.stringify(photo.metadata ?? {}) : null;

            draftEntries.push({
              os_id: os.id,
              os_numero: os.numero,
              xid_empresa: resolvedCompanyId,
              item_id: item.id,
              categoria: category.category,
              descricao: item.criterio_aceitacao,
              resultado,
              observacao,
              foto_url,
              foto_metadata,
              created_at: new Date().toISOString(),
            });
          }
        });
      });

      if (draftEntries.length === 0) {
        toast({
          title: 'Nenhum dado para salvar',
          description: 'Preencha algum item, observação ou foto para salvar um rascunho.'
        });
        return;
      }

      const { error: upsertError } = await supabase
        .from('checklist')
        .upsert(draftEntries, { onConflict: 'os_id,item_id' }); // exige UNIQUE(os_id,item_id)

      if (upsertError) throw upsertError;
  
      const { data: rows, count, error: countError } = await supabase
         .from('checklist')
         .select('*', { count: 'exact' })   // sem head:true
         .eq('os_id', os.id);
         //.in('item_id', itemIds);           // contagem correta


      if (countError) throw countError;

      
      const novoStatus =
      count === TOTAL_ITEMS ? 'concluido' :
      count > 0             ? 'em_progresso' :
                          null;

      if (novoStatus) {
        const updatePayload = { status: novoStatus };

        // Se for concluído, define data_conclusao como agora
        
      if (novoStatus === 'concluido') {
        updatePayload.data_conclusao = nowLocalTimestamp();
      }
        const { error: updateError } = await supabase
          .from('ordem_servico')
          .update(updatePayload)
          .eq('id', os.id);

        if (updateError) throw updateError;
      }

      // Status para o pedido também se OS for salva como em progresso
      //if (novoStatus === 'em_progresso') {
      //  const { error: pedidoError } = await supabase
      //    .from('pedidos')
      //    .update({ status: 'em_andamento' })
      //    .eq('id', os.cliente_id); // ou eq('id', os.pedido_id) dependendo do modelo de dados

      //  if (pedidoError) throw pedidoError;
      //}

      toast({
        title: 'Rascunho salvo!',
        description: `Salvamos ${draftEntries.length} item(ns). Total na OS: ${count ?? 0}. ${novoStatus ? `Status: ${novoStatus}.` : ''}`
      });
    } catch (error) {
      console.error('Erro ao salvar rascunho:', error);
      toast({
        title: 'Erro ao salvar rascunho',
        description: error?.message ?? 'Não foi possível salvar o rascunho. Tente novamente.',
        variant: 'destructive'
      });
    }
  };
  */

  const handleSubmitChecklist = async () => {
    const resolvedCompanyId = await resolveCompanyId();

    if (!resolvedCompanyId) {
      toast({
        title: 'Erro interno',
        description: 'Não foi possível identificar a empresa. Faça logout e entre novamente.',
        variant: 'destructive',
      });
      return;
    }

    const requiredItems = checklistItems.flatMap((category) =>
      category.items.filter((item) => item.required)
    );
    const missingItems = requiredItems.filter((item) => !checklistData[item.id]);
    let flagStatusConcluido = false;
    let flagNaoConforme = false;

    if (missingItems.length > 0) {
      toast({
        title: 'Itens obrigatórios pendentes',
        description: `${missingItems.length} itens obrigatórios não foram preenchidos.`,
        variant: 'destructive'
      });
      return;
    } else {
      flagStatusConcluido = true;
    }

  try {
      const checklistEntries = [];

      checklistItems.forEach((category) => {
        category.items.forEach((item) => {
          const rawResultado = checklistData[item.id];
          const rawObs = observations[item.id];
          const photo = photos[item.id];

          if (!rawResultado && !rawObs?.trim() && !photo) return;

          const resultado = uiResultadoToDB(rawResultado);
          const observacao =
            rawResultado === 'conforme' || rawResultado === 'nao_aplicavel'
              ? ''
              : (typeof rawObs === 'string' ? rawObs.trim() : '');

          checklistEntries.push({
            os_id: os.id,
            os_numero: os.numero,
            xid_empresa: resolvedCompanyId,
            item_id: item.id,
            categoria: category.category,
            descricao: item.criterio_aceitacao,
            resultado,
            observacao,
            foto_url: photo ? photo.dataUrl : null,
            foto_metadata: photo ? JSON.stringify(photo.metadata ?? {}) : null,
            updated_at: new Date().toISOString(),
          });
        });
      });

  // ✅ Verifica se existe alguma resposta "Não Conforme"
    flagNaoConforme = checklistEntries.some((entry) =>
      entry.resultado?.toLowerCase() === 'não conforme' ||
      entry.resultado?.toLowerCase() === 'nao conforme'
    );

  const { error: upsertError } = await supabase
    .from('checklist')
    .upsert(checklistEntries, { onConflict: 'os_id,item_id' });

  if (upsertError) throw upsertError;

  const count = checklistEntries.length;    

  let novoStatus = 'em_progresso';

  if (flagNaoConforme) {
      novoStatus = 'nao_conforme';
    } else if (flagStatusConcluido) {
      novoStatus = 'concluido';
    }

  
  if (novoStatus) {
   const updatePayload = { status: novoStatus };

   if (novoStatus === 'concluido') {
     updatePayload.data_conclusao = nowLocalTimestamp();
   }

   const { error: updateError } = await supabase
     .from('ordem_servico')
     .update(updatePayload)
     .eq('id', os.id);

   if (updateError) throw updateError;

   const pedidoId = os.pedido_id ?? os.pedidos?.id;

   if (novoStatus === 'concluido') {
     const { error: validacaoError } = await supabase
       .from('validacoes')
       .insert({
         os_id: os.id,
         status: 'pendente',
         xid_empresa: resolvedCompanyId,
         created_at: new Date().toISOString(),
       });

     if (validacaoError) throw validacaoError;

     if (!pedidoId) {
       throw new Error('Pedido associado à OS não está disponível.');
     }

     const { error: pedidoError } = await supabase
       .from('pedidos')
       .update(updatePayload.status === 'concluido' ? { status: 'concluido' } : { status: 'em_andamento' })
       .eq('id', pedidoId);

     if (pedidoError) throw pedidoError;
   }

   // ✅ Se for "não conforme" → pedido fica em andamento
      if (novoStatus === 'nao_conforme') {
        if (!pedidoId) {
          throw new Error('Pedido associado à OS não está disponível.');
        }

        const { error: pedidoError } = await supabase
          .from('pedidos')
          .update(updatePayload.status === 'concluido' ? { status: 'concluido' } : { status: 'em_andamento' })
          .eq('id', pedidoId);

        if (pedidoError) throw pedidoError;
      }


 }

  // Toast de sucesso
  toast({
    title: 'Checklist salvo!',
    description: `Itens: ${count}. Status: ${novoStatus}.`
  });

  onSubmit({
    osId: os.id,
    checklist: checklistData,
    photos,
    timestamp: new Date().toISOString()
  });
    } catch (error) {
      console.error('Error saving checklist:', error);
      toast({
        title: 'Erro ao salvar',
        description: error?.message ?? 'Não foi possível salvar.',
        variant: 'destructive'
      });
    }
  };

  const currentCategory = checklistItems[currentStep];

  const isCategoryComplete = (category) =>
    (category?.items ?? []).every((item) => Boolean(checklistData[item.id]));

  const applyCurrentCategoryConforme = () => {
    const categoryItems = currentCategory?.items ?? [];

    setChecklistData((prev) => {
      const next = { ...prev };
      categoryItems.forEach((item) => {
        next[item.id] = 'conforme';
      });
      return next;
    });

    setObservations((prev) => {
      const next = { ...prev };
      categoryItems.forEach((item) => {
        delete next[item.id];
      });
      return next;
    });

    toast({
      title: 'Categoria marcada como conforme',
      description: `${categoryItems.length} item(ns) definidos como Conforme.`,
    });
  };

  const handleDadosGeraisChange = (field, value) => {
    setDadosGeraisData((prev) => ({ ...prev, [field]: value }));
  };

  const handleAparelhoFormChange = (field, value) => {
    setAparelhoForm((prev) => ({ ...prev, [field]: value }));
  };

  const isAparelhoFormValid = () => {
    const requiredFields = ['local', 'tipo', 'marca', 'modelo', 'queimadores'];
    return requiredFields.every((field) => String(aparelhoForm[field] ?? '').trim() !== '');
  };

  const resetAparelhoForm = () => {
    setEditingAparelhoId(null);
    setAparelhoForm({ ...blankAparelhoForm });
  };

  const handleStartEditAparelho = (aparelho) => {
    setEditingAparelhoId(aparelho.id);
    setAparelhoForm({
      local: aparelho.local ?? '',
      tipo: aparelho.tipo ?? '',
      marca: aparelho.marca ?? '',
      modelo: aparelho.modelo ?? '',
      queimadores: aparelho.queimadores ?? '',
      circuito: aparelho.circuito ?? '',
      exaustao: aparelho.exaustao ?? '',
      pot_nominal: aparelho.pot_nominal ?? '',
      co_amb: aparelho.co_amb ?? '',
      tempo: aparelho.tempo ?? '',
      co_n: aparelho.co_n ?? '',
    });
  };

  const handleDeleteAparelho = async (aparelhoId) => {
    if (!aparelhoId) return;

    try {
      // tentar remover fotos relacionadas primeiro (para evitar conflito de FK)
      try {
        const { error: fotosError } = await supabase
          .from('fotos_apar_insp')
          .delete()
          .eq('aparelhos_insp_id', aparelhoId);
        if (fotosError) console.warn('Erro ao deletar fotos do aparelho:', fotosError.message || fotosError);
      } catch (errFotos) {
        console.warn('Erro ao deletar fotos do aparelho:', errFotos);
      }

      const { error } = await supabase
        .from('aparelhos_insp')
        .delete()
        .eq('id', aparelhoId);

      if (error) throw error;

      setAparelhosList((prev) => prev.filter((item) => item.id !== aparelhoId));
      if (editingAparelhoId === aparelhoId) {
        resetAparelhoForm();
      }

      // limpar fotos locais também
      setAparelhoPhotos((prev) => {
        const copy = { ...prev };
        delete copy[aparelhoId];
        return copy;
      });

      toast({
        title: 'Aparelho excluído',
        description: 'O aparelho foi removido com sucesso.',
      });
    } catch (error) {
      console.error('Erro ao excluir aparelho:', error);
      toast({
        title: 'Erro ao excluir aparelho',
        description: error?.message ?? 'Não foi possível excluir o aparelho.',
        variant: 'destructive',
      });
    }
  };

  // --- Gerenciamento de fotos de aparelhos ---
  const openAparelhoPhotosModal = (aparelhoId) => {
    setCurrentAparelhoForPhoto(aparelhoId);
    setShowAparelhoPhotosModal(true);
  };

  const openAparelhoPhotoCapture = (aparelhoId) => {
    setCurrentAparelhoForPhoto(aparelhoId);
    setShowAparelhoPhotosModal(false);
    setViewingAparelhoPhoto(null);
    setShowAparelhoPhotoCapture(true);
  };

  const handleSaveAparelhoPhoto = async (photo) => {
    if (!currentAparelhoForPhoto) return;
    const id = currentAparelhoForPhoto;
    // atualização otimista local
    const next = (aparelhoPhotos[id] ?? []).concat({ dataUrl: photo.dataUrl, metadata: photo.metadata, descricao: '', observacao: '' });
    setAparelhoPhotos((prev) => ({ ...prev, [id]: next }));

    // Persistir na tabela fotos_apar_insp
    try {
      const resolvedCompanyId = await resolveCompanyId();
      if (!resolvedCompanyId) {
        console.warn('Empresa não resolvida; foto não será persistida no banco.');
      } else {
        const insertPayload = {
          aparelhos_insp_id: id,
          foto_url: photo.dataUrl,
          foto_metadata: photo.metadata ?? {},
          descricao: '',
          observacao: '',
          xid_empresa: resolvedCompanyId,
          created_at: new Date().toISOString(),
        };

        const { data, error } = await supabase.from('fotos_apar_insp').insert(insertPayload).select().single();
        if (error) {
          console.warn('Não foi possível persistir foto na tabela fotos_apar_insp:', error.message || error);
        } else {
          // substituir o item otimista pelo registro retornado (com id)
          setAparelhoPhotos((prev) => {
            const arr = (prev[id] ?? []).slice();
            const lastIndex = arr.length - 1;
            if (lastIndex >= 0) {
              arr[lastIndex] = {
                id: data.id,
                dataUrl: data.foto_url,
                metadata: data.foto_metadata ?? photo.metadata ?? {},
                descricao: data.descricao ?? '',
                observacao: data.observacao ?? '',
              };
            }
            return { ...prev, [id]: arr };
          });
        }
      }
    } catch (err) {
      console.warn('Erro ao persistir foto na tabela fotos_apar_insp:', err);
    }

    setShowAparelhoPhotoCapture(false);
    setShowAparelhoPhotosModal(true);
  };

  const handleDeleteAparelhoPhoto = async (aparelhoId, index) => {
    const arr = (aparelhoPhotos[aparelhoId] ?? []).slice();
    if (index < 0 || index >= arr.length) return;
    const [removed] = arr.splice(index, 1);
    setAparelhoPhotos((prev) => ({ ...prev, [aparelhoId]: arr }));

    try {
      if (removed?.id) {
        const { error } = await supabase.from('fotos_apar_insp').delete().eq('id', removed.id);
        if (error) console.warn('Não foi possível excluir foto do banco:', error.message || error);
      } else {
        // fallback: se foto não tiver id no banco, tentar atualizar campo fotos na tabela aparelhos_insp
        const { error } = await supabase.from('aparelhos_insp').update({ fotos: JSON.stringify(arr) }).eq('id', aparelhoId);
        if (error) console.warn('Não foi possível atualizar fotos no banco (fallback):', error.message || error);
      }
    } catch (err) {
      console.warn('Erro ao excluir foto:', err);
    }
  };

  const handleUpdateAparelhoPhotoMeta = async (aparelhoId, index, field, value) => {
    const arr = (aparelhoPhotos[aparelhoId] ?? []).slice();
    if (!arr[index]) return;
    arr[index] = { ...arr[index], [field]: value };
    setAparelhoPhotos((prev) => ({ ...prev, [aparelhoId]: arr }));

    try {
      const fotoId = arr[index]?.id;
      if (fotoId) {
        const updateData = {};
        if (field === 'metadata') {
          updateData.foto_metadata = arr[index].metadata ?? {};
        } else if (field === 'descricao') {
          updateData.descricao = arr[index].descricao ?? null;
        } else if (field === 'observacao') {
          updateData.observacao = arr[index].observacao ?? null;
        }
        const { error } = await supabase.from('fotos_apar_insp').update(updateData).eq('id', fotoId);
        if (error) console.warn('Não foi possível atualizar metadados da foto:', error.message || error);
      } else {
        // fallback: persist como fotos no aparelho (coluna fotos) se existir
        const { error } = await supabase.from('aparelhos_insp').update({ fotos: JSON.stringify(arr) }).eq('id', aparelhoId);
        if (error) console.warn('Não foi possível atualizar metadados da foto (fallback):', error.message || error);
      }
    } catch (err) {
      console.warn('Erro ao atualizar metadados da foto:', err);
    }
  };

  const handleSaveAparelho = async () => {
    if (!os?.numero) {
      toast({
        title: 'OS não identificada',
        description: 'Não foi possível salvar o aparelho sem o número da OS.',
        variant: 'destructive',
      });
      return;
    }

    if (!isAparelhoFormValid()) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha Local, Tipo, Marca, Modelo e Queimadores para gravar o aparelho.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSavingAparelho(true);

      const payload = {
        num_os: os.numero,
        local: aparelhoForm.local || null,
        tipo: aparelhoForm.tipo || null,
        marca: aparelhoForm.marca || null,
        modelo: aparelhoForm.modelo || null,
        queimadores: aparelhoForm.queimadores || null,
        circuito: aparelhoForm.circuito || null,
        exaustao: aparelhoForm.exaustao || null,
        pot_nominal: aparelhoForm.pot_nominal || null,
        co_amb: aparelhoForm.co_amb || null,
        tempo: aparelhoForm.tempo || null,
        co_n: aparelhoForm.co_n || null,
      };

      if (editingAparelhoId) {
        // atualizar aparelho (fotos são gerenciadas separadamente na tabela fotos_apar_insp)
        const updatePayload = { ...payload };

        const { error } = await supabase
          .from('aparelhos_insp')
          .update(updatePayload)
          .eq('id', editingAparelhoId);

        if (error) throw error;

        setAparelhosList((prev) => prev.map((item) => (item.id === editingAparelhoId ? { ...item, ...payload } : item)));
        toast({
          title: 'Aparelho atualizado',
          description: 'As informações do aparelho foram atualizadas.',
        });
      } else {
        // criação normal (fotos podem ser adicionadas após salvar)
        const { data, error } = await supabase.from('aparelhos_insp').insert(payload).select().single();

        if (error) throw error;

        setAparelhosList((prev) => [
          ...prev,
          {
            ...payload,
            id: data?.id ?? crypto.randomUUID(),
            created_at: data?.created_at ?? new Date().toISOString(),
          },
        ]);
        toast({
          title: 'Aparelho cadastrado',
          description: 'O aparelho foi salvo na tabela de aparelhos da inspeção.',
        });
      }

      resetAparelhoForm();
    } catch (error) {
      console.error('Erro ao salvar aparelho:', error);
      toast({
        title: 'Erro ao salvar aparelho',
        description: error?.message ?? 'Não foi possível salvar as informações do aparelho.',
        variant: 'destructive',
      });
    } finally {
      setSavingAparelho(false);
    }
  };

  const handleSaveDadosGerais = async () => {
    if (!os?.numero) {
      toast({
        title: 'OS não identificada',
        description: 'Não foi possível salvar os dados gerais sem o número da OS.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSavingDadosGerais(true);

      const { data: existingRow, error: selectError } = await supabase
        .from('insp_dados_gerais')
        .select('id')
        .eq('num_os', os.numero)
        .maybeSingle();

      if (selectError) throw selectError;

      const payload = {
        num_os: os.numero,
        abastecimento: dadosGeraisData.abastecimento || null,
        material_inst_interna: dadosGeraisData.material_inst_interna || null,
        tipo_inst_interna: dadosGeraisData.tipo_inst_interna || null,
        numero_medidor: dadosGeraisData.numero_medidor || null,
        tipo_medidor: dadosGeraisData.tipo_medidor || null,
        marca_medidor: dadosGeraisData.marca_medidor || null,
        leitura_medidor: dadosGeraisData.leitura_medidor || null,
        pi_estanqueidade: dadosGeraisData.pi_estanqueidade || null,
        pf_estanqueidade: dadosGeraisData.pf_estanqueidade || null,
        tempo_estanqueidade: dadosGeraisData.tempo_estanqueidade || null,
        diametro_estanqueidade: dadosGeraisData.diametro_estanqueidade || null,
        pi_abaco: dadosGeraisData.pi_abaco || null,
        pf_abaco: dadosGeraisData.pf_abaco || null,
        volume_abaco: dadosGeraisData.volume_abaco || null,
        resultado_abaco: dadosGeraisData.resultado_abaco || null,
      };

      if (existingRow?.id) {
        const { error: updateError } = await supabase
          .from('insp_dados_gerais')
          .update(payload)
          .eq('id', existingRow.id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('insp_dados_gerais')
          .insert(payload);

        if (insertError) throw insertError;
      }

      toast({
        title: 'Dados gerais salvos',
        description: 'As informações da inspeção foram salvas na tabela de dados gerais.',
      });
      setShowDadosGerais(false);
    } catch (error) {
      console.error('Erro ao salvar dados gerais:', error);
      toast({
        title: 'Erro ao salvar dados gerais',
        description: error?.message ?? 'Não foi possível salvar as informações.',
        variant: 'destructive',
      });
    } finally {
      setSavingDadosGerais(false);
    }
  };

  if (showAparelhos) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-slate-900 sm:bg-black/50 sm:backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-slate-900 sm:bg-white/10 sm:backdrop-blur-xl rounded-none sm:rounded-2xl p-4 sm:p-6 border-0 sm:border sm:border-white/20 w-full h-full sm:w-full sm:max-w-5xl sm:max-h-[90vh] flex flex-col"
        >
          <div className="flex items-center justify-between mb-4 shrink-0">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-white">Aparelhos da Inspeção</h2>
              <p className="text-gray-300 text-sm">{os.numero} — Cadastro de aparelhos e dados de utilização</p>
            </div>
            <button onClick={() => setShowAparelhos(false)} className="text-gray-400 hover:text-white transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="bg-white/5 rounded-xl p-4 sm:p-6 mb-4 overflow-y-auto flex-1">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-white mb-3">Aparelhos já cadastrados</h3>
              {loadingAparelhos ? (
                <p className="text-gray-300">Carregando aparelhos salvos...</p>
              ) : aparelhosList.length === 0 ? (
                <p className="text-gray-400">Ainda não há aparelhos cadastrados para esta OS.</p>
              ) : (
                <div className="space-y-2">
                  {aparelhosList.map((item, index) => (
                    <div key={item.id ?? `${item.num_os}-${index}`} className="rounded-lg border border-white/10 bg-slate-950/40 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-blue-300 font-medium">Aparelho {index + 1}</span>
                          <span className="text-gray-400 text-sm">{item.local || 'Sem local'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            onClick={() => handleStartEditAparelho(item)}
                            variant="outline"
                            size="sm"
                            className="border-white/20 text-white hover:bg-white/10"
                          >
                            <Pencil className="w-4 h-4 mr-1" />
                            Alterar
                          </Button>

                          <Button
                            onClick={() => openAparelhoPhotosModal(item.id)}
                            variant="outline"
                            size="sm"
                            className="border-white/20 text-white hover:bg-white/10"
                          >
                            <Camera className="w-4 h-4 mr-1" />
                            Fotos ({(aparelhoPhotos[item.id] || []).length})
                          </Button>

                          <Button
                            onClick={() => handleDeleteAparelho(item.id)}
                            variant="outline"
                            size="sm"
                            className="border-red-400/30 text-red-200 hover:bg-red-500/10"
                          >
                            <Trash2 className="w-4 h-4 mr-1" />
                            Excluir
                          </Button>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-200">
                        <div><span className="text-gray-400">Tipo:</span> {item.tipo || '—'}</div>
                        <div><span className="text-gray-400">Marca:</span> {item.marca || '—'}</div>
                        <div><span className="text-gray-400">Modelo:</span> {item.modelo || '—'}</div>
                        <div><span className="text-gray-400">Queimadores:</span> {item.queimadores || '—'}</div>
                        <div><span className="text-gray-400">Circuito:</span> {item.circuito || '—'}</div>
                        <div><span className="text-gray-400">Exaustão:</span> {item.exaustao || '—'}</div>
                        <div><span className="text-gray-400">Potência nominal:</span> {item.pot_nominal || '—'}</div>
                        <div><span className="text-gray-400">CO amb:</span> {item.co_amb || '—'}</div>
                        <div><span className="text-gray-400">Tempo:</span> {item.tempo || '—'}</div>
                        <div><span className="text-gray-400">CO n:</span> {item.co_n || '—'}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-lg border border-white/10 p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">{editingAparelhoId ? 'Editar aparelho' : 'Novo aparelho'}</h3>
                {editingAparelhoId && (
                  <Button
                    onClick={resetAparelhoForm}
                    variant="outline"
                    size="sm"
                    className="border-white/20 text-white hover:bg-white/10"
                  >
                    Cancelar edição
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-2">Local</label>
                  <input
                    value={aparelhoForm.local}
                    onChange={(e) => handleAparelhoFormChange('local', e.target.value)}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ex.: Cozinha"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-2">Tipo</label>
                  <input
                    value={aparelhoForm.tipo}
                    onChange={(e) => handleAparelhoFormChange('tipo', e.target.value)}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ex.: Fogão"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-2">Marca</label>
                  <input
                    value={aparelhoForm.marca}
                    onChange={(e) => handleAparelhoFormChange('marca', e.target.value)}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-2">Modelo</label>
                  <input
                    value={aparelhoForm.modelo}
                    onChange={(e) => handleAparelhoFormChange('modelo', e.target.value)}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-2">Queimadores</label>
                  <input
                    value={aparelhoForm.queimadores}
                    onChange={(e) => handleAparelhoFormChange('queimadores', e.target.value)}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-2">Circuito</label>
                  <select
                    value={aparelhoForm.circuito}
                    onChange={(e) => handleAparelhoFormChange('circuito', e.target.value)}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="" className="text-slate-900">Selecione</option>
                    <option value="Aberto" className="text-slate-900">Aberto</option>
                    <option value="Fechado" className="text-slate-900">Fechado</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-2">Exaustão</label>
                  <select
                    value={aparelhoForm.exaustao}
                    onChange={(e) => handleAparelhoFormChange('exaustao', e.target.value)}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="" className="text-slate-900">Selecione</option>
                    <option value="Natural" className="text-slate-900">Natural</option>
                    <option value="Forçada" className="text-slate-900">Forçada</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-2">Potência Nominal</label>
                  <input
                    value={aparelhoForm.pot_nominal}
                    onChange={(e) => handleAparelhoFormChange('pot_nominal', e.target.value)}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-2">CO amb</label>
                  <input
                    value={aparelhoForm.co_amb}
                    onChange={(e) => handleAparelhoFormChange('co_amb', e.target.value)}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-2">Tempo</label>
                  <input
                    value={aparelhoForm.tempo}
                    onChange={(e) => handleAparelhoFormChange('tempo', e.target.value)}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-2">CO n</label>
                  <input
                    value={aparelhoForm.co_n}
                    onChange={(e) => handleAparelhoFormChange('co_n', e.target.value)}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center shrink-0">
            <Button
              onClick={() => setShowAparelhos(false)}
              variant="outline"
              className="border-white/20 text-white hover:bg-white/10"
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Voltar ao checklist
            </Button>
            <Button
              onClick={handleSaveAparelho}
              className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
              disabled={savingAparelho}
            >
              <Save className="w-4 h-4 mr-2" />
              {savingAparelho ? 'Salvando...' : editingAparelhoId ? 'Atualizar Aparelho' : 'Salvar Aparelho'}
            </Button>
          </div>

          {/* Photo capture modal (aparelho) */}
          {showAparelhoPhotoCapture && (
            <PhotoCapture
              onClose={() => setShowAparelhoPhotoCapture(false)}
              onSave={handleSaveAparelhoPhoto}
              itemId={currentAparelhoForPhoto}
            />
          )}

          {/* Aparelho photos modal */}
          {showAparelhoPhotosModal && currentAparelhoForPhoto && (
            <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
              <div className="bg-white/10 rounded-2xl p-4 w-full max-w-3xl border border-white/20">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">Fotos do Aparelho</h3>
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => openAparelhoPhotoCapture(currentAparelhoForPhoto)}
                      className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
                    >
                      <Camera className="w-4 h-4 mr-2" />Adicionar Foto
                    </Button>
                    <Button variant="outline" onClick={() => setShowAparelhoPhotosModal(false)} className="border-white/20 text-white hover:bg-white/10">
                      Fechar
                    </Button>
                  </div>
                </div>

                <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                  {(aparelhoPhotos[currentAparelhoForPhoto] || []).length === 0 ? (
                    <p className="text-gray-300">Nenhuma foto cadastrada.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {(aparelhoPhotos[currentAparelhoForPhoto] || []).map((p, i) => (
                        <div key={i} className="bg-white/5 rounded-lg p-2">
                          <img src={p.dataUrl} alt={`Foto ${i+1}`} className="w-full h-40 object-cover rounded cursor-pointer" onClick={() => { setViewingAparelhoPhoto(p.dataUrl); setViewingAparelhoPhotoIndex(i); }} />
                          <div className="mt-2 text-sm text-gray-300">
                            <input
                              value={p.descricao || ''}
                              placeholder="Descrição"
                              onChange={(e) => handleUpdateAparelhoPhotoMeta(currentAparelhoForPhoto, i, 'descricao', e.target.value)}
                              className="w-full px-2 py-1 bg-white/5 rounded border border-white/10 text-white"
                            />
                            <textarea
                              value={p.observacao || ''}
                              placeholder="Observação"
                              onChange={(e) => handleUpdateAparelhoPhotoMeta(currentAparelhoForPhoto, i, 'observacao', e.target.value)}
                              className="w-full mt-2 px-2 py-1 bg-white/5 rounded border border-white/10 text-white"
                            />
                          </div>
                          <div className="flex justify-end gap-2 mt-2">
                            <Button onClick={() => { setViewingAparelhoPhoto(p.dataUrl); setViewingAparelhoPhotoIndex(i); }} className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white border border-blue-500">Ver</Button>
                            <Button onClick={() => handleDeleteAparelhoPhoto(currentAparelhoForPhoto, i)} className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white border border-blue-500">Excluir</Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Visualizar foto em overlay */}
          {viewingAparelhoPhoto && (
            <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-black/80">
              <div className="bg-white/10 rounded-lg p-4 w-full max-w-4xl">
                <div className="flex justify-end">
                  <button onClick={() => { setViewingAparelhoPhoto(null); setViewingAparelhoPhotoIndex(null); }} className="text-gray-300"><X className="w-6 h-6" /></button>
                </div>
                <img src={viewingAparelhoPhoto} alt="Foto" className="w-full object-contain max-h-[75vh]" />
              </div>
            </div>
          )}

        </motion.div>
      </div>
    );
  }

  if (showDadosGerais) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-slate-900 sm:bg-black/50 sm:backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-slate-900 sm:bg-white/10 sm:backdrop-blur-xl rounded-none sm:rounded-2xl p-4 sm:p-6 border-0 sm:border sm:border-white/20 w-full h-full sm:w-full sm:max-w-4xl sm:max-h-[90vh] flex flex-col"
        >
          <div className="flex items-center justify-between mb-4 shrink-0">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-white">Dados Gerais da Inspeção</h2>
              <p className="text-gray-300 text-sm">{os.numero} — Cadastro das informações gerais da inspeção</p>
            </div>
            <button onClick={() => setShowDadosGerais(false)} className="text-gray-400 hover:text-white transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="bg-white/5 rounded-xl p-4 sm:p-6 mb-4 overflow-y-auto flex-1">
            {loadingDadosGerais ? (
              <p className="text-gray-300">Carregando dados salvos...</p>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-200 mb-2">Abastecimento</label>
                    <select
                      value={dadosGeraisData.abastecimento}
                      onChange={(e) => handleDadosGeraisChange('abastecimento', e.target.value)}
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="" className="text-slate-900">Selecione</option>
                      <option value="GLP" className="text-slate-900">GLP</option>
                      <option value="Gás Natural" className="text-slate-900">Gás Natural</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-200 mb-2">Instalação Interna Material</label>
                    <select
                      value={dadosGeraisData.material_inst_interna}
                      onChange={(e) => handleDadosGeraisChange('material_inst_interna', e.target.value)}
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="" className="text-slate-900">Selecione</option>
                      <option value="Aço" className="text-slate-900">Aço</option>
                      <option value="Cobre" className="text-slate-900">Cobre</option>
                      <option value="PE" className="text-slate-900">PE</option>
                      <option value="PEX" className="text-slate-900">PEX</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-200 mb-2">Instalação Interna Tipo</label>
                    <select
                      value={dadosGeraisData.tipo_inst_interna}
                      onChange={(e) => handleDadosGeraisChange('tipo_inst_interna', e.target.value)}
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="" className="text-slate-900">Selecione</option>
                      <option value="Aparente" className="text-slate-900">Aparente</option>
                      <option value="Embutido" className="text-slate-900">Embutido</option>
                      <option value="Enterrado" className="text-slate-900">Enterrado</option>
                    </select>
                  </div>
                </div>

                <div className="rounded-lg border border-white/10 p-4">
                  <h3 className="text-lg font-semibold text-white mb-4">Dados do Medidor</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-200 mb-2">Número</label>
                      <input
                        value={dadosGeraisData.numero_medidor}
                        onChange={(e) => handleDadosGeraisChange('numero_medidor', e.target.value)}
                        className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-200 mb-2">Tipo</label>
                      <input
                        value={dadosGeraisData.tipo_medidor}
                        onChange={(e) => handleDadosGeraisChange('tipo_medidor', e.target.value)}
                        className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-200 mb-2">Marca</label>
                      <input
                        value={dadosGeraisData.marca_medidor}
                        onChange={(e) => handleDadosGeraisChange('marca_medidor', e.target.value)}
                        className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-200 mb-2">Leitura</label>
                      <input
                        value={dadosGeraisData.leitura_medidor}
                        onChange={(e) => handleDadosGeraisChange('leitura_medidor', e.target.value)}
                        className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-white/10 p-4">
                  <h3 className="text-lg font-semibold text-white mb-4">Teste de Estanqueidade</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-200 mb-2">Pressão Inicial</label>
                      <input
                        value={dadosGeraisData.pi_estanqueidade}
                        onChange={(e) => handleDadosGeraisChange('pi_estanqueidade', e.target.value)}
                        className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-200 mb-2">Pressão Final</label>
                      <input
                        value={dadosGeraisData.pf_estanqueidade}
                        onChange={(e) => handleDadosGeraisChange('pf_estanqueidade', e.target.value)}
                        className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-200 mb-2">Tempo de Teste</label>
                      <input
                        value={dadosGeraisData.tempo_estanqueidade}
                        onChange={(e) => handleDadosGeraisChange('tempo_estanqueidade', e.target.value)}
                        className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-200 mb-2">Diâmetro da Rede</label>
                      <input
                        value={dadosGeraisData.diametro_estanqueidade}
                        onChange={(e) => handleDadosGeraisChange('diametro_estanqueidade', e.target.value)}
                        className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-white/10 p-4">
                  <h3 className="text-lg font-semibold text-white mb-4">Teste pelo Método do Ábaco</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-200 mb-2">Pressão Inicial</label>
                      <input
                        value={dadosGeraisData.pi_abaco}
                        onChange={(e) => handleDadosGeraisChange('pi_abaco', e.target.value)}
                        className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-200 mb-2">Pressão Final</label>
                      <input
                        value={dadosGeraisData.pf_abaco}
                        onChange={(e) => handleDadosGeraisChange('pf_abaco', e.target.value)}
                        className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-200 mb-2">Volume Rede Interna</label>
                      <input
                        value={dadosGeraisData.volume_abaco}
                        onChange={(e) => handleDadosGeraisChange('volume_abaco', e.target.value)}
                        className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-200 mb-2">Resultado (L/H)</label>
                      <input
                        value={dadosGeraisData.resultado_abaco}
                        onChange={(e) => handleDadosGeraisChange('resultado_abaco', e.target.value)}
                        className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-between items-center shrink-0">
            <Button
              onClick={() => setShowDadosGerais(false)}
              variant="outline"
              className="border-white/20 text-white hover:bg-white/10"
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Voltar ao checklist
            </Button>
            <Button
              onClick={handleSaveDadosGerais}
              className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
              disabled={savingDadosGerais}
            >
              <Save className="w-4 h-4 mr-2" />
              {savingDadosGerais ? 'Salvando...' : 'Salvar Dados'}
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-slate-900 sm:bg-black/50 sm:backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-slate-900 sm:bg-white/10 sm:backdrop-blur-xl rounded-none sm:rounded-2xl p-4 sm:p-6 border-0 sm:border sm:border-white/20 w-full h-full sm:w-full sm:max-w-4xl sm:max-h-[90vh] flex flex-col"
      >
        <div className="flex items-center justify-between mb-4 shrink-0">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white">Checklist de Inspeção</h2>
            <p className="text-gray-300 text-sm">
            {os.numero} — Cliente: <strong>{loading ? 'Carregando...' : (clienteNome || 'não encontrado')}</strong></p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Progress */}
        <div className="mb-4 shrink-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-white text-sm">Progresso</span>
            <span className="text-gray-300 text-sm">
              {currentStep + 1} de {checklistItems.length}
            </span>
          </div>
          <div className="w-full bg-white/10 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-green-500 to-emerald-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentStep + 1) / checklistItems.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Category Navigation */}
        <div className="mb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 overflow-x-auto pb-2">
              <div className="flex space-x-2 min-w-max">
                {checklistItems.map((category, index) => {
                  const complete = isCategoryComplete(category);

                  return (
                    <button
                      key={category.id}
                      onClick={() => setCurrentStep(index)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                        complete
                          ? 'bg-green-500/20 text-green-100 border border-green-400/40'
                          : currentStep === index
                            ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white'
                            : 'bg-white/10 text-gray-300 hover:bg-white/20'
                      }`}
                    >
                      {category.category}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                onClick={() => setShowDadosGerais(true)}
                variant="outline"
                size="sm"
                className="border-blue-400/40 bg-blue-500/10 text-blue-200 hover:bg-blue-500/20"
              >
                Dados
              </Button>

              <Button
                onClick={() => setShowAparelhos(true)}
                variant="outline"
                size="sm"
                className="border-cyan-400/40 bg-cyan-500/10 text-cyan-200 hover:bg-cyan-500/20"
              >
                Aparelhos
              </Button>

              <Button
                onClick={applyCurrentCategoryConforme}
                variant="outline"
                size="sm"
                className="border-green-400/40 bg-green-500/10 text-green-200 hover:bg-green-500/20"
              >
                Conforme
              </Button>
            </div>
          </div>
        </div>

        {/* Current Category */}
        <div className="bg-white/5 rounded-xl p-4 sm:p-6 mb-4 overflow-y-auto flex-1">
          <h3 className="text-lg sm:text-xl font-semibold text-white mb-4">
            {currentCategory.titulo ? `  ${currentCategory.titulo}` : ''}
          </h3>

          <div className="space-y-4">
            {currentCategory.items.map((item) => (
              <div key={item.id} className="bg-white/5 rounded-lg p-3 sm:p-4">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-3 gap-3">
                  <div className="flex-1">
                   <div className="flex items-center flex-wrap gap-x-2 mb-2">
                  <span className="text-blue-400 font-medium">{item.id}</span>

                  {item.photoRequired && (
                    <span className="text-orange-400 text-xs font-semibold">
                      {item.required ? "FOTO OBRIGATÓRIA" : "FOTO OPCIONAL"}
                    </span>
                  )}
                </div>
                    <p className="text-white text-sm sm:text-base">{item.criterio_aceitacao}</p>
              </div>

                  {item.photoRequired && (
                    <Button
                      onClick={() => handlePhotoCapture(item.id)}
                      size="sm"
                      variant="outline"
                      className={`shrink-0 border-white/20 text-white hover:bg-white/10 ${
                        photos[item.id] ? 'bg-green-500/20 border-green-500/40' : ''
                      }`}
                    >
                      <Camera className="w-4 h-4 mr-1" />
                      {photos[item.id] ? 'Foto OK' : 'Foto'}
                    </Button>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex flex-wrap gap-x-4 gap-y-2">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name={item.id}
                        value="conforme"
                        checked={checklistData[item.id] === 'conforme'}
                        onChange={(e) => handleItemChange(item.id, e.target.value)}
                        className="w-4 h-4 mr-2"
                      />
                      <span className="text-green-400 text-sm">Conforme</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name={item.id}
                        value="nao_conforme"
                        checked={checklistData[item.id] === 'nao_conforme'}
                        onChange={(e) => handleItemChange(item.id, e.target.value)}
                        className="w-4 h-4 mr-2"
                      />
                      <span className="text-red-400 text-sm">Não Conforme</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name={item.id}
                        value="nao_aplicavel"
                        checked={checklistData[item.id] === 'nao_aplicavel'}
                        onChange={(e) => handleItemChange(item.id, e.target.value)}
                        className="w-4 h-4 mr-2"
                      />
                      <span className="text-gray-400 text-sm">N/A</span>
                    </label>
                  </div>

                  {checklistData[item.id] === 'nao_conforme' && (
                    <textarea
                      //placeholder="Descreva a não conformidade...teste1"
                      
                      value={
                          observations[item.id] ??
                          `${item.ocorrencia}  Descrição:`
                        }

                      onChange={(e) => handleObservationChange(item.id, e.target.value)}
                      className="w-full mt-2 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                      rows={2}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center shrink-0">
          <Button
            onClick={handleSaveDraft}
            variant="outline"
            className="border-white/20 text-white hover:bg-white/10"
          >
            <Save className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Salvar</span>
          </Button>

          <div className="flex items-center space-x-2">
            <Button
              onClick={() => setCurrentStep(currentStep - 1)}
              variant="outline"
              size="icon"
              className="border-white/20 text-white hover:bg-white/10"
              disabled={currentStep === 0}
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>

            {currentStep < checklistItems.length - 1 ? (
              <Button
                onClick={() => setCurrentStep(currentStep + 1)}
                className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
              >
                Próximo <ChevronRight className="w-5 h-5 ml-1" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmitChecklist}
                className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
              >
                <Send className="w-4 h-4 mr-2" />
                Finalizar
              </Button>
            )}
          </div>
        </div>
      </motion.div>

      {showPhotoCapture && (
        <PhotoCapture
          onClose={() => setShowPhotoCapture(false)}
          onSave={handlePhotoSave}
          itemId={currentPhotoItem}
        />
      )}
    </div>
  );
};

export default ChecklistForm;
