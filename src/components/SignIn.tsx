import { useState, type FormEvent } from 'react';
import { BookOpen, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export function Brand() {
  return <a className="brand" href="/dashboard"><span className="brand-icon"><BookOpen size={20} strokeWidth={2.4}/><span/></span><span>edvora<span className="brand-period">.</span></span></a>;
}

export function SignIn() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    const result = mode === 'signin'
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName }, emailRedirectTo: new URL('/auth/callback', window.location.origin).href } });
    setBusy(false);
    if (result.error) setError(result.error.message);
    else if (mode === 'signup' && !result.data.session) setMessage('Check your inbox to confirm your email and finish creating your account.');
  };

  return <main className="auth-wrap"><div className="auth-card"><Brand/><div className="auth-copy"><span className="eyebrow">YOUR STUDY SPACE</span><h1>A little progress,<br/><em>every day.</em></h1><p>Sign in to pick up exactly where you left off. Your notes, goals and progress stay yours.</p></div><form className="auth-form" onSubmit={submit}>{mode==='signup'&&<label>Your name<input autoComplete="name" value={fullName} onChange={event=>setFullName(event.target.value)} placeholder="e.g. Ishan Sharma" required/></label>}<label>Email address<input type="email" autoComplete="email" value={email} onChange={event=>setEmail(event.target.value)} placeholder="you@example.com" required/></label><label>Password<input type="password" autoComplete={mode==='signin'?'current-password':'new-password'} value={password} onChange={event=>setPassword(event.target.value)} placeholder="At least 6 characters" minLength={6} required/></label>{error&&<p className="auth-error" role="alert">{error}</p>}{message&&<p className="auth-message" role="status">{message}</p>}<button className="auth-submit" disabled={busy}>{busy?'One moment…':mode==='signin'?'Sign in to EDVORA':'Create your account'}<span>→</span></button></form><button className="auth-mode" onClick={()=>{setMode(mode==='signin'?'signup':'signin');setError('');setMessage('')}}>{mode==='signin'?<>New to EDVORA? <b>Create an account</b></>:<>Already have an account? <b>Sign in</b></>}</button><div className="auth-privacy"><span className="privacy-dot"/> A private, secure space built for your learning journey</div></div><div className="auth-art"><div className="art-orbit orbit-a"/><div className="art-orbit orbit-b"/><div className="art-glow"/><div className="art-book"><div className="book-page left-page"><span>✦</span><i/><i/><i/><b>learn at<br/>your pace</b></div><div className="book-page right-page"><div className="book-sun">✳</div><i/><i/><i/><span>EDVORA</span></div></div><div className="art-sticker sticker-one"><Sparkles size={15}/> A fresh start</div><div className="art-sticker sticker-two"><span className="streak-mark">✦</span> You’ve got this</div><div className="art-caption"><span>01 — ONE STEP AT A TIME</span><h2>Your effort<br/>adds up.</h2></div></div></main>;
}
