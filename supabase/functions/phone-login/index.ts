// 手机号+密码登录 Edge Function
// 将手机号映射为虚拟邮箱，使用 Supabase Auth 验证密码
// 返回用户信息、角色和权限

import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  // 处理 CORS 预检请求
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    })
  }

  // 只允许 POST 请求
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ success: false, error: '方法不允许' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    })
  }

  try {
    const { phone, password } = await req.json()
    console.log('[phone-login] 收到请求, phone:', phone)

    // 参数验证
    if (!phone || !password) {
      return new Response(JSON.stringify({ success: false, error: '手机号和密码不能为空' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      })
    }

    if (phone.length !== 11) {
      return new Response(JSON.stringify({ success: false, error: '手机号格式不正确' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      })
    }

    if (password.length < 6) {
      return new Response(JSON.stringify({ success: false, error: '密码至少6位' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      })
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!

    console.log('[phone-login] 环境变量检查:', {
      hasUrl: !!SUPABASE_URL,
      hasServiceKey: !!SUPABASE_SERVICE_KEY,
      hasAnonKey: !!SUPABASE_ANON_KEY
    })

    // 创建 Supabase 客户端（使用 anon key）
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

    // 手机号映射为虚拟邮箱
    const virtualEmail = `${phone}@luxeway.user`
    console.log('[phone-login] 虚拟邮箱:', virtualEmail)

    // 使用 Supabase Auth 登录
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: virtualEmail,
      password: password
    })

    console.log('[phone-login] 认证结果:', {
      success: !authError,
      error: authError?.message,
      userId: authData?.user?.id
    })

    if (authError) {
      console.error('[phone-login] 登录失败:', authError)

      if (authError.message.includes('Invalid login credentials')) {
        return new Response(JSON.stringify({ success: false, error: '手机号或密码错误' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        })
      }

      return new Response(JSON.stringify({ success: false, error: authError.message }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      })
    }

    // 使用 service key 获取完整信息（包括角色和权限）
    const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    // 获取用户 profile 信息
    const { data: profile, error: profileError } = await serviceClient
      .from('profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single()

    console.log('[phone-login] Profile查询:', {
      success: !profileError,
      error: profileError?.message,
      profileRole: profile?.role
    })

    // 如果 profile 不存在，创建一个默认的（乘客角色）
    let userProfile = profile
    if (profileError || !profile) {
      const { data: newProfile, error: createError } = await serviceClient
        .from('profiles')
        .insert({
          id: authData.user.id,
          phone: phone,
          role: 'passenger',
          name: null,
          avatar_url: null,
          merchant_id: null
        })
        .select()
        .single()

      if (createError) {
        console.error('[phone-login] 创建 profile 失败:', createError)
      } else {
        userProfile = newProfile
        // 分配默认角色
        const { error: assignError } = await serviceClient.rpc('assign_role', {
          target_user_id: authData.user.id,
          role_name: 'passenger'
        })
        console.log('[phone-login] 分配默认角色:', { success: !assignError, error: assignError?.message })
      }
    }

    // 获取用户角色列表
    const { data: roles, error: rolesError } = await serviceClient
      .rpc('get_user_roles', { user_id: authData.user.id })

    console.log('[phone-login] 角色查询:', {
      success: !rolesError,
      error: rolesError?.message,
      rolesCount: roles?.length,
      roles: roles
    })

    // 获取用户权限列表
    const { data: permissions, error: permissionsError } = await serviceClient
      .rpc('get_user_permissions', { user_id: authData.user.id })

    console.log('[phone-login] 权限查询:', {
      success: !permissionsError,
      error: permissionsError?.message,
      permissionsCount: permissions?.length
    })

    // 如果用户没有角色，使用 profile.role 作为默认
    let userRoles = roles || []
    let userPermissions = permissions || []

    if (userRoles.length === 0 && userProfile?.role) {
      console.log('[phone-login] 用户无角色，尝试分配:', userProfile.role)

      // 同步角色到 user_roles 表
      const { error: assignError } = await serviceClient.rpc('assign_role', {
        target_user_id: authData.user.id,
        role_name: userProfile.role
      })
      console.log('[phone-login] 分配角色结果:', { success: !assignError, error: assignError?.message })

      // 再次获取角色
      const { data: newRoles, error: newRolesError } = await serviceClient
        .rpc('get_user_roles', { user_id: authData.user.id })

      if (newRolesError) {
        console.error('[phone-login] 再次获取角色失败:', newRolesError)
      } else {
        userRoles = newRoles || []
        console.log('[phone-login] 再次获取角色成功:', userRoles)
      }

      // 再次获取权限
      const { data: newPermissions, error: newPermsError } = await serviceClient
        .rpc('get_user_permissions', { user_id: authData.user.id })

      if (newPermsError) {
        console.error('[phone-login] 再次获取权限失败:', newPermsError)
      } else {
        userPermissions = newPermissions || []
      }
    }

    // 确定主角色（用于页面跳转）
    const primaryRole = userRoles.length > 0 ? userRoles[0].name : 'passenger'
    const displayRole = primaryRole.startsWith('merchant') || primaryRole === 'admin'
      ? 'provider'
      : 'passenger'

    console.log('[phone-login] 最终结果:', {
      primaryRole,
      displayRole,
      rolesCount: userRoles.length,
      permissionsCount: userPermissions.length
    })

    // 返回成功响应
    return new Response(JSON.stringify({
      success: true,
      user: {
        id: authData.user.id,
        phone: phone,
        roles: userRoles.map(r => ({
          name: r.name,
          display_name: r.display_name
        })),
        primary_role: primaryRole,
        display_role: displayRole,
        permissions: userPermissions.map(p => p.name) || [],
        name: userProfile?.name,
        nickname: userProfile?.nickname,
        avatar_url: userProfile?.avatar_url,
        merchant_id: userProfile?.merchant_id
      },
      session: {
        access_token: authData.session.access_token,
        refresh_token: authData.session.refresh_token,
        expires_at: authData.session.expires_at,
        expires_in: authData.session.expires_in
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    })

  } catch (e) {
    console.error('[phone-login] 捕获异常:', e)
    return new Response(JSON.stringify({ success: false, error: '服务器错误: ' + (e instanceof Error ? e.message : String(e)) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    })
  }
})