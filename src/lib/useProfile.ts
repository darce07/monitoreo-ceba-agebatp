import { useEffect, useRef, useState } from 'react';
import { supabase, type Profile } from './supabase';
import type { Session } from '@supabase/supabase-js';

export function useProfile() {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const loadedForUserId = useRef<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) {
      loadedForUserId.current = null;
      setProfile(null);
      setLoading(false);
      return;
    }

    // supabase-js revalida el token cada vez que la pestaña recupera el
    // foco, disparando onAuthStateChange con un objeto session nuevo
    // aunque sea el mismo usuario. Si ya tenemos el perfil de ese mismo
    // usuario cargado, no hace falta volver a mostrar la pantalla de
    // carga completa (se sentía como un F5 y perdía el estado actual).
    if (loadedForUserId.current === session.user.id) return;

    setLoading(true);
    supabase
      .from('profiles')
      .select('id, role, ceba_id, nombre')
      .eq('id', session.user.id)
      .single()
      .then(({ data }) => {
        loadedForUserId.current = session.user.id;
        setProfile(data as Profile | null);
        setLoading(false);
      });
  }, [session]);

  return { session, profile, loading };
}
