import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Bookmark, Check, ChevronDown, Clock3, Filter, ListFilter, Play, RotateCcw, Search, Sparkles, Target, Timer, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import './pyq.css';
import './pyq-organized.css';

type Subject = { id: string; name: string; theme: string };
type Chapter = { id: string; subject_id: string; chapter_number: number; title: string };
type Question = { id: string; subject_id: string; chapter_id: string; question_text: string; answer: string; explanation: string; exam_year: number | null; exam_set: string; source_name: string | null; source_url: string | null; source_verified: boolean; question_type: string; marks: number; difficulty: string; options: string[] | null; media_path: string | null; mediaUrl?: string };
type Attempt = { question_id: string; response: string; is_correct: boolean | null; bookmarked: boolean };
type Props = { userId: string; subjects: Subject[]; chapters: Chapter[] };

const types = ['All types','MCQ','Very Short','Short','Long','Case-based','Assertion-Reason','Diagram-based'];
const marksOptions = ['All marks','1 mark','2 marks','3 marks','4 marks','5 marks'];
const difficulties = ['All levels','Easy','Medium','Hard'];

export default function PYQLibrary({ userId, subjects, chapters }: Props) {
  const [questions,setQuestions]=useState<Question[]>([]);
  const [attempts,setAttempts]=useState<Attempt[]>([]);
  const [query,setQuery]=useState('');
  const [subjectId,setSubjectId]=useState('');
  const [chapterId,setChapterId]=useState('');
  const [year,setYear]=useState('all');
  const [type,setType]=useState('All types');
  const [marks,setMarks]=useState('All marks');
  const [difficulty,setDifficulty]=useState('All levels');
  const [openAnswer,setOpenAnswer]=useState<string|null>(null);
  const [practice,setPractice]=useState(false);
  const [practiceOrder,setPracticeOrder]=useState<string[]>([]);
  const [practiceIndex,setPracticeIndex]=useState(0);
  const [sessionStart,setSessionStart]=useState(0);
  const [elapsed,setElapsed]=useState(0);
  const [draft,setDraft]=useState('');
  const [score,setScore]=useState<{correct:number;total:number;seconds:number}|null>(null);
  const [practiceResults,setPracticeResults]=useState<Record<string,boolean>>({});
  const [mobileFilters,setMobileFilters]=useState(false);
  const [loading,setLoading]=useState(true);

  useEffect(()=>{
    let alive=true;
    const load=async()=>{
      const [{data:questionRows},{data:attemptRows}]=await Promise.all([
        supabase.from('questions').select('id,subject_id,chapter_id,question_text,answer,explanation,exam_year,exam_set,source_name,source_url,source_verified,question_type,marks,difficulty,options,media_path').eq('published',true).order('exam_year',{ascending:false,nullsFirst:false}),
        supabase.from('question_attempts').select('question_id,response,is_correct,bookmarked').eq('user_id',userId),
      ]);
      if(!alive)return;
      const readyQuestions=await Promise.all(((questionRows??[]) as Question[]).map(async question=>{
        if(!question.media_path)return question;
        const {data}=await supabase.storage.from('question-media').createSignedUrl(question.media_path,3600);
        return {...question,mediaUrl:data?.signedUrl};
      }));
      if(!alive)return;
      setQuestions(readyQuestions);
      setAttempts((attemptRows??[]) as Attempt[]);
      setLoading(false);
    };
    void load();
    return()=>{alive=false};
  },[userId]);

  useEffect(()=>{
    if(!practice||!sessionStart)return;
    const tick=()=>setElapsed(Math.floor((Date.now()-sessionStart)/1000));
    tick();
    const timer=window.setInterval(tick,1000);
    return()=>window.clearInterval(timer);
  },[practice,sessionStart]);

  const filteredChapters=useMemo(()=>chapters.filter(chapter=>!subjectId||chapter.subject_id===subjectId),[chapters,subjectId]);
  const filtered=useMemo(()=>questions.filter(q=>{
    const textMatch=q.question_text.toLowerCase().includes(query.toLowerCase())||q.exam_set.toLowerCase().includes(query.toLowerCase());
    return textMatch&&(!subjectId||q.subject_id===subjectId)&&(!chapterId||q.chapter_id===chapterId)&&(year==='all'||(year==='practice'?q.exam_year===null:String(q.exam_year)===year))&&(type==='All types'||q.question_type===type)&&(marks==='All marks'||q.marks===Number(marks[0]))&&(difficulty==='All levels'||q.difficulty===difficulty);
  }),[questions,query,subjectId,chapterId,year,type,marks,difficulty]);
  const currentId=practiceOrder[practiceIndex];
  const current=questions.find(q=>q.id===currentId);
  const attemptFor=(questionId:string)=>attempts.find(a=>a.question_id===questionId);
  const attemptedCount=attempts.filter(a=>a.is_correct!==null).length;
  const savedCount=attempts.filter(a=>a.bookmarked).length;
  const currentSubject=subjects.find(s=>s.id===current?.subject_id);
  const currentChapter=chapters.find(c=>c.id===current?.chapter_id);
  const formatTime=(seconds:number)=>`${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;

  const saveAttempt=async(question:Question,patch:Partial<Attempt>)=>{
    const old=attemptFor(question.id);
    const record={user_id:userId,question_id:question.id,response:old?.response??'',is_correct:old?.is_correct??null,bookmarked:old?.bookmarked??false,...patch,attempted_at:new Date().toISOString()};
    const {data}=await supabase.from('question_attempts').upsert(record,{onConflict:'user_id,question_id'}).select('question_id,response,is_correct,bookmarked').single();
    if(data){setAttempts(previous=>[...previous.filter(item=>item.question_id!==question.id),data as Attempt]);if(typeof patch.is_correct==='boolean'&&old?.is_correct==null){const {data:goals}=await supabase.from('study_goals').select('id,current_value,target_value').eq('user_id',userId).eq('category','questions');for(const goal of goals??[]){const current=Number(goal.current_value);const target=Number(goal.target_value);if(current>=target)continue;const value=current+1;await supabase.from('study_goals').update({current_value:value,completed_at:value>=target?new Date().toISOString():null}).eq('id',goal.id).eq('user_id',userId)}}}
  };

  const beginPractice=()=>{
    const ids=filtered.map(q=>q.id);
    if(!ids.length)return;
    setPracticeOrder(ids);
    setPracticeIndex(0);
    setDraft('');
    setPracticeResults({});
    setScore(null);
    setElapsed(0);
    setSessionStart(Date.now());
    setPractice(true);
  };
  const finishPractice=(lastCorrect?:boolean,lastQuestionId?:string)=>{
    const results=lastCorrect!==undefined&&lastQuestionId?{...practiceResults,[lastQuestionId]:lastCorrect}:practiceResults;
    const values=Object.values(results);
    setScore({correct:values.filter(Boolean).length,total:values.length,seconds:elapsed});
    setPractice(false);
    setSessionStart(0);
  };
  const gradePractice=async(correct:boolean)=>{
    if(!current)return;
    await saveAttempt(current,{response:draft,is_correct:correct});
    setPracticeResults(previous=>({...previous,[current.id]:correct}));
    setOpenAnswer(null);
    if(practiceIndex+1<practiceOrder.length){setPracticeIndex(practiceIndex+1);setDraft('');}
    else finishPractice(correct,current.id);
  };

  if(practice&&current&& !score) return <section className="pyq-page practice-page"><button className="pyq-back" onClick={()=>finishPractice()}><ArrowLeft size={15}/> Leave practice</button><div className="practice-top"><div><span className="pyq-eyebrow">EXAM PRACTICE · NO PEEKING</span><h1>One question at a time.</h1></div><div className="practice-time"><Timer size={17}/>{formatTime(elapsed)}</div></div><div className="practice-progress"><span style={{width:`${((practiceIndex+1)/practiceOrder.length)*100}%`}}/></div><div className="practice-meta"><span>QUESTION {String(practiceIndex+1).padStart(2,'0')} <i/> {String(practiceOrder.length).padStart(2,'0')}</span><span>{current.marks} marks <i/> {current.difficulty}</span></div><article className="practice-question"><div className="question-subject"><span className={`subject-mini theme-${currentSubject?.theme??'violet'}`}>{currentSubject?.name??'Subject'}</span><span>{currentChapter?.title}</span></div><p>{current.question_text}</p>{current.mediaUrl&&<img className="pyq-question-media" src={current.mediaUrl} alt="Question diagram"/>}<label className="answer-label" htmlFor="practice-answer">YOUR ANSWER</label><textarea id="practice-answer" value={draft} onChange={event=>setDraft(event.target.value)} placeholder="Take your time. Write what you know…" rows={5}/><div className="answer-hint">Your answer stays private. Reveal the solution when you’re ready.</div>{openAnswer===current.id&&<div className="revealed-answer"><span className="pyq-eyebrow">SUGGESTED ANSWER</span><p>{current.answer}</p><small>{current.explanation}</small></div>}<div className="practice-actions">{openAnswer===current.id?<><span className="self-assess">How did it go?</span><button className="assess-wrong" onClick={()=>void gradePractice(false)}>Needs work</button><button className="assess-right" onClick={()=>void gradePractice(true)}>Got it <Check size={14}/></button></>:<button className="reveal-button" onClick={()=>setOpenAnswer(current.id)} disabled={!draft.trim()}>Reveal answer <ArrowRight size={15}/></button>}</div></article><div className="practice-footer"><span><Sparkles size={14}/> Progress over perfection.</span><button onClick={()=>finishPractice()}>End session</button></div></section>;

  if(score) return <section className="pyq-page"><div className="pyq-result"><div className="result-symbol"><Target size={26}/></div><span className="pyq-eyebrow">SESSION COMPLETE</span><h1>Good work showing up.</h1><p>Your practice is what builds confidence.</p><div className="result-stats"><div><b>{score.total}</b><span>Answered</span></div><div><b>{score.total?Math.round(score.correct/score.total*100):0}%</b><span>Self-rated correct</span></div><div><b>{formatTime(score.seconds)}</b><span>Time spent</span></div></div><button onClick={()=>{setScore(null);setPracticeOrder([])}}>Back to question bank <ArrowRight size={15}/></button></div></section>;

  const select=(label:string,value:string,onChange:(value:string)=>void,options:{label:string,value:string}[])=><label className="pyq-filter"><span>{label}</span><span className="select-wrap"><select value={value} onChange={event=>onChange(event.target.value)}>{options.map(option=><option value={option.value} key={option.value}>{option.label}</option>)}</select><ChevronDown size={13}/></span></label>;
  if(!subjectId)return <section className="pyq-page"><div className="pyq-welcome"><div><span className="pyq-eyebrow"><span/> THE QUESTION BANK</span><h1>Start with a<br/><em>subject.</em></h1><p>Choose a class subject, then pick the chapter you want to practice.</p></div></div><div className="pyq-organized-grid">{subjects.map(subject=>{const count=questions.filter(question=>question.subject_id===subject.id).length;return <button key={subject.id} onClick={()=>setSubjectId(subject.id)}><span className="pyq-organized-mark">{subject.name.slice(0,1)}</span><span><b>{subject.name}</b><small>{count} questions</small></span><ArrowRight size={16}/></button>})}</div></section>;
  if(!chapterId)return <section className="pyq-page"><button className="pyq-back" onClick={()=>setSubjectId('')}><ArrowLeft size={15}/> All subjects</button><div className="pyq-library-heading"><div><span className="pyq-eyebrow">STEP 2 · CHOOSE A CHAPTER</span><h2>{subjects.find(subject=>subject.id===subjectId)?.name}</h2><p>Pick a chapter to view its PYQs and practice questions.</p></div></div><div className="pyq-organized-chapters">{filteredChapters.map(chapter=>{const count=questions.filter(question=>question.chapter_id===chapter.id).length;return <button key={chapter.id} onClick={()=>setChapterId(chapter.id)}><span>{String(chapter.chapter_number).padStart(2,'0')}</span><b>{chapter.title}</b><small>{count} {count===1?'question':'questions'}</small><ChevronDown size={15}/></button>})}</div></section>;
  const filterControls=<><div className="pyq-filters">{select('SUBJECT',subjectId,value=>{setSubjectId(value);setChapterId('')},[{label:'All subjects',value:''},...subjects.map(s=>({label:s.name,value:s.id}))])}{select('CHAPTER',chapterId,setChapterId,[{label:'All chapters',value:''},...filteredChapters.map(c=>({label:c.title,value:c.id}))])}{select('YEAR',year,setYear,[{label:'All years',value:'all'},{label:'CBSE-style practice',value:'practice'},...Array.from({length:12},(_,i)=>({label:String(2026-i),value:String(2026-i)}))])}{select('QUESTION TYPE',type,setType,types.map(x=>({label:x,value:x})))}{select('MARKS',marks,setMarks,marksOptions.map(x=>({label:x,value:x})))}{select('DIFFICULTY',difficulty,setDifficulty,difficulties.map(x=>({label:x,value:x})))}</div></>;

  return <section className="pyq-page"><button className="pyq-back" onClick={()=>setChapterId('')}><ArrowLeft size={15}/> {subjects.find(subject=>subject.id===subjectId)?.name} · All chapters</button><div className="pyq-welcome"><div><span className="pyq-eyebrow"><span/> THE QUESTION BANK</span><h1>Practice makes<br/><em>progress.</em></h1><p>Find your focus, work through a question, and grow a little more confident.</p></div><div className="pyq-illustration"><div className="pyq-illus-sun">✳</div><div className="pyq-illus-paper"><span>Q.</span><i/><i/><i/><b>you’ve got<br/>this</b></div><div className="pyq-illus-pencil"/><span className="pyq-illus-spark">✦</span></div></div>
    <div className="pyq-stats"><div><span className="pyq-stat-icon stat-violet"><ListFilter size={17}/></span><span><b>{questions.length}</b><small>Questions to explore</small></span></div><div><span className="pyq-stat-icon stat-green"><Check size={17}/></span><span><b>{attemptedCount}</b><small>Questions attempted</small></span></div><div><span className="pyq-stat-icon stat-amber"><Bookmark size={17}/></span><span><b>{savedCount}</b><small>Saved for revision</small></span></div></div>
    <div className="pyq-library-heading"><div><span className="pyq-eyebrow">YOUR PRACTICE DESK</span><h2>Find your next question</h2><p>Use the filters to find just the right challenge.</p></div><button className="pyq-practice-button" onClick={beginPractice} disabled={!filtered.length}><Play size={15} fill="currentColor"/> Start practice <span>{filtered.length||0} Qs</span></button></div>
    <div className="pyq-filter-bar"><div className="pyq-search"><Search size={16}/><input id="pyq-search" placeholder="Search questions or exam sets…" value={query} onChange={event=>setQuery(event.target.value)}/>{query&&<button onClick={()=>setQuery('')} aria-label="Clear search"><X size={14}/></button>}</div><button className="filter-toggle" onClick={()=>setMobileFilters(!mobileFilters)}><Filter size={15}/> Filters <ChevronDown size={14}/></button><span className="pyq-found">{filtered.length} {filtered.length===1?'question':'questions'}</span></div>
    <div className={`pyq-filter-panel ${mobileFilters?'show':''}`}>{filterControls}</div>
    {loading?<div className="pyq-loading">Loading your question bank…</div>:filtered.length===0?<div className="pyq-empty"><div className="empty-orbit"><BookOpenIcon/></div><span className="pyq-eyebrow">A CLEAR PAGE, A FRESH START</span><h3>{questions.length?'No questions match these filters yet.':'Your question bank is warming up.'}</h3><p>{questions.length?'Try broadening your search or choosing a different subject.':'CBSE-style practice questions are ready to explore. Verified past-year papers can be added by your teacher.'}</p>{questions.length>0&&<button onClick={()=>{setQuery('');setSubjectId('');setChapterId('');setYear('all');setType('All types');setMarks('All marks');setDifficulty('All levels')}}>Clear all filters <RotateCcw size={14}/></button>}</div>:<div className="pyq-question-list">{filtered.map((question,index)=>{const subject=subjects.find(s=>s.id===question.subject_id);const chapter=chapters.find(c=>c.id===question.chapter_id);const attempt=attemptFor(question.id);const expanded=openAnswer===question.id;return <article className="pyq-question-card" key={question.id}><div className="pyq-card-top"><span className="pyq-card-number">{String(index+1).padStart(2,'0')}</span><div className="pyq-card-tags"><span className={`pyq-tag theme-${subject?.theme??'violet'}`}>{subject?.name}</span><span className="pyq-tag tag-pale">{question.exam_year&&question.source_verified?`CBSE ${question.exam_year} · ${question.exam_set}`:'CBSE-style practice'}</span><span className="pyq-tag tag-outline">{question.marks} {question.marks===1?'mark':'marks'}</span></div><button className={`pyq-bookmark ${attempt?.bookmarked?'saved':''}`} aria-label={attempt?.bookmarked?'Remove bookmark':'Save question'} onClick={()=>void saveAttempt(question,{bookmarked:!attempt?.bookmarked})}><Bookmark size={17} fill={attempt?.bookmarked?'currentColor':'none'}/></button></div><p className="pyq-question-text">{question.question_text}</p>{question.mediaUrl&&<img className="pyq-question-media" src={question.mediaUrl} alt="Question diagram"/>}<div className="pyq-card-meta"><span>{chapter?.title}</span>{question.source_url&&question.source_verified&&<><i/><a href={question.source_url} target="_blank" rel="noreferrer">{question.source_name??'Source'}</a></>}<i/><span>{question.question_type}</span><i/><span className={`difficulty-${question.difficulty.toLowerCase()}`}>{question.difficulty}</span></div>{attempt?.is_correct!==null&&attempt?.is_correct!==undefined&&<div className={`attempt-tag ${attempt.is_correct?'correct':'incorrect'}`}>{attempt.is_correct?<Check size={12}/>:<X size={12}/>} {attempt.is_correct?'You got this right':'Marked for another look'}</div>}{expanded&&<div className="pyq-answer"><span className="pyq-eyebrow">SUGGESTED ANSWER</span><p>{question.answer}</p>{question.explanation&&<small>{question.explanation}</small>}</div>}<div className="pyq-card-actions"><button className="answer-toggle" onClick={()=>setOpenAnswer(expanded?null:question.id)}>{expanded?'Hide answer':'Reveal answer & explanation'} <ChevronDown size={14} className={expanded?'rotated':''}/></button><button className="attempt-action" onClick={()=>void saveAttempt(question,{response:attempt?.response??'',is_correct:attempt?.is_correct===null?true:!attempt?.is_correct})}>{attempt?.is_correct===true?'Mark for review':attempt?.is_correct===false?'Mark as correct':'Mark attempted'} <Check size={13}/></button></div></article>})}</div>}
    <div className="pyq-integrity"><span><Sparkles size={15}/></span><p><b>Honest practice, steady progress.</b> CBSE-style practice prompts are clearly labeled. Official past papers are identified by year when verified and added.</p></div>
  </section>;
}

function BookOpenIcon(){return <Clock3 size={22}/>}
