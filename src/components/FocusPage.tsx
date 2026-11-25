import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, BarChart3, Check, ChevronDown, CirclePause, CirclePlay, CircleStop, Clock3, Flame, RotateCcw, Sparkles, Target, Timer, TrendingUp, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import FriendsPage from '@/components/FriendsPage';
import './focus.css';

type Subject = { id:string; name:string; theme:string };
type Chapter = { id:string; subject_id:string; chapter_number:number; title:string };
type ActivityType = 'reading'|'question_practice'|'pyq'|'out_of_ncert'|'revision'|'other';
type FocusRecord = { id:string; status:'running'|'paused'; mode:'pomodoro'|'deep'|'custom'; phase:'focus'|'break'; subjectId:string; chapterId:string; activityType:ActivityType; objective:string; focusSeconds:number; breakSeconds:number; remainingMs:number; startedAt:number|null; focusStartedAt:number|null; accumulatedSeconds:number };
type FocusSession = { id:string; subject_id:string; chapter_id:string|null; activity_type:ActivityType; mode:string; objective:string; started_at:string; finished_at:string; duration_seconds:number; completed:boolean };
type Props={userId:string;subjects:Subject[];chapters:Chapter[]};
const KEY=(id:string)=>`edvora-focus:${id}`;
const readTimer=(key:string):FocusRecord|null=>{try{const value=localStorage.getItem(key);if(!value)return null;const parsed=JSON.parse(value) as FocusRecord;if(!['running','paused'].includes(parsed.status)||!['pomodoro','deep','custom'].includes(parsed.mode)||!['focus','break'].includes(parsed.phase)||typeof parsed.remainingMs!=='number')return null;if(!['reading','question_practice','pyq','out_of_ncert','revision','other'].includes(parsed.activityType))parsed.activityType='other';return parsed}catch{return null}};
const duration=(seconds:number)=>`${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`;
const minutes=(seconds:number)=>`${Math.floor(seconds/60)}m`;
const dayKey=(date:Date)=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;

