# Hope Passport · Hope 通行证

Vue 3 + TypeScript + Vite + Pinia 的统一账号与扫码授权页面。登录、绑定、扫码流程保持移动端布局；用户协议和隐私政策同时适配手机与 PC。不包含业务端创建二维码、轮询和兑换凭据的实现。

## 启动与检查

需要 Node.js 20.19+ 或 22.12+（建议使用本项目验证过的 Node.js 24）。

```powershell
npm install
npm run dev
npm run typecheck
npm run build
npm run preview
```

开发端口为 5173，预览端口为 4173；端口占用时直接报错，不自动更换。正式产物在 `dist/`。没有引入测试框架；类型检查、构建和浏览器流程检查作为当前验证手段。

## 环境选择

默认正式环境，包括 `npm run dev`。不是根据 Vite 的 development/production 模式选择 API。

| 访问方式 | 效果 |
| --- | --- |
| `/login` | 未选择过环境时使用 `https://api.lxy.fun`；有本地选择缓存时继续使用本地 |
| `/login?env=local` | 选择 `http://192.168.31.93:8000/`，写入 `localStorage` |
| `/scan?env=local&transaction_id=<UUID>` | 在本地环境处理扫码事务 |
| 本地页面顶部「恢复正式环境」 | 清除环境选择、退出当前本地账号、丢弃当前事务，重新打开正式环境登录页 |

不需要、也不支持 `env=prod`。环境参数只允许单个 `env=local`，未知或重复参数显示错误，不会拿 URL 参数拼接 API 地址。优先级：URL 中的本地选择 → localStorage 中的本地选择 → 正式环境。环境在页面启动时固定，切换通过整页重新加载完成；其他标签页修改环境时暂停本页操作。

环境键为 `hope-passport:environment`。可在开发者工具删除该键后重新打开不带 `env` 的地址恢复默认。

手机中的 `localhost` 是手机本身。真机本地联调时，把 `VITE_LOCAL_API_BASE_URL` 改为电脑可访问的局域网地址，且后端监听对应网络接口。HTTPS 页面访问 HTTP 开发接口可能被浏览器安全策略阻止，微信 OAuth 真机联调应使用已配置授权域名的 HTTPS 地址。

## 公开配置

复制 `.env.example` 为 `.env.local` 后填写公开配置，再重启开发服务；生产构建前注入相应变量。所有 `VITE_` 配置会进入浏览器，**禁止填写 AppSecret、私钥或服务端 Token**。

| 配置后缀 | 正式环境 / 本地环境前缀 | 说明 |
| --- | --- | --- |
| `API_BASE_URL` | `VITE_PROD_` / `VITE_LOCAL_` | API 源地址，不含 `/api/v1`、路径、查询参数 |
| `PASSPORT_URL` | 同上 | Passport 根地址，未填写时使用当前页面源地址；本期部署在域名根路径 |
| `WECHAT_APP_ID` | 同上 | 公众号 AppID；未配置时禁用微信登录，保留短信入口 |

用户协议与隐私政策直接使用本站 `/terms`、`/privacy`，不需要环境变量配置。此前的 `VITE_*_TERMS_URL`、`VITE_*_PRIVACY_URL` 不再读取。登录仍要求用户主动勾选同意，但不会再因链接未配置而被禁用。绑定页不要求重复同意。

## 公开协议页面

- 用户协议：`/terms`；隐私政策：`/privacy`。外部业务可以直接链接 `https://你的部署域名/terms` 或 `https://你的部署域名/privacy`，不需要登录凭据、环境或扫码参数。
- 两页绕过账号恢复和扫码守卫，不请求账号或扫码 API；无效登录缓存、后端离线或 API 配置错误不会阻止阅读。
- 手机使用单列正文和可折叠目录；PC 在 900px 及以上使用侧栏目录与限宽正文。支持目录锚点、页面刷新、两份文档互相切换和浏览器打印。
- 登录页在新标签页打开协议，链接不附带事务 ID 或凭据，原表单与扫码上下文保留。
- 页面正文是已明确标注的基础草案，尚未完成法务核验。正式发布前须补全运营主体、客服和隐私联系方式、后端和供应商的数据处理清单、保存期限与位置、用户权利受理渠道，并核实未成年人和跨境处理安排。不要把可访问的草案当作已完成合规审阅的正式文件。
- 两份文档只覆盖 Hope 通行证的统一账号功能；外部业务引用它们，不会替代该业务自身需要提供的告知。

## 页面与流程

