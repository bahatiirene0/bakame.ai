-- ============================================
-- Bakame.ai Database Schema
-- Scalable design for users, chats, and agents
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- CUSTOM TYPES (Enums)
-- ============================================

CREATE TYPE user_role AS ENUM ('user', 'premium', 'admin');
CREATE TYPE message_role AS ENUM ('user', 'assistant', 'system');
CREATE TYPE subscription_plan AS ENUM ('free', 'basic', 'premium', 'enterprise');
CREATE TYPE subscription_status AS ENUM ('active', 'cancelled', 'expired', 'trial');

-- ============================================
-- USERS TABLE
-- Extended profile from Supabase Auth
-- ============================================

CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  name TEXT,
  avatar_url TEXT,
  phone TEXT,
  role user_role DEFAULT 'user',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for email lookups
CREATE INDEX idx_users_email ON users(email);

-- ============================================
-- AGENTS TABLE
-- Specialist AI assistants
-- ============================================

CREATE TABLE agents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  system_prompt TEXT NOT NULL,
  icon TEXT DEFAULT '🐰',
  color TEXT DEFAULT '#22C55E',
  capabilities JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  is_premium BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for slug lookups
CREATE INDEX idx_agents_slug ON agents(slug);
CREATE INDEX idx_agents_active ON agents(is_active) WHERE is_active = true;

-- Insert default Bakame agent
INSERT INTO agents (name, slug, description, system_prompt, icon, color, capabilities, sort_order) VALUES
(
  'Bakame',
  'default',
  'Umufasha wubwenge - General AI assistant for all your questions',
  'You are Bakame.ai, a friendly and intelligent AI assistant created for Rwandans. You are helpful, knowledgeable, and respectful. You can assist with a wide range of topics including general knowledge, coding, writing, math, and more. When appropriate, incorporate Kinyarwanda phrases and cultural awareness. Always be honest if you don''t know something.',
  '🐰',
  '#22C55E',
  '["calculator", "weather", "currency", "search", "translate", "time", "news", "places"]',
  0
);

-- ============================================
-- CHAT SESSIONS TABLE
-- Conversation containers
-- ============================================

CREATE TABLE chat_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  agent_slug TEXT DEFAULT 'default',  -- Stores agent slug for easy frontend access
  title TEXT DEFAULT 'Ikiganiro gishya',
  metadata JSONB DEFAULT '{}',
  is_archived BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX idx_chat_sessions_user ON chat_sessions(user_id);
CREATE INDEX idx_chat_sessions_user_updated ON chat_sessions(user_id, updated_at DESC);
CREATE INDEX idx_chat_sessions_agent ON chat_sessions(agent_id);
CREATE INDEX idx_chat_sessions_agent_slug ON chat_sessions(agent_slug);

-- ============================================
-- MESSAGES TABLE
-- Individual chat messages
-- ============================================

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role message_role NOT NULL,
  content TEXT NOT NULL,
  tool_calls JSONB,
  tokens_used INTEGER,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fetching messages by session
CREATE INDEX idx_messages_session ON messages(session_id);
CREATE INDEX idx_messages_session_created ON messages(session_id, created_at ASC);

-- ============================================
-- USER_AGENTS TABLE
-- Track agent usage per user
-- ============================================

CREATE TABLE user_agents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  is_favorite BOOLEAN DEFAULT false,
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, agent_id)
);

CREATE INDEX idx_user_agents_user ON user_agents(user_id);

-- ============================================
-- SUBSCRIPTIONS TABLE (Future)
-- User subscription plans
-- ============================================

CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan subscription_plan DEFAULT 'free',
  status subscription_status DEFAULT 'active',
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);

-- ============================================
-- USAGE_LOGS TABLE
-- Analytics & billing tracking
-- ============================================

