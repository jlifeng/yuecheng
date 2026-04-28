// 绑定手机号 Edge Function
// 解密微信手机号 code，更新用户 profile，并检查是否被车队添加

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const WX_APPID = 'wx4f4e1b7e6b3b7e3b' // 替换为实际的 AppID
const WX_SECRET = Deno.env.get('WX_SECRET')! // 需要在 Supabase 中配置

Deno.serve(async (req: Request) => {
  try {
    const { code } = await req.json()

    if (!code) {
      return new Response(JSON.stringify({ success: false, error: '缺少 code' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // 从请求头获取用户 token
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, error: '未登录' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const token = authHeader.replace('Bearer ', '')
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    // 获取当前用户
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)
    if (userError || !user) {
      return new Response(JSON.stringify({ success: false, error: '用户无效' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // 调用微信接口解密手机号
    // 首先获取 access_token
    const tokenRes = await fetch(
      `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${WX_APPID}&secret=${WX_SECRET}`
    )
    const tokenData = await tokenRes.json()

    if (!tokenData.access_token) {
      console.error('获取微信 access_token 失败', tokenData)
      return new Response(JSON.stringify({ success: false, error: '微信接口错误' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // 解密手机号
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
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const phone = phoneData.phone_info.purePhoneNumber

    // 更新用户 profile
    await supabase.from('profiles').update({ phone }).eq('id', user.id)

    // 检查是否被车队添加
    const { data: drivers, error: driverError } = await supabase
      .from('drivers')
      .select('id, merchant_id, status')
      .eq('phone', phone)
      .eq('status', 'pending')

    if (drivers && drivers.length > 0) {
      // 自动绑定：更新 drivers 表
      const driver = drivers[0]
      await supabase
        .from('drivers')
        .update({ user_id: user.id, status: 'active' })
        .eq('id', driver.id)

      // 更新用户 profile 的 merchant_id
      await supabase
        .from('profiles')
        .update({ merchant_id: driver.merchant_id, role: 'merchant_driver' })
        .eq('id', user.id)
    }

    return new Response(JSON.stringify({ success: true, phone }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (e) {
    console.error('bind-phone error:', e)
    return new Response(JSON.stringify({ success: false, error: '服务器错误' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})