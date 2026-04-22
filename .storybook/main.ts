import type { StorybookConfig } from '@storybook/vue3-vite'

import tailwindcss from '@tailwindcss/postcss'

const config: StorybookConfig = {
  framework: {
    name: '@storybook/vue3-vite',
    options: {},
  },
  addons: ['@storybook/addon-vitest'],
  stories: ['../src/**/*.stories.ts'],
  viteFinal(config) {
    // @tailwindcss/vite ESM-imports .css files at build time, which breaks
    // rolldown's Node loader in Storybook. Replace it with the PostCSS plugin.
    config.plugins = (config.plugins ?? [])
      .flat(Infinity as 1)
      .filter(
        (p): p is NonNullable<typeof p> =>
          !(typeof p === 'object' && p !== null && 'name' in p && typeof p.name === 'string' && p.name.startsWith('@tailwindcss')),
      )
    config.css = { ...config.css, postcss: { plugins: [tailwindcss()] } }
    return config
  },
}

export default config