CREATE TABLE usage_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id UUID REFERENCES chat_sessions(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  tokens_input INTEGER DEFAULT 0,
  tokens_output INTEGER DEFAULT 0,
  cost_usd DECIMAL(10, 6),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_usage_logs_user ON usage_logs(user_id);
CREATE INDEX idx_usage_logs_created ON usage_logs(created_at DESC);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- Ensure users can only access their own data
-- ============================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_logs ENABLE ROW LEVEL SECURITY;

-- Users can read/update their own profile
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Anyone can view active agents
CREATE POLICY "Anyone can view active agents" ON agents
  FOR SELECT USING (is_active = true);

-- Users can CRUD their own chat sessions
CREATE POLICY "Users can view own sessions" ON chat_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own sessions" ON chat_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions" ON chat_sessions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own sessions" ON chat_sessions
  FOR DELETE USING (auth.uid() = user_id);

-- Users can CRUD messages in their sessions
CREATE POLICY "Users can view own messages" ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM chat_sessions
      WHERE chat_sessions.id = messages.session_id
      AND chat_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create messages in own sessions" ON messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM chat_sessions
      WHERE chat_sessions.id = messages.session_id
      AND chat_sessions.user_id = auth.uid()
    )
  );

-- Users can manage their agent preferences
CREATE POLICY "Users can view own agent prefs" ON user_agents
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own agent prefs" ON user_agents
  FOR ALL USING (auth.uid() = user_id);

-- Users can view their subscriptions
CREATE POLICY "Users can view own subscription" ON subscriptions
  FOR SELECT USING (auth.uid() = user_id);

-- Users can view their usage logs
CREATE POLICY "Users can view own usage" ON usage_logs
  FOR SELECT USING (auth.uid() = user_id);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agents_updated_at
  BEFORE UPDATE ON agents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chat_sessions_updated_at
  BEFORE UPDATE ON chat_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to create user profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url'
  );

  -- Also create a free subscription
  INSERT INTO public.subscriptions (user_id, plan, status)
  VALUES (NEW.id, 'free', 'active');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on auth.users insert
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================
-- SEED DATA: Additional Agents
-- ============================================

INSERT INTO agents (name, slug, description, system_prompt, icon, color, capabilities, is_premium, sort_order) VALUES
(
  'Tax Expert',
  'tax-expert',
  'Expert in Rwandan taxation and RRA regulations',
  'You are a tax expert AI assistant specializing in Rwandan taxation. You understand RRA (Rwanda Revenue Authority) regulations, tax filing procedures, VAT, income tax, and business taxation. Provide accurate, helpful tax guidance while always recommending users consult with certified tax professionals for specific legal matters.',
  '💰',
  '#EAB308',
  '["calculator"]',
  false,
  1
),
(
  'Code Helper',
  'code-helper',
  'Programming and software development assistant',
  'You are an expert programming assistant. You help with coding in all major languages including Python, JavaScript, TypeScript, Java, and more. You can explain concepts, debug code, suggest improvements, and help with software architecture. Always provide clear, well-commented code examples.',
  '💻',
  '#3B82F6',
  '["calculator"]',
  false,
  2
),
(
  'Business Coach',
  'business-coach',
  'Entrepreneurship and business strategy advisor',
  'You are a business coach and entrepreneurship advisor familiar with the East African business landscape. You help with business planning, marketing strategies, financial planning, and startup guidance. You understand the Rwandan business environment, RDB registration, and local market dynamics.',
  '💼',
  '#8B5CF6',
  '["calculator", "currency", "search"]',
  false,
  3
),
(
  'Kinyarwanda Teacher',
  'kiny-teacher',
  'Learn and practice Kinyarwanda language',
  'You are a Kinyarwanda language teacher. You help users learn Kinyarwanda vocabulary, grammar, pronunciation, and cultural context. You can translate between Kinyarwanda, English, and French. You make learning fun with examples from everyday Rwandan life.',
  '📚',
  '#EC4899',
  '["translate"]',
  false,
  4
),
(
  'Health Guide',
  'health-guide',
  'General health information and wellness tips',
  'You are a health information assistant. You provide general health education, wellness tips, and information about common health topics. You always emphasize that you are not a replacement for professional medical advice and encourage users to consult healthcare providers for medical concerns. You are familiar with Rwanda''s healthcare system.',
  '🏥',
  '#10B981',
  '["search"]',
  true,
  5
);
