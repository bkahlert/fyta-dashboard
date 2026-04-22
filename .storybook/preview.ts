import type { Preview } from '@storybook/vue3-vite'

import '../src/style.css'

const preview: Preview = {
  parameters: {
    backgrounds: { disable: true },
  },
}

export default preview
