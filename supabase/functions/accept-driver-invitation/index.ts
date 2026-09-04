// 确认加入车队邀请 Edge Function
// 司机端在「我的」页面点击「确认加入」时调用（不依赖微信 getPhoneNumber）。
// 用 service role key 按当前用户 profiles.phone 匹配 drivers 表中
// user_id 为空、status=pending 的邀请，回填 user_id + 置 status=active，
// 并给该用户分配 merchant_driver 角色、写入 merchant_id。
//
// 校验：只能确认 phone 匹配本人的 pending 记录，防止越权回填他人邀请。

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

    // 取用户手机号
    const { data: profile } = await serviceClient
      .from('profiles')
      .select('phone')
      .eq('id', user.id)
      .single()

    const phone = profile?.phone
    if (!phone) {
      return new Response(JSON.stringify({ success: false, error: '未绑定手机号，无法匹配车队邀请' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      })
    }

    // 查目标 driver 记录
    const { data: driver } = await serviceClient
      .from('drivers')
      .select('id, phone, user_id, status, merchant_id')
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

    if (driver.user_id && driver.user_id !== user.id) {
      return new Response(JSON.stringify({ success: false, error: '该邀请已被他人确认' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      })
    }

    if (driver.status === 'active' && driver.user_id === user.id) {
      // 已是本人激活状态，幂等返回成功
      return new Response(JSON.stringify({ success: true, merchant_id: driver.merchant_id, already: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      })
    }

    // 回填 user_id + 置 active
    await serviceClient
      .from('drivers')
      .update({ user_id: user.id, status: 'active' })
      .eq('id', driver_id)

    // 更新 profile：写入 merchant_id，但保留 passenger 角色（双角色：用户同时是乘客和司机）
    // RBAC user_roles 表追加 merchant_driver 角色，profiles.role 保留原值
    await serviceClient
      .from('profiles')
      .update({ merchant_id: driver.merchant_id })
      .eq('id', user.id)

    // 分配 merchant_driver 角色（RBAC）——不覆盖已有角色
    await serviceClient.rpc('assign_role', {
      target_user_id: user.id,
      role_name: 'merchant_driver'
    })

    return new Response(JSON.stringify({ success: true, merchant_id: driver.merchant_id }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    })

  } catch (e) {
    console.error('accept-driver-invitation error:', e)
    return new Response(JSON.stringify({ success: false, error: '服务器错误' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    })
  }
})
