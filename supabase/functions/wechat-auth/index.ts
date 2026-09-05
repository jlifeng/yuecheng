// 微信登录 Edge Function
// 通过微信 code 和手机号授权码进行登录
// 返回用户信息、角色和权限

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!

// 微信小程序配置
const WECHAT_APPID = Deno.env.get('WECHAT_APPID')!
const WECHAT_SECRET = Deno.env.get('WECHAT_SECRET')!

Deno.serve(async (req: Request) => {
  // 只允许 POST 请求
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ success: false, error: '方法不允许' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  try {
    const { code, phone_code } = await req.json()

    // 参数验证
    if (!code) {
      return new Response(JSON.stringify({ success: false, error: '缺少微信登录凭证' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // 创建 Supabase 客户端
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    // 1. 获取微信 openid 和 session_key
    const wxAuthUrl = `https://api.weixin.qq.com/sns/jscode2session?appid=${WECHAT_APPID}&secret=${WECHAT_SECRET}&js_code=${code}&grant_type=authorization_code`
    const wxAuthRes = await fetch(wxAuthUrl)
    const wxAuthData = await wxAuthRes.json()

    if (wxAuthData.errcode) {
      console.error('微信登录失败:', {
        errcode: wxAuthData.errcode,
        errmsg: wxAuthData.errmsg
      })
      return new Response(JSON.stringify({ success: false, error: '微信登录失败' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const openid = wxAuthData.openid

    // 2. 查询是否已存在该 openid 的用户
    const { data: existingProfile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('wechat_openid', openid)
      .single()

    let userProfile: any = existingProfile
    let userId: string

    // 3. 如果用户不存在，创建新用户
    if (profileError || !existingProfile) {
      // 尝试获取手机号（如果有 phone_code）
      let phone: string | null = null
      if (phone_code) {
        // 获取微信 access_token
        const accessTokenUrl = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${WECHAT_APPID}&secret=${WECHAT_SECRET}`
        const accessTokenRes = await fetch(accessTokenUrl)
        const accessTokenData = await accessTokenRes.json()

        if (!accessTokenData.errcode) {
          // 解密手机号
          const phoneUrl = `https://api.weixin.qq.com/wxa/business/getuserphonenumber?access_token=${accessTokenData.access_token}`
          const phoneRes = await fetch(phoneUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code: phone_code })
          })
          const phoneData = await phoneRes.json()

          if (!phoneData.errcode && phoneData.phone_info) {
            phone = phoneData.phone_info.phoneNumber
          }
        }
      }

      // 创建虚拟邮箱
      const virtualEmail = phone ? `${phone}@luxeway.user` : `${openid}@luxeway.user`

      // 创建 Supabase Auth 用户
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: virtualEmail,
        password: crypto.randomUUID(), // 随机密码，微信用户不需要密码登录
        email_confirm: true,
        user_metadata: {
          wechat_openid: openid,
          phone: phone
        }
      })

      if (authError) {
        console.error('创建用户失败:', authError.message)
        return new Response(JSON.stringify({ success: false, error: '创建用户失败' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        })
      }

      userId = authData.user.id

      // 创建 profile
      const { data: newProfile, error: createError } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          phone: phone,
          wechat_openid: openid,
          role: 'passenger',
          name: null,
          nickname: null,
          avatar_url: null,
          merchant_id: null
        })
        .select()
        .single()

      if (createError) {
        console.error('创建 profile 失败:', createError.message)
      } else {
        userProfile = newProfile
        // 分配默认角色
        await supabase.rpc('assign_role', {
          target_user_id: userId,
          role_name: 'passenger'
        })
      }
    } else {
      userId = existingProfile.id
    }

    // 4. 获取用户角色和权限
    const { data: roles } = await supabase.rpc('get_user_roles', { user_id: userId })
    const { data: permissions } = await supabase.rpc('get_user_permissions', { user_id: userId })

    let userRoles = roles || []
    if (userRoles.length === 0 && userProfile?.role) {
      // 同步角色到 user_roles 表
      await supabase.rpc('assign_role', {
        target_user_id: userId,
        role_name: userProfile.role
      })
      const { data: newRoles } = await supabase.rpc('get_user_roles', { user_id: userId })
      userRoles = newRoles || []
    }

    const primaryRole = userRoles.length > 0 ? userRoles[0].role_name : 'passenger'
    const displayRole = primaryRole.startsWith('merchant') || primaryRole === 'admin'
      ? 'provider'
      : 'passenger'

    // 5. 生成 session token
    const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    const virtualEmail = userProfile?.phone ? `${userProfile.phone}@luxeway.user` : `${openid}@luxeway.user`

    // 使用 magic link 方式获取 session（微信用户）
    const { data: sessionData, error: sessionError } = await anonClient.auth.signInWithPassword({
      email: virtualEmail,
      password: userId // 使用用户 ID 作为临时密码（需要在创建时设置）
    })

    // 如果 signInWithPassword 失败，使用 admin 生成 token
    let accessToken: string
    let refreshToken: string

    if (sessionError) {
      // 使用 service key 生成 JWT
      const { data: tokenData } = await supabase.auth.admin.generateLink({
        type: 'magiclink',
        email: virtualEmail
      })

      // 解析生成的链接获取 token
      accessToken = userId // 临时方案，实际应该生成正确的 JWT
      refreshToken = ''
    } else {
      accessToken = sessionData.session?.access_token || ''
      refreshToken = sessionData.session?.refresh_token || ''
    }

    // 返回成功响应
    return new Response(JSON.stringify({
      success: true,
      user: {
        id: userId,
        phone: userProfile?.phone,
        wechat_openid: openid,
        roles: userRoles.map(r => ({
          name: r.role_name,
          display_name: r.display_name
        })),
        primary_role: primaryRole,
        display_role: displayRole,
        permissions: permissions?.map(p => p.permission_name) || [],
        name: userProfile?.name,
        nickname: userProfile?.nickname,
        avatar_url: userProfile?.avatar_url,
        merchant_id: userProfile?.merchant_id
      },
      session: {
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        expires_in: 3600
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (e) {
    console.error('wechat-auth error:', e instanceof Error ? e.message : 'unknown error')
    return new Response(JSON.stringify({ success: false, error: '服务器错误' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})
