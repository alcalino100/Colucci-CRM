"use client"

// Client único do Supabase para o navegador.
// Lê as chaves das variáveis de ambiente (já configuradas na Vercel).
import { createClient } from "@supabase/supabase-js"

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(url, anon)
