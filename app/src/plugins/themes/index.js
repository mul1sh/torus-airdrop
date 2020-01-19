import lightBlue from './lightBlue'
import darkBlack from './darkBlack'
import { THEME_DARK_BLACK_NAME, THEME_LIGHT_BLUE_NAME } from '../../utils/enums'

export default {
  [THEME_LIGHT_BLUE_NAME]: {
    label: 'walletSettings.light',
    name: THEME_LIGHT_BLUE_NAME,
    theme: lightBlue,
    isDark: false
  },
  [THEME_DARK_BLACK_NAME]: {
    label: 'walletSettings.dark',
    name: THEME_DARK_BLACK_NAME,
    theme: darkBlack,
    isDark: true
  }
}
