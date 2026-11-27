import { useState, type FormEvent } from 'react';
import { ArrowRight, BookOpen, Check, Eye, EyeOff, LockKeyhole, Sparkles } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';
import './signin.css';

export function Brand() {
  return <a className="brand" href="/dashboard"><span className="brand-icon"><BookOpen size={20} strokeWidth={2.4}/><span/></span><span>edvora<span className="brand-period">.</span></span></a>;
}

export function SignIn() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [grade, setGrade] = useState<'10' | '11'>('10');
  const [reminderOptIn, setReminderOptIn] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const permission = mode === 'signup' && reminderOptIn && 'Notification' in window ? await Notification.requestPermission() : 'default';
      const result = mode === 'signin'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName, grade: Number(grade) }, emailRedirectTo: Capacitor.isNativePlatform() ? 'edvora://auth/callback' : new URL('/auth/callback', window.location.origin).href } });
      if (result.error) setError(result.error.message);
      else {
        if (permission === 'granted') localStorage.setItem('edvora-reminders-pending', 'true');
        if (mode === 'signup' && !result.data.session) setMessage('A welcome note is on its way. Check your inbox to confirm your email and join EDVORA.');
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to connect right now. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return <main className="auth-wrap auth-redesigned">
    <section className="auth-panel">
      <div className="auth-panel-inner">
        <div className="auth-topline"><Brand/><span className="auth-secure"><LockKeyhole size={13}/> YOUR SPACE, YOUR PACE</span></div>
        <div className="auth-heading"><span className="auth-overline"><Sparkles size={13}/> A PLACE TO GROW</span><h1>{mode === 'signin' ? <>Your next chapter<br/><em>starts here.</em></> : <>Make room for<br/><em>what’s possible.</em></>}</h1><p>{mode === 'signin' ? 'Come back to your goals, your notes and the progress that’s uniquely yours.' : 'Build a study rhythm that feels like you. Your journey starts with one small step.'}</p></div>
        <form className="auth-form auth-form-polished" onSubmit={submit}>
          {mode === 'signup' && <>
            <label>Your name<input autoComplete="name" value={fullName} onChange={event => setFullName(event.target.value)} placeholder="What should we call you?" required/></label>
            <label>Your class<select value={grade} onChange={event => setGrade(event.target.value as '10' | '11')}><option value="10">Class 10 · CBSE</option><option value="11">Class 11 · Science</option></select></label>
            <label className="signup-reminder"><input type="checkbox" checked={reminderOptIn} onChange={event => setReminderOptIn(event.target.checked)}/> Send gentle study reminders to this device</label>
          </>}
          <label>Email address<input type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="you@example.com" required/></label>
          <label>Password<span className="auth-password-wrap"><input type={showPassword ? 'text' : 'password'} autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} value={password} onChange={event => setPassword(event.target.value)} placeholder="At least 6 characters" minLength={6} required/><button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={17}/> : <Eye size={17}/>}</button></span></label>
          {error && <p className="auth-error" role="alert">{error}</p>}{message && <p className="auth-message" role="status">{message}</p>}
          <button className="auth-submit auth-submit-polished" disabled={busy}>{busy ? 'One moment…' : mode === 'signin' ? 'Sign in to EDVORA' : 'Create your account'}<ArrowRight size={17}/></button>
        </form>
        <button className="auth-mode auth-mode-polished" onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(''); setMessage(''); }}>{mode === 'signin' ? <>New to EDVORA? <b>Create an account</b></> : <>Already have an account? <b>Sign in</b></>}</button>
        <div className="auth-trust"><span><Check size={12}/></span> A private, supportive space built for your learning journey</div>
        <footer className="auth-panel-footer"><span>© 2026 EDVORA</span><span>Education, Evolved.</span></footer>
      </div>
    </section>
    <aside className="auth-art auth-art-polished" aria-label="An illustrated open book surrounded by ideas">
      <div className="auth-art-top"><span>EDVORA · YOUR STUDY COMPANION</span><span className="auth-art-mark"><Sparkles size={14}/> MADE FOR YOU</span></div>
      <div className="art-orbit orbit-a"/><div className="art-orbit orbit-b"/><div className="art-glow"/>
      <div className="auth-art-quote"><span className="auth-art-quote-mark">“</span><p>Every page you turn<br/>is a possibility <em>opening.</em></p><span className="auth-art-rule"/></div>
      <div className="art-book"><div className="book-page left-page"><span>✦</span><i/><i/><i/><b>learn at<br/>your pace</b></div><div className="book-page right-page"><div className="book-sun">✳</div><i/><i/><i/><span>EDVORA</span></div></div>
      <div className="art-sticker sticker-one"><Sparkles size={15}/> A fresh start</div><div className="art-sticker sticker-two"><span className="streak-mark">✦</span> You’ve got this</div>
      <div className="auth-art-bottom"><span>01 — ONE STEP AT A TIME</span><span>YOUR JOURNEY MATTERS <i/></span></div>
    </aside>
  </main>;
}
