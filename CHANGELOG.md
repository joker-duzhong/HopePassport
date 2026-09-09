# 修订记录

## 2026-09-09 默认授权界面改版

- 按用户提供的抖音授权页面参考，默认主题统一为白底、黑灰文字、浅灰输入/账号区域和玫红主按钮。保留 Hope 品牌与现有 app_key 主题注册入口，未知应用仍使用默认主题。
- 授权页新增简洁居中标题，应用信息与登录说明左对齐，账号区置于分隔线下。主按钮与协议共同靠底，不恢复关闭、取消、切换账号或可见扫码倒计时。
- 登录、绑定、微信回调、成功、失败和过期页面复用共享样式；短屏与错误信息增多时自然滚动。协议默认选中、可取消，取消后禁用提交，仍需显式确认扫码登录。
- 公开协议同步黑灰/玫红配色，保留手机与 PC 阅读布局；独立根组件异常兜底同步默认配色，不依赖主题解析。未修改业务接口、后端、依赖或环境配置。
- 玫红按钮采用满足大文字对比度的 20px/700 文本，小字号彩色链接使用独立的深玫红 link 主题变量。
- 验证：`npm run build`（含类型检查）、`git diff --check` 和 UI 机械检查通过。12 组临时 Playwright 场景通过，覆盖默认勾选/取消禁用、显式确认、过期与错误恢复、静默绑定、协议链接、默认主题回退及独立异常兜底刷新；未发送真实短信或授权请求。
- 320–430px 手机视口、320x360 缩小视口与长名称检查无横向溢出或操作区重叠。登录、绑定、授权与 PC 隐私文档 axe WCAG A/AA 检查无发现；手机与 1440px PC 协议截图已直接复核。软键盘仅模拟缩小视口，未进行微信真机验证。
- 文件：`src/config/themes.ts`、`src/styles.css`、`src/App.vue`、`src/views/ScanView.vue`、`src/components/PhoneForm.vue`、`src/components/LegalLayout.vue`、`src/main.ts`、`DESIGN.md`、`CHANGELOG.md`。

## 2026-09-09 协议移至页面底部

- 授权页确认按钮直接位于账号下方，协议移至底部，不占用主操作区。登录、绑定页同步采用表单/按钮在上、协议在底部的布局。
- 协议使用正常文档流和弹性空白靠底，不使用固定或绝对定位；短屏、错误提示或键盘缩小可用空间时内容可自然滚动，底部安全区保留。
- 默认勾选、取消后禁用提交、协议链接及已输入表单状态保持不变。登录页微信入口移入表单插槽，显式使用 type=button，避免触发短信表单提交。
- 文件：`src/views/ScanView.vue`、`src/views/LoginView.vue`、`src/views/BindPhoneView.vue`、`src/components/PhoneForm.vue`、`src/styles.css`、`DESIGN.md`、`CHANGELOG.md`。

## 2026-09-09 精简授权与登录界面

- 授权页仅保留设备图标、后端返回的应用名称、当前账号、协议和确认按钮。移除取消登录、切换账号、扫码倒计时、大块警示及重复说明；后端取消接口及既有认证规则不改动。
- 登录、绑定、回调和结果页统一短文案与紧凑白底布局。账号页移除品牌栏、口号和页脚，开发环境提示缩成一行；默认主题圆角 8px、标题 22px、主按钮 48px，保留按 app_key 扩展主题的能力。
- 微信静默发起和回调只显示加载状态，失败后提供必要的登录恢复入口。正常绑定、授权与成功页不再提供切换账号；已结束/失败的验证仍可重新登录，避免死路。
- 按用户确认，登录、绑定和授权协议默认勾选，可取消，取消后禁用提交；默认勾选不等同于主动勾选，也不会自动确认 PC 登录。正式发布前仍需运营方完成协议及合规审阅。
- 隐藏扫码倒计时但保留内部时钟，停留授权页到期自动显示过期状态；查询后及提交前再次检查有效期，不会因隐藏倒计时继续提交已过期授权。短信重发冷却仍保留。
- 公开协议保留手机/PC 阅读布局，并将已移除的取消、切换操作说明更新为实际可用行为。
- 验证：类型检查与生产构建通过，UI 机械检查无发现。9 组临时 Playwright 场景通过：默认勾选且不自动确认、自动过期、过期响应阻止提交、失败只查询不自动重提、短信协议及链接保留、纯静默加载及绑定、绑定冲突恢复、OAuth 错误无循环、长名称/无障碍/公开协议。
- 320x568、340x640、390x680、430x844 视口主操作可见且无横向溢出，长应用名称不被截断；授权页 axe WCAG A/AA 无发现，手机及 PC 文档截图已检查。所有认证请求均使用替身，未发送真实短信或授权。

