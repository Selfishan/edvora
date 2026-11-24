import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Check, Copy, Crown, LogOut, RefreshCw, Shield, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import './friends.css';

type Circle = { id: string; name: string; invite_code: string; joined_at?: string };
type Rank = { username: string; total_minutes: number; rank: number };
type Account = { unique_username: string | null; friend_circle_consent: boolean };
const formatHours = (minutes: number) => `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, '0')}m`;

export default function FriendsPage({ userId }: { userId: string }) {
  const [account, setAccount] = useState<Account>({ unique_username: null, friend_circle_consent: false });
  const [username, setUsername] = useState('');
  const [circles, setCircles] = useState<Circle[]>([]);
  const [activeCircle, setActiveCircle] = useState('');
  const [leaderboard, setLeaderboard] = useState<Rank[]>([]);
  const [circleName, setCircleName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    const [{ data: profile }, { data: groups }] = await Promise.all([
      supabase.from('profiles').select('unique_username,friend_circle_consent').eq('id', userId).maybeSingle(),
      supabase.rpc('my_study_circles'),
    ]);
    if (profile) { const row = profile as Account; setAccount(row); setUsername(row.unique_username ?? ''); }
    const next = (groups ?? []) as Circle[];
    setCircles(next);
    setActiveCircle(current => next.some(item => item.id === current) ? current : next[0]?.id ?? '');
    setLoading(false);
  }, [userId]);
  useEffect(() => { void refresh(); const timer = window.setInterval(() => void refresh(), 15000); return () => window.clearInterval(timer); }, [refresh]);
  useEffect(() => {
    if (!activeCircle || !account.friend_circle_consent) { setLeaderboard([]); return; }
    let alive = true;
    const load = async () => { const { data } = await supabase.rpc('circle_leaderboard', { p_circle_id: activeCircle }); if (alive) setLeaderboard((data ?? []) as Rank[]); };
    void load(); const timer = window.setInterval(() => void load(), 10000); return () => { alive = false; window.clearInterval(timer); };
  }, [activeCircle, account.friend_circle_consent]);
  const saveAccount = async () => {
    const handle = username.trim();
    if (account.friend_circle_consent && !/^[A-Za-z0-9_]{3,20}$/.test(handle)) { setMessage('A username must be 3–20 letters, numbers, or underscores.'); return; }
    const { error } = await supabase.from('profiles').update({ unique_username: handle || null, friend_circle_consent: account.friend_circle_consent }).eq('id', userId);
    if (error) { setMessage(error.message.includes('profiles_unique_username_key') ? 'That username is already taken.' : error.message); return; }
    setAccount({ unique_username: handle || null, friend_circle_consent: account.friend_circle_consent }); setMessage('Your circle profile is saved.'); await refresh();
  };
  const create = async (event: FormEvent) => { event.preventDefault(); setMessage(''); const { data, error } = await supabase.rpc('create_study_circle', { p_name: circleName.trim() }); if (error) { setMessage(error.message); return; } const created = (data?.[0] ?? data) as Circle; if (created?.id) { setCircles(old => [created, ...old.filter(item => item.id !== created.id)]); setActiveCircle(created.id); setCircleName(''); setMessage(`Circle created. Share code ${created.invite_code} with your friends.`); } };
  const join = async (event: React.FormEvent) => { event.preventDefault(); setMessage(''); const { data, error } = await supabase.rpc('join_study_circle', { p_code: joinCode.trim() }); if (error) { setMessage(error.message); return; } const joined = (data?.[0] ?? data) as Circle; if (joined?.id) { setCircles(old => [joined, ...old.filter(item => item.id !== joined.id)]); setActiveCircle(joined.id); setJoinCode(''); setMessage(`You joined ${joined.name}.`); } };
  const leave = async () => { if (!activeCircle) return; const { error } = await supabase.rpc('leave_study_circle', { p_circle_id: activeCircle }); if (error) { setMessage(error.message); return; } setCircles(old => old.filter(item => item.id !== activeCircle)); setActiveCircle(''); setMessage('You left the circle.'); };
  const copyCode = async () => { const circle = circles.find(item => item.id === activeCircle); if (!circle) return; await navigator.clipboard.writeText(circle.invite_code); setMessage('Invite code copied.'); };
  const self = leaderboard.find(row => row.username === account.unique_username);
  return <main className="friends-page"><header className="friends-heading"><span className="friends-eyebrow"><Users size={14}/> STUDY TOGETHER, BY CHOICE</span><h1>A little company<br/><em>goes a long way.</em></h1><p>Create or join a private circle. Only your username, total study hours, and rank are shared with circle members.</p></header>
    <section className="friends-consent"><div className="consent-icon"><Shield size={18}/></div><div className="consent-copy"><b>Your circle identity</b><span>Nothing is shared until you choose a username and opt in.</span></div><label className="friends-handle"><span>UNIQUE USERNAME</span><input value={username} maxLength={20} onChange={event=>setUsername(event.target.value)} placeholder="e.g. study_spark" autoComplete="off"/></label><label className="consent-toggle"><input type="checkbox" checked={account.friend_circle_consent} onChange={event=>setAccount(old=>({...old,friend_circle_consent:event.target.checked}))}/><span>I agree to share my username, total study hours, and rank with my circle members.</span></label><button className="friends-primary" onClick={()=>void saveAccount()}>Save privacy choices <Check size={14}/></button></section>
    {account.friend_circle_consent&&account.unique_username?<><section className="circle-actions"><form onSubmit={create}><span className="friends-eyebrow">START YOUR OWN</span><h2>Create a circle</h2><p>We’ll make a unique invite code you can share privately.</p><div><input value={circleName} maxLength={40} onChange={event=>setCircleName(event.target.value)} placeholder="Circle name" required/><button disabled={!circleName.trim()}><Users size={14}/> Create</button></div></form><form onSubmit={join}><span className="friends-eyebrow">HAVE AN INVITE CODE?</span><h2>Join your friends</h2><p>Enter the code shared by a circle member.</p><div><input value={joinCode} maxLength={20} onChange={event=>setJoinCode(event.target.value.toUpperCase())} placeholder="e.g. A3F92C1D" required/><button disabled={!joinCode.trim()}>Join <span>→</span></button></div></form></section><section className="circle-board"><header><div><span className="friends-eyebrow">YOUR PRIVATE LEADERBOARD</span><h2>{circles.length?'Study circle':'Your circles'}</h2></div>{circles.length>0&&<select aria-label="Choose a study circle" value={activeCircle} onChange={event=>setActiveCircle(event.target.value)}>{circles.map(circle=><option value={circle.id} key={circle.id}>{circle.name}</option>)}</select>}</header>{activeCircle?<><div className="circle-invite"><span><small>YOUR CIRCLE INVITE CODE</small><b>{circles.find(item=>item.id===activeCircle)?.invite_code}</b></span><button onClick={()=>void copyCode()}><Copy size={14}/> Copy code</button></div><div className="leaderboard-head"><span>RANK</span><span>STUDENT</span><span>TOTAL STUDY TIME</span></div>{leaderboard.map(row=><article className={`leaderboard-row ${row.username===account.unique_username?'is-me':''}`} key={row.username}><b className="leaderboard-rank">{row.rank===1?<Crown size={16}/>:String(row.rank).padStart(2,'0')}</b><span className="leaderboard-user">{row.username}{row.username===account.unique_username&&<small>YOU</small>}</span><b className="leaderboard-hours">{formatHours(row.total_minutes)}</b></article>)}{leaderboard.length===0&&!loading&&<p className="circle-empty">Your circle’s leaderboard will appear as members complete focus sessions.</p>}<footer><span><i/> Refreshes every 10 seconds · Hours only</span><button onClick={()=>void leave()}><LogOut size={13}/> Leave or close circle</button><button aria-label="Refresh circles" onClick={()=>void refresh()}><RefreshCw size={13}/></button></footer></>:<p className="circle-empty">Create a circle or join one with a code to see your group’s study hours.</p>}</section></>:<div className="circle-locked"><Shield size={18}/><span><b>Friend circles are off</b><small>Save your username and opt in above to create or join a study circle.</small></span></div>}
    {message&&<p className="friends-message" role="status">{message}<button onClick={()=>setMessage('')}>Dismiss</button></p>}
  </main>;
}