export default function FocusPage({userId,subjects,chapters}:Props){
  const storageKey=KEY(userId);
  const [timer,setTimer]=useState<FocusRecord|null>(()=>readTimer(storageKey));
  const [now,setNow]=useState(Date.now());
  const [history,setHistory]=useState<FocusSession[]>([]);
  const [selectedMode,setSelectedMode]=useState<FocusRecord['mode']>('custom');
  const [customFocus,setCustomFocus]=useState(60);
  const [customBreak,setCustomBreak]=useState(1);
  const [freestyle,setFreestyle]=useState(false);
  const [subjectId,setSubjectId]=useState('');
  const [chapterId,setChapterId]=useState('');
  const [activityType,setActivityType]=useState<FocusRecord['activityType']>('reading');
  const [objective,setObjective]=useState('');
  const [loading,setLoading]=useState(true);
  const [notice,setNotice]=useState('');
  const [friendsOpen,setFriendsOpen]=useState(false);
  const transitionLock=useRef(false);
  const filteredChapters=chapters.filter(chapter=>!subjectId||chapter.subject_id===subjectId);
  const currentSubject=subjects.find(subject=>subject.id===timer?.subjectId);
  const remainingMs=timer?Math.max(0,timer.remainingMs-(timer.status==='running'&&timer.startedAt?now-timer.startedAt:0)):0;
  const remainingSeconds=Math.ceil(remainingMs/1000);
  const progress=timer?Math.max(0,Math.min(100,((timer.phase==='focus'?timer.focusSeconds:timer.breakSeconds)-remainingSeconds)/(timer.phase==='focus'?timer.focusSeconds:timer.breakSeconds)*100)):0;

  useEffect(()=>{localStorage.setItem(storageKey,JSON.stringify(timer))},[timer,storageKey]);
  useEffect(()=>{
    let active=true;
    const load=async()=>{const {data}=await supabase.from('focus_sessions').select('id,subject_id,chapter_id,activity_type,mode,objective,started_at,finished_at,duration_seconds,completed').eq('user_id',userId).order('started_at',{ascending:false}).limit(500);if(active){setHistory((data??[]) as FocusSession[]);setLoading(false)}};
    void load();return()=>{active=false};
  },[userId]);
  useEffect(()=>{if(timer?.status!=='running')return;const interval=window.setInterval(()=>setNow(Date.now()),250);return()=>window.clearInterval(interval)},[timer?.status]);

  const saveSession=async(record:FocusRecord,seconds:number,completed:boolean,startedAt:number,finishedAt=Date.now())=>{
    if(seconds<1)return;
    const finished=finishedAt;
    const {data}=await supabase.from('focus_sessions').insert({user_id:userId,subject_id:record.subjectId,chapter_id:record.chapterId||null,activity_type:record.activityType,mode:record.mode,objective:record.objective,started_at:new Date(startedAt).toISOString(),finished_at:new Date(finished).toISOString(),duration_seconds:seconds,completed}).select('id,subject_id,chapter_id,activity_type,mode,objective,started_at,finished_at,duration_seconds,completed').single();
    if(data){setHistory(previous=>[data as FocusSession,...previous]);const {data:goals}=await supabase.from('study_goals').select('id,current_value,target_value').eq('user_id',userId).eq('category','study_minutes');for(const goal of goals??[]){const current=Number(goal.current_value);const target=Number(goal.target_value);if(current>=target)continue;const value=current+seconds/60;await supabase.from('study_goals').update({current_value:value,completed_at:value>=target?new Date().toISOString():null}).eq('id',goal.id).eq('user_id',userId)}}
  };

  useEffect(()=>{
    if(!timer||timer.status!=='running'||remainingMs>0||transitionLock.current)return;
    transitionLock.current=true;
    const transition=async()=>{
      const tick=Date.now();
      if(timer.phase==='focus'){
        const focusStart=timer.focusStartedAt??tick-timer.focusSeconds*1000;
        await saveSession(timer,timer.focusSeconds,true,focusStart,tick);
        setTimer(null);
        setNotice('Milestone reached. Wonderful work showing up.');
      }else{
        setTimer({...timer,phase:'focus',remainingMs:timer.focusSeconds*1000,startedAt:tick,focusStartedAt:tick});
      }
      setNow(tick);
      transitionLock.current=false;
    };
    void transition();
  },[timer,remainingMs]);

  const start=(mode:FocusRecord['mode'])=>{
    if(!freestyle&&(!subjectId||!chapterId))return;
    const focusMinutes=mode==='pomodoro'?25:mode==='deep'?50:customFocus;
    const breakMinutes=0;
    const tick=Date.now();
    setTimer({id:crypto.randomUUID(),status:'running',mode,phase:'focus',subjectId:subjectId||subjects[0]?.id||'',chapterId:freestyle?'':chapterId,activityType,objective:objective.trim(),focusSeconds:focusMinutes*60,breakSeconds:breakMinutes*60,remainingMs:focusMinutes*60*1000,startedAt:tick,focusStartedAt:tick,accumulatedSeconds:0});
    setNow(tick);
    setNotice('Your focus session has started. You’ve got this.');
  };
  const pause=()=>{if(!timer||timer.status!=='running')return;const elapsed=Math.max(0,now-(timer.startedAt??now));setTimer({...timer,status:'paused',remainingMs:Math.max(0,timer.remainingMs-elapsed),startedAt:null});};
  const resume=()=>{if(!timer||timer.status!=='paused')return;const tick=Date.now();setTimer({...timer,status:'running',startedAt:tick});setNow(tick)};
  const reset=()=>{if(!timer)return;setTimer({...timer,status:'paused',phase:'focus',remainingMs:timer.focusSeconds*1000,startedAt:null,focusStartedAt:null,accumulatedSeconds:0});setNow(Date.now())};
  const end=async()=>{if(!timer)return;const activeElapsed=timer.phase==='focus'?Math.max(0,timer.focusSeconds-Math.ceil(remainingMs/1000)):0;const ended=timer;setTimer(null);if(activeElapsed>0)await saveSession(ended,activeElapsed,false,(ended.focusStartedAt??now),Date.now());setNotice('Session wrapped up. Every focused minute counts.')};

  const today=dayKey(new Date());
  const todaySeconds=history.filter(item=>dayKey(new Date(item.started_at))===today).reduce((sum,item)=>sum+item.duration_seconds,0);
  const totalSeconds=history.reduce((sum,item)=>sum+item.duration_seconds,0);
  const longest=history.reduce((max,item)=>Math.max(max,item.duration_seconds),0);
  const dayMap=new Map<string,number>();
  for(let offset=6;offset>=0;offset--){const date=new Date();date.setDate(date.getDate()-offset);dayMap.set(dayKey(date),0)}
  history.forEach(item=>{const key=dayKey(new Date(item.started_at));if(dayMap.has(key))dayMap.set(key,(dayMap.get(key)??0)+item.duration_seconds)});
  const weekEntries=[...dayMap.entries()].map(([key,seconds])=>({key,seconds,date:new Date(`${key}T12:00:00`)}));
  const weekMax=Math.max(3600,...weekEntries.map(entry=>entry.seconds));
  const subjectTotals=useMemo(()=>subjects.map(subject=>({subject,seconds:history.filter(item=>item.subject_id===subject.id).reduce((sum,item)=>sum+item.duration_seconds,0)})).filter(item=>item.seconds>0).sort((a,b)=>b.seconds-a.seconds),[subjects,history]);
  const subjectMax=Math.max(1,...subjectTotals.map(item=>item.seconds));
  const activityLabels:Record<FocusRecord['activityType'],string>={reading:'Reading / notes',question_practice:'Question practice',pyq:'CBSE PYQ',out_of_ncert:'Out-of-NCERT practice',revision:'Revision',other:'Other'};
  const activityTotals=useMemo(()=>Object.keys(activityLabels).map(key=>({type:key as FocusRecord['activityType'],seconds:history.filter(item=>item.activity_type===key).reduce((sum,item)=>sum+item.duration_seconds,0)})).filter(item=>item.seconds>0).sort((a,b)=>b.seconds-a.seconds),[history]);
  const activityMax=Math.max(1,...activityTotals.map(item=>item.seconds));
  const streak=useMemo(()=>{const days=new Set(history.map(item=>dayKey(new Date(item.started_at))));let count=0;const cursor=new Date();if(!days.has(dayKey(cursor)))cursor.setDate(cursor.getDate()-1);while(days.has(dayKey(cursor))){count++;cursor.setDate(cursor.getDate()-1)}return count},[history]);
  const average=history.length?Math.round(totalSeconds/history.length):0;
  const modeName=timer?.mode==='pomodoro'?'Pomodoro':timer?.mode==='deep'?'Deep Focus':'Custom';
  const hourGroups=useMemo(()=>{const values=Array.from({length:6},()=>0);history.forEach(item=>{const hour=new Date(item.started_at).getHours();values[hour<9?0:hour<12?1:hour<15?2:hour<18?3:hour<21?4:5]+=item.duration_seconds});return values},[history]);
  const hourMax=Math.max(1,...hourGroups);

  return <main className="focus-page">
    <section className="focus-welcome"><button className="focus-friends-button" onClick={()=>setFriendsOpen(true)} aria-label="Open friend circles"><Users size={16}/><span>Friends</span></button><div className="focus-welcome-copy"><span className="focus-eyebrow"><span/> EDVORA FOCUS</span><h1>Make room for<br/><em>deep focus.</em></h1><p>A little time, fully yours. One thing at a time, one session at a time.</p><div className="focus-welcome-stats"><span><Clock3 size={14}/>{minutes(totalSeconds)} focused overall</span><span><Flame size={14}/>{streak} day streak</span></div></div><div className="focus-illustration"><div className="focus-moon">✳</div><div className="focus-plant"><i/><i/><b/></div><div className="focus-desk"><span/><i/></div><div className="focus-note"><Sparkles size={13}/> time for you</div></div></section>
    <div className="focus-grid"><section className="timer-card"><div className="timer-card-top"><div><span className="focus-eyebrow">YOUR FOCUS SESSION</span><h2>{timer?timer.phase==='focus'?'You’re in your focus zone':'A little breathing room':'Settle into a rhythm'}</h2></div>{timer&&<span className={`timer-state ${timer.status}`}><i/>{timer.status==='running'?'IN SESSION':'PAUSED'}</span>}</div>
      {!timer?<><div className="mode-picker focus-mode-picker"><button className={`mode-option ${selectedMode==='pomodoro'?'selected':''}`} onClick={()=>setSelectedMode('pomodoro')}><span className="mode-icon pomodoro-icon"><Timer size={17}/></span><span><b>Pomodoro</b><small>25 min focus · 5 min rest</small></span><i/></button><button className={`mode-option ${selectedMode==='deep'?'selected':''}`} onClick={()=>setSelectedMode('deep')}><span className="mode-icon deep-icon"><Sparkles size={17}/></span><span><b>Deep focus</b><small>50 min focus · 10 min rest</small></span><i/></button><button className={`mode-option ${selectedMode==='custom'?'selected':''}`} onClick={()=>setSelectedMode('custom')}><span className="mode-icon custom-icon"><Target size={17}/></span><span><b>Make it yours</b><small>Choose your own pace</small></span><i/></button></div><div className="focus-setup"><div className="setup-heading"><span>FIRST, PICK A SUBJECT</span><small>A little intention goes a long way</small></div><div className="setup-selects"><label className="focus-select"><span>SUBJECT</span><span className="focus-select-wrap"><select value={subjectId} onChange={event=>{setSubjectId(event.target.value);setChapterId('')}}><option value="">Choose a subject</option>{subjects.map(subject=><option key={subject.id} value={subject.id}>{subject.name}</option>)}</select><ChevronDown size={14}/></span></label><label className="focus-select"><span>CHAPTER</span><span className="focus-select-wrap"><select value={chapterId} onChange={event=>setChapterId(event.target.value)} disabled={!subjectId}><option value="">Choose a chapter</option>{filteredChapters.map(chapter=><option key={chapter.id} value={chapter.id}>{chapter.title}</option>)}</select><ChevronDown size={14}/></span></label><label className="focus-select"><span>ACTIVITY TYPE</span><span className="focus-select-wrap"><select value={activityType} onChange={event=>setActivityType(event.target.value as FocusRecord['activityType'])}><option value="reading">Reading / notes</option><option value="question_practice">Question practice</option><option value="pyq">CBSE PYQ</option><option value="out_of_ncert">Out-of-NCERT practice</option><option value="revision">Revision</option><option value="other">Other</option></select><ChevronDown size={14}/></span></label></div><label className="objective-label">WHAT WOULD YOU LIKE TO FOCUS ON? <small>· OPTIONAL</small><input value={objective} onChange={event=>setObjective(event.target.value)} placeholder="e.g. Revise quadratic equations" maxLength={120}/></label></div><div className="timer-launch-row"><div className="duration-adjust milestone-adjust"><span>SESSION LENGTH · UP TO 3 HOURS</span><div className="milestone-row">{[25,45,60,90,120,180].map(value=><button type="button" className={customFocus===value?'milestone-selected':''} onClick={()=>setCustomFocus(value)} key={value}>{value<60?`${value}m`:`${value/60}h`}</button>)}</div><label className="freestyle-toggle"><input type="checkbox" checked={freestyle} onChange={event=>setFreestyle(event.target.checked)}/> Freestyle study</label></div><button className="start-focus" onClick={()=>start(selectedMode)} disabled={!freestyle&&(!subjectId||!chapterId)}><CirclePlay size={17}/> Start {selectedMode==='pomodoro'?'Pomodoro':selectedMode==='deep'?'deep focus':'custom focus'} <ArrowRight size={15}/></button></div></>:<div className="timer-active"><div className={`timer-dial ${timer.phase==='break'?'break-dial':''}`} style={{'--timer-progress':`${progress}%`} as React.CSSProperties}><div className="timer-dial-inner"><span className="dial-phase">{timer.phase==='focus'?'FOCUS TIME':'TAKE A BREATH'}</span><b>{duration(remainingSeconds)}</b><span className="dial-mode">{modeName} · {timer.phase==='focus'?`${Math.round(timer.focusSeconds/60)} min`:`${Math.round(timer.breakSeconds/60)} min break`}</span></div></div><div className="timer-context"><span className={`timer-subject-dot theme-${currentSubject?.theme??'violet'}`}/><span><b>{currentSubject?.name}</b><small>{chapters.find(c=>c.id===timer.chapterId)?.title??timer.objective??'A focused study session'}</small></span></div><div className="timer-controls">{timer.status==='running'?<button className="pause-control" onClick={pause}><CirclePause size={17}/> Pause</button>:<button className="resume-control" onClick={resume}><CirclePlay size={17}/> Resume</button>}<button className="reset-control" onClick={reset}><RotateCcw size={16}/> Reset</button><button className="end-control" onClick={()=>void end()}><CircleStop size={16}/> End</button></div><p className="timer-encouragement">{timer.status==='paused'?'Take your time. Resume when you’re ready.':timer.phase==='focus'?'You’re doing great. Stay with this moment.':'Rest is part of the work. Let your mind breathe.'}</p></div>}
    </section>
    <aside className="focus-insights"><div className="insight-heading"><div><span className="focus-eyebrow">YOUR MOMENTUM</span><h3>It’s adding up.</h3></div><BarChart3 size={18}/></div><div className="insight-primary"><span className="insight-icon today-icon"><Clock3 size={17}/></span><span><small>FOCUSED TODAY</small><b>{minutes(todaySeconds)}</b></span><span className="today-goal">{history.filter(item=>dayKey(new Date(item.started_at))===today).length} sessions</span></div><div className="insight-secondary"><div><span className="insight-icon avg-icon"><TrendingUp size={15}/></span><small>SESSION AVERAGE</small><b>{minutes(average)}</b></div><div><span className="insight-icon longest-icon"><Flame size={15}/></span><small>LONGEST SESSION</small><b>{minutes(longest)}</b></div></div><div className="insight-streak"><span className="streak-flame"><Flame size={17}/></span><span><b>{streak?`${streak} day streak`:'Your streak starts here'}</b><small>Small steps, day by day</small></span><span className="streak-n">{streak}</span></div></aside></div>
    <div className="focus-lower-grid"><section className="weekly-card"><div className="analytics-title"><div><span className="focus-eyebrow">LAST 7 DAYS</span><h3>Your focus, day by day</h3></div><span className="weekly-total">{minutes(weekEntries.reduce((sum,entry)=>sum+entry.seconds,0))} total</span></div><div className="focus-week-chart">{weekEntries.map(entry=><div className="focus-week-day" key={entry.key}><span className="focus-week-min">{entry.seconds?minutes(entry.seconds):''}</span><div className="focus-week-track"><i className={entry.key===today?'current-day':''} style={{height:`${entry.seconds?Math.max(8,entry.seconds/weekMax*100):0}%`}}/></div><span className={entry.key===today?'current-label':''}>{entry.date.toLocaleDateString('en-US',{weekday:'short'})}</span></div>)}</div></section><section className="subject-focus-card"><div className="analytics-title"><div><span className="focus-eyebrow">WHERE YOU’VE BEEN</span><h3>Time by subject</h3></div><Target size={17}/></div>{subjectTotals.length?<div className="subject-breakdown">{subjectTotals.slice(0,5).map(({subject,seconds})=><div className="subject-break-row" key={subject.id}><span className={`subject-break-dot theme-${subject.theme}`}/><span className="subject-break-name">{subject.name}</span><div className="subject-break-track"><i className={`theme-fill-${subject.theme}`} style={{width:`${Math.max(4,seconds/subjectMax*100)}%`}}/></div><span className="subject-break-time">{minutes(seconds)}</span></div>)}</div>:<div className="analytics-empty"><span><Target size={18}/></span><p>Your subject mix will grow here,<br/>one study session at a time.</p></div>}</section></div>
    <section className="peak-time-card"><div className="analytics-title"><div><span className="focus-eyebrow">YOUR STUDY RHYTHM</span><h3>When you focus most</h3></div><Clock3 size={17}/></div><div className="peak-time-chart">{hourGroups.map((seconds,index)=><div key={index}><i style={{height:`${seconds?Math.max(8,seconds/hourMax*100):3}%`}}/><span>{['6–9a','9–12p','12–3p','3–6p','6–9p','9p+'][index]}</span></div>)}</div></section>
    <section className="focus-activity-card"><div className="analytics-title"><div><span className="focus-eyebrow">SESSION MIX</span><h3>Time by activity</h3></div><Target size={17}/></div>{activityTotals.length?<div className="subject-breakdown">{activityTotals.map(item=><div className="subject-break-row" key={item.type}><span className="activity-break-dot"/><span className="subject-break-name">{activityLabels[item.type]}</span><div className="subject-break-track"><i style={{width:`${Math.max(4,item.seconds/activityMax*100)}%`}}/></div><span className="subject-break-time">{minutes(item.seconds)}</span></div>)}</div>:<div className="analytics-empty"><p>Choose an activity type when you start a focus session.</p></div>}</section><section className="focus-history-card"><div className="analytics-title"><div><span className="focus-eyebrow">A LOOK BACK</span><h3>Your focus sessions</h3></div><span className="history-count">{history.length} sessions</span></div>{loading?<div className="history-empty">Gathering your sessions…</div>:history.length?<div className="focus-history-list">{history.slice(0,8).map(item=>{const subject=subjects.find(s=>s.id===item.subject_id);const chapter=chapters.find(c=>c.id===item.chapter_id);return <div className="focus-history-row" key={item.id}><span className={`history-subject-icon theme-${subject?.theme??'violet'}`}><Clock3 size={15}/></span><span className="history-main"><b>{subject?.name??'Study session'}</b><small>{chapter?.title??(item.objective||'Focused learning')}</small></span><span className="history-mode">{item.mode==='pomodoro'?'Pomodoro':item.mode==='deep'?'Deep focus':'Custom'} · {activityLabels[item.activity_type]}</span><span className="history-duration">{minutes(item.duration_seconds)}</span><span className={`history-status ${item.completed?'done':''}`}>{item.completed?<><Check size={11}/> Complete</>:'Session'}</span><time>{new Date(item.started_at).toLocaleDateString('en-US',{month:'short',day:'numeric'})}</time></div>})}</div>:<div className="history-empty"><span><Clock3 size={20}/></span><b>No focus sessions yet</b><small>Your first session will appear here after you wrap up.</small></div>}</section>
    {friendsOpen&&<FriendsPage userId={userId} onClose={()=>setFriendsOpen(false)}/>}
    {notice&&<div className="focus-toast"><Sparkles size={14}/>{notice}</div>}
  </main>;
}
