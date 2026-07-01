#!/usr/bin/env node
// הכנסת משתמש ראשוני ל-Supabase
// הרצה: SUPABASE_URL=xxx SUPABASE_SERVICE_ROLE_KEY=yyy node scripts/seed-user.mjs

import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'
import { createInterface } from 'readline'

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('חסרים: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
)

const rl = createInterface({ input: process.stdin, output: process.stdout })
const ask = (q) => new Promise((r) => rl.question(q, r))

const username     = await ask('שם משתמש (לדוגמה: ruth): ')
const displayName  = await ask('שם לתצוגה (לדוגמה: רות שפירא): ')
const email        = await ask('כתובת מייל: ')
const password     = await ask('סיסמה (תישמר כ-bcrypt): ')
rl.close()

const hash = await bcrypt.hash(password, 12)
console.log('מצפין סיסמה...')

const { error } = await supabase.from('app_users').insert({
  username,
  display_name: displayName,
  email,
  password_hash: hash,
})

if (error) {
  console.error('שגיאה:', error.message)
  process.exit(1)
}
console.log(`✅  משתמש "${username}" נוסף בהצלחה`)
