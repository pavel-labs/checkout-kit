import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import {
  dirname as posixDirname,
  join as posixJoin,
  normalize as posixNormalize,
} from 'node:path/posix'
import { fileURLToPath } from 'node:url'
import { defineConfig, type DefaultTheme } from 'vitepress'

// The guides in this directory are the same Markdown files the repository has always had, so
// they still read on GitHub. VitePress adds the sidebar, the search and the language switch;
// it does not own the content.

const REPO = 'https://github.com/pavel-labs/checkout-kit'

// The demo is a sibling of the docs on the same Pages site, not a page of them. Written
// without the base: VitePress prepends that itself, and spelling it out here produced
// /checkout-kit/checkout-kit/demo/.
const DEMO = '/demo/'

// The reference is generated into docs/api by `npm run docs:api`, which also writes one
// typedoc-sidebar.json per package. It is not committed, so the site still builds without it -
// the API section is simply absent until the reference has been generated.
const here = dirname(fileURLToPath(import.meta.url))
const apiRoot = join(here, '..', 'api')

const API_GROUPS: { text: string; packages: string[] }[] = [
  { text: 'The checkout', packages: ['core', 'react', 'ui', 'runtime-browser'] },
  {
    text: 'Payment plugins',
    packages: [
      'provider-psp',
      'provider-acquiring',
      'provider-hpp',
      'provider-hosted-fields',
      'provider-wallet',
      'provider-bank-transfer',
    ],
  },
  { text: 'Native apps', packages: ['webview-bridge'] },
  { text: 'For plugin authors', packages: ['testing', 'conformance'] },
]

const apiSidebar = (): DefaultTheme.SidebarItem[] => {
  if (!existsSync(apiRoot)) return []

  const groups = API_GROUPS.map((group) => ({
    text: group.text,
    items: group.packages.flatMap((name) => {
      const sidebar = join(apiRoot, name, 'typedoc-sidebar.json')
      if (!existsSync(sidebar)) return []

      return [
        {
          text: `@checkout-kit/${name}`,
          collapsed: true,
          items: JSON.parse(readFileSync(sidebar, 'utf8')) as DefaultTheme.SidebarItem[],
        },
      ]
    }),
  })).filter((group) => group.items.length > 0)

  return [{ text: 'API reference', link: '/api/' }, ...groups]
}

const guideSidebar = (): DefaultTheme.SidebarItem[] => [
  {
    text: 'Start here',
    items: [
      { text: 'Architecture', link: '/architecture' },
      { text: 'Adopting it', link: '/adopting' },
      { text: 'The UI kit', link: '/ui' },
    ],
  },
  {
    text: 'Using the plugins',
    items: [
      { text: 'Which one do I need?', link: '/plugins/' },
      { text: 'Setting up your environment', link: '/plugins/setup' },
      { text: 'Card processor', link: '/plugins/psp' },
      { text: 'Acquiring bank', link: '/plugins/acquiring' },
      { text: 'Hosted payment page', link: '/plugins/hosted-page' },
      { text: 'Hosted card fields', link: '/plugins/hosted-fields' },
      { text: 'Wallet', link: '/plugins/wallet' },
      { text: 'Bank transfer', link: '/plugins/bank-transfer' },
    ],
  },
  {
    text: 'Building an integration',
    items: [
      { text: 'Writing a payment plugin', link: '/plugin-authoring' },
      { text: 'The backend a plugin talks to', link: '/backend' },
      { text: 'Real providers, mapped', link: '/real-world-providers' },
      { text: 'Integration recipes', link: '/integrations' },
    ],
  },
  {
    text: 'Providers by region',
    collapsed: false,
    items: [
      { text: 'Europe', link: '/providers/europe' },
      { text: 'Americas', link: '/providers/americas' },
      { text: 'Asia', link: '/providers/asia' },
    ],
  },
  {
    text: 'Running it safely',
    items: [
      { text: 'Iframes and 3-D Secure', link: '/iframe' },
      { text: 'Security headers', link: '/security-headers' },
      { text: 'In a WebView', link: '/webview' },
    ],
  },
]

