// 绑定手机号 Edge Function
// 解密微信手机号 code，更新 profile.phone，
// 并按手机号匹配 drivers 表中车队预录的司机记录，回填 user_id + 置 active，
// 同时给该用户分配 merchant_driver 角色并写入 merchant_id。
// 这是司机身份打通的关键：绑定后 drivers.user_id 指向当前登录用户，
// order_detail 页据此判定 isAssignedDriver，仅被指派司机本人可见「去接驾」。

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
    const { code } = await req.json()

    if (!code) {
      return new Response(JSON.stringify({ success: false, error: '缺少 code' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      })
    }

    // 从请求头获取用户 token
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
    const WECHAT_APPID = Deno.env.get('WECHAT_APPID')!
    const WECHAT_SECRET = Deno.env.get('WECHAT_SECRET')!

    const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    // 获取当前用户
    const { data: { user }, error: userError } = await serviceClient.auth.getUser(token)
    if (userError || !user) {
      return new Response(JSON.stringify({ success: false, error: '用户无效' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      })
    }

    // 调用微信接口解密手机号
    const tokenRes = await fetch(
      `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${WECHAT_APPID}&secret=${WECHAT_SECRET}`
    )
    const tokenData = await tokenRes.json()

    if (!tokenData.access_token) {
      console.error('获取微信 access_token 失败', tokenData)
      return new Response(JSON.stringify({ success: false, error: '微信接口错误' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      })
    }

    const phoneRes = await fetch(
      `https://api.weixin.qq.com/wxa/business/getuserphonenumber?access_token=${tokenData.access_token}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      }
    )
    const phoneData = await phoneRes.json()

    if (phoneData.errcode !== 0 || !phoneData.phone_info?.purePhoneNumber) {
      console.error('解密手机号失败', phoneData)
      return new Response(JSON.stringify({ success: false, error: '获取手机号失败' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      })
    }

    const phone = phoneData.phone_info.purePhoneNumber

    // 1. 更新用户 profile.phone
    await serviceClient.from('profiles').update({ phone }).eq('id', user.id)

    // 2. 按手机号匹配 drivers 表中本用户尚未绑定的司机记录
    //    匹配条件不限 status=pending —— 老数据或被误置 active 的也能回填。
    //    排除已绑定其他用户的记录（user_id is null 或 user_id = 当前用户）。
    const { data: drivers } = await serviceClient
      .from('drivers')
      .select('id, merchant_id, status, user_id')
      .eq('phone', phone)
      .or('user_id.is.null,user_id.eq.' + user.id)

    let bound = false
    if (drivers && drivers.length > 0) {
      // 取第一条未绑定或已绑定本人的
      const driver = drivers.find((d: any) => !d.user_id) || drivers[0]
      if (!driver.user_id || driver.user_id === user.id) {
        await serviceClient
          .from('drivers')
          .update({ user_id: user.id, status: 'active' })
          .eq('id', driver.id)

        // 更新用户 profile：merchant_id + merchant_driver 角色
        await serviceClient
          .from('profiles')
          .update({ merchant_id: driver.merchant_id, role: 'merchant_driver' })
          .eq('id', user.id)

        // 分配 merchant_driver 角色（RBAC）
        await serviceClient.rpc('assign_role', {
          target_user_id: user.id,
          role_name: 'merchant_driver'
        })

        bound = true
      }
    }

    return new Response(JSON.stringify({ success: true, phone, bound }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    })

  } catch (e) {
    console.error('bind-phone error:', e)
    return new Response(JSON.stringify({ success: false, error: '服务器错误' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    })
  }
})
