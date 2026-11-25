import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import {
  ArrowDownRight, ArrowRight, Atom, Bell, BookMarked, BookOpen, Bookmark, CalendarDays, Check,
  ChevronDown, ChevronRight, CircleHelp, Clock3, Flame, FlaskConical, Globe2,
  GraduationCap, Home, Languages, Leaf, Library, Menu, Moon, MoreHorizontal,
  Search, Settings2, Sigma, Sparkles, SquareArrowOutUpRight, Sun, Target,
  Timer, TrendingUp, X, Zap,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Brand, SignIn } from '@/components/SignIn';
import PYQLibrary from '@/components/PYQLibrary';
import FocusPage from '@/components/FocusPage';
import ToolsPage from '@/components/ToolsPage';
import AdminPage from '@/components/AdminPage';
import ProgressPage from '@/components/ProgressPage';
import ChapterDeadlines from '@/components/ChapterDeadlines';
import { class11Subjects, class11FinalExamDate } from '@/data/class11';

type Subject = { id: string; name: string; description: string; theme: string; sort_order: number };
type Chapter = { id: string; subject_id: string; chapter_number: number; title: string; description: string; ncert_unit: string; notes_status: 'available' | 'coming_soon' };
type Progress = { chapter_id: string; status: string; bookmarked: boolean };
type FocusSummary = { id: string; subject_id: string; chapter_id: string | null; started_at: string; duration_seconds: number; completed: boolean };
type NoteViewer = { title: string; url: string; image: boolean; allowDownload: boolean; chapterId: string; pageCount: number | null };
type Announcement = { id: string; title: string; body: string; created_at: string };

const subjectSeeds = [
  { name: 'Mathematics', description: 'Think it through. Solve it your way.', theme: 'emerald', chapters: ['Real Numbers', 'Polynomials', 'Pair of Linear Equations in Two Variables', 'Quadratic Equations', 'Arithmetic Progressions', 'Triangles', 'Coordinate Geometry', 'Introduction to Trigonometry', 'Some Applications of Trigonometry', 'Circles', 'Areas Related to Circles', 'Surface Areas and Volumes', 'Statistics', 'Probability'] },
  { name: 'Science', description: 'Curiosity meets the natural world.', theme: 'violet', chapters: ['Chemical Reactions and Equations', 'Acids, Bases and Salts', 'Metals and Non-metals', 'Carbon and its Compounds', 'Life Processes', 'Control and Coordination', 'How do Organisms Reproduce?', 'Heredity', 'Light – Reflection and Refraction', 'The Human Eye and the Colourful World', 'Electricity', 'Magnetic Effects of Electric Current', 'Our Environment'] },
  { name: 'Social Science', description: 'Stories, places and the world we share.', theme: 'amber', chapters: ['The Rise of Nationalism in Europe', 'Nationalism in India', 'The Making of a Global World', 'The Age of Industrialisation', 'Print Culture and the Modern World', 'Resources and Development', 'Forest and Wildlife Resources', 'Water Resources', 'Agriculture', 'Minerals and Energy Resources', 'Power Sharing', 'Federalism', 'Development', 'Sectors of the Indian Economy'] },
  { name: 'English', description: 'Find your voice. Explore a story.', theme: 'blue', chapters: ['A Letter to God', 'Nelson Mandela: Long Walk to Freedom', 'Two Stories about Flying', 'From the Diary of Anne Frank', 'The Hundred Dresses – I', 'A Triumph of Surgery', 'The Thief’s Story', 'The Midnight Visitor'] },
  { name: 'Hindi Course B', description: 'Sparsh · Sanchayan · अभिव्यक्ति', theme: 'rose', chapters: ['बड़े भाई साहब', 'डायरी का एक पन्ना', 'तताँरा-वामीरो कथा', 'तीसरी कसम के शिल्पकार शैलेन्द्र'] },
  { name: 'Hindi A', description: 'क्षितिज · कृतिका · भाषा और साहित्य', theme: 'rose', chapters: ['सूरदास के पद', 'राम-लक्ष्मण-परशुराम संवाद', 'आत्मकथ्य', 'उत्साह और अट नहीं रही है', 'यह दंतुरित मुस्कान और फसल', 'छाया मत छूना', 'कन्यादान', 'संगतकार', 'नेताजी का चश्मा', 'बालगोबिन भगत', 'लखनवी अंदाज़', 'मानवीय करुणा की दिव्य चमक', 'एक कहानी यह भी', 'स्त्री शिक्षा के विरोधी कुतर्कों का खंडन', 'नौबतखाने में इबादत', 'संस्कृति', 'माता का अँचल', 'साना-साना हाथ जोड़ि', 'मैं क्यों लिखता हूँ'] },
  { name: 'Artificial Intelligence', description: 'AI 417 · From ideas to intelligent solutions.', theme: 'cyan', chapters: ['Communication Skills – II', 'Self-Management Skills – II', 'ICT Skills – II', 'Entrepreneurial Skills – II', 'Green Skills – II', 'Introduction to Artificial Intelligence', 'AI Project Cycle', 'Advanced Python', 'Data Exploration and Visualization', 'Statistical Data', 'Computer Vision', 'Natural Language Processing', 'Evaluation'] },
  { name: 'Information Technology', description: 'Digital skills for a connected world.', theme: 'cyan', chapters: ['Communication Skills – II', 'Self-Management Skills – II', 'ICT Skills – II', 'Entrepreneurial Skills – II'] },
];