const ruSidebar = (): DefaultTheme.SidebarItem[] => [
  {
    text: 'Начало',
    items: [
      { text: 'Архитектура', link: '/ru/architecture' },
      { text: 'Как внедрить', link: '/ru/adopting' },
      { text: 'UI-кит', link: '/ru/ui' },
    ],
  },
  {
    text: 'Как пользоваться плагинами',
    items: [
      { text: 'Какой мне нужен?', link: '/ru/plugins/' },
      { text: 'Настройка окружения', link: '/ru/plugins/setup' },
      { text: 'Карточный процессинг', link: '/ru/plugins/psp' },
      { text: 'Банк-эквайер', link: '/ru/plugins/acquiring' },
      { text: 'Платёжная страница банка', link: '/ru/plugins/hosted-page' },
      { text: 'Хостед-поля', link: '/ru/plugins/hosted-fields' },
      { text: 'Кошелёк', link: '/ru/plugins/wallet' },
      { text: 'Банковский перевод', link: '/ru/plugins/bank-transfer' },
    ],
  },
  {
    text: 'Своя интеграция',
    items: [
      { text: 'Как написать плагин', link: '/ru/plugin-authoring' },
      { text: 'Бэкенд для плагина', link: '/ru/backend' },
      { text: 'Настоящие провайдеры', link: '/ru/real-world-providers' },
      { text: 'Рецепты интеграций', link: '/ru/integrations' },
    ],
  },
  {
    text: 'Провайдеры по регионам',
    collapsed: false,
    items: [
      { text: 'Европа', link: '/ru/providers/europe' },
      { text: 'Америки', link: '/ru/providers/americas' },
      { text: 'Азия', link: '/ru/providers/asia' },
    ],
  },
  {
    text: 'Безопасность',
    items: [
      { text: 'Iframe и 3-D Secure', link: '/ru/iframe' },
      { text: 'Заголовки безопасности', link: '/ru/security-headers' },
      { text: 'В WebView', link: '/ru/webview' },
    ],
  },
]

export default defineConfig({
  title: 'Checkout kit',
  base: '/checkout-kit/',
  cleanUrls: false,
  lastUpdated: true,

  // The demo is served from the same site but built separately - there is no page here for
  // the link checker to find.
  ignoreDeadLinks: [/^\/demo\/?$/],

  markdown: {
    config(md) {
      // Some guides link to files outside docs/ - a package README, the bank simulator, an
      // example. Those are relative so they resolve when the file is read on GitHub, but the
      // site has no page for them. Point them at GitHub instead of leaving a dead link.
      const defaultRender =
        md.renderer.rules.link_open ??
        ((tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options))

      md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
        const href = tokens[idx].attrGet('href')

        if (href?.startsWith('.')) {
          const fromDocsRoot = posixNormalize(
            posixJoin(posixDirname(String(env.relativePath ?? '')), href),
          )

          if (fromDocsRoot.startsWith('../')) {
            const inRepo = fromDocsRoot.replace(/^(\.\.\/)+/, '')
            tokens[idx].attrSet('href', `${REPO}/blob/main/${inRepo}`)
            tokens[idx].attrSet('target', '_blank')
            tokens[idx].attrSet('rel', 'noreferrer')
          }
        }

        return defaultRender(tokens, idx, options, env, self)
      }
    },
  },

  head: [
    ['meta', { name: 'theme-color', content: '#aa3bff' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:title', content: 'Checkout kit' }],
    [
      'meta',
      {
        property: 'og:description',
        content: 'An embeddable checkout. Every payment integration behind it is a plugin.',
      },
    ],
  ],

  themeConfig: {
    search: { provider: 'local' },
    socialLinks: [{ icon: 'github', link: REPO }],
    outline: [2, 3],
  },

  locales: {
    root: {
      label: 'English',
      lang: 'en',
      description: 'An embeddable checkout. Every payment integration behind it is a plugin.',
      themeConfig: {
        nav: [
          { text: 'Guide', link: '/architecture', activeMatch: '^/(?!ru/|api/)' },
          { text: 'API', link: '/api/', activeMatch: '^/api/' },
          { text: 'Demo', link: DEMO },
        ],
        sidebar: {
          '/api/': apiSidebar(),
          '/': guideSidebar(),
        },
        editLink: {
          pattern: `${REPO}/edit/main/docs/:path`,
          text: 'Edit this page on GitHub',
        },
        footer: {
          message: 'Apache-2.0. Nothing here has taken a real payment yet.',
          copyright: `© ${new Date().getFullYear()} pavel-labs`,
        },
      },
    },

    ru: {
      label: 'Русский',
      lang: 'ru',
      link: '/ru/',
      description: 'Встраиваемый чекаут. Каждая платёжная интеграция за ним — плагин.',
      themeConfig: {
        nav: [
          { text: 'Руководство', link: '/ru/architecture', activeMatch: '^/ru/' },
          { text: 'API', link: '/api/' },
          { text: 'Демо', link: DEMO },
        ],
        sidebar: { '/ru/': ruSidebar() },
        editLink: {
          pattern: `${REPO}/edit/main/docs/:path`,
          text: 'Править эту страницу на GitHub',
        },
        footer: {
          message: 'Apache-2.0. Ни один настоящий платёж через это ещё не прошёл.',
          copyright: `© ${new Date().getFullYear()} pavel-labs`,
        },
        docFooter: { prev: 'Назад', next: 'Дальше' },
        outline: { label: 'На этой странице' },
        lastUpdated: { text: 'Обновлено' },
        returnToTopLabel: 'Наверх',
        langMenuLabel: 'Сменить язык',
      },
    },
  },
})
