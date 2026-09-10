# Hope Passport · Hope 通行证

Vue 3 + TypeScript + Vite + Pinia 的统一账号与扫码授权页面。登录、绑定、扫码流程保持移动端布局；用户协议和隐私政策同时适配手机与 PC。不包含业务端创建二维码、轮询和兑换凭据的实现。

## 启动与检查

需要 Node.js 20.19+ 或 22.12+（建议使用本项目验证过的 Node.js 24）。

```powershell
npm install
npm run dev
npm test
npm run typecheck
npm run build
npm run preview
```

开发端口为 5173，预览端口为 4173；端口占用时直接报错，不自动更换。正式产物在 `dist/`。使用 Node.js 24 内置测试、类型检查、构建和浏览器流程检查验证，不额外安装测试框架。

开发、预览与生产统一挂载在 `/passport/`，由 `vite.config.ts` 的 `base` 控制。开发入口为 `http://localhost:5173/passport/`，生产入口为 `https://tool.lxyy.fun/passport/`；不要再使用根目录的 `/login` 或 `/scan`。API 环境选择与页面挂载目录相互独立。

## 环境选择

默认正式环境，包括 `npm run dev`。不是根据 Vite 的 development/production 模式选择 API。

| 访问方式 | 效果 |
| --- | --- |
| `/passport/login` | 未选择过环境时使用 `https://api.lxyy.fun`；有本地选择缓存时继续使用本地 |
| `/passport/login?env=local` | 选择 `http://192.168.31.93:8000/`，写入 `localStorage` |
| `/passport/scan?env=local&transaction_id=<UUID>` | 在本地环境处理扫码事务 |
| 本地页面顶部「恢复正式环境」 | 清除环境选择、退出当前本地账号、丢弃当前事务，重新打开正式环境登录页 |

不需要、也不支持 `env=prod`。环境参数只允许单个 `env=local`，未知或重复参数显示错误，不会拿 URL 参数拼接 API 地址。普通入口优先级：URL 中的本地选择 → localStorage 中的本地选择 → 正式环境；带合法 `back` 的入口使用其显式环境选择（有 env=local 选本地，否则选正式），不继承旧环境缓存，也不通过 back 的域名猜测 API 环境。环境在页面启动时固定，切换通过整页重新加载完成；其他标签页修改环境时暂停本页操作。

环境键为 `hope-passport:environment`。可在开发者工具删除该键后重新打开不带 `env` 的地址恢复默认。

手机中的 `localhost` 是手机本身。真机本地联调时，把 `VITE_LOCAL_API_BASE_URL` 改为电脑可访问的局域网地址，且后端监听对应网络接口。HTTPS 页面访问 HTTP 开发接口仍可能被浏览器安全策略阻止。

本地环境（`env=local` 或已缓存本地选择）允许 HTTP 网页执行微信登录；正式环境始终要求 HTTPS。HTTP 下缺少 `crypto.subtle` 时按需加载随项目构建的 `@noble/hashes` SHA-256 实现，code 仍只保存摘要；随机 state 仍使用 `crypto.getRandomValues`，没有不安全的随机数降级。

本地联调需配置 `VITE_LOCAL_WECHAT_APP_ID`；`VITE_LOCAL_PASSPORT_URL` 留空时使用当前网页源地址加 `/passport/`，填写时须包含该目录并与实际打开地址匹配。后端 `ENVIRONMENT` 必须为 `development`、`dev` 或 `local`；回调源白名单非空时须登记该 HTTP 源地址（含端口、不含路径和尾部斜线）。后端正式环境即便收到 `env=local` 也不接受 HTTP 回调。修改 Vite 环境变量后须重启开发服务。

解除的是项目自身 HTTPS 限制，不替代公众号 AppID、网页授权域名、微信开发者工具及回调可达性要求；不能承诺任意局域网 IP 都能通过微信平台校验。HTTP 不加密登录数据，仅用于可信网络内的测试账号联调，正式服务继续使用 HTTPS。

## 公开配置

复制 `.env.example` 为 `.env.local` 后填写公开配置，再重启开发服务；生产构建前注入相应变量。所有 `VITE_` 配置会进入浏览器，**禁止填写 AppSecret、私钥或服务端 Token**。

