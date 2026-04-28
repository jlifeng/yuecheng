<script>
		export default {
			onLaunch() {
				console.log('App Launch')

				// 检查是否已登录
				const userProfile = uni.getStorageSync('userProfile')
				const accessToken = uni.getStorageSync('accessToken')
				const userRole = uni.getStorageSync('userRole')

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
