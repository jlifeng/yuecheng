// 微信登录 V2 Edge Function
// 通过微信 code 登录，可选 phone_code 获取手机号
// 新用户自动注册，老用户更新手机号
// 返回用户信息、角色、权限和 session

import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ success: false, error: '方法不允许' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    })
  }

  try {
    const { code, phone_code } = await req.json()

    if (!code) {
      return new Response(JSON.stringify({ success: false, error: '缺少微信登录凭证' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      })
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
    const WECHAT_APPID = Deno.env.get('WECHAT_APPID')!
    const WECHAT_SECRET = Deno.env.get('WECHAT_SECRET')!

    const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    // 1. 获取微信 openid
    const wxAuthUrl = `https://api.weixin.qq.com/sns/jscode2session?appid=${WECHAT_APPID}&secret=${WECHAT_SECRET}&js_code=${code}&grant_type=authorization_code`
    const wxAuthRes = await fetch(wxAuthUrl)
    const wxAuthData = await wxAuthRes.json()

    if (wxAuthData.errcode) {
      console.error('[wechat-login-v2] 微信登录失败:', {
        errcode: wxAuthData.errcode,
        errmsg: wxAuthData.errmsg
      })
      return new Response(JSON.stringify({ success: false, error: '微信登录失败' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      })
    }

    const openid = wxAuthData.openid

    // 2. 解析手机号（如果有 phone_code）
    let phone: string | null = null
    if (phone_code) {
      try {
        const accessTokenUrl = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${WECHAT_APPID}&secret=${WECHAT_SECRET}`
        const accessTokenRes = await fetch(accessTokenUrl)
        const accessTokenData = await accessTokenRes.json()

        if (!accessTokenData.errcode && accessTokenData.access_token) {
          const phoneUrl = `https://api.weixin.qq.com/wxa/business/getuserphonenumber?access_token=${accessTokenData.access_token}`
          const phoneRes = await fetch(phoneUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code: phone_code })
          })
          const phoneData = await phoneRes.json()

          if (!phoneData.errcode && phoneData.phone_info) {
            phone = phoneData.phone_info.phoneNumber
            console.log('[wechat-login-v2] 已获取手机号')
          }
        }
      } catch (e) {
        console.error('[wechat-login-v2] 手机号获取异常')
      }
    }

    // 3. 查找已有用户（多途径）
    let { data: existingProfile, error: profileError } = await serviceClient
      .from('profiles')
      .select('*')
      .eq('wechat_openid', openid)
      .maybeSingle()

    // 如果有手机号但 openid 没匹配，按 phone 再查一次
    if ((!existingProfile || profileError) && phone) {
      const { data: phoneProfile } = await serviceClient
        .from('profiles')
        .select('*')
        .eq('phone', phone)
        .maybeSingle()
      if (phoneProfile) {
        existingProfile = phoneProfile
        profileError = null
        await serviceClient
          .from('profiles')
          .update({ wechat_openid: openid })
          .eq('id', phoneProfile.id)
        existingProfile.wechat_openid = openid
        console.log('[wechat-login-v2] 已通过手机号匹配已有用户')
      }
    }

    let userProfile: any = existingProfile
    let userId: string
    let isNewUser = false

    if (!profileError && existingProfile) {
      // ===== 老用户登录 =====
      userId = existingProfile.id

      // 补充手机号
      if (phone && !existingProfile.phone) {
        console.log('[wechat-login-v2] 已补充已有用户的手机号')
        await serviceClient
          .from('profiles')
          .update({ phone })
          .eq('id', userId)
        userProfile = { ...existingProfile, phone }

        // 同步更新 auth email
        const oldEmail = `${openid}@luxeway.user`
        const newEmail = `${phone}@luxeway.user`
        const { data: userList } = await serviceClient.auth.admin.listUsers({ page: 1, perPage: 1000 })
        const authUser = userList?.users?.find((u: any) => u.email === oldEmail)
        if (authUser) {
          await serviceClient.auth.admin.updateUserById(authUser.id, {
            email: newEmail,
            email_confirm: true
          })
        }
      }

    } else {
      // ===== 新用户注册 =====
      isNewUser = true
      const virtualEmail = phone ? `${phone}@luxeway.user` : `${openid}@luxeway.user`

      // 先检查 auth.users 是否已有该 email
      // 用 listUsers + perPage=1000 尽量覆盖，如果找不到就直接尝试创建
      const { data: userList } = await serviceClient.auth.admin.listUsers({ page: 1, perPage: 1000 })
      const existingAuthUser = userList?.users?.find((u: any) => u.email === virtualEmail)

      if (existingAuthUser) {
        // auth 用户已存在但 profile 缺失，直接复用
        console.log('[wechat-login-v2] auth 用户已存在，复用已有用户')
        userId = existingAuthUser.id

        // upsert profile
        await serviceClient
          .from('profiles')
          .upsert({
            id: userId,
            phone: phone || null,
            wechat_openid: openid,
            role: 'passenger',
            name: null,
            nickname: null,
            avatar_url: null,
            merchant_id: null
          }, { onConflict: 'id' })

        const { data: reloadProfile } = await serviceClient
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle()
        if (reloadProfile) userProfile = reloadProfile

        await serviceClient.rpc('assign_role', {
          target_user_id: userId,
          role_name: 'passenger'
        })

      } else {
        // 真正的新用户：尝试创建，如果 email 已存在则 fallback
        const { data: authData, error: authError } = await serviceClient.auth.admin.createUser({
          email: virtualEmail,
          password: crypto.randomUUID(),
          email_confirm: true,
          user_metadata: { wechat_openid: openid, phone }
        })

        if (authError) {
          // createUser 失败（email 已存在），用 generateLink 按 email 查找复用
          console.log('[wechat-login-v2] createUser 失败:', authError.message, '，尝试按 email 查找已有用户')
          const { data: linkData, error: linkError } = await serviceClient.auth.admin.generateLink({
            type: 'magiclink',
            email: virtualEmail,
          })

          if (!linkError && linkData?.user) {
            userId = (linkData.user as any).id
            console.log('[wechat-login-v2] 通过 generateLink 找到已有用户')

            await serviceClient
              .from('profiles')
              .upsert({
                id: userId,
                phone: phone || null,
                wechat_openid: openid,
                role: 'passenger',
                name: null,
                nickname: null,
                avatar_url: null,
                merchant_id: null
              }, { onConflict: 'id' })

            const { data: reloadProfile } = await serviceClient
              .from('profiles')
              .select('*')
              .eq('id', userId)
              .maybeSingle()
            if (reloadProfile) userProfile = reloadProfile

            await serviceClient.rpc('assign_role', {
              target_user_id: userId,
              role_name: 'passenger'
            })
          } else {
            console.error('[wechat-login-v2] 无法创建或找到用户, linkError:', linkError?.message)
            return new Response(JSON.stringify({ success: false, error: '登录失败，请重试' }), {
              status: 500,
              headers: { 'Content-Type': 'application/json', ...corsHeaders }
            })
          }
        } else {
          // 创建成功
          userId = authData.user.id

          const { data: newProfile, error: createError } = await serviceClient
            .from('profiles')
            .insert({
              id: userId,
              phone,
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
            console.error('[wechat-login-v2] 创建 profile 失败:', createError.message)
          } else {
            userProfile = newProfile
          }

          await serviceClient.rpc('assign_role', {
            target_user_id: userId,
            role_name: 'passenger'
          })
        }
      }
    }

    // 4. 获取角色和权限
    const { data: roles } = await serviceClient.rpc('get_user_roles', { user_id: userId })
    const { data: permissions } = await serviceClient.rpc('get_user_permissions', { user_id: userId })

    let userRoles: any[] = Array.isArray(roles) ? roles : []
    if (userRoles.length === 0 && userProfile?.role) {
      await serviceClient.rpc('assign_role', {
        target_user_id: userId,
        role_name: userProfile.role
      })
      const { data: newRoles } = await serviceClient.rpc('get_user_roles', { user_id: userId })
      userRoles = Array.isArray(newRoles) ? newRoles : []
    }

    const primaryRole = userRoles.length > 0 ? (userRoles[0].role_name || userRoles[0].name || 'passenger') : 'passenger'
    const displayRole = (primaryRole?.startsWith('merchant') || primaryRole === 'admin')
      ? 'provider'
      : 'passenger'

    // 5. 生成 session
    // 直接用 getUserById 获取真实 email，比 listUsers 更可靠
    const { data: authUserData } = await serviceClient.auth.admin.getUserById(userId)
    const realEmail = authUserData?.user?.email || `${openid}@luxeway.user`

    const oneTimePassword = crypto.randomUUID()
    const { error: pwdError } = await serviceClient.auth.admin.updateUserById(userId, {
      password: oneTimePassword
    })

    if (pwdError) {
      console.error('[wechat-login-v2] 重置密码失败:', pwdError.message)
      return new Response(JSON.stringify({ success: false, error: '登录失败' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      })
    }

    const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    let sessionData: any = null
    let sessionError: any = null

    for (let i = 0; i < 3; i++) {
      const result = await anonClient.auth.signInWithPassword({
        email: realEmail,
        password: oneTimePassword
      })
      sessionData = result.data
      sessionError = result.error
      if (!sessionError && sessionData?.session) break
      console.log('[wechat-login-v2] 登录重试:', i + 1)
      await new Promise(r => setTimeout(r, 200))
    }

    let accessToken = ''
    let refreshToken = ''

    if (!sessionError && sessionData?.session) {
      accessToken = sessionData.session.access_token
      refreshToken = sessionData.session.refresh_token
    } else {
      console.error('[wechat-login-v2] session 获取失败:', sessionError?.message)
      return new Response(JSON.stringify({ success: false, error: '登录失败，请重试' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      })
    }

    // 6. 返回结果
    return new Response(JSON.stringify({
      success: true,
      isNewUser,
      user: {
        id: userId,
        phone: userProfile?.phone || null,
        wechat_openid: openid,
        roles: userRoles.map((r: any) => ({
          name: r.role_name || r.name,
          display_name: r.display_name
        })),
        primary_role: primaryRole,
        display_role: displayRole,
        permissions: Array.isArray(permissions) ? permissions.map((p: any) => p.permission_name || p.name) : [],
        name: userProfile?.name || null,
        nickname: userProfile?.nickname || null,
        avatar_url: userProfile?.avatar_url || null,
        merchant_id: userProfile?.merchant_id || null
      },
      session: {
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_at: sessionData.session.expires_at,
        expires_in: sessionData.session.expires_in
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    })

  } catch (e) {
    console.error('[wechat-login-v2] 异常:', e instanceof Error ? e.message : 'unknown error')
    return new Response(JSON.stringify({
      success: false,
      error: '服务器错误: ' + (e instanceof Error ? e.message : String(e))
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    })
  }
})