| 配置后缀 | 正式环境 / 本地环境前缀 | 说明 |
| --- | --- | --- |
| `API_BASE_URL` | `VITE_PROD_` / `VITE_LOCAL_` | 必填 API 源地址，不含 `/api/v1`、路径、查询参数；代码不再提供本地或线上地址兜底 |
| `PASSPORT_URL` | 同上 | Passport 部署基址，包含 `/passport/`；未填写时使用当前页面源地址加 Vite base。末尾斜线可省略，会自动补齐。路径须与 Vite base 相同，不能附带查询参数或片段 |
| `WECHAT_APP_ID` | 同上 | 公众号 AppID；未配置时禁用微信登录，保留短信入口 |

用户协议与隐私政策直接使用本站 `/passport/terms`、`/passport/privacy`，不需要环境变量配置。此前的 `VITE_*_TERMS_URL`、`VITE_*_PRIVACY_URL` 不再读取。按已确认的交互要求，短信登录、绑定和设备确认页协议默认勾选，可取消；取消后不能提交。默认勾选不能描述为用户主动勾选，正式发布前仍需合规审阅。静默验证微信身份不直接授权 PC，必须手动点击确认。

## 公开协议页面

- 用户协议：`https://tool.lxyy.fun/passport/terms`；隐私政策：`https://tool.lxyy.fun/passport/privacy`。外部业务可以直接链接，不需要登录凭据、环境或扫码参数。
- 两页绕过账号恢复和扫码守卫，不请求账号或扫码 API；无效登录缓存、后端离线或 API 配置错误不会阻止阅读。
- 手机使用单列正文和可折叠目录；PC 在 900px 及以上使用侧栏目录与限宽正文。支持目录锚点、页面刷新、两份文档互相切换和浏览器打印。
- 登录页在新标签页打开协议，链接不附带事务 ID 或凭据，原表单与扫码上下文保留。
- 页面正文是已明确标注的基础草案，尚未完成法务核验。正式发布前须补全运营主体、客服和隐私联系方式、后端和供应商的数据处理清单、保存期限与位置、用户权利受理渠道，并核实未成年人和跨境处理安排。不要把可访问的草案当作已完成合规审阅的正式文件。
- 两份文档只覆盖 Hope 通行证的统一账号功能；外部业务引用它们，不会替代该业务自身需要提供的告知。

## 页面与流程

### 微信内台账自动返回

教师台账在微信内打开时可直接创建事务并进入本项目，授权中心继续通过微信验证身份、必要时绑定手机号，并保留一次“确认登录”。确认后自动返回台账，由台账兑换自己的业务 Token；普通 PC 扫码继续显示“确认在电脑上登录”和原结果页。

- 业务端在扫码 URL 后追加单个 `back` 参数，内容是 URL 编码后的完整返回地址；应用自行决定路径、端口、查询参数和片段，Passport 不追加任何业务参数。教师台账从当前源地址生成回调，并在 back 的 fragment 中放事务 ID 和随机 state。
- 先发布本项目，再发布台账 Web；台账服务器须将 `/auth/passport/callback` 回退到其 `index.html`。本次复用已有后端扫码接口。
- 域名白名单集中在 `src/config/returnTargets.ts` 的 `allowedReturnDomains`，当前放行 `lxyy.fun` 及其任意层级子域名。另放行 localhost / *.localhost、127/8、10/8、172.16/12、192.168/16、169.254/16，以及 IPv6 回环、私有和链路本地地址；本地端口不受限制。手机需使用可达的局域网地址，更换本地 IP/端口无需修改回跳代码。
- 白名单按 URL 解析后的 hostname 和完整标签边界匹配，拒绝 `evillxyy.fun`、`lxyy.fun.evil.test`、用户名密码、重复 back、相对地址和脚本协议。非本地必须 HTTPS，本地允许 HTTP。机制适用于任意真实扫码应用，传入 app_key 时仍与后端事务核对。
- back 上下文穿过内部路由、OAuth state 和手机号绑定，OAuth 回调携带同一公开 back 以确定启动环境，实际返回上下文以本地已验证 OAuth state 为准。不发送 Passport Token、poll_token 或 exchange_code；业务端负责自己的回调校验及兑换。重新载入结果页先复核事务状态，不信任 URL 上的 success/confirmed。
- 自动进入 OAuth、确认后页面跳转、自动返回及过期页的“返回应用”均使用 replace，避免本次受控流程留下额外历史项。普通 PC 扫码不传 back，确认后仍显示“请回到电脑继续”。微信内台账移除短信入口，Passport 的账号登录和首次手机号绑定保留。
- `npm test` 使用 Node.js 24 内置测试运行白名单边界检查；跨项目浏览器用例位于 TeacherLogbook 的 `tests/web/passport.spec.ts`。先启动两项目开发服务、构建两项目，再在台账项目运行 `npm run test:web -- tests/web/passport.spec.ts`。全部身份和业务 API 使用隔离响应，不发送真实短信。

