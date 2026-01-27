CREATE TABLE users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE,
  name TEXT,
  handle TEXT UNIQUE,
  voice_tag TEXT,
  presence TEXT,
  onboarding_complete BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE voices (
  id UUID PRIMARY KEY,
  author_id UUID REFERENCES users(id),
  body TEXT,
  presence TEXT,
  archived BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE responses (
  id UUID PRIMARY KEY,
  voice_id UUID,
  author_id UUID,
  target_user_id UUID,
  type TEXT,
  body TEXT,
  archived BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE acknowledgements (
  id UUID PRIMARY KEY,
  voice_id UUID,
  user_id UUID,
  created_at TIMESTAMP DEFAULT now(),
  UNIQUE (voice_id, user_id)
);
