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
    text: 'Provider integrations',
    packages: ['provider-stripe', 'provider-adyen', 'provider-paypal'],
  },
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
    "text": "Start here",
    "items": [
      {
        "text": "Getting started",
        "link": "/getting-started"
      },
      {
        "text": "Choose your packages",
        "link": "/packages"
      },
      {
        "text": "Architecture",
        "link": "/architecture"
      }
    ]
  },
  {
    "text": "Connect a provider",
    "items": [
      {
        "text": "Stripe",
        "link": "/providers/stripe"
      },
      {
        "text": "Adyen",
        "link": "/providers/adyen"
      },
      {
        "text": "PayPal",
        "link": "/providers/paypal"
      },
      {
        "text": "Merchant server",
        "link": "/merchant-integration"
      }
    ]
  },
  {
    "text": "Build the checkout",
    "items": [
      {
        "text": "React",
        "link": "/react"
      },
      {
        "text": "UI kit",
        "link": "/ui"
      },
      {
        "text": "Runtime and recovery",
        "link": "/runtime"
      },
      {
        "text": "WebView and native commands",
        "link": "/webview"
      },
      {
        "text": "Adopting an existing checkout",
        "link": "/adopting"
      }
    ]
  },
  {
    "text": "Verify and extend",
    "items": [
      {
        "text": "Testing and conformance",
        "link": "/testing"
      },
      {
        "text": "Troubleshooting",
        "link": "/troubleshooting"
      },
      {
        "text": "Write a provider",
        "link": "/plugin-authoring"
      },
      {
        "text": "Backend contracts",
        "link": "/backend"
      },
      {
        "text": "Iframes and 3DS",
        "link": "/iframe"
      },
      {
        "text": "Security headers",
        "link": "/security-headers"
      }
    ]
  },
  {
    "text": "Reference protocols",
    "collapsed": true,
    "items": [
      {
        "text": "Choose a protocol",
        "link": "/plugins/"
      },
      {
        "text": "Simulator environment",
        "link": "/plugins/setup"
      },
      {
        "text": "JSON PSP",
        "link": "/plugins/psp"
      },
      {
        "text": "Form acquiring",
        "link": "/plugins/acquiring"
      },
      {
        "text": "Hosted page",
        "link": "/plugins/hosted-page"
      },
      {
        "text": "Hosted fields",
        "link": "/plugins/hosted-fields"
      },
      {
        "text": "Wallet SDK",
        "link": "/plugins/wallet"
      },
      {
        "text": "Bank transfer",
        "link": "/plugins/bank-transfer"
      }
    ]
  },
  {
    "text": "Integration design examples",
    "collapsed": true,
    "items": [
      {
        "text": "Provider mappings",
        "link": "/real-world-providers"
      },
      {
        "text": "Integration recipes",
        "link": "/integrations"
      },
      {
        "text": "Europe",
        "link": "/providers/europe"
      },
      {
        "text": "Americas",
        "link": "/providers/americas"
      },
      {
        "text": "Asia",
        "link": "/providers/asia"
      }
    ]
  }
]

