import { supabase } from '../lib/supabase';
import type { UserProfile } from '../types';

const ADMIN_EMPLOYEE_ID = '4020895';

function resolveRole(email: string, dbRole: string): 'consultant' | 'admin' {
  const employeeId = email.replace('@salesfit.local', '');
  return employeeId === ADMIN_EMPLOYEE_ID ? 'admin' : 'consultant';
}

async function signIn(email: string, password: string): Promise<UserProfile> {
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (authError || !authData.user) {
    throw new Error('이메일 또는 비밀번호가 올바르지 않습니다.');
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, email, name, role, created_at')
    .eq('id', authData.user.id)
    .single();

  if (profileError || !profile) {
    throw new Error('이메일 또는 비밀번호가 올바르지 않습니다.');
  }

  return {
    id: profile.id as string,
    email: profile.email as string,
    name: profile.name as string,
    role: resolveRole(profile.email as string, profile.role as string),
    createdAt: profile.created_at as string,
  };
}

async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw new Error(error.message);
  }
}

async function getCurrentUser(): Promise<UserProfile | null> {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session?.user) {
    return null;
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, email, name, role, created_at')
    .eq('id', sessionData.session.user.id)
    .single();

  if (error || !profile) {
    return null;
  }

  return {
    id: profile.id as string,
    email: profile.email as string,
    name: profile.name as string,
    role: resolveRole(profile.email as string, profile.role as string),
    createdAt: profile.created_at as string,
  };
}

export const authService = { signIn, signOut, getCurrentUser };