### 本次文件清单

- 页面：`src/App.vue`、`src/views/LoginView.vue`、`src/views/BindPhoneView.vue`、`src/views/ScanView.vue`、`src/views/WechatCallbackView.vue`、`src/views/ResultView.vue`。
- 组件与样式：`src/components/PhoneForm.vue`、`src/components/AccountSummary.vue`、`src/styles.css`、`src/config/themes.ts`、`index.html`。
- 文案与文档：`src/views/TermsView.vue`、`src/views/PrivacyView.vue`、`README.md`、`PRODUCT.md`、`DESIGN.md`、`CHANGELOG.md`。
- 保留工作区其他既有修改；没有修改后端、真实环境配置或依赖。

## 2026-09-09 本地 HTTP 微信登录联调

- 本地环境放开前端 OAuth 的 HTTPS 检查；正式环境在发起和回调两个阶段均要求 HTTPS 和 WebCrypto，不依赖 localhost 被浏览器视为安全上下文来放行。
- HTTP 下缺少 `crypto.subtle` 时按需加载 `@noble/hashes@1.8.0` 的 SHA-256，兼容此前确认缺少 Object.hasOwn 的开发者工具内核。code 仅存摘要，保留随机 state、环境与源地址校验和重复 code 拦截；缺少安全随机 API 时不降级为 Math.random。
- 后端同步允许明确开发环境的 HTTP 回调白名单；正式环境不接受由 env=local 或 DEBUG 开启 HTTP。未修改真实环境变量值，公众号及回调源仍需部署方配置。
- 验证：后端相关 123 项测试通过；6 组临时 Playwright 检查通过，覆盖真实非安全 HTTP 上下文和缺少 Object.hasOwn 的自动回调、摘要一致性、code 防重、错误 state、正式 HTTP 发起/回调拒绝、正式 HTTPS 原生摘要及安全随机缺失拒绝。SHA-256 标准向量通过，npm 安装审计无已知漏洞。没有请求真实微信、短信或认证服务。
- 文件：`src/lib/oauth.ts`、`package.json`、`package-lock.json`、`README.md`、`CHANGELOG.md`。
- 最终验证：`npm run build`（含类型检查）通过；扩大到身份、旧登录、扫码、刷新及 OpenID 契约后 174 项测试通过；两个仓库 `git diff --check` 通过。

## 2026-09-09 微信开发者工具白屏兼容修复

- 已确认部分开发者工具内核没有 `Object.hasOwn`：主题计算抛错导致根组件渲染失败，原异常处理只更新组件内部提示，无法从根组件白屏恢复。
- 主题及结果状态改用 `Object.prototype.hasOwnProperty.call`，保留自有属性检查，避免 `constructor`、`__proto__` 等继承属性被当成已登记主题或合法状态；不修改浏览器全局对象。
- 在根组件外增加独立渲染异常提示与刷新按钮。开发期输出固定来源及错误类别，不记录异常原文、用户信息或凭据；生产构建不输出诊断日志。
- 验证：`npm run build`（含类型检查）通过。临时 Playwright 在开发服务和生产预览分别移除 `Object.hasOwn`，各验证 8 个登录/结果/协议及继承属性参数场景；均正常显示且手机视口无横向溢出。两种构建分别注入根组件异常，兜底正常、无异常原文泄露；开发服务刷新恢复通过，生产无诊断日志。未发送真实认证请求，未直接操控微信开发者工具。
- 本次文件：`src/config/themes.ts`、`src/views/ResultView.vue`、`src/main.ts`、`CHANGELOG.md`。保留工作区其他既有修改。

