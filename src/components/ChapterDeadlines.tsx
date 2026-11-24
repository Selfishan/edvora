import { useEffect, useState } from 'react';
import { CalendarDays, Check, Plus, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import './deadlines.css';

type Chapter = { id: string; subject_id: string; title: string; chapter_number: number };
type Subject = { id: string; name: string };
type Deadline = { id: string; chapter_id: string; due_at: string; completed: boolean };

export default function ChapterDeadlines({ userId, chapters, subjects }: { userId: string; chapters: Chapter[]; subjects: Subject[] }) {
  const [items, setItems] = useState<Deadline[]>([]);
  const [chapterId, setChapterId] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => { let active = true; void supabase.from('chapter_deadlines').select('id,chapter_id,due_at,completed').eq('user_id', userId).order('due_at').then(({ data }) => { if (active) setItems((data ?? []) as Deadline[]); }); return () => { active = false; }; }, [userId]);
  const add = async (event: React.FormEvent) => { event.preventDefault(); if (!chapterId || !dueAt) return; setSaving(true); setMessage(''); const { data, error } = await supabase.from('chapter_deadlines').upsert({ user_id: userId, chapter_id: chapterId, due_at: dueAt, completed: false }, { onConflict: 'user_id,chapter_id' }).select('id,chapter_id,due_at,completed').single(); setSaving(false); if (error) { setMessage(error.message); return; } if (data) setItems(old => [...old.filter(item => item.chapter_id !== chapterId), data as Deadline].sort((a,b)=>a.due_at.localeCompare(b.due_at))); setChapterId(''); setDueAt(''); };
  const toggle = async (item: Deadline) => { const { error } = await supabase.from('chapter_deadlines').update({ completed: !item.completed }).eq('id', item.id).eq('user_id', userId); if (!error) setItems(old => old.map(row => row.id === item.id ? { ...row, completed: !row.completed } : row)); };
  const remove = async (id: string) => { const { error } = await supabase.from('chapter_deadlines').delete().eq('id', id).eq('user_id', userId); if (!error) setItems(old => old.filter(item => item.id !== id)); };
  return <section className="chapter-deadlines"><header><span className="deadline-icon"><CalendarDays size={18}/></span><div><span className="eyebrow">A DATE TO AIM FOR</span><h3>Chapter deadlines</h3><p>Make a plan for a chapter, then tick it off when you’re done.</p></div></header><form onSubmit={add}><select required value={chapterId} onChange={event=>setChapterId(event.target.value)}><option value="">Choose a chapter…</option>{subjects.map(subject=><optgroup label={subject.name} key={subject.id}>{chapters.filter(chapter=>chapter.subject_id===subject.id).map(chapter=><option value={chapter.id} key={chapter.id}>{chapter.title}</option>)}</optgroup>)}</select><input type="date" required value={dueAt} onChange={event=>setDueAt(event.target.value)}/><button disabled={saving||!chapterId||!dueAt}><Plus size={14}/>{saving?'Saving…':'Add deadline'}</button></form>{message&&<p className="deadline-message" role="alert">{message}</p>}<div className="deadline-list">{items.map(item=>{const chapter=chapters.find(row=>row.id===item.chapter_id);const subject=subjects.find(row=>row.id===chapter?.subject_id);const overdue=!item.completed&&item.due_at<new Date().toISOString().slice(0,10);return <article className={item.completed?'deadline-complete':''} key={item.id}><button className="deadline-check" onClick={()=>void toggle(item)} aria-label={item.completed?'Reopen deadline':'Mark chapter complete'}>{item.completed&&<Check size={13}/>}</button><span className="deadline-copy"><b>{chapter?.title??'Removed chapter'}</b><small>{subject?.name??'Chapter'} · Due {new Date(`${item.due_at}T12:00:00`).toLocaleDateString('en-US',{month:'short',day:'numeric'})}{overdue?' · Overdue':''}</small></span><button className="deadline-delete" onClick={()=>void remove(item.id)} aria-label="Remove deadline"><Trash2 size={14}/></button></article>;})}{items.length===0&&<p className="deadlines-empty">Your chapter plans will show here.</p>}</div></section>;
}
