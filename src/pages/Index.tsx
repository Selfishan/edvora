import { useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import {
  ArrowDownRight, ArrowRight, Atom, Bell, BookMarked, BookOpen, Bookmark, Check,
  ChevronDown, ChevronRight, CircleHelp, Clock3, Flame, FlaskConical, Globe2,
  GraduationCap, Home, Languages, Leaf, Library, Menu, Moon, MoreHorizontal,
  Search, Settings2, Sigma, Sparkles, SquareArrowOutUpRight, Sun, Target,
  Timer, TrendingUp, X, Zap,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Brand, SignIn } from '@/components/SignIn';

type Subject = { id: string; name: string; description: string; theme: string; sort_order: number };
type Chapter = { id: string; subject_id: string; chapter_number: number; title: string; description: string; ncert_unit: string; notes_status: 'available' | 'coming_soon' };
type Progress = { chapter_id: string; status: string; bookmarked: boolean };

const subjectSeeds = [
  { name: 'Mathematics', description: 'Think it through. Solve it your way.', theme: 'emerald', chapters: ['Real Numbers', 'Polynomials', 'Pair of Linear Equations in Two Variables', 'Quadratic Equations', 'Arithmetic Progressions', 'Triangles', 'Coordinate Geometry', 'Introduction to Trigonometry', 'Some Applications of Trigonometry', 'Circles', 'Areas Related to Circles', 'Surface Areas and Volumes', 'Statistics', 'Probability'] },
  { name: 'Science', description: 'Curiosity meets the natural world.', theme: 'violet', chapters: ['Chemical Reactions and Equations', 'Acids, Bases and Salts', 'Metals and Non-metals', 'Carbon and its Compounds', 'Life Processes', 'Control and Coordination', 'How do Organisms Reproduce?', 'Heredity', 'Light – Reflection and Refraction', 'The Human Eye and the Colourful World', 'Electricity', 'Magnetic Effects of Electric Current', 'Our Environment'] },
  { name: 'Social Science', description: 'Stories, places and the world we share.', theme: 'amber', chapters: ['The Rise of Nationalism in Europe', 'Nationalism in India', 'The Making of a Global World', 'The Age of Industrialisation', 'Print Culture and the Modern World', 'Resources and Development', 'Forest and Wildlife Resources', 'Water Resources', 'Agriculture', 'Minerals and Energy Resources', 'Power Sharing', 'Federalism', 'Development', 'Sectors of the Indian Economy'] },
  { name: 'English', description: 'Find your voice. Explore a story.', theme: 'blue', chapters: ['A Letter to God', 'Nelson Mandela: Long Walk to Freedom', 'Two Stories about Flying', 'From the Diary of Anne Frank', 'The Hundred Dresses – I', 'A Triumph of Surgery', 'The Thief’s Story', 'The Midnight Visitor'] },
  { name: 'Hindi Course B', description: 'Sparsh · Sanchayan · अभिव्यक्ति', theme: 'rose', chapters: ['बड़े भाई साहब', 'डायरी का एक पन्ना', 'तताँरा-वामीरो कथा', 'तीसरी कसम के शिल्पकार शैलेन्द्र'] },
  { name: 'Information Technology', description: 'Digital skills for a connected world.', theme: 'cyan', chapters: ['Communication Skills – II', 'Self-Management Skills – II', 'ICT Skills – II', 'Entrepreneurial Skills – II'] },
];

const iconFor = (name: string) => name === 'Mathematics' ? Sigma : name === 'Science' ? FlaskConical : name === 'Social Science' ? Globe2 : name === 'English' ? BookOpen : name === 'Hindi Course B' ? Languages : Atom;
const navItems = [{ name: 'Home', icon: Home }, { name: 'Study', icon: Library }, { name: 'PYQs', icon: BookMarked }, { name: 'Focus', icon: Timer }, { name: 'Progress', icon: TrendingUp }];
const sideTools = [{ name: 'Quick revision', icon: Zap }, { name: 'Bookmarks', icon: Bookmark }, { name: 'Planner', icon: Target }, { name: 'Notebook', icon: BookOpen }];
const fmtMinutes = (minutes: number) => `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, '0')}m`;

function Index() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [progress, setProgress] = useState<Progress[]>([]);
  const [profile, setProfile] = useState<{ full_name: string | null; daily_goal_minutes: number; exam_date: string | null } | null>(null);
  const [tab, setTab] = useState('Home');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [search, setSearch] = useState('');
  const [mobileMenu, setMobileMenu] = useState(false);
  const [notice, setNotice] = useState('');
  const [sessionMinutes] = useState(0);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setLoading(false); });
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession));
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session?.user) return;
    let alive = true;
    const load = async () => {
      const uid = session.user.id;
      const [subjectsRes, profileRes, rolesRes] = await Promise.all([
        supabase.from('subjects').select('*').order('sort_order'),
        supabase.from('profiles').select('full_name,daily_goal_minutes,exam_date').eq('id', uid).maybeSingle(),
        supabase.from('user_roles').select('role').eq('user_id', uid),
      ]);
      if (!alive) return;
      let catalog = (subjectsRes.data ?? []) as Subject[];
      if (!catalog.length) {
        for (let i = 0; i < subjectSeeds.length; i++) {
          const item = subjectSeeds[i];
          const { data } = await supabase.from('subjects').upsert({ name: item.name, description: item.description, theme: item.theme, sort_order: i + 1 }, { onConflict: 'name' }).select().single();
          if (data) catalog.push(data as Subject);
        }
      }
      setSubjects(catalog);
      if (profileRes.data) setProfile(profileRes.data as typeof profile);
      if (rolesRes.data?.some(role => role.role === 'admin')) sessionStorage.setItem('edvora-admin', 'true');
      const { data: chapterRows } = await supabase.from('chapters').select('*').order('chapter_number');
      let chapterList = (chapterRows ?? []) as Chapter[];
      if (chapterList.length === 0 && catalog.length) {
        for (const subject of catalog) {
          const seed = subjectSeeds.find(item => item.name === subject.name);
          if (!seed) continue;
          const { data } = await supabase.from('chapters').insert(seed.chapters.map((title, i) => ({ subject_id: subject.id, chapter_number: i + 1, title, description: `${subject.name} · Class 10 CBSE`, ncert_unit: `Unit ${i + 1}` }))).select();
          if (data) chapterList = chapterList.concat(data as Chapter[]);
        }
      }
      if (!alive) return;
      setChapters(chapterList);
      const { data: progressRows } = await supabase.from('chapter_progress').select('chapter_id,status,bookmarked').eq('user_id', uid);
      if (alive) setProgress((progressRows ?? []) as Progress[]);
    };
    void load();
    return () => { alive = false; };
  }, [session]);

  const signedIn = !!session;
  const displayName = profile?.full_name || session?.user.user_metadata?.full_name || session?.user.email?.split('@')[0] || 'Student';
  const firstName = displayName.split(/[ ._-]/)[0];
  const now = new Date();
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 18 ? 'Good afternoon' : 'Good evening';
  const selected = subjects.find(s => s.id === selectedSubject);
  const shownChapters = useMemo(() => chapters.filter(chapter => (!selectedSubject || chapter.subject_id === selectedSubject) && chapter.title.toLowerCase().includes(search.toLowerCase())), [chapters, selectedSubject, search]);
  const completedCount = progress.filter(item => item.status === 'completed').length;
  const bookmarkedCount = progress.filter(item => item.bookmarked).length;
  const progressFor = (chapterId: string) => progress.find(item => item.chapter_id === chapterId);

  const ensureProgress = async (chapterId: string, patch: Partial<Progress>) => {
    if (!session) return;
    const existing = progressFor(chapterId);
    const { data } = await supabase.from('chapter_progress').upsert({ user_id: session.user.id, chapter_id: chapterId, status: existing?.status ?? 'not_started', bookmarked: existing?.bookmarked ?? false, ...patch }, { onConflict: 'user_id,chapter_id' }).select('chapter_id,status,bookmarked').single();
    if (data) setProgress(old => [...old.filter(item => item.chapter_id !== chapterId), data as Progress]);
  };

  if (loading) return <div className="loading-screen"><span className="loading-logo"><BookOpen size={23}/></span><span>Getting your desk ready…</span></div>;
  if (!signedIn) return <SignIn/>;

  const goTab = (name: string) => { setTab(name); setMobileMenu(false); if (name === 'Study') document.getElementById('study-library')?.scrollIntoView({ behavior: 'smooth' }); };
  const startStudy = (name: string) => { setSelectedSubject(name); goTab('Study'); document.getElementById('study-library')?.scrollIntoView({ behavior: 'smooth' }); };
  const notify = (text: string) => { setNotice(text); window.setTimeout(() => setNotice(''), 3000); };

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="sidebar-brand"><Brand /><span className="brand-school">YOUR CLASS 10 STUDY SPACE</span></div>
      <div className="side-scroll"><div className="nav-label">YOUR SPACE</div><nav className="side-nav">{navItems.map(item => <button key={item.name} onClick={() => goTab(item.name)} className={`nav-link ${tab === item.name ? 'active' : ''}`}><item.icon size={18}/><span>{item.name}</span>{item.name === 'Focus' && <span className="nav-live"/>}</button>)}</nav><div className="nav-label tools-label">STUDY TOOLS</div><nav className="side-nav">{sideTools.map(item => <button key={item.name} onClick={() => item.name === 'Bookmarks' ? goTab('Bookmarks') : notify(`${item.name} is coming to your study space soon`)} className={`nav-link ${tab === item.name ? 'active' : ''}`}><item.icon size={18}/><span>{item.name}</span>{item.name === 'Bookmarks' && bookmarkedCount > 0 && <span className="nav-count">{bookmarkedCount}</span>}</button>)}</nav></div>
      <div className="sidebar-bottom"><button className="focus-mini" onClick={() => goTab('Focus')}><span className="focus-mini-icon"><Timer size={18}/></span><span className="focus-mini-copy"><b>Ready when you are</b><small>Start a focus session</small></span><ChevronRight size={16}/></button><div className="sidebar-user"><span className="avatar-small">{firstName.charAt(0).toUpperCase()}</span><span className="user-copy"><b>{firstName}</b><small>Class 10 · CBSE</small></span><button className="icon-plain" aria-label="Settings" onClick={() => notify('Account settings are coming soon')}><Settings2 size={17}/></button></div></div>
    </aside>
    <div className="main-column">
      <header className="topbar"><button className="mobile-brand" onClick={() => setMobileMenu(!mobileMenu)}><Menu size={20}/></button><div className="breadcrumbs"><span>EDVORA</span><ChevronRight size={13}/><b>{tab}</b></div><div className="top-actions"><button className="search-trigger" onClick={() => document.getElementById('chapter-search')?.focus()}><Search size={16}/><span>Search anything</span><kbd>⌘ K</kbd></button><button className="top-icon" aria-label="Notifications" onClick={() => notify('You’re all caught up')}><Bell size={18}/><i/></button><button className="avatar-top" onClick={() => notify('Profile settings coming soon')}>{firstName.charAt(0).toUpperCase()}</button></div></header>
      {mobileMenu && <div className="mobile-menu">{[...navItems,...sideTools.map(tool => ({...tool, name: tool.name === 'Quick revision' ? 'Revision' : tool.name}))].map(item => <button key={item.name} onClick={() => goTab(item.name)}><item.icon size={18}/>{item.name}</button>)}</div>}
      <main className="dashboard">
        <div className="welcome-row"><div><div className="session-tag"><span/> YOUR 2026–27 STUDY SPACE</div><h1>{greeting}, {firstName}<span className="greeting-comma">.</span></h1><p className="welcome-sub">A new day is a new chance to get a little closer.</p></div><div className="date-pill"><span className="date-icon"><Sun size={17}/></span><span><b>{now.toLocaleDateString('en-US',{weekday:'long'})}</b><small>{now.toLocaleDateString('en-US',{month:'long',day:'numeric'})}</small></span><ChevronDown size={15}/></div></div>
        <section className="hero-card"><div className="hero-content"><div className="hero-kicker"><span className="sparkle-dot"><Sparkles size={12}/></span> A NOTE FOR TODAY</div><h2>Small steps.<br/><em>Bright futures.</em></h2><p>Every page you read, every problem you solve — it all adds up. Keep showing up for yourself.</p><button onClick={() => goTab('Study')} className="hero-button">Continue your journey <ArrowRight size={16}/></button><div className="hero-note"><span className="note-avatars"><i>I</i><i>✦</i><i>+</i></span><span>Made for the way <b>you learn</b></span></div></div><div className="hero-art" aria-hidden="true"><div className="hero-sun">✳</div><div className="hero-desk"><div className="desk-book"><div/><div/></div><div className="desk-pencil"/><div className="desk-cup"><span/></div></div><div className="hero-plant"><i/><i/><i/><b/></div><div className="hero-lamp"><i/><b/></div><div className="hero-spark sp-a">✳</div><div className="hero-spark sp-b">✦</div><div className="hero-cloud cloud-a"/><div className="hero-cloud cloud-b"/></div><div className="hero-index">01 <span/> 03</div></section>
        <div className="section-heading metric-heading"><div><span className="eyebrow">YOUR MOMENTUM</span><h2>A little goes a long way</h2></div><button className="subtle-link" onClick={() => goTab('Progress')}>View your progress <ArrowRight size={15}/></button></div>
        <section className="metrics-grid"><MetricCard icon={Clock3} iconClass="lavender" label="STUDY TIME" value={fmtMinutes(sessionMinutes)} sub="Across all your sessions"/><MetricCard icon={Target} iconClass="peach" label="TODAY’S FOCUS" value="0 min" sub={`Your daily goal · ${profile?.daily_goal_minutes ?? 120} min`} progress={0}/><MetricCard icon={BookOpen} iconClass="mint" label="CHAPTERS DONE" value={String(completedCount).padStart(2,'0')} sub={`Out of ${chapters.length || 0} chapters`} trend="Keep it up"/><MetricCard icon={Bookmark} iconClass="butter" label="SAVED FOR LATER" value={String(bookmarkedCount).padStart(2,'0')} sub="Your little collection"/></section>
        <section className="learning-layout"><div className="learning-main" id="study-library"><div className="section-heading"><div><span className="eyebrow">PICK UP WHEREVER YOU LIKE</span><h2>Your study library</h2></div><button className="text-link" onClick={() => {setSelectedSubject(''); setTab('Study')}}>All subjects <ArrowRight size={15}/></button></div><div className="subject-grid">{subjects.map((subject,index) => {const Icon=iconFor(subject.name); const count=chapters.filter(c=>c.subject_id===subject.id).length; const done=chapters.filter(c=>c.subject_id===subject.id && progressFor(c.id)?.status==='completed').length; return <button key={subject.id} className={`subject-card subject-${subject.theme} ${selectedSubject===subject.id?'subject-selected':''}`} onClick={()=>{setSelectedSubject(selectedSubject===subject.id?'':subject.id);setTab('Study')}}><span className="subject-top"><span className="subject-icon"><Icon size={20}/></span><span className="subject-arrow"><ArrowDownRight size={16}/></span></span><span className="subject-name">{subject.name}</span><span className="subject-desc">{subject.description}</span><span className="subject-bottom"><span>{count ? `${count} chapters` : 'Explore chapters'}</span><span className="subject-progress">{done}/{count || '—'} <i style={{width: count ? `${Math.round(done/count*100)}%` : '0%'}}/></span></span><span className={`subject-decoration deco-${index}`}>{subject.name==='Mathematics'?'∑':subject.name==='Science'?'✳':subject.name==='Social Science'?'◉':'✦'}</span></button>})}</div>
        <div className="chapter-heading"><div><span className="eyebrow">{selected ? selected.name.toUpperCase() : 'A GOOD PLACE TO START'}</span><h2>{selected ? 'Chapter shelf' : 'Your chapters'}</h2></div><div className="chapter-tools"><div className="chapter-search"><Search size={15}/><input id="chapter-search" placeholder="Find a chapter" value={search} onChange={event=>setSearch(event.target.value)}/>{search&&<button onClick={()=>setSearch('')} aria-label="Clear search"><X size={13}/></button>}</div><button className="filter-button" onClick={()=>setSelectedSubject('')}><span>{selected?.name.split(' ')[0] ?? 'All subjects'}</span><ChevronDown size={14}/></button></div></div>
        <div className="chapter-list">{shownChapters.slice(0,8).map(chapter=>{const subject=subjects.find(s=>s.id===chapter.subject_id);const status=progressFor(chapter.id)?.status??'not_started';const saved=progressFor(chapter.id)?.bookmarked??false;return <article className="chapter-row" key={chapter.id}><div className={`chapter-number theme-${subject?.theme??'violet'}`}>{String(chapter.chapter_number).padStart(2,'0')}</div><div className="chapter-title"><span>{chapter.title}</span><small>{subject?.name} <i/> Chapter {chapter.chapter_number}</small></div><span className={`chapter-status status-${status}`}>{status==='completed'?<Check size={12}/>:status==='in_progress'?<span className="status-pulse"/>:null}{status.replace('_',' ')}</span><button className={`bookmark-button ${saved?'is-saved':''}`} aria-label={saved?'Remove bookmark':'Bookmark chapter'} onClick={()=>void ensureProgress(chapter.id,{bookmarked:!saved})}><Bookmark size={17} fill={saved?'currentColor':'none'}/></button><button className="chapter-open" aria-label={`Open ${chapter.title}`} onClick={()=>chapter.notes_status==='available'?notify(`Opening notes for ${chapter.title}`):notify('Handwritten notes for this chapter are coming soon')}><ChevronRight size={17}/></button></article>})}{shownChapters.length===0&&<div className="empty-chapters"><Search size={22}/><b>No chapters found</b><span>Try another name or choose a different subject.</span></div>}</div><button className="all-chapters" onClick={()=>notify('You’re already on your chapter shelf')}>See all {selected?.name ?? 'chapters'} <ArrowRight size={15}/></button></div>
        <aside className="learning-aside"><div className="aside-head"><div><span className="eyebrow">YOUR DAILY RHYTHM</span><h3>Today, in focus</h3></div><MoreHorizontal size={19}/></div><div className="focus-empty"><div className="focus-ring"><div className="focus-ring-inner"><Clock3 size={22}/><b>00:00</b><span>FOCUSED</span></div></div><p>Every focused minute<br/>starts with one.</p><button onClick={()=>goTab('Focus')}>Start a focus session <ArrowRight size={14}/></button></div><div className="aside-divider"/><div className="week-head"><div><span className="eyebrow">YOUR WEEK</span><h3>Show up, your way</h3></div><span className="week-total">0 / 7 days</span></div><div className="week-chart">{['M','T','W','T','F','S','S'].map((day,index)=><div className="week-day" key={`${day}-${index}`}><div className="week-bar-wrap"><i className={index===now.getDay()-1?'today-bar':''} style={{height:index===now.getDay()-1?'17%':`${[24,62,38,78,33,56,21][index]}%`}}/></div><span className={index===now.getDay()-1?'is-today':''}>{day}</span></div>)}</div><div className="week-foot"><span><span className="week-dot"/> One session at a time</span><ArrowRight size={14}/></div><div className="streak-card"><span className="streak-icon"><Flame size={17}/></span><span><b>Build your rhythm</b><small>One focused day at a time</small></span><span className="streak-days">0 <small>days</small></span></div></aside></section>
        <section className="bottom-nudge"><div className="nudge-icon"><Leaf size={20}/></div><div><span className="eyebrow">A GENTLE REMINDER</span><p>You don’t have to do it all today. Just take the <em>next small step.</em></p></div><button onClick={()=>goTab('Focus')}>Take a moment <ArrowRight size={15}/></button><span className="nudge-spark">✳</span></section>
        <footer className="footer"><span>© 2026 EDVORA</span><span>Made for curious minds <span className="footer-heart">✳</span></span><button onClick={()=>notify('Need a hand? Reach out to your administrator')}><CircleHelp size={14}/> Need a hand?</button></footer>
      </main>
    </div>
    <nav className="mobile-bottom">{navItems.map(item=><button key={item.name} className={tab===item.name?'selected':''} onClick={()=>goTab(item.name)}><item.icon size={19}/><span>{item.name}</span></button>)}<button onClick={()=>setMobileMenu(!mobileMenu)}><MoreHorizontal size={19}/><span>More</span></button></nav>
    {notice&&<div className="toast-note"><span>✦</span>{notice}<button onClick={()=>setNotice('')}><X size={14}/></button></div>}
    <button className="signout-button" onClick={async()=>{await supabase.auth.signOut();sessionStorage.removeItem('edvora-admin')}}>Sign out</button>
  </div>;
}

function MetricCard({icon:Icon,iconClass,label,value,sub,progress,trend}: {icon: typeof Clock3; iconClass:string;label:string;value:string;sub:string;progress?:number;trend?:string}) {
  return <article className="metric-card"><div className="metric-top"><span className={`metric-icon ${iconClass}`}><Icon size={17}/></span><span className="metric-label">{label}</span>{trend&&<span className="metric-trend"><Sparkles size={12}/>{trend}</span>}</div><div className="metric-value">{value}</div><div className="metric-sub">{sub}</div>{progress!==undefined&&<div className="metric-progress"><i style={{width:`${progress}%`}}/></div>}</article>;
}

export default Index;
