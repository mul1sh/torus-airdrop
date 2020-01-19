import simplex from './simplex'
import moonpay from './moonpay'
import wyre from './wyre'
import coindirect from './coindirect'
import { paymentProviders } from '../../utils/utils'
import { SIMPLEX, MOONPAY, WYRE, COINDIRECT, ETH } from '../../utils/enums'
import torus from '../../torus'
import vuetify from '../../plugins/vuetify'

const topupStream = torus.communicationMux.getStream('topup')

export default {
  ...simplex,
  ...moonpay,
  ...wyre,
  ...coindirect,
  async initiateTopup({ state, dispatch }, { provider, params, preopenInstanceId }) {
    const handleSuccess = success => {
      topupStream.write({
        name: 'topup_response',
        data: {
          success: success
        }
      })
    }

    const handleFailure = error => {
      topupStream.write({
        name: 'topup_response',
        data: {
          success: false,
          error: error.message || 'Internal error'
        }
      })
    }
    if (paymentProviders[provider] && paymentProviders[provider].api) {
      try {
        const selectedProvider = paymentProviders[provider]
        const selectedParams = params || {}

        // set default values
        if (!selectedParams.selectedCurrency) selectedParams.selectedCurrency = 'USD'
        if (!selectedParams.fiatValue) selectedParams.fiatValue = selectedProvider.minOrderValue
        if (!selectedParams.selectedCryptoCurrency) selectedParams.selectedCryptoCurrency = 'ETH'

        // validations
        const requestedOrderAmount = +parseFloat(selectedParams.fiatValue)
        if (requestedOrderAmount < selectedProvider.minOrderValue) throw new Error('Requested amount is lower than supported')
        if (requestedOrderAmount > selectedProvider.maxOrderValue) throw new Error('Requested amount is higher than supported')
        if (!selectedProvider.validCurrencies.includes(selectedParams.selectedCurrency)) throw new Error('Unsupported currency')
        if (!selectedProvider.validCryptoCurrencies.includes(selectedParams.selectedCryptoCurrency)) throw new Error('Unsupported cryptoCurrency')

        // simplex
        if (provider === SIMPLEX) {
          const { result: currentOrder } = await dispatch('fetchSimplexQuote', selectedParams)
          const { success } = await dispatch('fetchSimplexOrder', { currentOrder, preopenInstanceId })
          handleSuccess(success)
        }
        // moonpay
        else if (provider === MOONPAY) {
          const currentOrder = await dispatch('fetchMoonpayQuote', selectedParams)
          const { success } = await dispatch('fetchMoonpayOrder', {
            currentOrder,
            colorCode: vuetify.framework.theme.themes.light.primary,
            preopenInstanceId
          })
          handleSuccess(success)
        }
        // wyre
        else if (provider === WYRE) {
          const { data: currentOrder } = await dispatch('fetchWyreQuote', selectedParams)
          const { success } = await dispatch('fetchWyreOrder', { currentOrder, preopenInstanceId })
          handleSuccess(success)
        }
        // coindirect
        else if (provider === COINDIRECT) {
          const currentOrder = await dispatch('fetchCoindirectQuote', selectedParams)
          const { success } = await dispatch('fetchCoindirectOrder', { currentOrder, preopenInstanceId })
          handleSuccess(success)
        }
      } catch (error) {
        handleFailure(error)
      }
    } else {
      handleFailure(new Error('Unsupported/Invalid provider selected'))
    }
  }
}