以下为 Vue Router 内部路径，浏览器访问时均加 `/passport` 前缀，例如 `/login` 对应 `/passport/login`；业务 API 路径不加此前缀。

- `/login`：中国大陆手机号（11 位）、字符串四位验证码、短信发送与倒计时。有效扫码事务在微信内且配置公众号时自动发起一次 `snsapi_base`，失败后保留手动微信重试和短信入口；独立登录页不自动跳转。
- `/wechat/callback`：校验 sessionStorage 中的随机 state、环境、源地址、部署目录、AppID 和十分钟有效期；清除 URL 中的 code/state 时保留 `/passport/` 前缀。提交前消耗状态并记录 code 指纹，失败后只允许重新授权，不重复提交旧 code。
- `/bind-phone`：只保存临时身份票据，不提前保存 Token。验证手机后，新微信身份直接关联同手机号平台账号；历史账号冲突拒绝自动合并。票据失效或结果不明时返回登录重新验证微信身份；错误短信可继续重试。
- `/scan?transaction_id=<UUID>`：查询事务、通知已扫码、引导登录/绑定、再次校验、手动确认。只显示应用名称、当前账号、协议和确认按钮，不显示取消、切换账号或扫码倒计时；内部保留时钟，到期自动显示过期状态。恢复前台时重新查询；提交前再次检查事务和当前账号。
- `/result`：登录成功、授权确认/完成/取消/过期、禁用账号、参数和登录态异常。直接打开扫码结果链接会重新核对对应事务。
- `/terms`、`/privacy`：不依赖登录态的公开协议页面。

事务 ID 随内部路由流转，OAuth 往返通过 state 对应的本地上下文保留。只接收 UUID，不信任 URL 中的应用名称或账号信息。任何终态都不会在手机端创建替代事务。确认请求不携带 user_id，也不执行扫码凭据兑换。

## 主题扩展

入口示例：`/passport/login?app_key=your_app` 或 `/passport/scan?transaction_id=<UUID>&app_key=your_app`。

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
- 请求超时为 15 秒；确认失败后只提供状态查询，不自动重复提交授权。后台取消接口未删除，页面不再提供取消入口。
- 不读写业务端 poll_token 或 exchange_code，不传递手机 Access Token 给原设备，不接收任意 redirect_url。
- 不添加遥测、统计、第三方字体、远程主题或 CDN 依赖。无运行时控制台输出。不要把真实凭据放进截图、日志、URL 或问题反馈中。
- sessionStorage 仍可被同源脚本读取，不能防御 XSS。部署应控制同源脚本、设置合理 CSP；OAuth 回调访问日志应移除 code/state 查询参数。
- `/passport/` 不是安全隔离边界，同域名其他应用的脚本也能读取同源存储。只有可信站点内容才应共用该域名。迁移前已发起的旧版 OAuth 上下文不含部署目录，须重新扫码；不要重定向带 code/state 的旧回调来尝试复用。

## 后端与部署联调

响应采用 `{ code: 200, message, data }`。本次协议以配套 `hope-service` 源码及其 `docs/identity-login-api.md`、`docs/scan-login-api.md` 为准；旧版需求中的“微信先创建无手机号用户”已被后续确认的两阶段流程替代。

新增调用为 `/auth/identity/h5`、`/auth/identity/complete/sms`。服务端须配置 `PASSPORT_WECHAT_APP_IDS`、`PASSPORT_CALLBACK_ORIGINS` 和小程序 `MINIAPP_APP_SCOPES`；AppSecret 仅保留服务端。公众号和小程序 AppID 不能混用。

授权中心只接收 `app_scope=passport` 且已验证手机号的正式会话。PC 扫码兑换得到会话所属应用的 Token；PC 直接手机登录需提交 app_key，小程序按后端 AppID 映射获得业务 Token，业务 Token 不能确认扫码。无 app_scope 的旧 Token/缓存需重新登录，必须协调更新业务端。未改动其他 PC 或小程序前端。

