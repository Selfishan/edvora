import { useMemo } from 'react';
import { ArrowRight, BookOpen, Check, Clock3, Flame, Target, TrendingUp } from 'lucide-react';
import './progress.css';

type Subject = { id: string; name: string; theme: string };
type Chapter = { id: string; subject_id: string; chapter_number: number; title: string };
type ChapterProgress = { chapter_id: string; status: string };
type FocusSession = { started_at: string; duration_seconds: number };
type Props = { subjects: Subject[]; chapters: Chapter[]; progress: ChapterProgress[]; sessions: FocusSession[]; dailyGoal: number; onUpdate: (chapterId: string, status: string) => void; onStudy: () => void };
const statusLabels: Record<string, string> = { not_started: 'Not started', in_progress: 'In progress', completed: 'Completed', needs_revision: 'Review again' };

export default function ProgressPage({ subjects, chapters, progress, sessions, dailyGoal, onUpdate, onStudy }: Props) {
  const progressFor = (id: string) => progress.find(item => item.chapter_id === id)?.status ?? 'not_started';
  const completed = chapters.filter(chapter => progressFor(chapter.id) === 'completed').length;
  const underway = chapters.filter(chapter => progressFor(chapter.id) === 'in_progress').length;
  const totalMinutes = Math.floor(sessions.reduce((sum, item) => sum + item.duration_seconds, 0) / 60);
  const week = useMemo(() => Array.from({ length: 7 }, (_, index) => {
    const day = new Date(); day.setHours(0, 0, 0, 0); day.setDate(day.getDate() - (6 - index));
    const minutes = Math.floor(sessions.filter(item => { const date = new Date(item.started_at); return date.getFullYear() === day.getFullYear() && date.getMonth() === day.getMonth() && date.getDate() === day.getDate(); }).reduce((sum, item) => sum + item.duration_seconds, 0) / 60);
    return { day, minutes };
  }), [sessions]);
  const currentStreak = useMemo(() => {
    const active = new Set(sessions.map(item => { const day = new Date(item.started_at); return `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`; }));
    let count = 0; const day = new Date(); day.setHours(0, 0, 0, 0);
    const todayKey = `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`;
    if (!active.has(todayKey)) day.setDate(day.getDate() - 1);
    while (active.has(`${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`)) { count++; day.setDate(day.getDate() - 1); }
    return count;
  }, [sessions]);
  const maxMinutes = Math.max(1, ...week.map(day => day.minutes));
  return <main className="progress-page">
    <header className="progress-welcome"><span className="progress-eyebrow"><TrendingUp size={14}/> YOUR LEARNING JOURNEY</span><h1>Progress that’s <em>yours.</em></h1><p>Every small step counts. Here’s how your learning is taking shape.</p></header>
    <section className="progress-summary"><article><span className="progress-icon violet"><BookOpen size={18}/></span><small>CHAPTERS COMPLETED</small><b>{completed}<i> / {chapters.length}</i></b><div className="progress-meter"><i style={{ width: `${chapters.length ? completed / chapters.length * 100 : 0}%` }}/></div></article><article><span className="progress-icon mint"><Target size={18}/></span><small>IN PROGRESS</small><b>{underway}<i> chapters</i></b><p>Keep a steady pace, one topic at a time.</p></article><article><span className="progress-icon peach"><Clock3 size={18}/></span><small>TOTAL STUDY TIME</small><b>{Math.floor(totalMinutes / 60)}<i>h {String(totalMinutes % 60).padStart(2, '0')}m</i></b><p>Across your recorded focus sessions.</p></article><article><span className="progress-icon butter"><Flame size={18}/></span><small>STUDY STREAK</small><b>{currentStreak}<i> {currentStreak === 1 ? 'day' : 'days'}</i></b><p>Consecutive days with a focus session.</p></article></section>
    <section className="progress-columns"><article className="progress-panel"><div className="progress-panel-heading"><div><span className="progress-eyebrow">LAST SEVEN DAYS</span><h2>Your focus rhythm</h2></div><span className="weekly-total">{week.reduce((sum, day) => sum + day.minutes, 0)} min</span></div><div className="progress-week-chart">{week.map(({ day, minutes }) => <div className="progress-week-day" key={day.toISOString()}><b>{minutes ? `${minutes}m` : ''}</b><div><i style={{ height: `${minutes ? Math.max(8, minutes / maxMinutes * 100) : 3}%` }}/></div><span>{day.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 1)}</span></div>)}</div><p className="progress-chart-note">Your activity is calculated from saved focus sessions.</p></article><article className="progress-panel"><div className="progress-panel-heading"><div><span className="progress-eyebrow">DAILY INTENTION</span><h2>Show up for yourself</h2></div></div><div className="daily-goal-display"><span className="goal-ring"><Target size={23}/></span><span><b>{dailyGoal} min</b><small>your daily focus goal</small></span></div><p className="progress-chart-note">Set or update your daily goal in your profile.</p></article></section>
    <section className="syllabus-section"><div className="syllabus-heading"><div><span className="progress-eyebrow">YOUR SYLLABUS</span><h2>Chapter by chapter</h2><p>Update each chapter as you learn. Your progress is saved privately.</p></div><button onClick={onStudy}>Open study library <ArrowRight size={15}/></button></div>{subjects.map(subject => { const items = chapters.filter(chapter => chapter.subject_id === subject.id); const done = items.filter(chapter => progressFor(chapter.id) === 'completed').length; return <article className="syllabus-subject" key={subject.id}><header><span className={`syllabus-subject-mark ${subject.theme}`}>{subject.name.slice(0, 1)}</span><b>{subject.name}</b><small>{done} of {items.length} complete</small><div className="syllabus-subject-meter"><i style={{ width: `${items.length ? done / items.length * 100 : 0}%` }}/></div></header><div className="syllabus-chapters">{items.map(chapter => { const status = progressFor(chapter.id); return <div className="syllabus-chapter" key={chapter.id}><span className="syllabus-check">{status === 'completed' && <Check size={13}/>}</span><span>{chapter.title}</span><select aria-label={`Update status for ${chapter.title}`} value={status} onChange={event => onUpdate(chapter.id, event.target.value)}>{Object.entries(statusLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></div>; })}</div></article>; })}</section>
  </main>;
}
