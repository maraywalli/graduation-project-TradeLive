'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { GraduationCap, Plus, Clock, X, Loader2, Play, Upload } from 'lucide-react';
import { useI18n } from '@/lib/i18n/provider';
import { useAuth } from '@/lib/auth/provider';
import { createClient } from '@/lib/supabase/browser';
import { toast } from '@/components/ui/Toaster';

const CATEGORIES = ['business', 'tech', 'design', 'marketing', 'language', 'lifestyle', 'other'];

export function CoursesClient({ courses, enrollments }: { courses: any[]; enrollments: any[] }) {
  const { t, locale } = useI18n();
  const { user } = useAuth();
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [tab, setTab] = useState<'all' | 'mine'>('all');
  const enrolledIds = new Set(enrollments.map((e) => e.course_id));

  const enroll = async (course: any) => {
    if (!user) { router.push('/login?next=/courses'); return; }
    const supabase = createClient();
    const { error } = await supabase.from('course_enrollments').insert({ course_id: course.id, user_id: user.id });
    if (error) return toast(error.message, 'error');
    toast(t.common.success);
    router.refresh();
  };

  const updateProgress = async (enrollmentId: string, progress: number) => {
    const supabase = createClient();
    const { error } = await supabase.from('course_enrollments').update({ progress }).eq('id', enrollmentId);
    if (error) return toast(error.message, 'error');
    router.refresh();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl md:text-3xl font-black flex items-center gap-2">
          <GraduationCap className="w-7 h-7 text-orange-500" /> {t.courses.title}
        </h1>
        {user && (
          <button onClick={() => setShowForm(true)} className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 text-white font-black flex items-center gap-2">
            <Plus className="w-4 h-4" /> {locale === 'ku' ? 'خولی نوێ' : 'New course'}
          </button>
        )}
      </div>

      <div className="flex gap-2 mb-6">
        <button onClick={() => setTab('all')} className={`px-4 py-2 rounded-xl font-black text-sm ${tab === 'all' ? 'bg-orange-500 text-white' : 'bg-zinc-100 dark:bg-zinc-800'}`}>
          {locale === 'ku' ? 'هەموو' : 'All Courses'}
        </button>
        {user && (
          <button onClick={() => setTab('mine')} className={`px-4 py-2 rounded-xl font-black text-sm ${tab === 'mine' ? 'bg-orange-500 text-white' : 'bg-zinc-100 dark:bg-zinc-800'}`}>
            {t.courses.myEnrollments} ({enrollments.length})
          </button>
        )}
      </div>

      {tab === 'all' ? (
        courses.length === 0 ? (
          <Empty text={t.courses.noCourses} />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {courses.map((c) => (
              <div key={c.id} className="bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 flex flex-col">
                <div className="aspect-[16/9] bg-gradient-to-br from-blue-500 to-purple-600 relative">
                  {c.cover_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.cover_url} alt={c.title} className="w-full h-full object-cover" />
                  ) : (
                    <GraduationCap className="w-12 h-12 text-white/60 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                  )}
                </div>
                <div className="p-4 flex-1 flex flex-col">
                  <h3 className="font-black mb-1">{c.title}</h3>
                  <p className="text-xs font-bold text-zinc-500 mb-2">@{c.instructor?.username}</p>
                  <div className="text-xs font-bold text-zinc-500 flex items-center gap-1 mb-3">
                    <Clock className="w-3 h-3" /> {c.duration_minutes} {locale === 'ku' ? 'خولەک' : 'min'}
                  </div>
                  <div className="font-black text-orange-500 mb-3">
                    {c.price > 0 ? `${Number(c.price).toLocaleString()} ${t.common.currency}` : (locale === 'ku' ? 'بێبەرامبەر' : 'Free')}
                  </div>
                  <button
                    onClick={() => enroll(c)}
                    disabled={enrolledIds.has(c.id)}
                    className="mt-auto w-full py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 text-white font-black disabled:opacity-50"
                  >
                    {enrolledIds.has(c.id) ? (locale === 'ku' ? 'تۆمارکراوە' : 'Enrolled') : t.courses.enroll}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        enrollments.length === 0 ? (
          <Empty text={locale === 'ku' ? 'هیچ خولێکت نییە' : 'No enrollments yet'} />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {enrollments.map((e) => (
              <div key={e.id} className="bg-white dark:bg-zinc-900 rounded-2xl p-5 border border-zinc-200 dark:border-zinc-800">
                <h3 className="font-black mb-2">{e.course?.title}</h3>
                <div className="mb-3">
                  <div className="flex justify-between text-xs font-bold text-zinc-500 mb-1">
                    <span>{t.courses.progress}</span><span>{e.progress}%</span>
                  </div>
                  <div className="w-full h-2 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-orange-500 to-red-500" style={{ width: `${e.progress}%` }} />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => updateProgress(e.id, Math.min(100, e.progress + 25))} className="flex-1 py-2 rounded-xl bg-orange-500 text-white font-black text-sm flex items-center justify-center gap-1">
                    <Play className="w-3 h-3" /> +25%
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {showForm && <CourseFormModal onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); router.refresh(); }} />}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="text-center py-20 text-zinc-500"><GraduationCap className="w-16 h-16 mx-auto mb-4 opacity-30" /><p className="font-bold text-lg">{text}</p></div>;
}

function CourseFormModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const { t, locale } = useI18n();
  const { user } = useAuth();
  const [form, setForm] = useState({ title: '', description: '', price: '0', duration_minutes: '60', category: 'tech', content_url: '', cover_url: '' });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const uploadImage = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/items/upload', { method: 'POST', body: fd });
      const json = await res.json();
      if (!res.ok || !json.url) throw new Error(json.error || 'Upload failed');
      setForm((f) => ({ ...f, cover_url: json.url }));
      toast(locale === 'ku' ? 'وێنە بارکرا' : 'Cover uploaded', 'success');
    } catch (err: any) {
      toast(err?.message || 'Upload failed', 'error');
    } finally {
      setUploading(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.from('courses').insert({
      instructor_id: user.id,
      title: form.title,
      description: form.description || null,
      cover_url: form.cover_url || null,
      price: Number(form.price),
      duration_minutes: Number(form.duration_minutes),
      category: form.category,
      content_url: form.content_url || null,
    });
    setSaving(false);
    if (error) return toast(error.message, 'error');
    toast(t.common.success);
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <form onSubmit={submit} className="bg-white dark:bg-zinc-900 rounded-3xl p-6 w-full max-w-lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-black">{locale === 'ku' ? 'خولی نوێ' : 'New course'}</h2>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"><X className="w-5 h-5" /></button>
        </div>
        <div className="flex flex-col gap-3">
          <div>
            <label className="text-xs font-bold text-zinc-600 dark:text-zinc-400 mb-1 block">
              {locale === 'ku' ? 'وێنەی پەرتووک' : 'Course cover'}
            </label>
            <label className="flex items-center justify-center gap-2 px-4 py-3 bg-zinc-100 dark:bg-zinc-800 rounded-xl text-sm font-bold cursor-pointer hover:bg-zinc-200 dark:hover:bg-zinc-700">
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {locale === 'ku' ? 'وێنە بارکە' : 'Upload cover'}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0])} />
            </label>
            {form.cover_url && (
              <div className="mt-3 rounded-2xl overflow-hidden w-full h-40 bg-zinc-100 dark:bg-zinc-800">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={form.cover_url} alt="Course cover" className="w-full h-full object-cover" />
              </div>
            )}
          </div>
          <Field label={t.common.title} value={form.title} onChange={(v) => setForm({ ...form, title: v })} required />
          <Field label={t.common.description} value={form.description} onChange={(v) => setForm({ ...form, description: v })} />
          <div className="grid grid-cols-2 gap-3">
            <Field label={t.common.price} type="number" value={form.price} onChange={(v) => setForm({ ...form, price: v })} required />
            <Field label={locale === 'ku' ? 'ماوە (خولەک)' : 'Duration (min)'} type="number" value={form.duration_minutes} onChange={(v) => setForm({ ...form, duration_minutes: v })} required />
          </div>
          <div>
            <label className="text-xs font-bold text-zinc-600 dark:text-zinc-400 mb-1 block">{t.common.category}</label>
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="w-full px-4 py-3 bg-zinc-100 dark:bg-zinc-800 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-orange-500">
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <Field label={locale === 'ku' ? 'لینکی ناوەڕۆک' : 'Content URL'} value={form.content_url} onChange={(v) => setForm({ ...form, content_url: v })} />
          <button disabled={saving} className="mt-2 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 text-white font-black flex items-center justify-center gap-2 disabled:opacity-50">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {t.common.save}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', required }: { label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean }) {
  return (
    <div>
      <label className="text-xs font-bold text-zinc-600 dark:text-zinc-400 mb-1 block">{label}</label>
      <input type={type} required={required} value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-3 bg-zinc-100 dark:bg-zinc-800 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-orange-500" />
    </div>
  );
}