临时票据按环境存在 sessionStorage，成功、重新发起验证或失效后清除；每个事务记录自动 OAuth 尝试，避免失败循环。页面不再提供切换账号；失败重试仍会清理旧 OAuth 状态，保留恢复入口。已绑定的公共公众号身份扫描不同业务无需重复验证手机号，但总要手动确认设备登录。

需后端/运维确认：
1. 两个环境允许实际前端域名的 CORS，支持 Authorization、Content-Type；对前端暴露 `Retry-After` 响应头。
2. 公众号授权域名、AppID 与 Passport 地址一致。必须在同一浏览器会话、同一源地址完成 OAuth，后端返回真实微信授权 URL。
3. 将 `dist/` 内的文件放到现有站点根目录下的 `passport/` 目录，服务器仅为 `/passport/` 路径做 SPA 回退到 `/passport/index.html`，不要修改域名下其他应用的回退规则。缺失静态资源返回 404，不回退 HTML。
4. `index.html` 不长期缓存；带内容哈希的 assets 可长期缓存。使用 HTTPS。
5. 上游业务端按需求.md实现创建事务、保存 poll_token、生成只含事务 ID 的二维码、轮询及一次性兑换。本地联调二维码可另带公开的 env=local，不能夹带任何秘密凭据。

### 当前部署地址

| 用途 | 地址或配置内容 |
| --- | --- |
| 授权中心入口 | `https://tool.lxyy.fun/passport/` |
| PC 二维码内容 | `https://tool.lxyy.fun/passport/scan?transaction_id=<后端返回的UUID>` |
| 微信网页回调 | `https://tool.lxyy.fun/passport/wechat/callback` |
| 前端 `VITE_PROD_PASSPORT_URL` | `https://tool.lxyy.fun/passport/`，也可留空自动采用当前源地址与挂载目录 |
| 前端 `VITE_LOCAL_PASSPORT_URL` | 建议留空，按实际开发 IP/端口推导 `/passport/` |
| 公众号网页授权域名 | `tool.lxyy.fun`，不含协议或目录；确认配置的是网页授权域名 |
| 后端回调源白名单条目及 CORS 源 | `https://tool.lxyy.fun`，不含 `/passport/` |

后端明确接受 `/passport/wechat/callback` 和兼容旧版的 `/wechat/callback`，不接受任意子目录。现有非空回调源白名单需要加入新源地址；空白名单沿用服务端已有放行规则，正式部署建议配置非空白名单。这里只调整前后端代码和公开示例，不修改实际服务器、公众号后台或真实 `.env`。

### Nginx 子目录示例

将下面的 location 合并到 `tool.lxyy.fun` 现有 HTTPS server 中，沿用该站点真实的 `root`。目录对应关系须为：站点 root 下的 `passport/index.html` 与 `passport/assets/`。不要把 `dist` 文件夹本身再嵌套一层。

```nginx
location = /passport {
    access_log off;
    return 308 /passport/$is_args$args;
}

location = /passport/index.html {
    access_log off;
    add_header Cache-Control "no-cache" always;
    try_files $uri =404;
}

location ^~ /passport/assets/ {
    try_files $uri =404;
    expires 1y;
    add_header Cache-Control "public, immutable";
}

location ^~ /passport/ {
    access_log off;
    try_files $uri $uri/ /passport/index.html;
}
```

示例关闭页面及回退 HTML 的访问日志，避免记录微信 code/state；CDN、WAF 和其他代理层也须脱敏。若已有响应安全头，合并 `add_header` 时保留现有安全头策略。公众号域名验证文件放在微信要求的域名根目录，不放进 `/passport/`，也不要被根站点的 SPA 回退规则拦截。

部署顺序：先发布兼容新旧路径的后端，再部署 `dist/` 并更新业务端二维码入口。构建后检查 `/passport/login`、`/passport/scan`、`/passport/wechat/callback` 和协议地址直接打开/刷新均返回页面；构建成功不代表远程服务器已部署或公众号配置已完成。

## 目录

`src/api` 接口与类型；`src/config` 环境与主题；`src/stores` 账号及扫码流程；`src/lib` 存储与 OAuth；`src/composables` 时钟；`src/components` 公共移动端组件；`src/views` 路由页面。
