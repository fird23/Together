'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import {
  ArrowRight, CalendarDays, Check, CheckCircle2, Copy,
  Heart, HeartHandshake, Image as ImageIcon, LogOut, Menu, Settings,
  ShieldCheck, Sparkles, UserRound, Users, X,
} from 'lucide-react';
import { isSupabaseConfigured, supabase, createInviteToken, sha256 } from '@/lib/supabase';
import type { Session } from '@supabase/supabase-js';

type Profile = { id: string; email: string; display_name: string; avatar_url: string | null };
type Couple = { id: string; start_date: string; created_at: string };
type Member = { user_id: string; profile: Profile | null };
type View = 'home' | 'profile' | 'settings';

const today = new Date().toISOString().slice(0, 10);

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || '♡';
}

function daysTogether(date: string) {
  const start = new Date(`${date}T00:00:00`);
  const now = new Date();
  const todayLocal = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startLocal = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  return Math.max(0, Math.floor((todayLocal.getTime() - startLocal.getTime()) / 86400000));
}

export default function TogetherApp() {
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [couple, setCouple] = useState<Couple | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'reset'>('login');
  const [view, setView] = useState<View>('home');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState(today);
  const [inviteUrl, setInviteUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const client = supabase;

  const loadWorkspace = useCallback(async (currentSession: Session) => {
    if (!client) return;
    const user = currentSession.user;
    const { data: ownProfile } = await client.from('profiles').select('*').eq('id', user.id).maybeSingle();
    setProfile(ownProfile as Profile | null);
    const { data: memberships, error: membershipError } = await client
      .from('couple_members').select('couple_id').eq('user_id', user.id).limit(1);
    if (membershipError) { setError(membershipError.message); setCouple(null); setMembers([]); return; }
    if (!memberships?.length) { setCouple(null); setMembers([]); return; }
    const coupleId = memberships[0].couple_id as string;
    const [{ data: coupleData }, { data: memberRows }] = await Promise.all([
      client.from('couples').select('*').eq('id', coupleId).maybeSingle(),
      client.from('couple_members').select('user_id').eq('couple_id', coupleId),
    ]);
    setCouple(coupleData as Couple | null);
    const ids = (memberRows ?? []).map((row) => row.user_id as string);
    const { data: profiles } = ids.length
      ? await client.from('profiles').select('*').in('id', ids)
      : { data: [] as Profile[] };
    setMembers(ids.map((id) => ({ user_id: id, profile: (profiles ?? []).find((p) => p.id === id) as Profile | undefined ?? null })));
  }, [client]);

  useEffect(() => {
    setInviteToken(new URLSearchParams(window.location.search).get('invite'));
  }, []);

  useEffect(() => {
    if (!client) { setLoading(false); return; }
    client.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      if (data.session) await loadWorkspace(data.session);
      setLoading(false);
    });
    const { data: listener } = client.auth.onAuthStateChange((event, nextSession) => {
      if (event === 'PASSWORD_RECOVERY') setRecoveryMode(true);
      setSession(nextSession);
      if (nextSession) setTimeout(() => void loadWorkspace(nextSession), 0);
      else { setProfile(null); setCouple(null); setMembers([]); }
    });
    return () => listener.subscription.unsubscribe();
  }, [client, loadWorkspace]);

  useEffect(() => {
    if (!client || !session || !inviteToken || loading) return;
    let cancelled = false;
    (async () => {
      setBusy(true); setError('');
      const tokenHash = await sha256(inviteToken);
      const { error: acceptError } = await client.rpc('accept_invitation', { p_token_hash: tokenHash });
      if (cancelled) return;
      if (acceptError) setError(acceptError.message.includes('already') ? 'Вы уже состоите в паре или приглашение использовано.' : acceptError.message);
      else {
        setNotice('Вы присоединились к паре. Добро пожаловать!');
        window.history.replaceState({}, '', '/');
        await loadWorkspace(session);
      }
      setBusy(false);
    })();
    return () => { cancelled = true; };
  }, [client, session, inviteToken, loading, loadWorkspace]);

  const partner = members.find((member) => member.user_id !== session?.user.id)?.profile;
  const days = useMemo(() => couple ? daysTogether(couple.start_date) : 0, [couple]);

  async function handleAuth(event: FormEvent) {
    event.preventDefault();
    if (!client) return;
    setBusy(true); setError(''); setNotice('');
    try {
      if (authMode === 'register') {
        const { data, error: authError } = await client.auth.signUp({
          email: email.trim(), password,
          options: { data: { display_name: name.trim() }, ...(inviteToken ? { emailRedirectTo: `${window.location.origin}/?invite=${encodeURIComponent(inviteToken)}` } : {}) },
        });
        if (authError) throw authError;
        if (!data.session) setNotice('Проверьте почту и подтвердите адрес. После подтверждения войдите в аккаунт.');
        else setNotice('Аккаунт создан. Добро пожаловать в Together!');
      } else if (authMode === 'reset') {
        const { error: resetError } = await client.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/` });
        if (resetError) throw resetError;
        setNotice('Если аккаунт с таким email существует, инструкция для восстановления отправлена на почту.');
      } else {
        const { error: loginError } = await client.auth.signInWithPassword({ email: email.trim(), password });
        if (loginError) throw loginError;
      }
    } catch (e) { setError(e instanceof Error ? e.message : 'Не удалось выполнить запрос.'); }
    finally { setBusy(false); }
  }

  async function createCouple(event: FormEvent) {
    event.preventDefault();
    if (!client || !session) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const token = createInviteToken();
      const tokenHash = await sha256(token);
      const { error: createError } = await client.rpc('create_couple_with_invitation', {
        p_start_date: startDate, p_token_hash: tokenHash,
      });
      if (createError) throw createError;
      setInviteUrl(`${window.location.origin}/invite/${token}`);
      await loadWorkspace(session);
      setNotice('Пара создана. Теперь отправьте приглашение партнёру.');
    } catch (e) { setError(e instanceof Error ? e.message : 'Не удалось создать пару.'); }
    finally { setBusy(false); }
  }

  async function createAnotherInvite() {
    if (!client || !couple) return;
    setBusy(true); setError('');
    try {
      const token = createInviteToken();
      const tokenHash = await sha256(token);
      const { error: inviteError } = await client.rpc('create_invitation', { p_couple_id: couple.id, p_token_hash: tokenHash });
      if (inviteError) throw inviteError;
      setInviteUrl(`${window.location.origin}/invite/${token}`);
    } catch (e) { setError(e instanceof Error ? e.message : 'Не удалось создать приглашение.'); }
    finally { setBusy(false); }
  }

  async function saveProfile(event: FormEvent) {
    event.preventDefault();
    if (!client || !session) return;
    setBusy(true); setError('');
    const { error: updateError } = await client.from('profiles').update({ display_name: name.trim() }).eq('id', session.user.id);
    if (updateError) setError(updateError.message);
    else { setNotice('Профиль обновлён.'); await loadWorkspace(session); }
    setBusy(false);
  }

  async function saveDate(event: FormEvent) {
    event.preventDefault();
    if (!client || !couple || !session) return;
    setBusy(true); setError('');
    const { error: updateError } = await client.from('couples').update({ start_date: startDate }).eq('id', couple.id);
    if (updateError) setError(updateError.message);
    else { setNotice('Дата начала отношений обновлена.'); await loadWorkspace(session); }
    setBusy(false);
  }

  async function signOut() { if (client) await client.auth.signOut(); setView('home'); setRecoveryMode(false); }

  async function updatePassword(event: FormEvent) {
    event.preventDefault();
    if (!client) return;
    if (newPassword.length < 8) { setError('Пароль должен содержать минимум 8 символов.'); return; }
    if (newPassword !== confirmPassword) { setError('Пароли не совпадают.'); return; }
    setBusy(true); setError('');
    const { error: passwordError } = await client.auth.updateUser({ password: newPassword });
    if (passwordError) setError(passwordError.message);
    else { setNotice('Пароль успешно изменён.'); setRecoveryMode(false); setNewPassword(''); setConfirmPassword(''); }
    setBusy(false);
  }
  async function copyInvite() {
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true); window.setTimeout(() => setCopied(false), 1800);
  }

  if (!isSupabaseConfigured || !client) return <SetupScreen />;
  if (loading) return <div className="loading-screen"><div className="brand-mark"><Heart size={22} fill="currentColor" /></div><span>Загружаем ваше пространство...</span></div>;

  if (session && recoveryMode) return (
    <main className="auth-shell"><div className="auth-card"><Brand/><div className="auth-intro"><span className="eyebrow">БЕЗОПАСНОСТЬ АККАУНТА</span><h1>Новый пароль</h1><p>Придумайте новый пароль для своего аккаунта.</p></div><form className="form-stack" onSubmit={updatePassword}><label>Новый пароль<input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} minLength={8} required/></label><label>Повторите пароль<input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} minLength={8} required/></label>{error && <div className="alert alert-error">{error}</div>}{notice && <div className="alert alert-success">{notice}</div>}<button className="button button-primary button-full" disabled={busy}>{busy ? 'Сохраняем...' : 'Изменить пароль'}</button></form></div></main>
  );

  if (!session) return (
    <main className="auth-shell">
      <div className="auth-decoration decoration-one" /><div className="auth-decoration decoration-two" />
      <div className="auth-card">
        <Brand />
        <div className="auth-intro">
          <span className="eyebrow">ВАШЕ МАЛЕНЬКОЕ МЕСТО ДЛЯ ДВОИХ</span>
          <h1>{authMode === 'register' ? 'Начните вашу историю' : authMode === 'reset' ? 'Восстановление доступа' : 'Хорошо, что вы здесь'}</h1>
          <p>{authMode === 'register' ? 'Создайте аккаунт, чтобы собрать ваше общее пространство.' : authMode === 'reset' ? 'Укажите email, и мы отправим ссылку для восстановления пароля.' : 'Войдите, чтобы продолжить вашу общую историю.'}</p>
        </div>
        <form className="form-stack" onSubmit={handleAuth}>
          {authMode === 'register' && <label>Как вас называть<input value={name} onChange={(e) => setName(e.target.value)} placeholder="Например, Саша" required minLength={2} maxLength={40} /></label>}
          <label>Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" required /></label>
          {authMode !== 'reset' && <label>Пароль<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Минимум 8 символов" autoComplete={authMode === 'register' ? 'new-password' : 'current-password'} minLength={8} required /></label>}
          {error && <div className="alert alert-error">{error}</div>}{notice && <div className="alert alert-success">{notice}</div>}
          <button className="button button-primary button-full" disabled={busy}>{busy ? 'Подождите...' : authMode === 'register' ? 'Создать аккаунт' : authMode === 'reset' ? 'Отправить ссылку' : 'Войти'}<ArrowRight size={17} /></button>
        </form>
        <div className="auth-links">
          {authMode === 'login' && <button onClick={() => { setAuthMode('reset'); setError(''); setNotice(''); }}>Забыли пароль?</button>}
          <p>{authMode === 'register' ? 'Уже есть аккаунт?' : 'Ещё нет аккаунта?'} <button onClick={() => { setAuthMode(authMode === 'register' ? 'login' : 'register'); setError(''); setNotice(''); }}>{authMode === 'register' ? 'Войти' : 'Создать аккаунт'}</button></p>
          {authMode === 'reset' && <button onClick={() => setAuthMode('login')}>Вернуться ко входу</button>}
        </div>
        <p className="privacy-note"><ShieldCheck size={14} /> Ваше пространство доступно только вам и вашему партнёру</p>
      </div>
      <footer className="auth-footer">Сделано с заботой о важных моментах <Heart size={12} fill="currentColor" /></footer>
    </main>
  );

  if (!couple) return (
    <main className="onboarding-shell">
      <header className="topbar"><Brand /><button className="icon-button" onClick={signOut} aria-label="Выйти"><LogOut size={18} /></button></header>
      <section className="onboarding-card">
        <div className="onboarding-icon"><HeartHandshake size={30} /></div>
        <span className="eyebrow">СЛЕДУЮЩИЙ ШАГ</span>
        <h1>Создадим ваше общее пространство?</h1>
        <p className="muted">Вы можете создать пару и пригласить партнёра или присоединиться по ссылке, которую он вам отправил.</p>
        {inviteToken ? <div className="alert alert-info">Приглашение найдено. После входа мы попробуем подключить вас к паре.</div> : null}
        <form className="form-stack onboarding-form" onSubmit={createCouple}>
          <label>Дата начала отношений<input type="date" value={startDate} max={today} onChange={(e) => setStartDate(e.target.value)} required /></label>
          {error && <div className="alert alert-error">{error}</div>}{notice && <div className="alert alert-success">{notice}</div>}
          <button className="button button-primary button-full" disabled={busy || Boolean(inviteToken)}>{busy ? 'Создаём...' : 'Создать пару'}<Heart size={17} /></button>
        </form>
        {inviteUrl && <div className="invite-box"><div><strong>Приглашение готово</strong><span>Отправьте эту ссылку партнёру</span></div><div className="copy-row"><input readOnly value={inviteUrl} /><button className="button button-secondary" onClick={copyInvite}>{copied ? <Check size={16} /> : <Copy size={16} />}{copied ? 'Скопировано' : 'Копировать'}</button></div></div>}
        <div className="onboarding-separator"><span>ИЛИ</span></div>
        <p className="join-hint">Чтобы присоединиться к существующей паре, откройте пригласительную ссылку от партнёра в этом браузере после входа в аккаунт.</p>
      </section>
    </main>
  );

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileMenu ? 'sidebar-open' : ''}`}>
        <div className="sidebar-top"><Brand /><button className="icon-button mobile-close" onClick={() => setMobileMenu(false)}><X size={19}/></button></div>
        <div className="sidebar-couple"><div className="mini-avatars"><Avatar name={profile?.display_name ?? 'Вы'} /><span className="avatar-join">+</span><Avatar name={partner?.display_name ?? 'Партнёр'} /></div><div><strong>{profile?.display_name ?? 'Ваша пара'} & {partner?.display_name ?? 'партнёр'}</strong><span>Ваше общее пространство</span></div></div>
        <nav className="side-nav">
          <span className="nav-label">ПРОСТРАНСТВО</span>
          <button className={`nav-item ${view === 'home' ? 'active' : ''}`} onClick={() => { setView('home'); setMobileMenu(false); }}><Heart size={18}/> Главная</button>
          <button className={`nav-item ${view === 'profile' ? 'active' : ''}`} onClick={() => { setView('profile'); setName(profile?.display_name ?? ''); setMobileMenu(false); }}><UserRound size={18}/> Мой профиль</button>
          <button className={`nav-item ${view === 'settings' ? 'active' : ''}`} onClick={() => { setView('settings'); setStartDate(couple.start_date); setMobileMenu(false); }}><Settings size={18}/> Настройки</button>
        </nav>
        <div className="sidebar-bottom"><div className="security-tip"><ShieldCheck size={17}/><p>Это пространство приватное. Его видите только вы вдвоём.</p></div><button className="account-row" onClick={signOut}><Avatar name={profile?.display_name ?? 'Вы'} small/><span><strong>{profile?.display_name ?? 'Мой профиль'}</strong><small>Выйти из аккаунта</small></span><LogOut size={17}/></button></div>
      </aside>
      {mobileMenu && <button className="mobile-scrim" aria-label="Закрыть меню" onClick={() => setMobileMenu(false)} />}
      <main className="main-content">
        <header className="main-header"><button className="icon-button mobile-menu-button" onClick={() => setMobileMenu(true)}><Menu size={20}/></button><div><span className="eyebrow">ВАШЕ ОБЩЕЕ ПРОСТРАНСТВО</span><h2>{view === 'home' ? 'Главная' : view === 'profile' ? 'Мой профиль' : 'Настройки'}</h2></div><div className="header-user"><span>{profile?.display_name ?? 'Вы'}</span><Avatar name={profile?.display_name ?? 'Вы'} small/></div></header>
        {(error || notice) && <div className={`global-message ${error ? 'alert-error' : 'alert-success'}`}>{error || notice}<button onClick={() => { setError(''); setNotice(''); }}><X size={15}/></button></div>}
        {view === 'home' && <>
          <section className="welcome-row"><div><span className="eyebrow">СЧАСТЬЕ — В МЕЛОЧАХ</span><h1>Ваша история продолжается<span>.</span></h1><p>Маленькое пространство для всего, что важно вам двоим.</p></div><div className="today-pill"><span className="pulse-dot"/> Вместе сегодня</div></section>
          <section className="hero-card"><div className="hero-glow"/><div className="hero-content"><div className="couple-avatars"><Avatar name={profile?.display_name ?? 'Вы'} large/><div className="heart-between"><Heart size={19} fill="currentColor"/></div><Avatar name={partner?.display_name ?? 'Партнёр'} large/></div><span className="hero-caption">КАЖДЫЙ ДЕНЬ — ЧАСТЬ ВАШЕЙ ИСТОРИИ</span><div className="day-count">{days.toLocaleString('ru-RU')}</div><div className="day-label">дней вместе</div><div className="hero-date"><CalendarDays size={15}/> С {new Date(`${couple.start_date}T00:00:00`).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}</div></div><div className="hero-decoration decoration-heart"><Heart size={94}/></div><div className="hero-decoration decoration-sparkle"><Sparkles size={30}/></div></section>
          <div className="section-heading"><div><span className="eyebrow">ВАШ МАЛЕНЬКИЙ МИР</span><h2>Всё начинается с вас</h2></div></div>
          <section className="feature-grid"><article className="feature-card couple-card"><div className="feature-icon pink"><Users size={20}/></div><span className="feature-overline">ВАША ПАРА</span><h3>{profile?.display_name ?? 'Вы'} и {partner?.display_name ?? 'партнёр'}</h3><p>{members.length === 2 ? 'Два аккаунта. Одно общее пространство.' : 'Пригласите партнёра, чтобы завершить создание пары.'}</p><div className="member-list">{members.map((m) => <div className="member-chip" key={m.user_id}><Avatar name={m.profile?.display_name ?? 'Участник'} small/><span>{m.profile?.display_name ?? 'Участник'}</span><CheckCircle2 size={14}/></div>)}</div>{members.length < 2 && <button className="text-button" onClick={createAnotherInvite} disabled={busy}>Создать приглашение <ArrowRight size={15}/></button>}{inviteUrl && <div className="invite-box dashboard-invite"><div><strong>Ссылка для партнёра</strong><span>Приглашение действует 7 дней</span></div><div className="copy-row"><input readOnly value={inviteUrl}/><button className="button button-secondary" onClick={copyInvite}>{copied ? <Check size={16}/> : <Copy size={16}/>} {copied ? 'Скопировано' : 'Копировать'}</button></div></div>}</article><article className="feature-card date-card"><div className="feature-icon peach"><CalendarDays size={20}/></div><span className="feature-overline">ВАЖНАЯ ДАТА</span><h3>{new Date(`${couple.start_date}T00:00:00`).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}</h3><p>День, с которого началась ваша история.</p><button className="text-button" onClick={() => { setStartDate(couple.start_date); setView('settings'); }}>Изменить дату <ArrowRight size={15}/></button></article></section>
          <section className="coming-soon"><div className="coming-icon"><ImageIcon size={19}/></div><div><strong>Здесь будут ваши воспоминания</strong><p>Скоро вы сможете сохранять особенные моменты, фотографии и важные даты.</p></div><span className="coming-badge">СКОРО</span></section>
        </>}
        {view === 'profile' && <section className="settings-layout"><div className="settings-intro"><div className="profile-big"><Avatar name={profile?.display_name ?? 'Вы'} large/></div><h1>Ваш профиль</h1><p>Информация, которую видит ваш партнёр.</p></div><form className="panel form-stack" onSubmit={saveProfile}><h3>Личная информация</h3><label>Имя или никнейм<input value={name} onChange={(e) => setName(e.target.value)} minLength={2} maxLength={40} required/></label><label>Email<input value={session.user.email ?? ''} disabled/><small className="field-hint">Email нельзя изменить здесь.</small></label><button className="button button-primary" disabled={busy}>{busy ? 'Сохраняем...' : 'Сохранить изменения'}</button></form></section>}
        {view === 'settings' && <section className="settings-layout"><div className="settings-intro"><div className="settings-icon"><Settings size={25}/></div><h1>Настройки</h1><p>Управляйте вашим общим пространством.</p></div><form className="panel form-stack" onSubmit={saveDate}><h3>Дата начала отношений</h3><p className="panel-description">Эта дата используется для расчёта количества дней вместе.</p><label>Дата<input type="date" value={startDate} max={today} onChange={(e) => setStartDate(e.target.value)} required/></label><button className="button button-primary" disabled={busy}>{busy ? 'Сохраняем...' : 'Сохранить дату'}</button></form><div className="panel danger-panel"><div><h3>Выйти из аккаунта</h3><p>Вы сможете войти снова в любое время.</p></div><button className="button button-secondary" onClick={signOut}><LogOut size={16}/> Выйти</button></div></section>}
        <footer className="main-footer"><span>TOGETHER <Heart size={11} fill="currentColor"/> ДЛЯ ДВОИХ</span><span>Ваши моменты принадлежат вам.</span></footer>
      </main>
    </div>
  );
}

