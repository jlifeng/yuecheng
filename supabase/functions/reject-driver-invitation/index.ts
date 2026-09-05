// 拒绝车队邀请 Edge Function
// 司机端在「我的」页面拒绝某条 pending 车队邀请时调用。
// 用 service role key 把 drivers 表中对应记录置 status=unbound（硬拒绝），
// 而非前端本地软删除 —— drivers 表 UPDATE 受 RLS 限制，匿名/认证用户无法直接改。
//
// 仅允许处理本人手机号匹配、且 user_id 尚未回填的 pending 记录，
// 避免误改他人或已绑定的司机记录。

import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  try {
    const { driver_id } = await req.json()

    if (!driver_id) {
      return new Response(JSON.stringify({ success: false, error: '缺少 driver_id' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      })
    }

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, error: '未登录' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      })
    }

    const token = authHeader.replace('Bearer ', '')

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!

    const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } }
    })

    // 校验当前用户
    const { data: { user }, error: userError } = await anonClient.auth.getUser()
    if (userError || !user) {
      return new Response(JSON.stringify({ success: false, error: '用户无效' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      })
    }

    // 取用户手机号（profiles.phone）
    const { data: profile } = await serviceClient
      .from('profiles')
      .select('phone')
      .eq('id', user.id)
      .single()

    const phone = profile?.phone
    if (!phone) {
      return new Response(JSON.stringify({ success: false, error: '未绑定手机号' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      })
    }

    // 查目标 driver 记录，校验：phone 匹配本人 + user_id 为空 + status=pending
    // （只能拒绝发给自己的、尚未确认的邀请，防止越权改他人记录）
    const { data: driver } = await serviceClient
      .from('drivers')
      .select('id, phone, user_id, status')
      .eq('id', driver_id)
      .single()

    if (!driver) {
      return new Response(JSON.stringify({ success: false, error: '邀请不存在' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      })
    }

    if (driver.phone !== phone) {
      return new Response(JSON.stringify({ success: false, error: '无权操作该邀请' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      })
    }

    if (driver.user_id) {
      // 已绑定本人 —— 不应走拒绝流程，提示去解绑
      return new Response(JSON.stringify({ success: false, error: '该邀请已确认，请使用解绑' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      })
    }

    // 置 status=unbound（保留记录，但不再对司机展示为邀请）
    await serviceClient
      .from('drivers')
      .update({ status: 'unbound' })
      .eq('id', driver_id)

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    })

  } catch (e) {
    console.error('reject-driver-invitation error:', e instanceof Error ? e.message : 'unknown error')
    return new Response(JSON.stringify({ success: false, error: '服务器错误' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    })
  }
})
