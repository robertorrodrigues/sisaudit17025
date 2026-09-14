import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/customSupabaseClient';  
import { useSettings } from '@/contexts/SettingsContext';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { PlusCircle, Edit, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const DEFAULT_COMPANY_ID = 1;



const UserForm = ({ user, onSave, onCancel }) => {
  const [formData, setFormData] = useState(
    user || { name: '', email: '', password: '', role: 'administrador', xid_empresa: DEFAULT_COMPANY_ID }
  );

  useEffect(() => {
    setFormData(
      user || { name: '', email: '', password: '', role: 'administrador', xid_empresa: DEFAULT_COMPANY_ID }
    );
  }, [user]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const val = type === 'checkbox' ? checked : value;
    setFormData(prev => ({ ...prev, [name]: val }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="Nome" required className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500" />
      <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="Email" required className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500" />
      {!user && (
        <input type="password" name="password" value={formData.password} onChange={handleChange} placeholder="Senha" minLength={6} required className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500" />
      )}
      <select name="role" value={formData.role} onChange={handleChange} className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
        <option value="administrador">Administrador</option>
        <option value="tecnico">Técnico</option>
        <option value="atendente">Atendente</option>
      </select>

      <label className="flex items-center gap-2">
        <input type="checkbox" name="enabled" checked={!!formData.enabled} onChange={handleChange} className="w-4 h-4" />
        <span className="text-sm text-gray-300">Ativo</span>
      </label>

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          name="validation"
          checked={!!(formData.validation ?? formData.validador)}
          onChange={handleChange}
          className="w-4 h-4"
        />
        <span className="text-sm text-gray-300">Validador</span>
      </label>

      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="outline">Cancelar</Button>
        </DialogClose>
        <Button type="submit">Salvar</Button>
      </DialogFooter>
    </form>
  );
};

const UserSettings = ({ openNewUserModal = false }) => {
  const { settings, updateSettings } = useSettings();
  const { user, signUp } = useAuth();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  const [dbUsers, setDbUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  const resolveCompanyId = async () => {
    const fromUser = user?.user_metadata?.xid_empresa ?? user?.xid_empresa ?? null;

    if (fromUser) {
      return fromUser;
    }

    if (!user?.id) {
      return null;
    }

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

  const fetchProfiles = async () => {
    setLoading(true);

    const resolvedCompanyId = await resolveCompanyId();

    let query = supabase
      .from('profiles')
      .select('id, name, email, role, enabled, validador, xid_empresa')
      .order('name', { ascending: true });

    if (resolvedCompanyId) {
      query = query.eq('xid_empresa', resolvedCompanyId);
    }

    const { data, error } = await query;

    if (error) {
      toast({ title: 'Erro ao buscar usuários', description: error.message, variant: 'destructive' });
      setDbUsers([]);
    } else {
      console.log('Fetched profiles:', data);
      setDbUsers(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProfiles();

    // opcional: escuta mudanças em profiles e refaz fetch
    const channel = supabase
      .channel('public:profiles')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        () => { fetchProfiles(); }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (openNewUserModal) {
      setEditingUser(null);
      setIsDialogOpen(true);
    }
  }, [openNewUserModal]);

  const handleSaveUser = async (user) => {
  setLoading(true);

  try {
    if (user.id) {
      // atualizar usuário existente
      const profileUpdate = {
        name: user.name,
        email: user.email,
        role: user.role,
        enabled: user.enabled ?? true,
        validador: user.validador ?? user.validation ?? false,
      };

      const updateQuery = supabase
        .from('profiles')
        .update(profileUpdate)
        .eq('id', user.id);

      // A RLS policy validates that the selected profile belongs to the current
      // user's company. Avoid filtering by xid_empresa here because legacy
      // profiles may contain a stale or null company value.
      const { error } = await updateQuery;

      if (error) {
        toast({ title: 'Erro ao atualizar', description: error.message, variant: 'destructive' });
      } else {
        const { data: updatedUsers, error: verifyError } = await supabase
          .from('profiles')
          .select('id, name, email, role, enabled, validador')
          .eq('id', user.id);

        if (verifyError) {
          toast({ title: 'Erro ao verificar atualização', description: verifyError.message, variant: 'destructive' });
        } else if (
          !updatedUsers?.length ||
          Object.entries(profileUpdate).some(([field, value]) => updatedUsers[0][field] !== value)
        ) {
          toast({
            title: 'Usuário não atualizado',
            description: 'A política de acesso do banco impediu a alteração deste usuário.',
            variant: 'destructive',
          });
        } else {
          toast({ title: 'Usuário atualizado' });
          setIsDialogOpen(false);
          setEditingUser(null);
          await fetchProfiles();
        }
      }
    } else {
      // Cria a identidade primeiro; a RLS de profiles exige um usuário autenticado.
      const resolvedCompanyId = user.xid_empresa ?? DEFAULT_COMPANY_ID;
      if (!resolvedCompanyId) {
        throw new Error('Não foi possível identificar a empresa do usuário logado.');
      }

      const { data: currentSessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        throw sessionError;
      }

      const { error } = await signUp(user.email, user.password, {
        data: {
          name: user.name,
          role: user.role,
          enabled: user.enabled ?? true,
          validador: user.validador ?? user.validation ?? false,
          xid_empresa: resolvedCompanyId,
        },
      });

      // signUp may switch the client session to the newly created account.
      // Restore the administrator session so the settings screen remains usable.
      if (currentSessionData.session) {
        const { error: restoreError } = await supabase.auth.setSession(currentSessionData.session);
        if (restoreError) {
          throw restoreError;
        }
      }

      if (error) {
        toast({ title: 'Erro ao criar usuário', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Usuário criado', description: user.email });
        setIsDialogOpen(false);
        setEditingUser(null);
        await fetchProfiles();
      }
    }
  } catch (err) {
    toast({ title: 'Erro', description: err.message || String(err), variant: 'destructive' });
  } finally {
    setLoading(false);
  }
};

  const handleDeleteUser = async (userId) => {
    const resolvedCompanyId = await resolveCompanyId();

    let query = supabase.from('profiles').delete().eq('id', userId);

    if (resolvedCompanyId) {
      query = query.eq('xid_empresa', resolvedCompanyId);
    }

    const { error } = await query;
    if (error) {
      toast({ title: 'Erro ao deletar', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Usuário removido' });
      fetchProfiles();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-white">Gerenciamento de Usuários</h3>
          <p className="text-sm text-gray-400">Adicione, remova e edite permissões de usuários.</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingUser(null)} className="bg-gradient-to-r from-green-500 to-green-600">
              <PlusCircle className="w-4 h-4 mr-2" />
              Novo Usuário
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-slate-900 border-slate-800 text-white">
            <DialogHeader>
              <DialogTitle>{editingUser ? 'Editar Usuário' : 'Novo Usuário'}</DialogTitle>
            </DialogHeader>
            <UserForm user={editingUser} onSave={handleSaveUser} onCancel={() => setIsDialogOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-white/5 rounded-xl border border-white/10">
        <ul className="divide-y divide-white/10">


          {loading && (
            <li className="p-4 text-gray-300">Carregando usuários...</li>
          )}
          {!loading && dbUsers.length === 0 && (
            <li className="p-4 text-gray-400">Nenhum usuário encontrado.</li>
          )}
          {!loading && dbUsers.map(user => (
             <li key={user.id} className="p-4 flex items-center justify-between">
               <div>
                <p className="font-medium text-white">{user.name || <span className="text-gray-400">—</span>}</p>
                <p className="text-sm text-gray-400">{user.email} - <span className="capitalize">{user.role || '—'}</span> {user.enabled === false ? <span className="text-red-400 ml-2">(desativado)</span> : ''}</p>
               </div>
               <div className="flex items-center gap-2">
                 <Button variant="ghost" size="icon" onClick={() => { setEditingUser(user); setIsDialogOpen(true); }}>
                   <Edit className="w-4 h-4 text-blue-400" />
                 </Button>
                 <AlertDialog>
                   <AlertDialogTrigger asChild>
                     <Button variant="ghost" size="icon"><Trash2 className="w-4 h-4 text-red-400" /></Button>
                   </AlertDialogTrigger>
                   <AlertDialogContent className="bg-slate-900 border-slate-800 text-white">
                     <AlertDialogHeader>
                       <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                       <AlertDialogDescription>
                         Essa ação não pode ser desfeita. Isso irá remover permanentemente o usuário.
                       </AlertDialogDescription>
                     </AlertDialogHeader>
                     <AlertDialogFooter>
                       <AlertDialogCancel>Cancelar</AlertDialogCancel>
                       <AlertDialogAction onClick={() => handleDeleteUser(user.id)} className="bg-red-600 hover:bg-red-700">Deletar</AlertDialogAction>
                     </AlertDialogFooter>
                   </AlertDialogContent>
                 </AlertDialog>
               </div>
             </li>
         ))}
        </ul>
      </div>
    </div>
  );
};

export default UserSettings;