const ruSidebar = (): DefaultTheme.SidebarItem[] => [
  {
    "text": "Начало",
    "items": [
      {
        "text": "Быстрый старт",
        "link": "/ru/getting-started"
      },
      {
        "text": "Каталог пакетов",
        "link": "/ru/packages"
      },
      {
        "text": "Архитектура",
        "link": "/ru/architecture"
      }
    ]
  },
  {
    "text": "Подключение провайдера",
    "items": [
      {
        "text": "Stripe",
        "link": "/ru/providers/stripe"
      },
      {
        "text": "Adyen",
        "link": "/ru/providers/adyen"
      },
      {
        "text": "PayPal",
        "link": "/ru/providers/paypal"
      },
      {
        "text": "Сервер мерчанта",
        "link": "/ru/merchant-integration"
      }
    ]
  },
  {
    "text": "Интерфейс чекаута",
    "items": [
      {
        "text": "React",
        "link": "/ru/react"
      },
      {
        "text": "UI-кит",
        "link": "/ru/ui"
      },
      {
        "text": "Runtime и восстановление",
        "link": "/ru/runtime"
      },
      {
        "text": "WebView и нативные команды",
        "link": "/ru/webview"
      },
      {
        "text": "Внедрение в свой чекаут",
        "link": "/ru/adopting"
      }
    ]
  },
  {
    "text": "Проверка и расширение",
    "items": [
      {
        "text": "Тестирование и conformance",
        "link": "/ru/testing"
      },
      {
        "text": "Решение проблем",
        "link": "/ru/troubleshooting"
      },
      {
        "text": "Свой провайдер",
        "link": "/ru/plugin-authoring"
      },
      {
        "text": "Контракты бэкенда",
        "link": "/ru/backend"
      },
      {
        "text": "Iframe и 3DS",
        "link": "/ru/iframe"
      },
      {
        "text": "Заголовки безопасности",
        "link": "/ru/security-headers"
      }
    ]
  },
  {
    "text": "Референсные протоколы",
    "collapsed": true,
    "items": [
      {
        "text": "Выбор протокола",
        "link": "/ru/plugins/"
      },
      {
        "text": "Окружение симулятора",
        "link": "/ru/plugins/setup"
      },
      {
        "text": "JSON PSP",
        "link": "/ru/plugins/psp"
      },
      {
        "text": "Form-эквайер",
        "link": "/ru/plugins/acquiring"
      },
      {
        "text": "Платёжная страница",
        "link": "/ru/plugins/hosted-page"
      },
      {
        "text": "Хостед-поля",
        "link": "/ru/plugins/hosted-fields"
      },
      {
        "text": "SDK кошелька",
        "link": "/ru/plugins/wallet"
      },
      {
        "text": "Банковский перевод",
        "link": "/ru/plugins/bank-transfer"
      }
    ]
  },
  {
    "text": "Примеры проектирования",
    "collapsed": true,
    "items": [
      {
        "text": "Сопоставление протоколов",
        "link": "/ru/real-world-providers"
      },
      {
        "text": "Рецепты интеграций",
        "link": "/ru/integrations"
      },
      {
        "text": "Европа",
        "link": "/ru/providers/europe"
      },
      {
        "text": "Америки",
        "link": "/ru/providers/americas"
      },
      {
        "text": "Азия",
        "link": "/ru/providers/asia"
      }
    ]
  }
]

export default defineConfig({
  title: 'Checkout kit',
  base: '/checkout-kit/',
  cleanUrls: false,
  lastUpdated: true,

  // The demo is served from the same site but built separately - there is no page here for
  // the link checker to find.
  ignoreDeadLinks: [/^\/demo\/(?:index(?:\.html)?)?$/],

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
            const target = inRepo.split(/[?#]/)[0]
            if (!target || !existsSync(join(here, '../..', decodeURIComponent(target)))) {
              throw new Error('Missing repository link in ' + String(env.relativePath) + ': ' + href)
            }
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
        content: 'Headless checkout engine, provider adapters, browser runners and native hosts.',
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
      description: 'Headless checkout engine, provider adapters, browser runners and native hosts.',
      themeConfig: {
        nav: [
          { text: 'Guide', link: '/getting-started', activeMatch: '^/(?!ru/|api/)' },
          { text: 'Packages', link: '/packages' },
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
          message: 'Apache-2.0 · Headless engine, provider adapters and runnable examples.',
          copyright: `© ${new Date().getFullYear()} pavel-labs`,
        },
      },
    },

    ru: {
      label: 'Русский',
      lang: 'ru',
      link: '/ru/',
      description: 'Headless-движок чекаута, адаптеры провайдеров и браузерные/нативные хосты.',
      themeConfig: {
        nav: [
          { text: 'Руководство', link: '/ru/getting-started', activeMatch: '^/ru/' },
          { text: 'Пакеты', link: '/ru/packages' },
          { text: 'API', link: '/api/' },
          { text: 'Демо', link: DEMO },
        ],
        sidebar: { '/ru/': ruSidebar() },
        editLink: {
          pattern: `${REPO}/edit/main/docs/:path`,
          text: 'Править эту страницу на GitHub',
        },
        footer: {
          message: 'Apache-2.0 · Headless-движок, адаптеры провайдеров и запускаемые примеры.',
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