const iconFor = (name: string) => name === 'Mathematics' ? Sigma : name === 'Science' ? FlaskConical : name === 'Social Science' ? Globe2 : name === 'English' ? BookOpen : name.startsWith('Hindi') ? Languages : name === 'Artificial Intelligence' ? Sparkles : Atom;
const navItems = [{ name: 'Home', icon: Home }, { name: 'Study', icon: Library }, { name: 'Focus', icon: Timer }, { name: 'Important Questions', icon: BookMarked }, { name: 'Progress', icon: TrendingUp }];
const sideTools = [{ name: 'Quick revision', icon: Zap }, { name: 'Bookmarks', icon: Bookmark }, { name: 'Planner', icon: Target }, { name: 'Notebook', icon: BookOpen }, { name: 'Profile', icon: Settings2 }, { name: 'Search', icon: Search }, { name: 'About', icon: CircleHelp }];
const routeTabs: Record<string,string> = {'/dashboard':'Home','/study':'Study','/pyqs':'Important Questions','/important-questions':'Important Questions','/focus':'Focus','/progress':'Progress','/revision':'Revision','/bookmarks':'Bookmarks','/planner':'Planner','/notebook':'Notebook','/profile':'Profile','/search':'Search','/admin':'Admin','/about':'About','/':'Home'};
const tabRoutes: Record<string,string> = {Home:'/dashboard',Study:'/study','Important Questions':'/important-questions',PYQs:'/important-questions',Focus:'/focus',Progress:'/progress','Quick revision':'/revision',Revision:'/revision',Bookmarks:'/bookmarks',Planner:'/planner',Notebook:'/notebook',Profile:'/profile',Search:'/search',About:'/about',Admin:'/admin'};
const fmtMinutes = (minutes: number) => `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, '0')}m`;

