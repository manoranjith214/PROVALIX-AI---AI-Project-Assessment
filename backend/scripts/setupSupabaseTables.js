const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  try {
    console.log('--- Step 1: Creating public.profiles table ---');
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS public.profiles (
        id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
        email TEXT,
        full_name TEXT,
        avatar_url TEXT,
        permanent_id TEXT,
        department TEXT DEFAULT 'Computer Science & Engineering',
        year TEXT DEFAULT '1st Year',
        college TEXT DEFAULT 'Apex Institute of Technology & Research',
        role TEXT DEFAULT 'Student',
        phone TEXT,
        dob TEXT,
        location TEXT,
        bio TEXT,
        degree TEXT,
        section TEXT,
        register_number TEXT,
        expected_graduation_year TEXT,
        skills JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    console.log('--- Step 2: Enabling RLS on profiles and creating policies ---');
    await prisma.$executeRawUnsafe(`ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;`);
    await prisma.$executeRawUnsafe(`DROP POLICY IF EXISTS "Users can select own profile" ON public.profiles;`);
    await prisma.$executeRawUnsafe(`DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;`);
    await prisma.$executeRawUnsafe(`DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;`);
    await prisma.$executeRawUnsafe(`DROP POLICY IF EXISTS "Users can delete own profile" ON public.profiles;`);

    await prisma.$executeRawUnsafe(`
      CREATE POLICY "Users can select own profile"
        ON public.profiles FOR SELECT
        USING (auth.uid() = id);
    `);
    await prisma.$executeRawUnsafe(`
      CREATE POLICY "Users can insert own profile"
        ON public.profiles FOR INSERT
        WITH CHECK (auth.uid() = id);
    `);
    await prisma.$executeRawUnsafe(`
      CREATE POLICY "Users can update own profile"
        ON public.profiles FOR UPDATE
        USING (auth.uid() = id)
        WITH CHECK (auth.uid() = id);
    `);
    await prisma.$executeRawUnsafe(`
      CREATE POLICY "Users can delete own profile"
        ON public.profiles FOR DELETE
        USING (auth.uid() = id);
    `);

    console.log('--- Step 3: Creating public.projects table with RLS ---');
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS public.projects (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        category TEXT DEFAULT 'General Computing & AI',
        description TEXT DEFAULT '',
        problem_statement TEXT DEFAULT '',
        proposed_solution TEXT DEFAULT '',
        objectives TEXT DEFAULT '',
        innovation TEXT DEFAULT '',
        features TEXT DEFAULT '',
        target_users TEXT DEFAULT '',
        technologies JSONB DEFAULT '[]'::jsonb,
        programming_languages JSONB DEFAULT '[]'::jsonb,
        testing_approach TEXT DEFAULT '',
        limitations TEXT DEFAULT '',
        future_enhancements TEXT DEFAULT '',
        github_url TEXT,
        live_demo_url TEXT,
        external_links JSONB DEFAULT '[]'::jsonb,
        resources JSONB DEFAULT '[]'::jsonb,
        ai_evaluation JSONB,
        plagiarism JSONB,
        status TEXT DEFAULT 'Evaluated',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    await prisma.$executeRawUnsafe(`ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;`);
    await prisma.$executeRawUnsafe(`DROP POLICY IF EXISTS "Users can select own projects" ON public.projects;`);
    await prisma.$executeRawUnsafe(`DROP POLICY IF EXISTS "Users can insert own projects" ON public.projects;`);
    await prisma.$executeRawUnsafe(`DROP POLICY IF EXISTS "Users can update own projects" ON public.projects;`);
    await prisma.$executeRawUnsafe(`DROP POLICY IF EXISTS "Users can delete own projects" ON public.projects;`);

    await prisma.$executeRawUnsafe(`
      CREATE POLICY "Users can select own projects"
        ON public.projects FOR SELECT
        USING (auth.uid() = user_id);
    `);
    await prisma.$executeRawUnsafe(`
      CREATE POLICY "Users can insert own projects"
        ON public.projects FOR INSERT
        WITH CHECK (auth.uid() = user_id);
    `);
    await prisma.$executeRawUnsafe(`
      CREATE POLICY "Users can update own projects"
        ON public.projects FOR UPDATE
        USING (auth.uid() = user_id)
        WITH CHECK (auth.uid() = user_id);
    `);
    await prisma.$executeRawUnsafe(`
      CREATE POLICY "Users can delete own projects"
        ON public.projects FOR DELETE
        USING (auth.uid() = user_id);
    `);

    console.log('--- Step 4: Creating public.teams table with RLS ---');
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS public.teams (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        code TEXT NOT NULL,
        logo TEXT,
        max_size INT DEFAULT 4,
        captain_id TEXT,
        captain_name TEXT,
        captain_email TEXT,
        captain_permanent_id TEXT,
        members JSONB DEFAULT '[]'::jsonb,
        invitations JSONB DEFAULT '[]'::jsonb,
        submissions JSONB DEFAULT '[]'::jsonb,
        status TEXT DEFAULT 'Active',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    await prisma.$executeRawUnsafe(`ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;`);
    await prisma.$executeRawUnsafe(`DROP POLICY IF EXISTS "Users can select own teams" ON public.teams;`);
    await prisma.$executeRawUnsafe(`DROP POLICY IF EXISTS "Users can insert own teams" ON public.teams;`);
    await prisma.$executeRawUnsafe(`DROP POLICY IF EXISTS "Users can update own teams" ON public.teams;`);
    await prisma.$executeRawUnsafe(`DROP POLICY IF EXISTS "Users can delete own teams" ON public.teams;`);

    await prisma.$executeRawUnsafe(`
      CREATE POLICY "Users can select own teams"
        ON public.teams FOR SELECT
        USING (auth.uid() = user_id);
    `);
    await prisma.$executeRawUnsafe(`
      CREATE POLICY "Users can insert own teams"
        ON public.teams FOR INSERT
        WITH CHECK (auth.uid() = user_id);
    `);
    await prisma.$executeRawUnsafe(`
      CREATE POLICY "Users can update own teams"
        ON public.teams FOR UPDATE
        USING (auth.uid() = user_id)
        WITH CHECK (auth.uid() = user_id);
    `);
    await prisma.$executeRawUnsafe(`
      CREATE POLICY "Users can delete own teams"
        ON public.teams FOR DELETE
        USING (auth.uid() = user_id);
    `);

    console.log('--- Step 5: Creating public.classrooms table with RLS ---');
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS public.classrooms (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        code TEXT NOT NULL,
        description TEXT,
        logo TEXT,
        owner_id TEXT,
        start_date TIMESTAMPTZ DEFAULT NOW(),
        deadline TIMESTAMPTZ DEFAULT (NOW() + interval '30 days'),
        submission_mode TEXT DEFAULT 'Individual',
        min_team_size INT DEFAULT 2,
        max_team_size INT DEFAULT 4,
        resources_config JSONB DEFAULT '[]'::jsonb,
        status TEXT DEFAULT 'Active',
        members JSONB DEFAULT '[]'::jsonb,
        invitations JSONB DEFAULT '[]'::jsonb,
        submissions JSONB DEFAULT '[]'::jsonb,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    await prisma.$executeRawUnsafe(`ALTER TABLE public.classrooms ENABLE ROW LEVEL SECURITY;`);
    await prisma.$executeRawUnsafe(`DROP POLICY IF EXISTS "Users can select own classrooms" ON public.classrooms;`);
    await prisma.$executeRawUnsafe(`DROP POLICY IF EXISTS "Users can insert own classrooms" ON public.classrooms;`);
    await prisma.$executeRawUnsafe(`DROP POLICY IF EXISTS "Users can update own classrooms" ON public.classrooms;`);
    await prisma.$executeRawUnsafe(`DROP POLICY IF EXISTS "Users can delete own classrooms" ON public.classrooms;`);

    await prisma.$executeRawUnsafe(`
      CREATE POLICY "Users can select own classrooms"
        ON public.classrooms FOR SELECT
        USING (auth.uid() = user_id);
    `);
    await prisma.$executeRawUnsafe(`
      CREATE POLICY "Users can insert own classrooms"
        ON public.classrooms FOR INSERT
        WITH CHECK (auth.uid() = user_id);
    `);
    await prisma.$executeRawUnsafe(`
      CREATE POLICY "Users can update own classrooms"
        ON public.classrooms FOR UPDATE
        USING (auth.uid() = user_id)
        WITH CHECK (auth.uid() = user_id);
    `);
    await prisma.$executeRawUnsafe(`
      CREATE POLICY "Users can delete own classrooms"
        ON public.classrooms FOR DELETE
        USING (auth.uid() = user_id);
    `);

    console.log('--- Step 6: Creating public.user_settings table with RLS ---');
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS public.user_settings (
        user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
        notification_preferences JSONB DEFAULT '{}'::jsonb,
        privacy_preferences JSONB DEFAULT '{}'::jsonb,
        evaluation_preferences JSONB DEFAULT '{}'::jsonb,
        ai_settings JSONB DEFAULT '{}'::jsonb,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    await prisma.$executeRawUnsafe(`ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;`);
    await prisma.$executeRawUnsafe(`DROP POLICY IF EXISTS "Users can select own settings" ON public.user_settings;`);
    await prisma.$executeRawUnsafe(`DROP POLICY IF EXISTS "Users can insert own settings" ON public.user_settings;`);
    await prisma.$executeRawUnsafe(`DROP POLICY IF EXISTS "Users can update own settings" ON public.user_settings;`);

    await prisma.$executeRawUnsafe(`
      CREATE POLICY "Users can select own settings"
        ON public.user_settings FOR SELECT
        USING (auth.uid() = user_id);
    `);
    await prisma.$executeRawUnsafe(`
      CREATE POLICY "Users can insert own settings"
        ON public.user_settings FOR INSERT
        WITH CHECK (auth.uid() = user_id);
    `);
    await prisma.$executeRawUnsafe(`
      CREATE POLICY "Users can update own settings"
        ON public.user_settings FOR UPDATE
        USING (auth.uid() = user_id)
        WITH CHECK (auth.uid() = user_id);
    `);

    console.log('--- Step 7: Safe cleanup of profiles and user application tables ---');
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE public.profiles RESTART IDENTITY CASCADE;`);
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE public.projects RESTART IDENTITY CASCADE;`);
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE public.teams RESTART IDENTITY CASCADE;`);
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE public.classrooms RESTART IDENTITY CASCADE;`);
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE public.user_settings RESTART IDENTITY CASCADE;`);
    console.log('Cleaned application data tables (auth.users preserved).');

    console.log('ALL SUPABASE TABLES & RLS POLICIES SUCCESSFULLY CREATED & CONFIGURED!');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await prisma.$disconnect();
  }
}

run();
