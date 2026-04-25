import { createClient } from '@/lib/supabase/server';
import { CoursesClient } from './CoursesClient';

export const dynamic = 'force-dynamic';

export default async function CoursesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Run the courses fetch and (when signed in) the enrollments fetch in
  // parallel. Saves one Supabase round-trip on cold serverless starts.
  const [coursesRes, enrollmentsRes] = await Promise.all([
    supabase
      .from('courses')
      .select('*, instructor:profiles!courses_instructor_id_fkey(username, tier)')
      .order('created_at', { ascending: false }),
    user
      ? supabase
          .from('course_enrollments')
          .select('*, course:courses(*)')
          .eq('user_id', user.id)
      : Promise.resolve({ data: [] as any[] }),
  ]);

  return (
    <CoursesClient
      courses={coursesRes.data || []}
      enrollments={enrollmentsRes.data || []}
    />
  );
}
