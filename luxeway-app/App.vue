<script>
	import { refreshAccessToken } from '@/services/wechatAuth'

	export default {
		async onLaunch() {
			console.log('App Launch')

			// 检查是否已登录
			const userProfile = uni.getStorageSync('userProfile')
			let accessToken = uni.getStorageSync('accessToken')
			const refreshToken = uni.getStorageSync('refreshToken')
			const userRole = uni.getStorageSync('userRole')

			// accessToken 缺失但 refreshToken 在：尝试静默刷新
			if (userProfile && !accessToken && refreshToken) {
				console.log('onLaunch - accessToken 缺失，尝试用 refreshToken 刷新')
				const newToken = await refreshAccessToken()
				if (newToken) {
					accessToken = newToken
				}
			}

			if (userProfile && accessToken) {
				console.log('已登录，跳转首页')
				// 根据当前角色模式跳转对应首页
				if (userRole === 'admin') {
					uni.reLaunch({ url: '/pages/admin/index' })
				} else if (userRole === 'provider') {
					uni.reLaunch({ url: '/pages/provider/workbench' })
				} else {
					uni.reLaunch({ url: '/pages/index/index' })
				}
			} else {
				console.log('未登录，跳转登录页')
				// 清掉可能残留的 userProfile，避免登录页误判为已登录
				uni.removeStorageSync('userProfile')
				uni.removeStorageSync('userRole')
				uni.removeStorageSync('userRoles')
				uni.removeStorageSync('userPermissions')
				uni.reLaunch({ url: '/pages/login/index' })
			}
		},
		onShow() {
			console.log('App Show')
		},
		onHide() {
			console.log('App Hide')
		}
	}
</script>

<style>
	/*每个页面公共css */
</style>
