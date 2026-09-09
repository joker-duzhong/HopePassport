# 修订记录

## 内置公开协议页面

- 新增 `/terms` 用户协议和 `/privacy` 隐私政策，外部可直接访问，无需登录或扫码参数；阅读不调用账号 API。
- 新增共用协议阅读布局，兼容手机与 PC；支持目录锚点、文档切换和打印样式。其他账号页面仍保持移动端布局。
- 本站直接使用内置协议链接，移除协议 URL 环境配置、缺失配置提示及登录禁用条件；继续校验用户主动勾选同意。
- 协议内容明确标为基础草案，不编造运营主体、联系方式、后端数据保存期限等未确认信息。
- 保留用户已调整的本地 API 地址及其他无关改动。

### 本次文件清单

- 新增：`src/components/LegalLayout.vue`、`src/views/TermsView.vue`、`src/views/PrivacyView.vue`。
- 修改：`src/App.vue`、`src/router.ts`、`src/config/environment.ts`、`src/components/PhoneForm.vue`、`src/views/LoginView.vue`、`src/lib/oauth.ts`、`.env.example`、`README.md`、`PRODUCT.md`、`DESIGN.md`、`CHANGELOG.md`。

## 0.1.0 — 2026-09-08

- 初始化 Vue 3、TypeScript、Vite、Pinia 和 Vue Router 移动端工程。
- 默认正式 API；支持 env=local 持久化选择与恢复正式环境入口，按环境隔离会话。
- 添加 app_key 主题注册表与全局样式变量，为后续业务换皮预留入口。
- 实现手机号验证码登录、微信 OAuth 回调、手机号绑定与账号切换。
- 实现扫码事务检查、已扫码通知、主动确认/取消及结果和异常页面；不包含业务端二维码创建、轮询和兑换。
- 加入并发合并刷新、截止时间倒计时、Retry-After、重复操作阻止、旧请求取消与返回响应校验。
- 添加公开环境配置示例、产品说明、设计约定与部署联调文档。
- 浏览器验证修正倒计时首帧多计一秒、结果链接校验前短暂显示未验证状态，以及旧账号恢复请求影响新登录状态的问题。

### 验证结果

- `npm run typecheck`、`npm run build` 通过；依赖安装审计未发现已知漏洞。
- 11 组临时 Playwright 模拟验证全部通过：默认环境与登录恢复；本地缓存及会话隔离；短信限流与截止时间；并发刷新；刷新失败退出；显式扫码确认；绑定冲突与切换账号；微信回调、绑定续接及防重放；无效参数；取消、过期、应用停用与账号禁用；移动布局和无障碍。
- 检查 320、390、430px 移动视口无水平溢出；登录页 axe WCAG A/AA 检查未发现违规；UI 机械检查无发现。
- 临时测试依赖、模拟数据、脚本与截图均放在系统临时目录，不加入工程或生产构建。没有发送真实短信或向真实扫码事务提交授权。
- 待真实联调：协议 URL、公众号 AppID、授权域名、两个环境 CORS、真机微信浏览器，以及上游业务端二维码与凭据兑换。

### 本次新增文件清单（38 个）

原始 `需求.md` 保持不变。以下为本次新增并迭代的全部工程文件，不包含被忽略的依赖及构建产物。

- `.env.example`
- `.gitignore`
- `package.json`
- `package-lock.json`
- `index.html`
- `tsconfig.json`
- `vite.config.ts`
- `README.md`
- `PRODUCT.md`
- `DESIGN.md`
- `CHANGELOG.md`
- `src/main.ts`
- `src/App.vue`
- `src/router.ts`
- `src/styles.css`
- `src/api/types.ts`
- `src/api/client.ts`
- `src/api/auth.ts`
- `src/config/environment.ts`
- `src/config/themes.ts`
- `src/lib/storage.ts`
- `src/lib/session.ts`
- `src/lib/oauth.ts`
- `src/lib/appError.ts`
- `src/stores/auth.ts`
- `src/stores/flow.ts`
- `src/stores/scan.ts`
- `src/composables/useClock.ts`
- `src/components/AppIcon.vue`
- `src/components/BrandMark.vue`
- `src/components/InlineNotice.vue`
- `src/components/AccountSummary.vue`
- `src/components/PhoneForm.vue`
- `src/views/LoginView.vue`
- `src/views/BindPhoneView.vue`
- `src/views/WechatCallbackView.vue`
- `src/views/ScanView.vue`
- `src/views/ResultView.vue`