function Brand() { return <a className="brand" href="/"><span className="brand-mark"><Heart size={19} fill="currentColor"/></span><span>together<span className="brand-dot">.</span></span></a>; }
function Avatar({ name, small = false, large = false }: { name: string; small?: boolean; large?: boolean }) { return <div className={`avatar ${small ? 'avatar-small' : ''} ${large ? 'avatar-large' : ''}`} aria-label={name}>{initials(name)}</div>; }
function SetupScreen() { return <main className="setup-shell"><div className="setup-card"><Brand/><div className="setup-icon"><Settings size={25}/></div><h1>Остался один шаг</h1><p>Подключи Supabase, чтобы включить регистрацию, профили и создание пар.</p><ol><li>Создай проект на <a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer">supabase.com</a>.</li><li>В настройках проекта открой <b>Project Settings → API</b>.</li><li>Скопируй Project URL и anon / publishable key в файл <code>.env.local</code>.</li><li>Выполни SQL из файла <code>supabase/schema.sql</code> в SQL Editor.</li><li>Перезапусти сервер командой <code>npm run dev</code>.</li></ol><div className="env-example">NEXT_PUBLIC_SUPABASE_URL=...<br/>NEXT_PUBLIC_SUPABASE_ANON_KEY=...</div></div></main>; }
