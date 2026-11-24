import { FormEvent, useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowRight, Bookmark, BookOpen, CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight, Clock3, FileText, Flame, Plus, Search, Sparkles, Target, Trash2, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import './tools.css';

type Subject={id:string;name:string;theme:string};
type Chapter={id:string;subject_id:string;title:string;chapter_number:number};
type Profile={full_name:string|null;daily_goal_minutes:number;exam_date:string|null};
type Material={id:string;subject_id:string|null;category:string;title:string;content:string;published:boolean};
type NotebookPage={id:string;subject_id:string|null;title:string;content:string;updated_at:string};
type PlannerEvent={id:string;title:string;notes:string;starts_at:string;ends_at:string|null;completed:boolean;subject_id:string|null;event_type:string};
type StudyGoal={id:string;title:string;category:string;target_value:number;current_value:number;unit:string;due_on:string|null};
type Props={page:string;userId:string;email:string;subjects:Subject[];chapters:Chapter[];profile:Profile|null;onProfileUpdate:(profile:Profile)=>void};
type SearchResult={type:string;title:string;description:string;subject:string;action:string};
const localDate=(date:Date)=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;

export default function ToolsPage({page,userId,email,subjects,chapters,profile,onProfileUpdate}:Props){
  const [materials,setMaterials]=useState<Material[]>([]);
  const [materialBookmarks,setMaterialBookmarks]=useState<string[]>([]);
  const [bookmarkedChapters,setBookmarkedChapters]=useState<Chapter[]>([]);
  const [bookmarkedQuestions,setBookmarkedQuestions]=useState<{id:string;question_text:string;exam_year:number|null;marks:number;subject_id:string;chapter_id:string}[]>([]);
  const [notebook,setNotebook]=useState<NotebookPage[]>([]);
  const [activeNote,setActiveNote]=useState<NotebookPage|null>(null);
  const [noteSaved,setNoteSaved]=useState(true);
  const [events,setEvents]=useState<PlannerEvent[]>([]);
  const [goals,setGoals]=useState<StudyGoal[]>([]);
  const [focusMinutes,setFocusMinutes]=useState(0);
  const [answeredQuestions,setAnsweredQuestions]=useState(0);
  const [searchText,setSearchText]=useState('');
  const [searchResults,setSearchResults]=useState<SearchResult[]>([]);
  const [category,setCategory]=useState('All');
  const [selectedSubject,setSelectedSubject]=useState('');
  const [plannerWeek,setPlannerWeek]=useState(()=>{const date=new Date();date.setDate(date.getDate()-((date.getDay()+6)%7));return date});
  const [selectedDate,setSelectedDate]=useState(localDate(new Date()));
  const [eventTitle,setEventTitle]=useState('');
  const [eventTime,setEventTime]=useState('16:00');
  const [eventSubject,setEventSubject]=useState('');
  const [goalTitle,setGoalTitle]=useState('');
  const [goalTarget,setGoalTarget]=useState('');
  const [goalUnit,setGoalUnit]=useState('minutes');
  const [profileName,setProfileName]=useState(profile?.full_name??'');
  const [dailyGoal,setDailyGoal]=useState(profile?.daily_goal_minutes??120);
  const [examDate,setExamDate]=useState(profile?.exam_date??'');
  const [newPassword,setNewPassword]=useState('');
  const [status,setStatus]=useState('');
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [calendarMode,setCalendarMode]=useState<'week'|'month'>('week');
  const filteredChapters=chapters.filter(chapter=>!selectedSubject||chapter.subject_id===selectedSubject);
  const categories=['All','Formulas','Key definitions','Important dates','Maps & facts','Grammar rules'];

  useEffect(()=>{setProfileName(profile?.full_name??'');setDailyGoal(profile?.daily_goal_minutes??120);setExamDate(profile?.exam_date??'')},[profile]);
  useEffect(()=>{
    let alive=true;
    const load=async()=>{
      if(page==='Revision'||page==='Bookmarks'){
        const [{data:materialRows},{data:materialMarkRows}]=await Promise.all([
          supabase.from('revision_materials').select('id,subject_id,category,title,content,published').eq('published',true).order('created_at',{ascending:false}),
          supabase.from('material_bookmarks').select('material_id').eq('user_id',userId),
        ]);
        if(alive){setMaterials((materialRows??[]) as Material[]);setMaterialBookmarks((materialMarkRows??[]).map(row=>row.material_id));}
      }
      if(page==='Notebook'){
        const {data}=await supabase.from('notebook_pages').select('id,subject_id,title,content,updated_at').eq('user_id',userId).order('updated_at',{ascending:false});
        if(alive){const rows=(data??[]) as NotebookPage[];setNotebook(rows);setActiveNote(rows[0]??null);}
      }
      if(page==='Bookmarks'){
        const [{data:chapterRows},{data:questionRows}]=await Promise.all([
          supabase.from('chapter_progress').select('chapter_id,chapters(id,title,chapter_number,subject_id)').eq('user_id',userId).eq('bookmarked',true),
          supabase.from('question_attempts').select('question_id,questions(id,question_text,exam_year,marks,subject_id,chapter_id)').eq('user_id',userId).eq('bookmarked',true),
        ]);
        if(alive){setBookmarkedChapters((chapterRows??[]).flatMap(row=>Array.isArray(row.chapters)?row.chapters:row.chapters?[row.chapters]:[]) as Chapter[]);setBookmarkedQuestions((questionRows??[]).flatMap(row=>Array.isArray(row.questions)?row.questions:row.questions?[row.questions]:[]) as typeof bookmarkedQuestions);}
      }
      if(page==='Planner'){
        const [{data:eventRows},{data:goalRows},{data:focusRows},{data:attemptRows}]=await Promise.all([
          supabase.from('planner_events').select('id,title,notes,starts_at,ends_at,completed,subject_id,event_type').eq('user_id',userId).order('starts_at'),
          supabase.from('study_goals').select('id,title,category,target_value,current_value,unit,due_on').eq('user_id',userId).order('created_at',{ascending:false}),
          supabase.from('focus_sessions').select('duration_seconds').eq('user_id',userId),
          supabase.from('question_attempts').select('question_id').eq('user_id',userId),
        ]);
        if(alive){setEvents((eventRows??[]) as PlannerEvent[]);setGoals((goalRows??[]) as StudyGoal[]);setFocusMinutes(Math.floor((focusRows??[]).reduce((sum,row)=>sum+Number(row.duration_seconds),0)/60));setAnsweredQuestions((attemptRows??[]).length);}
      }
      setLoading(false);
    };
    setLoading(true);void load();return()=>{alive=false};
  },[page,userId]);

  useEffect(()=>{
    if(page!=='Search'||!searchText.trim()){setSearchResults([]);return}
    let alive=true;const delay=window.setTimeout(async()=>{
      const needle=searchText.trim();
      const [{data:subjectRows},{data:chapterRows},{data:questionRows},{data:materialRows},{data:noteRows}]=await Promise.all([
        supabase.from('subjects').select('id,name').ilike('name',`%${needle}%`).limit(6),
        supabase.from('chapters').select('id,title,subject_id').ilike('title',`%${needle}%`).limit(10),
        supabase.from('questions').select('id,question_text,subject_id,exam_year').eq('published',true).ilike('question_text',`%${needle}%`).limit(10),
        supabase.from('revision_materials').select('id,title,category,subject_id').eq('published',true).ilike('title',`%${needle}%`).limit(8),
        supabase.from('notebook_pages').select('id,title,content,subject_id').eq('user_id',userId).order('updated_at',{ascending:false}).limit(100),
      ]);
      if(!alive)return;
      const subjectName=(id:string|null)=>subjects.find(s=>s.id===id)?.name??'';
      setSearchResults([
        ...(subjectRows??[]).map(row=>({type:'Subject',title:row.name,description:'Explore this subject',subject:'Class 10 CBSE',action:'/study'})),
        ...(chapterRows??[]).map(row=>({type:'Chapter',title:row.title,description:'Chapter in your study library',subject:subjectName(row.subject_id),action:'/study'})),
        ...(questionRows??[]).map(row=>({type:'Question',title:row.question_text,description:row.exam_year?`CBSE ${row.exam_year} question`:'CBSE-style practice question',subject:subjectName(row.subject_id),action:'/pyqs'})),
        ...(materialRows??[]).map(row=>({type:row.category,title:row.title,description:'Quick revision material',subject:subjectName(row.subject_id),action:'/revision'})),
        ...(noteRows??[]).filter(row=>`${row.title} ${row.content}`.toLowerCase().includes(needle.toLowerCase())).slice(0,8).map(row=>({type:'Notebook',title:row.title,description:'Your private note',subject:subjectName(row.subject_id),action:'/notebook'})),
      ]);
    },220);
    return()=>{alive=false;window.clearTimeout(delay)};
  },[page,searchText,userId,subjects]);

  const filteredMaterials=useMemo(()=>materials.filter(item=>(category==='All'||item.category===category)&&(!selectedSubject||item.subject_id===selectedSubject)&&`${item.title} ${item.content}`.toLowerCase().includes(searchText.toLowerCase())),[materials,category,selectedSubject,searchText]);
  const saveBookmark=async(materialId:string)=>{
    if(materialBookmarks.includes(materialId)){await supabase.from('material_bookmarks').delete().eq('user_id',userId).eq('material_id',materialId);setMaterialBookmarks(old=>old.filter(id=>id!==materialId))}
    else{const {error}=await supabase.from('material_bookmarks').insert({user_id:userId,material_id:materialId});if(!error)setMaterialBookmarks(old=>[...old,materialId])}
  };
  const createNote=async()=>{const {data,error}=await supabase.from('notebook_pages').insert({user_id:userId,title:'Untitled note',content:'',subject_id:selectedSubject||null}).select('id,subject_id,title,content,updated_at').single();if(error){setStatus(error.message);return}if(data){setNotebook(old=>[data as NotebookPage,...old]);setActiveNote(data as NotebookPage);setNoteSaved(true)}};
  useEffect(()=>{
    if(page!=='Notebook'||!activeNote||!notebook.some(note=>note.id===activeNote.id))return;
    setNoteSaved(false);const timer=window.setTimeout(async()=>{const {error}=await supabase.from('notebook_pages').update({title:activeNote.title,content:activeNote.content,subject_id:activeNote.subject_id,updated_at:new Date().toISOString()}).eq('id',activeNote.id).eq('user_id',userId);if(!error){setNotebook(items=>items.map(note=>note.id===activeNote.id?{...activeNote,updated_at:new Date().toISOString()}:note));setNoteSaved(true)}},650);return()=>window.clearTimeout(timer);
  },[activeNote,page,userId]);

  const submitEvent=async(event:FormEvent)=>{event.preventDefault();if(!eventTitle.trim())return;const startsAt=new Date(`${selectedDate}T${eventTime}:00`);const {data,error}=await supabase.from('planner_events').insert({user_id:userId,title:eventTitle.trim(),notes:'',starts_at:startsAt.toISOString(),subject_id:eventSubject||null,event_type:'study'}).select('id,title,notes,starts_at,ends_at,completed,subject_id,event_type').single();if(error){setStatus(error.message);return}if(data){setEvents(old=>[...old,data as PlannerEvent].sort((a,b)=>a.starts_at.localeCompare(b.starts_at)));setEventTitle('');setStatus('Study block added to your planner.')}};
  const addGoal=async(event:FormEvent)=>{event.preventDefault();if(!goalTitle.trim()||Number(goalTarget)<=0)return;const {data,error}=await supabase.from('study_goals').insert({user_id:userId,title:goalTitle.trim(),category:goalUnit==='questions'?'questions':'study_minutes',target_value:Number(goalTarget),unit:goalUnit}).select('id,title,category,target_value,current_value,unit,due_on').single();if(error){setStatus(error.message);return}if(data){setGoals(old=>[data as StudyGoal,...old]);setGoalTitle('');setGoalTarget('')}};
  const toggleEvent=async(item:PlannerEvent)=>{const {error}=await supabase.from('planner_events').update({completed:!item.completed}).eq('id',item.id).eq('user_id',userId);if(!error)setEvents(old=>old.map(event=>event.id===item.id?{...event,completed:!event.completed}:event))};
  const deleteEvent=async(id:string)=>{const {error}=await supabase.from('planner_events').delete().eq('id',id).eq('user_id',userId);if(!error)setEvents(old=>old.filter(event=>event.id!==id))};
  const updateProfile=async(event:FormEvent)=>{event.preventDefault();setSaving(true);const values={full_name:profileName.trim(),daily_goal_minutes:dailyGoal,exam_date:examDate||null};const {error}=await supabase.from('profiles').update(values).eq('id',userId);if(!error)await supabase.auth.updateUser({data:{full_name:profileName.trim()}});setSaving(false);if(error)setStatus(error.message);else{onProfileUpdate({...values});setStatus('Your profile is saved.')}};
  const updatePassword=async()=>{if(newPassword.length<6){setStatus('Use at least 6 characters for your new password.');return}const {error}=await supabase.auth.updateUser({password:newPassword});if(error)setStatus(error.message);else{setNewPassword('');setStatus('Your password has been updated.')}};

  const header=(eyebrow:string,title:string,description:string,action?:React.ReactNode)=><div className="tool-header"><div><span className="tool-eyebrow">{eyebrow}</span><h1>{title}</h1><p>{description}</p></div>{action}</div>;
  const statusMessage=status&&<div className="tool-status" role="status">{status}<button onClick={()=>setStatus('')} aria-label="Dismiss"><X size={14}/></button></div>;
  const subjectLabel=(id:string|null)=>subjects.find(subject=>subject.id===id)?.name??'All subjects';
  const startOfWeek=new Date(plannerWeek);const weekDays=Array.from({length:7},(_,index)=>{const date=new Date(startOfWeek);date.setDate(startOfWeek.getDate()+index);return date});
  const monthDays=Array.from({length:35},(_,index)=>{const first=new Date(plannerWeek.getFullYear(),plannerWeek.getMonth(),1);const offset=(first.getDay()+6)%7;const date=new Date(first);date.setDate(1-offset+index);return date});
  const visibleEvents=events.filter(event=>localDate(new Date(event.starts_at))===selectedDate);
  const currentSelectedDate=new Date(`${selectedDate}T12:00:00`);

  if(page==='Revision')return <main className="tools-page">{header('THE QUICK-RECALL LIBRARY','A little review goes a long way.','The small, high-impact details that make everything click.')}<div className="tool-filter-row"><div className="tool-search"><Search size={16}/><input placeholder="Find a formula, definition or fact…" value={searchText} onChange={event=>setSearchText(event.target.value)}/></div><label className="tool-subject-select"><select value={selectedSubject} onChange={event=>setSelectedSubject(event.target.value)}><option value="">All subjects</option>{subjects.map(subject=><option key={subject.id} value={subject.id}>{subject.name}</option>)}</select><ChevronDown size={14}/></label></div><div className="revision-tabs">{categories.map(item=><button key={item} className={category===item?'active':''} onClick={()=>setCategory(item)}>{item}</button>)}</div>{loading?<div className="tool-loading">Gathering your revision cards…</div>:filteredMaterials.length?<div className="revision-grid">{filteredMaterials.map(item=><article className="revision-card" key={item.id}><div className="revision-card-top"><span className="revision-category">{item.category}</span><button className={`tool-bookmark ${materialBookmarks.includes(item.id)?'saved':''}`} onClick={()=>void saveBookmark(item.id)} aria-label="Bookmark revision material"><Bookmark size={16} fill={materialBookmarks.includes(item.id)?'currentColor':'none'}/></button></div><span className="revision-subject">{subjectLabel(item.subject_id)}</span><h2>{item.title}</h2><p>{item.content}</p><span className="revision-card-foot"><Sparkles size={13}/> Keep this one close</span></article>)}</div>:<div className="tool-empty"><span><BookOpen size={22}/></span><b>Your quick-revision shelf is ready.</b><p>Revision cards added by your teacher will appear here.</p></div>}{statusMessage}</main>;

  if(page==='Bookmarks')return <main className="tools-page">{header('YOUR LITTLE COLLECTION','Saved for another day.','Everything you bookmarked, all in one quiet corner.')}<div className="bookmark-collection">{bookmarkedChapters.length===0&&bookmarkedQuestions.length===0&&materialBookmarks.length===0?<div className="tool-empty"><span><Bookmark size={22}/></span><b>A little space for the things you want to keep.</b><p>Bookmark a chapter, practice question, or revision card to find it here.</p><a href="/study">Explore your study shelf <ArrowRight size={14}/></a></div>:<><section><div className="collection-title"><BookOpen size={16}/><h2>Chapters</h2><span>{bookmarkedChapters.length}</span></div>{bookmarkedChapters.map(chapter=><a className="saved-row" key={chapter.id} href="/study"><span className="saved-number">{String(chapter.chapter_number).padStart(2,'0')}</span><span><b>{chapter.title}</b><small>{subjectLabel(chapter.subject_id)}</small></span><ArrowRight size={15}/></a>)}</section><section><div className="collection-title"><Target size={16}/><h2>Practice questions</h2><span>{bookmarkedQuestions.length}</span></div>{bookmarkedQuestions.map(question=><a className="saved-row" key={question.id} href="/pyqs"><span className="saved-number question-saved">Q</span><span><b>{question.question_text}</b><small>{subjectLabel(question.subject_id)} · {question.marks} marks {question.exam_year?`· ${question.exam_year}`:''}</small></span><ArrowRight size={15}/></a>)}</section><section><div className="collection-title"><Sparkles size={16}/><h2>Revision cards</h2><span>{materialBookmarks.length}</span></div>{materials.filter(item=>materialBookmarks.includes(item.id)).map(item=><a className="saved-row" key={item.id} href="/revision"><span className="saved-number card-saved">✦</span><span><b>{item.title}</b><small>{item.category} · {subjectLabel(item.subject_id)}</small></span><ArrowRight size={15}/></a>)}</section></>}</div>{statusMessage}</main>;

  if(page==='Planner')return <main className="tools-page">{header('MAKE A LITTLE PLAN','A plan that feels like yours.','Map out your study rhythm, leave room to breathe.')}<div className="planner-layout"><section className="planner-calendar"><div className="calendar-toolbar"><div><span className="tool-eyebrow">YOUR CALENDAR</span><h2>{plannerWeek.toLocaleDateString('en-US',{month:'long',year:'numeric'})}</h2></div><div className="calendar-controls"><div className="calendar-view-toggle"><button className={calendarMode==='week'?'selected':''} onClick={()=>setCalendarMode('week')}>Week</button><button className={calendarMode==='month'?'selected':''} onClick={()=>setCalendarMode('month')}>Month</button></div><button onClick={()=>{const next=new Date(plannerWeek);next.setDate(next.getDate()+(calendarMode==='week'?7:35));setPlannerWeek(next)}} aria-label="Next period"><ChevronRight size={16}/></button><button onClick={()=>{const next=new Date(plannerWeek);next.setDate(next.getDate()-(calendarMode==='week'?7:35));setPlannerWeek(next)}} aria-label="Previous period"><ChevronLeft size={16}/></button></div></div><div className={`calendar-grid ${calendarMode==='month'?'month-view':''}`}><div className="calendar-weekdays">{['MON','TUE','WED','THU','FRI','SAT','SUN'].map(day=><span key={day}>{day}</span>)}</div>{(calendarMode==='week'?weekDays:monthDays).map(date=>{const key=localDate(date);const dayEvents=events.filter(event=>localDate(new Date(event.starts_at))===key);return <button className={`calendar-day ${selectedDate===key?'selected':''} ${date.getMonth()!==plannerWeek.getMonth()?'outside':''}`} key={key} onClick={()=>setSelectedDate(key)}><span className="calendar-date">{date.getDate()}</span>{dayEvents.slice(0,2).map(event=><i key={event.id} className={event.completed?'event-complete':''}>{event.title}</i>)}</button>})}</div><div className="calendar-selected"><div><span className="tool-eyebrow">YOUR DAY</span><h3>{currentSelectedDate.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'})}</h3></div><span>{visibleEvents.length} {visibleEvents.length===1?'block':'blocks'}</span></div>{visibleEvents.map(event=><div className="planner-event" key={event.id}><button className={`event-check ${event.completed?'done':''}`} onClick={()=>void toggleEvent(event)}>{event.completed&&<Check size={13}/>}</button><span className="event-time">{new Date(event.starts_at).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'})}</span><span className="event-copy"><b>{event.title}</b><small>{subjectLabel(event.subject_id)}</small></span><button className="event-delete" onClick={()=>void deleteEvent(event.id)} aria-label="Delete event"><Trash2 size={14}/></button></div>)}<form className="add-event-form" onSubmit={submitEvent}><input value={eventTitle} onChange={event=>setEventTitle(event.target.value)} placeholder="Add a study block" required/><input type="time" value={eventTime} onChange={event=>setEventTime(event.target.value)}/><select value={eventSubject} onChange={event=>setEventSubject(event.target.value)}><option value="">Subject</option>{subjects.map(subject=><option key={subject.id} value={subject.id}>{subject.name}</option>)}</select><button><Plus size={15}/></button></form></section><aside className="goals-panel"><div className="goals-heading"><div><span className="tool-eyebrow">AIM A LITTLE HIGHER</span><h2>Your study goals</h2></div><Target size={18}/></div><form className="goal-form" onSubmit={addGoal}><input value={goalTitle} onChange={event=>setGoalTitle(event.target.value)} placeholder="A goal you care about" required/><div><input type="number" min="1" value={goalTarget} onChange={event=>setGoalTarget(event.target.value)} placeholder="Target" required/><select value={goalUnit} onChange={event=>setGoalUnit(event.target.value)}><option value="minutes">minutes</option><option value="questions">questions</option></select><button aria-label="Add goal"><Plus size={15}/></button></div></form>{goals.length?goals.map(goal=>{const current=goal.category==='study_minutes'?focusMinutes:goal.category==='questions'?answeredQuestions:Number(goal.current_value);const percent=Math.min(100,current/Number(goal.target_value)*100);return <article className="goal-card" key={goal.id}><div className="goal-card-top"><span><b>{goal.title}</b><small>{current} / {goal.target_value} {goal.unit}</small></span><span className="goal-percent">{Math.round(percent)}%</span></div><div className="goal-progress"><i style={{width:`${percent}%`}}/></div><span className="goal-percent">{Math.round(percent)}% there</span></article>}):<div className="goals-empty"><span><Flame size={18}/></span><p>Set a goal that feels<br/>worth showing up for.</p></div>}</aside></div>{statusMessage}</main>;

  if(page==='Notebook')return <main className="tools-page">{header('YOUR PRIVATE NOTEBOOK','Thoughts, ideas, yours.','A calm place to jot something down before it slips away.',<button className="tool-primary" onClick={()=>void createNote()}><Plus size={15}/> New note</button>)}<div className="notebook-layout"><aside className="note-list"><span className="tool-eyebrow">YOUR NOTES · {notebook.length}</span>{notebook.map(note=><button className={`note-list-item ${activeNote?.id===note.id?'active':''}`} key={note.id} onClick={()=>{setActiveNote(note);setSelectedSubject(note.subject_id??'')}}><FileText size={15}/><span><b>{note.title||'Untitled note'}</b><small>{note.updated_at?new Date(note.updated_at).toLocaleDateString('en-US',{month:'short',day:'numeric'}):'Just now'}</small></span></button>)}{!notebook.length&&!loading&&<p className="note-list-empty">Start with a blank page.</p>}</aside>{activeNote?<section className="notebook-editor"><div className="notebook-toolbar"><span className="save-indicator"><i className={noteSaved?'saved':''}/>{noteSaved?'All changes saved':'Saving…'}</span><label>SUBJECT <select value={activeNote.subject_id??''} onChange={event=>setActiveNote({...activeNote,subject_id:event.target.value||null})}><option value="">General notes</option>{subjects.map(subject=><option key={subject.id} value={subject.id}>{subject.name}</option>)}</select></label></div><input className="note-title-input" value={activeNote.title} onChange={event=>setActiveNote({...activeNote,title:event.target.value})} placeholder="Untitled note"/><textarea className="note-content-input" value={activeNote.content} onChange={event=>setActiveNote({...activeNote,content:event.target.value})} placeholder={'Start writing…\n\nTip: use # for a heading, - for a list, and [ ] for a checklist.'}/><div className="notebook-hint"><Sparkles size={14}/> Markdown-friendly · Auto-saved privately</div></section>:<section className="notebook-welcome"><span><BookOpen size={26}/></span><h2>A blank page can hold anything.</h2><p>Create a note for an idea, a question, or a little reminder to yourself.</p><button className="tool-primary" onClick={()=>void createNote()}><Plus size={15}/> Create your first note</button></section>}</div>{statusMessage}</main>;

  if(page==='Profile')return <main className="tools-page">{header('YOUR ACCOUNT, YOUR WAY','Make this space yours.','A few details to help your study space feel like home.')}<form className="profile-form" onSubmit={updateProfile}><div className="profile-avatar-large">{(profileName||'S').charAt(0).toUpperCase()}</div><div className="profile-email"><span className="tool-eyebrow">SIGNED IN AS</span><b>{email}</b></div><label>YOUR NAME<input value={profileName} onChange={event=>setProfileName(event.target.value)} placeholder="Full name" required/></label><div className="profile-fields"><label>BOARD<input value="CBSE" readOnly/></label><label>CLASS<input value="10" readOnly/></label><label>ACADEMIC YEAR<input value="2026–27" readOnly/></label></div><label>DAILY STUDY GOAL <span className="profile-unit">minutes</span><input type="number" min="15" max="720" step="15" value={dailyGoal} onChange={event=>setDailyGoal(Number(event.target.value))}/></label><label>BOARD EXAM DATE<input type="date" value={examDate??''} onChange={event=>setExamDate(event.target.value)}/><small>We’ll use this date for your countdown.</small></label><button className="tool-primary" disabled={saving}>{saving?'Saving…':'Save my changes'} <ArrowRight size={15}/></button><div className="password-update"><label>UPDATE PASSWORD<input type="password" minLength={6} autoComplete="new-password" value={newPassword} onChange={event=>setNewPassword(event.target.value)} placeholder="At least 6 characters"/></label><button type="button" onClick={()=>void updatePassword()} disabled={!newPassword}>Update password</button></div><button type="button" className="sign-out-action" onClick={async()=>{await supabase.auth.signOut()}}>Sign out</button></form>{statusMessage}</main>;

  if(page==='Search')return <main className="tools-page search-page">{header('YOUR WHOLE STUDY SPACE','Find what you need.','Search subjects, chapters, questions, revision cards and your own notes.')}<div className="universal-search"><Search size={20}/><input autoFocus value={searchText} onChange={event=>setSearchText(event.target.value)} placeholder="Try “quadratic equations”…"/><kbd>ESC</kbd></div><div className="search-results">{searchText.trim()?searchResults.length?searchResults.map((result,index)=><a className="search-result" href={result.action} key={`${result.type}-${index}`}><span className="result-icon"><Search size={15}/></span><span><small>{result.type}{result.subject?` · ${result.subject}`:''}</small><b>{result.title}</b><i>{result.description}</i></span><ArrowRight size={15}/></a>):<div className="tool-empty"><span><Search size={21}/></span><b>No matching notes just yet.</b><p>Try another phrase or search a chapter name.</p></div>:<div className="search-suggestions"><span>TRY A LITTLE SEARCH</span>{['quadratic equations','chemical reactions','federalism'].map(term=><button onClick={()=>setSearchText(term)} key={term}>{term}<ArrowRight size={13}/></button>)}</div>}</div></main>;

  return <main className="tools-page"><div className="tool-empty"><span><Sparkles size={22}/></span><b>This study space is coming together.</b><p>Check back soon.</p></div></main>;
}
