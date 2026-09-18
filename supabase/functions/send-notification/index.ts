// Edge Function : diffusion d'une notification push par le super admin
// (admin_national uniquement) à tous les adhérents actifs ayant activé les
// notifications "annonces". Appelée par l'app via supabase.functions.invoke.
//
// SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY sont injectées
// automatiquement par Supabase dans chaque Edge Function, pas besoin de les
// configurer manuellement.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Non authentifié' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Client "en tant qu'appelant" (respecte la RLS) pour vérifier son rôle.
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await callerClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Session invalide' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: profile, error: profileError } = await callerClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || profile?.role !== 'admin_national') {
      return new Response(JSON.stringify({ error: 'Réservé au super admin' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { title, body } = await req.json();
    if (!title || !body) {
      return new Response(JSON.stringify({ error: 'title et body requis' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Client service_role : contourne la RLS pour agréger tous les tokens.
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: activeProfiles, error: activeError } = await adminClient
      .from('profiles')
      .select('id')
      .eq('is_suspended', false)
      .gte('valid_until', new Date().toISOString().slice(0, 10));
    if (activeError) throw activeError;

    const activeIds = (activeProfiles || []).map((p: { id: string }) => p.id);
    if (activeIds.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: prefs, error: prefsError } = await adminClient
      .from('notification_preferences')
      .select('user_id, announcements')
      .in('user_id', activeIds);
    if (prefsError) throw prefsError;

    const optedOut = new Set(
      (prefs || []).filter((p: { announcements: boolean }) => p.announcements === false).map((p: { user_id: string }) => p.user_id)
    );
    const eligibleIds = activeIds.filter((id: string) => !optedOut.has(id));

    const { data: tokenRows, error: tokensError } = await adminClient
      .from('push_tokens')
      .select('user_id, expo_push_token')
      .in('user_id', eligibleIds);
    if (tokensError) throw tokensError;

    const rows = tokenRows || [];
    if (rows.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Template générique requis par la FK de notification_send_log (créé une
    // seule fois, le contenu réel est celui envoyé dynamiquement ci-dessous).
    await adminClient.from('notification_templates').upsert(
      {
        key: 'admin_broadcast',
        title: 'Diffusion admin',
        body: "Contenu défini à l'envoi",
        preference_column: 'announcements',
      },
      { onConflict: 'key' }
    );

    const broadcastId = crypto.randomUUID();
    let sent = 0;

    for (let i = 0; i < rows.length; i += 100) {
      const chunk = rows.slice(i, i + 100);
      const messages = chunk.map((t: { expo_push_token: string }) => ({
        to: t.expo_push_token,
        title,
        body,
        sound: 'default',
        channelId: 'default',
      }));

      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-Encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messages),
      });
      const result = await response.json().catch(() => ({}));
      const tickets = result?.data || [];

      const logRows = chunk.map((t: { user_id: string }, idx: number) => ({
        template_key: 'admin_broadcast',
        user_id: t.user_id,
        related_entity_id: broadcastId,
        expo_ticket_id: tickets[idx]?.id || null,
      }));
      await adminClient.from('notification_send_log').insert(logRows);

      sent += chunk.length;
    }

    return new Response(JSON.stringify({ sent }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