function Index() {
  const location = useLocation();
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[] | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [progress, setProgress] = useState<Progress[]>([]);
  const [focusSessions, setFocusSessions] = useState<FocusSummary[]>([]);
  const [profile, setProfile] = useState<{ full_name: string | null; daily_goal_minutes: number; exam_date: string | null; grade: number } | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [rolesReady, setRolesReady] = useState(false);
  const [viewer, setViewer] = useState<NoteViewer|null>(null);
  const [studyChapter, setStudyChapter] = useState<Chapter|null>(null);
  const [announcement, setAnnouncement] = useState<Announcement|null>(null);
  const [tab, setTab] = useState(routeTabs[location.pathname] ?? 'Home');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [search, setSearch] = useState('');
  const [mobileMenu, setMobileMenu] = useState(false);
  const [notice, setNotice] = useState('');
  const [focusChip, setFocusChip] = useState('');

  useEffect(() => {
    setTab(routeTabs[location.pathname] ?? 'Home');
  }, [location.pathname]);

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); setTab('Search'); setMobileMenu(false); navigate('/search'); }
      if (event.key === 'Escape') setMobileMenu(false);
    };
    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, [navigate]);

  useEffect(() => {
    if (!session?.user) return;
    const updateChip = () => {
      try {
        const raw = localStorage.getItem(`edvora-focus:${session.user.id}`);
        if (!raw) { setFocusChip(''); return; }
        const timer = JSON.parse(raw);
        const remaining = Math.max(0, timer.remainingMs - (timer.status === 'running' && timer.startedAt ? Date.now() - timer.startedAt : 0));
        setFocusChip(`${timer.status === 'paused' ? 'Paused' : ''} ${String(Math.ceil(remaining / 60000)).padStart(2, '0')}:${String(Math.floor(remaining / 1000) % 60).padStart(2, '0')}`.trim());
      } catch { setFocusChip(''); }
    };
    updateChip();
    const interval = window.setInterval(updateChip, 1000);
    return () => window.clearInterval(interval);
  }, [session]);

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
      const [subjectsRes, profileRes, rolesRes, announcementsRes, preferencesRes] = await Promise.all([
        supabase.from('subjects').select('*').order('sort_order'),
        supabase.from('profiles').select('full_name,daily_goal_minutes,exam_date,grade').eq('id', uid).maybeSingle(),
        supabase.from('user_roles').select('role').eq('user_id', uid),
        supabase.from('announcements').select('id,title,body,created_at').eq('published',true).order('created_at',{ascending:false}).limit(1),
        supabase.from('profile_subjects').select('subject_id').eq('user_id', uid),
      ]);
      if (!alive) return;
      let catalog = (subjectsRes.data ?? []) as Subject[];
      const grade = Number(profileRes.data?.grade ?? session.user.user_metadata?.grade ?? 10);
      const applicableSeeds = grade === 11 ? [...class11Subjects] : subjectSeeds;
      for (let i = 0; i < applicableSeeds.length; i++) {
        const item = applicableSeeds[i];
        if (catalog.some(subject => subject.name === item.name)) continue;
        const { data } = await supabase.from('subjects').upsert({ name: item.name, description: item.description, theme: item.theme, sort_order: i + 1 }, { onConflict: 'name' }).select().single();
        if (data) catalog.push(data as Subject);
      }
      catalog = catalog.filter(subject => grade === 11 ? subject.name.startsWith('Class 11 · ') : !subject.name.startsWith('Class 11 · '));
      setSubjects(catalog);
      if (profileRes.data) setProfile({ ...profileRes.data, grade, exam_date: grade === 11 ? class11FinalExamDate : profileRes.data.exam_date } as typeof profile);
      const admin = rolesRes.data?.some(role => role.role === 'admin') ?? false;
      setIsAdmin(admin);
      setRolesReady(true);
      if (!preferencesRes.error) setSelectedSubjectIds((preferencesRes.data ?? []).map(row => row.subject_id));
      setAnnouncement((announcementsRes.data?.[0] as Announcement|undefined)??null);
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
      const [{ data: progressRows }, { data: focusRows }] = await Promise.all([
        supabase.from('chapter_progress').select('chapter_id,status,bookmarked').eq('user_id', uid),
        supabase.from('focus_sessions').select('id,subject_id,chapter_id,started_at,duration_seconds,completed').eq('user_id', uid).order('started_at', { ascending: false }).limit(500),
      ]);
      if (alive) { setProgress((progressRows ?? []) as Progress[]); setFocusSessions((focusRows ?? []) as FocusSummary[]); }
    };
    void load();
    return () => { alive = false; };
  }, [session]);

  const signedIn = !!session;
  const displayName = profile?.full_name || session?.user.user_metadata?.full_name || session?.user.email?.split('@')[0] || 'Student';
  const firstName = displayName.split(/[ ._-]/)[0];
  const now = new Date();
  const dayKey = (date: Date) => `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
  const todayFocusSeconds = focusSessions.filter(item => dayKey(new Date(item.started_at)) === dayKey(now)).reduce((sum, item) => sum + item.duration_seconds, 0);
  const totalFocusSeconds = focusSessions.reduce((sum, item) => sum + item.duration_seconds, 0);
  const dailyGoal = profile?.daily_goal_minutes ?? 120;
  const weeklyDays = new Set(focusSessions.filter(item => Date.now() - new Date(item.started_at).getTime() < 7 * 86400000).map(item => dayKey(new Date(item.started_at)))).size;
  const weeklyMinutes = Array.from({ length: 7 }, (_, index) => { const date = new Date(now); date.setHours(0, 0, 0, 0); date.setDate(date.getDate() - (date.getDay() + 6) % 7 + index); return Math.floor(focusSessions.filter(item => dayKey(new Date(item.started_at)) === dayKey(date)).reduce((sum, item) => sum + item.duration_seconds, 0) / 60); });
  const streakDays = (() => { const active = new Set(focusSessions.map(item => dayKey(new Date(item.started_at)))); const cursor = new Date(now); cursor.setHours(0, 0, 0, 0); if (!active.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1); let count = 0; while (active.has(dayKey(cursor))) { count++; cursor.setDate(cursor.getDate() - 1); } return count; })();
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 18 ? 'Good afternoon' : 'Good evening';
  const visibleSubjects = isAdmin ? subjects : subjects.filter(subject => selectedSubjectIds?.includes(subject.id));
  const visibleChapters = chapters.filter(chapter => visibleSubjects.some(subject => subject.id === chapter.subject_id));
  const selected = visibleSubjects.find(s => s.id === selectedSubject);
  const shownChapters = useMemo(() => visibleChapters.filter(chapter => (!selectedSubject || chapter.subject_id === selectedSubject) && chapter.title.toLowerCase().includes(search.toLowerCase())), [chapters, visibleSubjects, selectedSubject, search]);
  const completedCount = progress.filter(item => visibleChapters.some(chapter => chapter.id === item.chapter_id) && item.status === 'completed').length;
  const bookmarkedCount = progress.filter(item => visibleChapters.some(chapter => chapter.id === item.chapter_id) && item.bookmarked).length;
  const progressFor = (chapterId: string) => progress.find(item => item.chapter_id === chapterId);
  const recentChapters = visibleChapters.map(chapter => { const sessions = focusSessions.filter(item => item.chapter_id === chapter.id); return { chapter, seconds: sessions.reduce((sum,item)=>sum+item.duration_seconds,0), latest: Math.max(0,...sessions.map(item=>new Date(item.started_at).getTime())) }; }).filter(item => item.latest && item.chapter.title.toLowerCase().includes(search.toLowerCase()) && (!selectedSubject || item.chapter.subject_id === selectedSubject)).sort((a,b)=>b.latest-a.latest).slice(0,6);
  const shelfChapters = tab === 'Study' ? shownChapters.map(chapter => ({ chapter, seconds: focusSessions.filter(item=>item.chapter_id===chapter.id).reduce((sum,item)=>sum+item.duration_seconds,0) })) : recentChapters;
  const saveSubjectChoices = async (ids: string[]) => {
    if (!session || !ids.length) return false;
    const rows = ids.map(subject_id => ({ user_id: session.user.id, subject_id }));
    const { error } = await supabase.from('profile_subjects').upsert(rows, { onConflict: 'user_id,subject_id' });
    if (error) return false;
    const { error: cleanupError } = await supabase.from('profile_subjects').delete().eq('user_id', session.user.id).not('subject_id', 'in', `(${ids.join(',')})`);
    if (cleanupError) return false;
    setSelectedSubjectIds(ids);
    setSelectedSubject('');
    return true;
  };

  const ensureProgress = async (chapterId: string, patch: Partial<Progress>) => {
    if (!session) return;
    const existing = progressFor(chapterId);
    const { data } = await supabase.from('chapter_progress').upsert({ user_id: session.user.id, chapter_id: chapterId, status: existing?.status ?? 'not_started', bookmarked: existing?.bookmarked ?? false, ...patch }, { onConflict: 'user_id,chapter_id' }).select('chapter_id,status,bookmarked').single();
    if (data) { setProgress(old => [...old.filter(item => item.chapter_id !== chapterId), data as Progress]); if(patch.status==='completed'&&existing?.status!=='completed'){const {data:goals}=await supabase.from('study_goals').select('id,current_value,target_value').eq('user_id',session.user.id).eq('category','chapters');for(const goal of goals??[]){const current=Number(goal.current_value);const target=Number(goal.target_value);if(current>=target)continue;const value=current+1;await supabase.from('study_goals').update({current_value:value,completed_at:value>=target?new Date().toISOString():null}).eq('id',goal.id).eq('user_id',session.user.id)}} }
  };

  if (loading) return <div className="loading-screen"><span className="loading-logo"><BookOpen size={23}/></span><span>Getting your desk ready…</span></div>;
  if (!signedIn) return <SignIn/>;
  if (!isAdmin && selectedSubjectIds !== null && selectedSubjectIds.length === 0) return <SubjectSetup subjects={subjects} onSave={saveSubjectChoices}/>;

  const goTab = (name: string) => { setTab(name); setMobileMenu(false); if (tabRoutes[name]) navigate(tabRoutes[name]); if (name === 'Study') document.getElementById('study-library')?.scrollIntoView({ behavior: 'smooth' }); if (name === 'PYQs' || name === 'Important Questions' || name === 'Focus' || name === 'Progress' || name === 'Search') window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const startStudy = (name: string) => { setSelectedSubject(name); goTab('Study'); document.getElementById('study-library')?.scrollIntoView({ behavior: 'smooth' }); };
  const notify = (text: string) => { setNotice(text); window.setTimeout(() => setNotice(''), 3000); };
  const openNotes = async (chapter: Chapter) => {
    const {data,error}=await supabase.from('notes').select('title,storage_path,allow_download,page_count').eq('chapter_id',chapter.id).eq('published',true).order('created_at',{ascending:false}).limit(1).maybeSingle();
    if(error||!data){notify('Handwritten notes for this chapter are coming soon.');return}
    const {data:signed,error:signedError}=await supabase.storage.from('notes-documents').createSignedUrl(data.storage_path,3600);
    if(signedError||!signed){notify('Could not open this notes file. Please try again.');return}
    void ensureProgress(chapter.id,{status:progressFor(chapter.id)?.status==='completed'?'completed':'in_progress'});setViewer({title:data.title,url:signed.signedUrl,image: ['.png','.jpg','.jpeg','.webp'].some(extension=>data.storage_path.toLowerCase().endsWith(extension)),allowDownload:data.allow_download,chapterId:chapter.id,pageCount:data.page_count});
  };

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="sidebar-brand"><Brand /><span className="brand-school">YOUR CLASS {profile?.grade ?? 10} STUDY SPACE</span></div>
      <div className="side-scroll"><div className="nav-label">YOUR SPACE</div><nav className="side-nav">{navItems.map(item => <button key={item.name} onClick={() => goTab(item.name)} className={`nav-link ${`${tab === item.name ? 'active' : ''} ${item.name === 'Focus' ? 'focus-primary' : ''}`}`}><item.icon size={18}/><span>{item.name}</span>{item.name === 'Focus' && <span className="nav-live"/>}</button>)}</nav><div className="nav-label tools-label">STUDY TOOLS</div><nav className="side-nav">{sideTools.map(item => <button key={item.name} onClick={() => goTab(item.name)} className={`nav-link ${tab === item.name || (item.name === 'Quick revision' && tab === 'Revision') ? 'active' : ''}`}><item.icon size={18}/><span>{item.name}</span>{item.name === 'Bookmarks' && bookmarkedCount > 0 && <span className="nav-count">{bookmarkedCount}</span>}</button>)}{isAdmin&&<button onClick={()=>goTab('Admin')} className={`nav-link ${tab==='Admin'?'active':''}`}><Settings2 size={18}/><span>Admin</span></button>}</nav></div>
      <div className="sidebar-bottom"><button className="focus-mini" onClick={() => goTab('Focus')}><span className="focus-mini-icon"><Timer size={18}/></span><span className="focus-mini-copy"><b>{focusChip?`Focus · ${focusChip}`:'Ready when you are'}</b><small>{focusChip?'Your timer is still running':'Start a focus session'}</small></span><ChevronRight size={16}/></button><div className="sidebar-user"><span className="avatar-small">{firstName.charAt(0).toUpperCase()}</span><span className="user-copy"><b>{firstName}</b><small>Class {profile?.grade ?? 10} · CBSE</small></span><button className="icon-plain" aria-label="Settings" onClick={() => notify('Account settings are coming soon')}><Settings2 size={17}/></button></div></div>
    </aside>
    <div className="main-column">
      <header className="topbar"><button className="mobile-brand" onClick={() => setMobileMenu(!mobileMenu)}><Menu size={20}/></button><div className="breadcrumbs"><span>EDVORA</span><ChevronRight size={13}/><b>{tab}</b></div><div className="top-actions">{focusChip&&<button className="live-focus-chip" onClick={()=>goTab('Focus')}><span/> {focusChip} <Timer size={13}/></button>}<button className="search-trigger" onClick={() => goTab('Search')}><Search size={16}/><span>Search anything</span><kbd>⌘ K</kbd></button><button className="top-icon" aria-label="Notifications" onClick={() => notify('You’re all caught up')}><Bell size={18}/><i/></button><button className="avatar-top" onClick={() => goTab('Profile')}>{firstName.charAt(0).toUpperCase()}</button></div></header>
      {mobileMenu && <div className="mobile-menu">{[...navItems,...sideTools.map(tool => ({...tool, name: tool.name === 'Quick revision' ? 'Revision' : tool.name})),...(isAdmin?[{name:'Admin',icon:Settings2}]:[])].map(item => <button key={item.name} onClick={() => goTab(item.name)}><item.icon size={18}/>{item.name}</button>)}</div>}
      {tab==='Important Questions' ? <PYQLibrary userId={session.user.id} subjects={visibleSubjects} chapters={visibleChapters}/> : tab==='Focus' ? <FocusPage userId={session.user.id} subjects={visibleSubjects} chapters={visibleChapters}/> : tab==='Progress' ? <ProgressPage userId={session.user.id} subjects={visibleSubjects} chapters={visibleChapters} progress={progress} sessions={focusSessions} dailyGoal={dailyGoal} onUpdate={(chapterId,status)=>void ensureProgress(chapterId,{status})} onStudy={()=>goTab('Study')}/> : tab==='Admin' ? (rolesReady?<AdminPage isAdmin={isAdmin} subjects={subjects} chapters={chapters} onChapterCreated={chapter=>setChapters(old=>[...old,{...chapter,description:'',ncert_unit:'',notes_status:'coming_soon'}])}/>:<div className="loading-screen">Checking admin access…</div>) : ['Revision','Bookmarks','Planner','Notebook','Profile','Search'].includes(tab) ? <ToolsPage page={tab} userId={session.user.id} email={session.user.email??''} subjects={tab==='Profile'?subjects:visibleSubjects} chapters={tab==='Profile'?chapters:visibleChapters} profile={profile} selectedSubjectIds={selectedSubjectIds??[]} onSubjectsSave={saveSubjectChoices} onProfileUpdate={setProfile}/> : <main className="dashboard">
        {announcement&&<div className="announcement-banner"><span><Bell size={15}/></span><div><b>{announcement.title}</b><small>{announcement.body}</small></div><button onClick={()=>setAnnouncement(null)} aria-label="Dismiss announcement"><X size={14}/></button></div>}
        <div className="welcome-row"><div><div className="session-tag"><span/> YOUR 2026–27 STUDY SPACE</div><h1>{greeting}, {firstName}<span className="greeting-comma">.</span></h1><p className="welcome-sub">A new day is a new chance to get a little closer.</p></div><div className="date-pill"><span className="date-icon"><Sun size={17}/></span><span><b>{now.toLocaleDateString('en-US',{weekday:'long'})}</b><small>{now.toLocaleDateString('en-US',{month:'long',day:'numeric'})}</small></span><ChevronDown size={15}/></div></div>
        <section className="board-countdown"><span className="countdown-icon"><CalendarDays size={19}/></span><div><span className="eyebrow">{profile?.grade===11?'YOUR CLASS 11 FINAL EXAM COUNTDOWN':'YOUR BOARD EXAM COUNTDOWN'}</span><b>{profile?.exam_date?(()=>{const parts=profile.exam_date.split("-").map(Number);const days=Math.ceil((Date.UTC(parts[0],parts[1]-1,parts[2])-Date.UTC(now.getFullYear(),now.getMonth(),now.getDate()))/86400000);return days>0?`${days} days to go`:days===0?"Your exam is today":"Exam date has passed"})():"Set an exam date in your Profile"}</b><small>{profile?.exam_date?new Date(profile.exam_date+"T12:00:00").toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric",year:"numeric"}):"Add your date to see the countdown here"}</small></div><button onClick={()=>goTab("Profile")}>{profile?.exam_date?"Update date":"Set exam date"} <ArrowRight size={14}/></button></section><section className="hero-card"><div className="hero-content"><div className="hero-kicker"><span className="sparkle-dot"><Sparkles size={12}/></span> A NOTE FOR TODAY</div><h2>Small steps.<br/><em>Bright futures.</em></h2><p>Every page you read, every problem you solve — it all adds up. Keep showing up for yourself.</p><button onClick={() => goTab('Study')} className="hero-button">Continue your journey <ArrowRight size={16}/></button><div className="hero-note"><span className="note-avatars"><i>I</i><i>✦</i><i>+</i></span><span>Made for the way <b>you learn</b></span></div></div><div className="hero-art" aria-hidden="true"><div className="hero-sun">✳</div><div className="hero-desk"><div className="desk-book"><div/><div/></div><div className="desk-pencil"/><div className="desk-cup"><span/></div></div><div className="hero-plant"><i/><i/><i/><b/></div><div className="hero-lamp"><i/><b/></div><div className="hero-spark sp-a">✳</div><div className="hero-spark sp-b">✦</div><div className="hero-cloud cloud-a"/><div className="hero-cloud cloud-b"/></div><div className="hero-index">01 <span/> 03</div></section>
        <div className="section-heading metric-heading"><div><span className="eyebrow">YOUR MOMENTUM</span><h2>A little goes a long way</h2></div><button className="subtle-link" onClick={() => goTab('Progress')}>View your progress <ArrowRight size={15}/></button></div>
        <section className="metrics-grid"><MetricCard icon={Clock3} iconClass="lavender" label="STUDY TIME" value={fmtMinutes(Math.floor(totalFocusSeconds/60))} sub="Across all your sessions"/><MetricCard icon={Target} iconClass="peach" label="TODAY’S FOCUS" value={`${Math.floor(todayFocusSeconds/60)} min`} sub={`Your daily goal · ${dailyGoal} min`} progress={Math.min(100,todayFocusSeconds/(dailyGoal*60)*100)}/><MetricCard icon={BookOpen} iconClass="mint" label="CHAPTERS DONE" value={String(completedCount).padStart(2,'0')} sub={`Out of ${visibleChapters.length || 0} chapters`} trend="Keep it up"/><MetricCard icon={Bookmark} iconClass="butter" label="SAVED FOR LATER" value={String(bookmarkedCount).padStart(2,'0')} sub="Your little collection"/></section>
        <section className="learning-layout"><div className="learning-main" id="study-library"><div className="section-heading"><div><span className="eyebrow">PICK UP WHEREVER YOU LIKE</span><h2>Your study library</h2></div><button className="text-link" onClick={() => {setSelectedSubject(''); setTab('Study')}}>All subjects <ArrowRight size={15}/></button></div><div className="subject-grid">{visibleSubjects.map((subject,index) => {const Icon=iconFor(subject.name); const count=visibleChapters.filter(c=>c.subject_id===subject.id).length; const done=visibleChapters.filter(c=>c.subject_id===subject.id && progressFor(c.id)?.status==='completed').length; return <button key={subject.id} className={`subject-card subject-${subject.theme} ${selectedSubject===subject.id?'subject-selected':''}`} onClick={()=>{setSelectedSubject(selectedSubject===subject.id?'':subject.id);setTab('Study')}}><span className="subject-top"><span className="subject-icon"><Icon size={20}/></span><span className="subject-arrow"><ArrowDownRight size={16}/></span></span><span className="subject-name">{subject.name}</span><span className="subject-desc">{subject.description}</span><span className="subject-bottom"><span>{count ? `${count} chapters` : 'Explore chapters'}</span><span className="subject-progress">{done}/{count || '—'} <i style={{width: count ? `${Math.round(done/count*100)}%` : '0%'}}/></span></span><span className={`subject-decoration deco-${index}`}>{subject.name==='Mathematics'?'∑':subject.name==='Science'?'✳':subject.name==='Social Science'?'◉':'✦'}</span></button>})}</div>
        <div className="chapter-heading"><div><span className="eyebrow">{selected ? selected.name.toUpperCase() : 'A GOOD PLACE TO START'}</span><h2>{tab==='Study'?(selected?'Chapter shelf':'All chapters'):selected?'Recently studied':'Your recent chapters'}</h2></div><div className="chapter-tools"><div className="chapter-search"><Search size={15}/><input id="chapter-search" placeholder="Find a chapter" value={search} onChange={event=>setSearch(event.target.value)}/>{search&&<button onClick={()=>setSearch('')} aria-label="Clear search"><X size={13}/></button>}</div><button className="filter-button" onClick={()=>setSelectedSubject('')}><span>{selected?.name.split(' ')[0] ?? 'All subjects'}</span><ChevronDown size={14}/></button></div></div>
        <div className="chapter-list">{shelfChapters.map(({chapter,seconds})=>{const subject=subjects.find(s=>s.id===chapter.subject_id);const status=progressFor(chapter.id)?.status??'not_started';const saved=progressFor(chapter.id)?.bookmarked??false;return <article className="chapter-row" role="button" tabIndex={0} onClick={()=>setStudyChapter(chapter)} onKeyDown={event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();setStudyChapter(chapter)}}} key={chapter.id}><div className={`chapter-number theme-${subject?.theme??'violet'}`}>{String(chapter.chapter_number).padStart(2,'0')}</div><div className="chapter-title"><span>{chapter.title}</span><small>{subject?.name} <i/> Chapter {chapter.chapter_number} · {fmtMinutes(Math.floor(seconds/60))} focused</small></div><span className={`chapter-status status-${status}`}>{status==='completed'?<Check size={12}/>:status==='in_progress'?<span className="status-pulse"/>:null}{status.replace('_',' ')}</span><button className={`bookmark-button ${saved?'is-saved':''}`} aria-label={saved?'Remove bookmark':'Bookmark chapter'} onClick={event=>{event.stopPropagation();void ensureProgress(chapter.id,{bookmarked:!saved})}}><Bookmark size={17} fill={saved?'currentColor':'none'}/></button><button className="chapter-open" aria-label={`Open ${chapter.title}`} onClick={event=>{event.stopPropagation();setStudyChapter(chapter)}}><ChevronRight size={17}/></button></article>})}{shelfChapters.length===0&&<div className="empty-chapters"><Search size={22}/><b>{tab==='Study'?'No chapters found':focusSessions.some(item=>item.chapter_id)?'No recent chapters match':'Your recent chapters will appear here'}</b><span>{tab==='Study'?'Try a different subject or search.':'Choose a subject and chapter when you start a focus session.'}</span></div>}</div><button className="all-chapters" onClick={()=>{if(tab==='Study')setSearch('');else goTab('Study')}}>{tab==='Study'?(search?'Clear chapter search':`Showing ${shelfChapters.length} chapters`):'Browse all chapters'} <ArrowRight size={15}/></button></div>
        <aside className="learning-aside"><div className="aside-head"><div><span className="eyebrow">YOUR DAILY RHYTHM</span><h3>Today, in focus</h3></div><MoreHorizontal size={19}/></div><div className="focus-empty"><div className="focus-ring"><div className="focus-ring-inner"><Clock3 size={22}/><b>{Math.floor(todayFocusSeconds/60)}m</b><span>FOCUSED TODAY</span></div></div><p>Every focused minute<br/>starts with one.</p><button onClick={()=>goTab('Focus')}>Start a focus session <ArrowRight size={14}/></button></div><div className="aside-divider"/><div className="week-head"><div><span className="eyebrow">YOUR WEEK</span><h3>Show up, your way</h3></div><span className="week-total">{weeklyDays} / 7 days</span></div><div className="week-chart">{['M','T','W','T','F','S','S'].map((day,index)=><div className="week-day" key={`${day}-${index}`}><div className="week-bar-wrap"><i className={index===now.getDay()-1?'today-bar':''} style={{height:`${Math.max(4,weeklyMinutes[index]/Math.max(1,...weeklyMinutes)*100)}%`}}/></div><span className={index===now.getDay()-1?'is-today':''}>{day}</span></div>)}</div><div className="week-foot"><span><span className="week-dot"/> One session at a time</span><ArrowRight size={14}/></div><div className="streak-card"><span className="streak-icon"><Flame size={17}/></span><span><b>{streakDays ? 'A lovely rhythm' : 'Start your rhythm'}</b><small>{streakDays ? 'Keep showing up, your way' : 'One focused day at a time'}</small></span><span className="streak-days">{streakDays} <small>days</small></span></div></aside></section>
        <ChapterDeadlines userId={session.user.id} chapters={visibleChapters} subjects={visibleSubjects}/>
        <section className="bottom-nudge"><div className="nudge-icon"><Leaf size={20}/></div><div><span className="eyebrow">A GENTLE REMINDER</span><p>You don’t have to do it all today. Just take the <em>next small step.</em></p></div><button onClick={()=>goTab('Focus')}>Take a moment <ArrowRight size={15}/></button><span className="nudge-spark">✳</span></section>
        <footer className="footer"><span>© 2026 EDVORA</span><span>Made for curious minds <span className="footer-heart">✳</span></span><button onClick={()=>notify('Need a hand? Reach out to your administrator')}><CircleHelp size={14}/> Need a hand?</button></footer>
      </main>}
    </div>
    <nav className="mobile-bottom">{navItems.map(item=><button key={item.name} className={tab===item.name?'selected':''} onClick={() => goTab(item.name)}><item.icon size={19}/><span>{item.name}</span></button>)}<button onClick={()=>setMobileMenu(!mobileMenu)}><MoreHorizontal size={19}/><span>More</span></button></nav>
    {studyChapter&&<div className="chapter-actions-overlay" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget)setStudyChapter(null)}}><section className="chapter-actions-dialog" role="dialog" aria-modal="true" aria-labelledby="chapter-actions-title"><header><span><small>{subjects.find(subject=>subject.id===studyChapter.subject_id)?.name} · CHAPTER {studyChapter.chapter_number}</small><b id="chapter-actions-title">{studyChapter.title}</b></span><button onClick={()=>setStudyChapter(null)} aria-label="Close chapter options"><X size={18}/></button></header><p>Choose how you’d like to study this chapter.</p><a href="https://ncert.nic.in/textbook.php" target="_blank" rel="noreferrer"><span className="chapter-option-icon">N</span><span><b>NCERT textbook</b><small>Open the official NCERT textbook portal</small></span><SquareArrowOutUpRight size={16}/></a><button className="chapter-resource-button" onClick={()=>{const chapter=studyChapter;setStudyChapter(null);void openNotes(chapter)}}><span className="chapter-option-icon handwritten-icon"><BookOpen size={17}/></span><span><b>Handwritten notes</b><small>Open the latest notes shared for this chapter</small></span><ChevronRight size={17}/></button></section></div>}{viewer&&<div className="notes-overlay" role="dialog" aria-modal="true" aria-label={viewer.title}><div className="notes-dialog"><header><span><b>{viewer.title}</b><small>{chapters.find(chapter=>chapter.id===viewer.chapterId)?.title}</small></span><button onClick={()=>setViewer(null)} aria-label="Close notes"><X size={18}/></button></header><div className="notes-document">{viewer.image?<img src={viewer.url} alt={viewer.title}/>:<iframe title={viewer.title} src={viewer.url}/>}</div><footer><span>{viewer.pageCount?viewer.pageCount+' pages':''}</span><button onClick={()=>{void ensureProgress(viewer.chapterId,{status:'completed'});setViewer(null)}}><Check size={13}/> Mark completed</button><button onClick={()=>{void ensureProgress(viewer.chapterId,{status:'needs_revision'});setViewer(null)}}>Flag for revision</button>{viewer.allowDownload&&<a href={viewer.url} download target="_blank" rel="noreferrer">Download</a>}</footer></div></div>}
    {notice&&<div className="toast-note"><span>✦</span>{notice}<button onClick={()=>setNotice('')}><X size={14}/></button></div>}
    <button className="signout-button" onClick={async()=>{await supabase.auth.signOut();sessionStorage.removeItem('edvora-admin')}}>Sign out</button>
  </div>;
}

function MetricCard({icon:Icon,iconClass,label,value,sub,progress,trend}: {icon: typeof Clock3; iconClass:string;label:string;value:string;sub:string;progress?:number;trend?:string}) {
  return <article className="metric-card"><div className="metric-top"><span className={`metric-icon ${iconClass}`}><Icon size={17}/></span><span className="metric-label">{label}</span>{trend&&<span className="metric-trend"><Sparkles size={12}/>{trend}</span>}</div><div className="metric-value">{value}</div><div className="metric-sub">{sub}</div>{progress!==undefined&&<div className="metric-progress"><i style={{width:`${progress}%`}}/></div>}</article>;
}


function SubjectSetup({ subjects, onSave }: { subjects: Subject[]; onSave: (ids: string[]) => Promise<boolean> }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const toggle = (id: string) => setSelected(current => current.includes(id) ? current.filter(value => value !== id) : [...current, id]);
  const submit = async () => { setSaving(true); setError(''); const saved = await onSave(selected); setSaving(false); if (!saved) setError('Could not save your subjects. Please try again.'); };
  return <main className="subject-onboarding"><div className="subject-onboarding-card"><Brand/><span className="eyebrow">YOUR CLASS {subjects.some(subject=>subject.name.startsWith('Class 11 · '))?11:10} STUDY SPACE</span><h1>What subjects<br/><em>do you study?</em></h1><p>Choose the subjects you carry this year. You can change these later from your profile.</p><div className="subject-choice-grid">{subjects.map(subject=><button type="button" key={subject.id} onClick={()=>toggle(subject.id)} className={selected.includes(subject.id)?'chosen':''}><span className="subject-choice-check">{selected.includes(subject.id)?'✓':''}</span><span><b>{subject.name}</b><small>{subject.description}</small></span></button>)}</div>{error&&<p role="alert" className="auth-error">{error}</p>}<button className="auth-submit" disabled={!selected.length||saving} onClick={()=>void submit()}>{saving?'Saving your choices…':'Build my study space'} <span>→</span></button></div></main>;
}

export default Index;
