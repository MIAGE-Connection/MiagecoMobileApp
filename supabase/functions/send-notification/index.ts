// Edge Function : diffusion d'une notification push par le super admin
// (admin_national uniquement) à tous les adhérents actifs ayant activé les
// notifications "annonces". Appelée soit par l'app (supabase.functions.invoke,
// admin authentifié), soit par le job pg_cron des notifications programmées
// (voir supabase_phase5b_scheduled_notifications.sql), identifié par le
// secret CRON_SECRET.
//
// SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY sont injectées
// automatiquement par Supabase dans chaque Edge Function. CRON_SECRET doit en
// revanche être configuré manuellement (Edge Functions > send-notification >
// Settings > Secrets), avec la même valeur que celle mise dans le SQL du cron.
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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const cronSecret = Deno.env.get('CRON_SECRET');

    // Deux façons d'être autorisé : soit un admin_national authentifié
    // (envoi manuel depuis l'app), soit le job pg_cron des notifications
    // programmées, identifié par un secret partagé (jamais exposé au client).
    const isCronCall = Boolean(cronSecret) && req.headers.get('x-cron-secret') === cronSecret;

    if (!isCronCall) {
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) {
        return new Response(JSON.stringify({ error: 'Non authentifié' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

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
    }

    const { title, body } = await req.json();
    const source = isCronCall ? 'scheduled' : 'manual';
    if (!title || !body) {
      return new Response(JSON.stringify({ error: 'title et body requis' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Client service_role : contourne la RLS pour agréger tous les tokens.
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const recordHistory = async (sentCount: number) => {
      await adminClient.from('notification_history').insert({ title, body, source, sent_count: sentCount });
    };

    const { data: activeProfiles, error: activeError } = await adminClient
      .from('profiles')
      .select('id')
      .eq('is_suspended', false)
      .gte('valid_until', new Date().toISOString().slice(0, 10));
    if (activeError) throw activeError;

    const activeIds = (activeProfiles || []).map((p: { id: string }) => p.id);
    if (activeIds.length === 0) {
      await recordHistory(0);
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
      await recordHistory(0);
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

    await recordHistory(sent);
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