## 2026-09-09 两阶段微信身份与扫码快捷登录

- 有效扫码事务在微信内且配置 AppID 时自动发起一次 snsapi_base；已有正式 Passport 登录态直接进入确认页。失败后只由用户手动重试，保留短信回退。
- 使用新身份接口；PHONE_REQUIRED 仅保存环境隔离的临时票据，不提前保存 Token。手机号验证成功关联同手机号用户，新手机号自动注册；历史账号冲突保留错误并提供恢复入口。
- 清理旧版/其他应用 Token 缓存。绑定完成、退出或切换账号清理临时身份与 OAuth 状态，迟到响应不覆盖新账号；账号切换抑制同一事务自动微信登录。
- 扫码始终核对后端目标应用、有效期和当前用户，主动同意协议并点击确认后才授权 PC，不自动兑换业务 Token。
- 同步协议草案中静默验证和新身份关联的功能说明，保留公开协议 PC/手机布局及无需登录访问。
- 验证：npm run typecheck、npm run build 通过；9 组临时 Playwright 模拟检查通过，覆盖新身份绑定及短信错误恢复、已有身份扫描 A/B、账号切换、OAuth 防循环与 state 校验、过期、历史冲突、短信回退、环境隔离、公开页面和布局。检查 320/390/430px 手机和 1440px 文档视口无溢出；确认页 axe WCAG A/AA 与 UI 机械检查无发现，截图已检查。
- 配套后端回归 245 项通过，其中 5 项在一次性 PostgreSQL 15 容器中验证真实约束、并发绑定和事务回滚，其余使用隔离替身；未连接现有业务数据库或发送真实短信、微信授权。
- 发布前必须更新后端公开配置和对应 PC/小程序客户端，并完成真机微信、域名及 SMS 联调。无范围的旧 Token 将被拒绝；两阶段接口不能与旧新用户登录流程混用。

### 本次文件清单

- 新增：`src/lib/pendingIdentity.ts`。
- 修改：`src/api/auth.ts`、`src/api/client.ts`、`src/api/types.ts`、`src/lib/oauth.ts`、`src/router.ts`、`src/stores/auth.ts`。
- 修改：`src/views/LoginView.vue`、`src/views/BindPhoneView.vue`、`src/views/WechatCallbackView.vue`、`src/views/ScanView.vue`、`src/views/TermsView.vue`、`src/views/PrivacyView.vue`。
- 文档：`README.md`、`CHANGELOG.md`。本次未修改原始 `需求.md`、真实环境变量值或依赖；保留工作区已有 `.env.example` 等变更。

## 内置公开协议页面

- 新增 `/terms` 用户协议和 `/privacy` 隐私政策，外部可直接访问，无需登录或扫码参数；阅读不调用账号 API。
- 新增共用协议阅读布局，兼容手机与 PC；支持目录锚点、文档切换和打印样式。其他账号页面仍保持移动端布局。
- 本站直接使用内置协议链接，移除协议 URL 环境配置、缺失配置提示及登录禁用条件；继续校验用户主动勾选同意。
- 协议内容明确标为基础草案，不编造运营主体、联系方式、后端数据保存期限等未确认信息。
- 保留用户已调整的本地 API 地址及其他无关改动。

### 验证结果

- `npm run typecheck`、`npm run build` 通过。
- 7 组临时 Playwright 检查通过：公开页面不触发账号请求、无效环境与事务参数不阻断阅读、PC 目录锚点及刷新、手机和 PC 布局、手机目录展开、协议链接保留登录表单和扫码上下文、登录及 OAuth 仍要求同意。
- 320、390、768、1440px 视口无水平溢出；两页 PC axe WCAG A/AA 检查与 UI 机械检查无发现；人工检查手机和 PC 截图，正文和目录未重叠。
- 测试脚本、模拟数据及截图放在系统临时目录，未加入项目依赖或产物；没有发送真实短信或提交真实登录授权。
- 协议仍为未完成法律审阅的基础草案；上线前须确认运营与数据处理信息。

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
