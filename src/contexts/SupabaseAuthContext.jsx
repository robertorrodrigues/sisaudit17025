
// SupabaseAuthContext.jsx
import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';

const AuthContext = createContext(undefined);

export const AuthProvider = ({ children }) => {
  const { toast } = useToast();

  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const handleSession = useCallback(async (session) => {
    setSession(session);
    setUser(session?.user ?? null);
    setLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadProfile = async () => {
      if (!user?.id) {
        setProfile(null);
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, role, enabled, xid_empresa')
        .eq('id', user.id)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        console.error('Supabase profile load error:', error);
        setProfile(null);
        return;
      }

      setProfile(data);
    };

    loadProfile();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  useEffect(() => {
    const getSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        console.error('Supabase getSession error:', error);
      }
      handleSession(session);
    };

    getSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Opcional: console.log('Auth event:', event);
      handleSession(session);
    });

    return () => subscription.unsubscribe();
  }, [handleSession]);

  const signUp = useCallback(
    async (email, password, options = {}) => {
      try {
        // Validações de tipos para evitar o "bad_json"
        if (typeof email !== 'string' || typeof password !== 'string') {
          const msg = 'Email e senha devem ser strings.';
          toast({
            variant: 'destructive',
            title: 'Cadastro falhou',
            description: msg,
          });
          return { data: null, error: new Error(msg) };
        }

        // options.data pode conter metadados do usuário (ex.: name)
        const safeOptions = {
          ...options,
          // Garante que data é um objeto
          data: typeof options.data === 'object' && options.data !== null ? options.data : undefined,
          // Se você usa confirmação por e-mail, configure isso (opcional)
          // emailRedirectTo: options.emailRedirectTo ?? 'https://seuapp.com/welcome',
        };

        console.log('Calling supabase.auth.signUp with:', {
          email,
          hasPassword: !!password,
          options: safeOptions,
        });

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: safeOptions,
        });

        if (error) {
          console.error('Supabase SignUp Error:', error);
          toast({
            variant: 'destructive',
            title: 'Cadastro falhou',
            description: error.message || 'Ocorreu um erro inesperado.',
          });
        } else if (data?.user) {
          if (safeOptions.data?.pending_access) {
            await supabase.auth.signOut();
          }
          // Em projetos com confirmação por e-mail ativada:
          // data.user pode estar null e data.session será null.
          // O usuário precisa clicar no link do e-mail.
          toast({
            variant: 'default',
            title: 'Cadastro iniciado',
            description:
              'Se a confirmação por e-mail estiver ativada, verifique sua caixa de entrada para concluir o cadastro.',
          });
        }

        return { data, error };
      } catch (err) {
        console.error('Unexpected signUp error:', err);
        toast({
          variant: 'destructive',
          title: 'Cadastro falhou',
          description: 'Erro inesperado ao cadastrar.',
        });
        return { data: null, error: err };
      }
    },
    [toast]
  );

  const signIn = useCallback(
    async (email, password) => {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          console.error('Supabase SignIn Error:', error);
          toast({
            variant: 'destructive',
            title: 'Login falhou',
            description: 'Erro na validação, verifique suas credenciais.',
          });
          return { data, error };
        }

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('enabled')
          .eq('id', data.user.id)
          .maybeSingle();

        if (profileError) {
          console.error('Supabase profile status lookup error:', profileError);
          await supabase.auth.signOut();
          setUser(null);
          setSession(null);
          toast({
            variant: 'destructive',
            title: 'Login falhou',
            description: 'Não foi possível validar o status do usuário.',
          });
          return { data: null, error: profileError };
        }

        if (profile?.enabled === false) {
          const blockedError = new Error(
            'Seu acesso está inativo, entre em contato com o Help Desk'
          );
          await supabase.auth.signOut();
          setUser(null);
          setSession(null);
          toast({
            variant: 'destructive',
            title: 'Usuário bloqueado',
            description: blockedError.message,
          });
          return { data: null, error: blockedError };
        }

        return { data, error };
      } catch (err) {
        console.error('Unexpected signIn error:', err);
        toast({
          variant: 'destructive',
          title: 'Login falhou',
          description: 'Erro inesperado ao entrar.',
        });
        return { data: null, error: err };
      }
    },
    [toast]
  );

  const signOut = useCallback(async () => {
    if (!session) {
      setUser(null);
      setSession(null);
      return { error: null };
    }

    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        const isSessionMissing =
          error.status === 403 &&
          String(error.message).toLowerCase().includes('session_not_found');

        if (!isSessionMissing) {
          console.error('Supabase SignOut Error:', error);
          toast({
            variant: 'destructive',
            title: 'Deslogar falhou',
            description: error.message || 'Ocorreu um erro inesperado.',
          });
          return { error };
        }
      }

      setUser(null);
      setSession(null);
      return { error: null };
    } catch (err) {
      console.error('Unexpected signOut error:', err);
      toast({
        variant: 'destructive',
        title: 'Deslogar falhou',
        description: 'Erro inesperado ao sair.',
      });
      setUser(null);
      setSession(null);
      return { error: err };
    }
  }, [session, toast]);

  const value = useMemo(
    () => ({
      user,
      session,
      profile,
      loading,
      signUp,
      signIn,
      signOut,
    }),
    [user, session, profile, loading, signUp, signIn, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
