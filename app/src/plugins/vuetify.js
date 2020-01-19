import Vue from 'vue'
import Vuetify from 'vuetify/lib'
import themes from './themes'
import iconsValues from '../icons'
import { THEME_DARK_BLACK_NAME, THEME_LIGHT_BLUE_NAME } from '../utils/enums'

Vue.use(Vuetify)

import languages from './locales'

let userLanguage = window.navigator.userLanguage || window.navigator.language || 'en-US'
userLanguage = userLanguage.split('-')
userLanguage = Object.prototype.hasOwnProperty.call(languages, userLanguage[0]) ? userLanguage[0] : 'en'

export default new Vuetify({
  theme: {
    dark: false,
    themes: {
      light: { ...themes[THEME_LIGHT_BLUE_NAME].theme },
      dark: { ...themes[THEME_DARK_BLACK_NAME].theme }
    },
    options: {
      customProperties: true
    }
  },
  icons: {
    values: iconsValues
  },
  lang: {
    locales: languages,
    current: userLanguage
  }
})