- `/login`：中国大陆手机号（11 位）、字符串四位验证码、短信发送与倒计时；微信内显示公众号登录入口。
- `/wechat/callback`：校验 sessionStorage 中的随机 state、环境、域名、AppID 和十分钟有效期；清除 URL 中的 code/state。提交前消耗状态并记录 code 指纹，失败后只允许重新授权，不重复提交旧 code。
- `/bind-phone`：以当前账号凭据绑定手机号；冲突时保留后端错误，用户明确选择后才能退出当前账号、使用已有手机号登录。
- `/scan?transaction_id=<UUID>`：查询事务、通知已扫码、引导登录/绑定、再次校验、手动确认或取消。恢复前台时重新查询；提交前再次检查事务和当前账号。
- `/result`：登录成功、授权确认/完成/取消/过期、禁用账号、参数和登录态异常。直接打开扫码结果链接会重新核对对应事务。
- `/terms`、`/privacy`：不依赖登录态的公开协议页面。

事务 ID 随内部路由流转，OAuth 往返通过 state 对应的本地上下文保留。只接收 UUID，不信任 URL 中的应用名称或账号信息。任何终态都不会在手机端创建替代事务。确认请求不携带 user_id，也不执行扫码凭据兑换。

## 主题扩展

入口示例：`/login?app_key=your_app` 或 `/scan?transaction_id=<UUID>&app_key=your_app`。

`src/config/themes.ts` 提供 `PassportTheme`、`defaultTheme` 和 `appThemes` 注册表。后续按真实 app_key 在注册表中添加主题即可；所有页面通过 `themeVariables()` 消费统一 CSS 变量，不需要修改账号或扫码逻辑。

```ts
export const appThemes: Readonly<Record<string, PassportTheme>> = {
  your_app: {
    ...defaultTheme,
    key: 'your-app',
    tokens: { ...defaultTheme.tokens, accent: '#345aa0', accentHover: '#27467e', accentSoft: '#e9effa' },
  },
}
```

以上为扩展示例，没有注册虚构业务。未知 app_key 回退 Hope 主题；不会从 URL 下载 CSS、图片或脚本。扫码接口返回 app_key 后以其更新主题，**展示应用名称始终来自后端**。主题只改变外观，不控制账号、API 地址或授权对象。需要整体换版时，在 `App.vue` 的布局层扩展，不在 API/store 层加入皮肤判断。新增皮肤需检查文本对比度与交互状态。

## 状态与安全边界

- 登录凭据和用户信息存在环境命名空间下的 sessionStorage，刷新可恢复，关闭会话后不承诺保留；从缓存恢复必须请求 `/auth/me`。localStorage 不存 Access Token。
- Token 刷新做并发合并；原请求最多补发一次。刷新失败清理当前登录态，不循环使用旧凭据。退出或切换账号中止旧请求，迟到响应不覆盖新账号。
- `429` 读取 `Retry-After`（秒数或 HTTP 日期）。接口层在截止前阻止重复请求；短信限流等待与「短信已发送」分开，不把失败显示成发送成功。无该响应头时保守等待 60 秒。
- 短信成功后才开启 60 秒重发计时，使用截止时间计算并在同一浏览器会话保存；切后台不会使计时失真。
- 请求超时为 15 秒；确认/取消失败后只提供状态查询，不自动重复提交授权。
- 不读写业务端 poll_token 或 exchange_code，不传递手机 Access Token 给原设备，不接收任意 redirect_url。
- 不添加遥测、统计、第三方字体、远程主题或 CDN 依赖。无运行时控制台输出。不要把真实凭据放进截图、日志、URL 或问题反馈中。
- sessionStorage 仍可被同源脚本读取，不能防御 XSS。部署应控制同源脚本、设置合理 CSP；OAuth 回调访问日志应移除 code/state 查询参数。

## 后端与部署联调

接口以本地 `http://192.168.31.93:8000//api/v1/openapi.json` 核对，响应采用 `{ code: 200, message, data }`。`docs/scan-login-api.md` 未随当前仓库提供。

需后端/运维确认：
1. 两个环境允许实际前端域名的 CORS，支持 Authorization、Content-Type；对前端暴露 `Retry-After` 响应头。
2. 公众号授权域名、AppID 与 Passport 地址一致。必须在同一浏览器会话、同一源地址完成 OAuth，后端返回真实微信授权 URL。
3. 本期前端部署在根路径；服务器给 `/login`、`/scan`、`/bind-phone`、`/wechat/callback`、`/result`、`/terms`、`/privacy` 做 SPA 回退到 `index.html`，否则外部直接访问或刷新会 404。
4. `index.html` 不长期缓存；带内容哈希的 assets 可长期缓存。使用 HTTPS。
5. 上游业务端按需求.md实现创建事务、保存 poll_token、生成只含事务 ID 的二维码、轮询及一次性兑换。本地联调二维码可另带公开的 env=local，不能夹带任何秘密凭据。

## 目录

`src/api` 接口与类型；`src/config` 环境与主题；`src/stores` 账号及扫码流程；`src/lib` 存储与 OAuth；`src/composables` 时钟；`src/components` 公共移动端组件；`src/views` 路由页面。
