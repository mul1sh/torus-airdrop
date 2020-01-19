/* eslint-disable max-len */
const assert = require('assert')
const sinon = require('sinon')
const clone = require('clone')
const nock = require('nock')
const createThoughStream = require('through2').obj
const blacklistJSON = require('eth-phishing-detect/src/config')
const MetaMaskController = require('../../../src/controllers/TorusController').default
const firstTimeState = require('../../localhostState')
const createTxMeta = require('../lib/createTxMeta')
const EthQuery = require('eth-query')

const currentNetworkId = 42
const DEFAULT_LABEL = 'Account 1'
const DEFAULT_LABEL_2 = 'Account 2'
const TEST_SEED = 'debris dizzy just program just float decrease vacant alarm reduce speak stadium'
const TEST_ADDRESS = '0x0dcd5d886577d5081b0c52e242ef29e70be3e7bc'
const TEST_ADDRESS_2 = '0xec1adf982415d2ef5ec55899b9bfb8bc0f29251b'
const TEST_ADDRESS_3 = '0xeb9e64b93097bc15f01f13eae97015c57ab64823'
const TEST_SEED_ALT = 'setup olympic issue mobile velvet surge alcohol burger horse view reopen gentle'
const TEST_ADDRESS_ALT = '0xc42edfcc21ed14dda456aa0756c153f7985d8813'
const CUSTOM_RPC_URL = 'http://localhost:8545'

const testAccount = {
  key: '08506248462eadf53f05b6c3577627071757644b3a0547315788357ec93e7b77',
  address: '0xa12164fed66719297d2cf407bb314d07feb12c02'
}

const testAccount2 = {
  key: '357a5188cb0f748f62f59b6eac31b9d386b9f7f2c87f567f0dae5eed8b8a9d9c',
  address: '0x43ce12056aa1e8372ab4abf0c0cc658d2d41077f'
}

describe('MetaMaskController', function() {
  let metamaskController
  const sandbox = sinon.createSandbox()
  const noop = () => {}

  beforeEach(function() {
    nock('https://api.infura.io')
      .persist()
      .get('/v2/blacklist')
      .reply(200, blacklistJSON)

    nock('https://api.infura.io')
      .get('/v1/ticker/ethusd')
      .reply(
        200,
        '{"base": "ETH", "quote": "USD", "bid": 288.45, "ask": 288.46, "volume": 112888.17569277, "exchange": "bitfinex", "total_volume": 272175.00106721005, "num_exchanges": 8, "timestamp": 1506444677}'
      )

    nock('https://api.infura.io')
      .get('/v1/ticker/ethjpy')
      .reply(
        200,
        '{"base": "ETH", "quote": "JPY", "bid": 32300.0, "ask": 32400.0, "volume": 247.4616071, "exchange": "kraken", "total_volume": 247.4616071, "num_exchanges": 1, "timestamp": 1506444676}'
      )

    nock('https://api.infura.io')
      .persist()
      .get(/.*/)
      .reply(200)

    metamaskController = new MetaMaskController({
      showUnapprovedTx: noop,
      showUnconfirmedMessage: noop,
      encryptor: {
        encrypt: function(password, object) {
          this.object = object
          return Promise.resolve('mock-encrypted')
        },
        decrypt: function() {
          return Promise.resolve(this.object)
        }
      },
      initState: clone(firstTimeState),
      platform: { showTransactionNotification: () => {} }
    })
    // disable diagnostics
    metamaskController.diagnostics = null
    // add sinon method spies
    // sandbox.spy(metamaskController.keyringController, 'createNewVaultAndKeychain')
    // sandbox.spy(metamaskController.keyringController, 'createNewVaultAndRestore')
  })

  afterEach(function() {
    nock.cleanAll()
    sandbox.restore()
  })

  // describe('submitPassword', function() {
  //   const password = 'password'

  //   beforeEach(async function() {
  //     await metamaskController.createNewVaultAndKeychain(password)
  //   })

  //   it('removes any identities that do not correspond to known accounts.', async function() {
  //     const fakeAddress = '0xbad0'
  //     metamaskController.preferencesController.addAddresses([fakeAddress])
  //     await metamaskController.submitPassword(password)

  //     const identities = Object.keys(metamaskController.preferencesController.store.getState().identities)
  //     const addresses = await metamaskController.keyringController.getAccounts()

  //     identities.forEach(identity => {
  //       assert.ok(addresses.includes(identity), `addresses should include all IDs: ${identity}`)
  //     })

  //     addresses.forEach(address => {
  //       assert.ok(identities.includes(address), `identities should include all Addresses: ${address}`)
  //     })
  //   })
  // })

  describe('#getGasPrice', function() {
    it('gives the 50th percentile lowest accepted gas price from recentBlocksController', async function() {
      const realRecentBlocksController = metamaskController.recentBlocksController
      metamaskController.recentBlocksController = {
        store: {
          getState: () => {
            return {
              recentBlocks: [
                { gasPrices: ['0x3b9aca00', '0x174876e800'] },
                { gasPrices: ['0x3b9aca00', '0x174876e800'] },
                { gasPrices: ['0x174876e800', '0x174876e800'] },
                { gasPrices: ['0x174876e800', '0x174876e800'] }
              ]
            }
          }
        }
      }

      const gasPrice = metamaskController.getGasPrice()
      assert.strictEqual(gasPrice, '0x174876e800', 'accurately estimates 65th percentile accepted gas price')

      metamaskController.recentBlocksController = realRecentBlocksController
    })
  })

  describe('#getBalance', () => {
    it('should return the balance known by accountTracker', async () => {
      const accounts = {}
      const balance = '0x14ced5122ce0a000'
      accounts[TEST_ADDRESS] = { balance: balance }

      metamaskController.accountTracker.store.putState({ accounts: accounts })

      const gotten = await metamaskController.getBalance(TEST_ADDRESS)

      assert.strictEqual(balance, gotten)
    })
  })

  // Not implemented but referenced - ##fail
  describe('#getApi', function() {
    let getApi, state

    beforeEach(function() {
      getApi = metamaskController.getApi()
    })

    it('getState', function(done) {
      getApi.getState((err, res) => {
        if (err) {
          done(err)
        } else {
          state = res
        }
      })
      assert.deepStrictEqual(state, metamaskController.getState())
      done()
    })
  })

  // Not implemented but defined preferences controller - ##fail
  // describe('preferencesController', function() {
  //   it('defaults useBlockie to false', function() {
  //     assert.strictEqual(metamaskController.preferencesController.store.getState().useBlockie, false)
  //   })

  //   it('setUseBlockie to true', function() {
  //     metamaskController.setUseBlockie(true, noop)
  //     assert.strictEqual(metamaskController.preferencesController.store.getState().useBlockie, true)
  //   })
  // })

  // describe('#selectFirstIdentity', function() {
  //   let identities, address

  //   beforeEach(function() {
  //     address = '0x0dcd5d886577d5081b0c52e242ef29e70be3e7bc'
  //     identities = {
  //       '0x0dcd5d886577d5081b0c52e242ef29e70be3e7bc': {
  //         address: address,
  //         name: 'Account 1'
  //       },
  //       '0xc42edfcc21ed14dda456aa0756c153f7985d8813': {
  //         address: '0xc42edfcc21ed14dda456aa0756c153f7985d8813',
  //         name: 'Account 2'
  //       }
  //     }
  //     metamaskController.preferencesController.store.updateState({ identities })
  //     metamaskController.selectFirstIdentity()
  //   })

  // it('changes preferences controller select address', function() {
  //   const preferenceControllerState = metamaskController.preferencesController.store.getState()
  //   assert.strictEqual(preferenceControllerState.selectedAddress, address)
  // })

  // it('changes metamask controller selected address', function() {
  //   const metamaskState = metamaskController.getState()
  //   assert.strictEqual(metamaskState.selectedAddress, address)
  // })
  // })

  // describe('connectHardware', function() {
  //   it('should throw if it receives an unknown device name', async function() {
  //     try {
  //       // eslint-disable-next-line prettier/prettier
  //       await metamaskController.connectHardware('Some random device name', 0, 'm/44/0\'/0\'')
  //     } catch (e) {
  //       assert.strictEqual(e, 'Error: MetamaskController:getKeyringForDevice - Unknown device')
  //     }
  //   })

  //   it('should add the Trezor Hardware keyring', async function() {
  //     sinon.spy(metamaskController.keyringController, 'addNewKeyring')
  //     await metamaskController.connectHardware('trezor', 0).catch(e => null)
  //     const keyrings = await metamaskController.keyringController.getKeyringsByType('Trezor Hardware')
  //     assert.strictEqual(metamaskController.keyringController.addNewKeyring.getCall(0).args, 'Trezor Hardware')
  //     assert.strictEqual(keyrings.length, 1)
  //   })

  //   it('should add the Ledger Hardware keyring', async function() {
  //     sinon.spy(metamaskController.keyringController, 'addNewKeyring')
  //     await metamaskController.connectHardware('ledger', 0).catch(e => null)
  //     const keyrings = await metamaskController.keyringController.getKeyringsByType('Ledger Hardware')
  //     assert.strictEqual(metamaskController.keyringController.addNewKeyring.getCall(0).args, 'Ledger Hardware')
  //     assert.strictEqual(keyrings.length, 1)
  //   })
  // })

  // describe('checkHardwareStatus', function() {
  //   it('should throw if it receives an unknown device name', async function() {
  //     try {
  //       // eslint-disable-next-line prettier/prettier
  //       await metamaskController.checkHardwareStatus('Some random device name', 'm/44/0\'/0\'')
  //     } catch (e) {
  //       assert.strictEqual(e, 'Error: MetamaskController:getKeyringForDevice - Unknown device')
  //     }
  //   })

  //   it('should be locked by default', async function() {
  //     await metamaskController.connectHardware('trezor', 0).catch(e => null)
  //     const status = await metamaskController.checkHardwareStatus('trezor')
  //     assert.strictEqual(status, false)
  //   })
  // })

  // describe('forgetDevice', function() {
  //   it('should throw if it receives an unknown device name', async function() {
  //     try {
  //       await metamaskController.forgetDevice('Some random device name')
  //     } catch (e) {
  //       assert.strictEqual(e, 'Error: MetamaskController:getKeyringForDevice - Unknown device')
  //     }
  //   })

  //   it('should wipe all the keyring info', async function() {
  //     await metamaskController.connectHardware('trezor', 0).catch(e => null)
  //     await metamaskController.forgetDevice('trezor')
  //     const keyrings = await metamaskController.keyringController.getKeyringsByType('Trezor Hardware')

  //     assert.deepStrictEqual(keyrings[0].accounts, [])
  //     assert.deepStrictEqual(keyrings[0].page, 0)
  //     assert.deepStrictEqual(keyrings[0].isUnlocked(), false)
  //   })
  // })

  // describe('unlockHardwareWalletAccount', function() {
  //   let accountToUnlock
  //   let windowOpenStub
  //   let addNewAccountStub
  //   let getAccountsStub
  //   beforeEach(async function() {
  //     accountToUnlock = 10
  //     windowOpenStub = sinon.stub(window, 'open')
  //     windowOpenStub.returns(noop)

  //     addNewAccountStub = sinon.stub(metamaskController.keyringController, 'addNewAccount')
  //     addNewAccountStub.returns({})

  //     getAccountsStub = sinon.stub(metamaskController.keyringController, 'getAccounts')
  //     // Need to return different address to mock the behavior of
  //     // adding a new account from the keyring
  //     getAccountsStub.onCall(0).returns(Promise.resolve(['0x1']))
  //     getAccountsStub.onCall(1).returns(Promise.resolve(['0x2']))
  //     getAccountsStub.onCall(2).returns(Promise.resolve(['0x3']))
  //     getAccountsStub.onCall(3).returns(Promise.resolve(['0x4']))
  //     sinon.spy(metamaskController.preferencesController, 'setAddresses')
  //     sinon.spy(metamaskController.preferencesController, 'setSelectedAddress')
  //     sinon.spy(metamaskController.preferencesController, 'setAccountLabel')
  //     // eslint-disable-next-line prettier/prettier
  //     await metamaskController.connectHardware('trezor', 0, 'm/44/0\'/0\'').catch(e => null)
  //     // eslint-disable-next-line prettier/prettier
  //     await metamaskController.unlockHardwareWalletAccount(accountToUnlock, 'trezor', 'm/44/0\'/0\'')
  //   })

  //   afterEach(function() {
  //     window.open.restore()
  //     metamaskController.keyringController.addNewAccount.restore()
  //     metamaskController.keyringController.getAccounts.restore()
  //     metamaskController.preferencesController.setAddresses.restore()
  //     metamaskController.preferencesController.setSelectedAddress.restore()
  //     metamaskController.preferencesController.setAccountLabel.restore()
  //   })

  //   it('should set unlockedAccount in the keyring', async function() {
  //     const keyrings = await metamaskController.keyringController.getKeyringsByType('Trezor Hardware')
  //     assert.strictEqual(keyrings[0].unlockedAccount, accountToUnlock)
  //   })

  //   it('should call keyringController.addNewAccount', async function() {
  //     assert(metamaskController.keyringController.addNewAccount.calledOnce)
  //   })

  //   it('should call keyringController.getAccounts ', async function() {
  //     assert(metamaskController.keyringController.getAccounts.called)
  //   })

  //   it('should call preferencesController.setAddresses', async function() {
  //     assert(metamaskController.preferencesController.setAddresses.calledOnce)
  //   })

  //   it('should call preferencesController.setSelectedAddress', async function() {
  //     assert(metamaskController.preferencesController.setSelectedAddress.calledOnce)
  //   })

  //   it('should call preferencesController.setAccountLabel', async function() {
  //     assert(metamaskController.preferencesController.setAccountLabel.calledOnce)
  //   })
  // })

  // describe('#setCustomRpc', function() {
  //   let rpcTarget

  //   beforeEach(function() {
  //     rpcTarget = metamaskController.setCustomRpc(CUSTOM_RPC_URL)
  //   })

  //   it('returns custom RPC that when called', async function() {
  //     assert.strictEqual(await rpcTarget, CUSTOM_RPC_URL)
  //   })

  //   it('changes the network controller rpc', function() {
  //     const networkControllerState = metamaskController.networkController.store.getState()
  //     assert.strictEqual(networkControllerState.provider.rpcTarget, CUSTOM_RPC_URL)
  //   })
  // })

  describe('#setCurrentCurrency', function() {
    let defaultMetaMaskCurrency

    beforeEach(function() {
      defaultMetaMaskCurrency = metamaskController.currencyController.getCurrentCurrency()
    })

    it('defaults to usd', function() {
      assert.strictEqual(defaultMetaMaskCurrency, 'usd')
    })

    it('sets currency to JPY', function() {
      metamaskController.setCurrentCurrency('JPY', noop)
      assert.strictEqual(metamaskController.currencyController.getCurrentCurrency(), 'JPY')
    })
  })

  // describe('#createShapeshifttx', function() {
  //   let depositAddress, depositType, shapeShiftTxList

  //   beforeEach(function() {
  //     nock('https://shapeshift.io')
  //       .get('/txStat/3EevLFfB4H4XMWQwYCgjLie1qCAGpd2WBc')
  //       .reply(200, '{"status": "no_deposits", "address": "3EevLFfB4H4XMWQwYCgjLie1qCAGpd2WBc"}')

  //     depositAddress = '3EevLFfB4H4XMWQwYCgjLie1qCAGpd2WBc'
  //     depositType = 'ETH'
  //     shapeShiftTxList = metamaskController.shapeshiftController.store.getState().shapeShiftTxList
  //   })

  //   it('creates a shapeshift tx', async function() {
  //     metamaskController.createShapeShiftTx(depositAddress, depositType)
  //     assert.strictEqual(shapeShiftTxList[0].depositAddress, depositAddress)
  //   })
  // })

  describe('#addNewAccount', function() {
    let addNewAccount

    beforeEach(function() {
      addNewAccount = metamaskController.addAccount(testAccount.key, testAccount.address)
    })

    it('errors when an primary keyring is does not exist', async function() {
      await addNewAccount
      const state = metamaskController.accountTracker.store.getState()
      assert.deepStrictEqual(await metamaskController.keyringController.getAccounts(), [testAccount.address])
      assert.deepStrictEqual(await Object.keys(state.accounts), [testAccount.address])
    })
  })

  // describe('#verifyseedPhrase', function() {
  //   let seedPhrase, getConfigSeed

  //   it('errors when no keying is provided', async function() {
  //     try {
  //       await metamaskController.verifySeedPhrase()
  //     } catch (error) {
  //       assert.strictEqual(error.message, 'MetamaskController - No HD Key Tree found')
  //     }
  //   })

  //   beforeEach(async function() {
  //     await metamaskController.createNewVaultAndKeychain('password')
  //     seedPhrase = await metamaskController.verifySeedPhrase()
  //   })

  //   it('#placeSeedWords should match the initially created vault seed', function() {
  //     metamaskController.placeSeedWords((err, result) => {
  //       if (err) {
  //         log.error(err)
  //       } else {
  //         getConfigSeed = metamaskController.configManager.getSeedWords()
  //         assert.strictEqual(result, seedPhrase)
  //         assert.strictEqual(result, getConfigSeed)
  //       }
  //     })
  //     assert.strictEqual(getConfigSeed, undefined)
  //   })

  //   it('#addNewAccount', async function() {
  //     await metamaskController.addNewAccount()
  //     const getAccounts = await metamaskController.keyringController.getAccounts()
  //     assert.strictEqual(getAccounts.length, 2)
  //   })
  // })

  // describe('#resetAccount', function() {
  //   beforeEach(function() {
  //     const selectedAddressStub = sinon.stub(metamaskController.preferencesController, 'getSelectedAddress')
  //     const getNetworkstub = sinon.stub(metamaskController.txController.txStateManager, 'getNetwork')

  //     selectedAddressStub.returns('0x0dcd5d886577d5081b0c52e242ef29e70be3e7bc')
  //     getNetworkstub.returns(42)

  //     metamaskController.txController.txStateManager._saveTxList([
  //       createTxMeta({
  //         id: 1,
  //         status: 'unapproved',
  //         metamaskNetworkId: currentNetworkId,
  //         txParams: { from: '0x0dcd5d886577d5081b0c52e242ef29e70be3e7bc' }
  //       }),
  //       createTxMeta({
  //         id: 1,
  //         status: 'unapproved',
  //         metamaskNetworkId: currentNetworkId,
  //         txParams: { from: '0x0dcd5d886577d5081b0c52e242ef29e70be3e7bc' }
  //       }),
  //       createTxMeta({ id: 2, status: 'rejected', metamaskNetworkId: 32 }),
  //       createTxMeta({
  //         id: 3,
  //         status: 'submitted',
  //         metamaskNetworkId: currentNetworkId,
  //         txParams: { from: '0xB09d8505E1F4EF1CeA089D47094f5DD3464083d4' }
  //       })
  //     ])
  //   })

  //   it('wipes transactions from only the correct network id and with the selected address', async function() {
  //     await metamaskController.resetAccount()
  //     assert.strictEqual(metamaskController.txController.txStateManager.getTx(1), undefined)
  //   })
  // })

  // describe('#removeAccount', function() {
  //   let ret
  //   const addressToRemove = '0x1'

  //   beforeEach(async function() {
  //     sinon.stub(metamaskController.preferencesController, 'removeAddress')
  //     sinon.stub(metamaskController.accountTracker, 'removeAccount')
  //     sinon.stub(metamaskController.keyringController, 'removeAccount')

  //     ret = await metamaskController.removeAccount(addressToRemove)
  //   })

  //   afterEach(function() {
  //     metamaskController.keyringController.removeAccount.restore()
  //     metamaskController.accountTracker.removeAccount.restore()
  //     metamaskController.preferencesController.removeAddress.restore()
  //   })

  //   it('should call preferencesController.removeAddress', async function() {
  //     assert(metamaskController.preferencesController.removeAddress.calledWith(addressToRemove))
  //   })
  //   it('should call accountTracker.removeAccount', async function() {
  //     assert(metamaskController.accountTracker.removeAccount.calledWith([addressToRemove]))
  //   })
  //   it('should call keyringController.removeAccount', async function() {
  //     assert(metamaskController.keyringController.removeAccount.calledWith(addressToRemove))
  //   })
  //   it('should return address', async function() {
  //     assert.strictEqual(ret, '0x1')
  //   })
  // })

  // describe('#clearSeedWordCache', function() {
  //   it('should set seed words to null', function(done) {
  //     sandbox.stub(metamaskController.preferencesController, 'setSeedWords')
  //     metamaskController.clearSeedWordCache(err => {
  //       if (err) {
  //         done(err)
  //       }

  //       assert.ok(metamaskController.preferencesController.setSeedWords.calledOnce)
  //       assert.deepStrictEqual(metamaskController.preferencesController.setSeedWords.args, [[null]])
  //       done()
  //     })
  //   })
  // })

  // describe('#setCurrentLocale', function() {
  //   it('checks the default currentLocale', function() {
  //     const preferenceCurrentLocale = metamaskController.preferencesController.store.getState().currentLocale
  //     assert.strictEqual(preferenceCurrentLocale, undefined)
  //   })

  //   it('sets current locale in preferences controller', function() {
  //     metamaskController.setCurrentLocale('ja', noop)
  //     const preferenceCurrentLocale = metamaskController.preferencesController.store.getState().currentLocale
  //     assert.strictEqual(preferenceCurrentLocale, 'ja')
  //   })
  // })

  describe('#newUnsignedMessage', () => {
    let msgParams, metamaskMsgs, messages, msgId

    const address = '0xc42edfcc21ed14dda456aa0756c153f7985d8813'
    const data = '0x43727970746f6b697474696573'

    beforeEach(async () => {
      sandbox.stub(metamaskController, 'getBalance')
      metamaskController.getBalance.callsFake(() => {
        return Promise.resolve('0x0')
      })

      // await metamaskController.createNewVaultAndRestore('foobar1337', TEST_SEED_ALT)
      // await metamaskController.createNewVaultAndKeychain('password')
      // log.info(await metamaskController.keyringController.getAccounts())

      msgParams = {
        from: address,
        data: data
      }

      const promise = metamaskController.newUnsignedMessage(msgParams)
      // handle the promise so it doesn't throw an unhandledRejection
      promise.then(noop).catch(noop)

      metamaskMsgs = metamaskController.messageManager.getUnapprovedMsgs()
      messages = metamaskController.messageManager.messages
      msgId = Object.keys(metamaskMsgs)[0]
      messages[0].msgParams.metamaskId = parseInt(msgId)
    })

    it('persists address from msg params', function() {
      assert.strictEqual(metamaskMsgs[msgId].msgParams.from, address)
    })

    it('persists data from msg params', function() {
      assert.strictEqual(metamaskMsgs[msgId].msgParams.data, data)
    })

    it('sets the status to unapproved', function() {
      assert.strictEqual(metamaskMsgs[msgId].status, 'unapproved')
    })

    it('sets the type to eth_sign', function() {
      assert.strictEqual(metamaskMsgs[msgId].type, 'eth_sign')
    })

    it('rejects the message', function() {
      const msgIdInt = parseInt(msgId)
      metamaskController.cancelMessage(msgIdInt, noop)
      assert.strictEqual(messages[0].status, 'rejected')
    })

    // it('errors when signing a message', async function() {
    //   try {
    //     await metamaskController.signMessage(messages[0].msgParams)
    //   } catch (error) {
    //     assert.strictEqual(error.message, 'message length is invalid')
    //   }
    // })
  })

  describe('#newUnsignedPersonalMessage', function() {
    it('errors with no from in msgParams', async () => {
      const msgParams = {
        data: data
      }
      try {
        await metamaskController.newUnsignedPersonalMessage(msgParams)
        assert.fail('should have thrown')
      } catch (error) {
        assert.strictEqual(error.message, 'MetaMask Message Signature: from field is required.')
      }
    })

    let msgParams, metamaskPersonalMsgs, personalMessages, msgId

    const address = '0xc42edfcc21ed14dda456aa0756c153f7985d8813'
    const data = '0x43727970746f6b697474696573'

    beforeEach(async function() {
      sandbox.stub(metamaskController, 'getBalance')
      metamaskController.getBalance.callsFake(() => {
        return Promise.resolve('0x0')
      })

      // await metamaskController.createNewVaultAndRestore('foobar1337', TEST_SEED_ALT)

      msgParams = {
        from: address,
        data: data
      }

      const promise = metamaskController.newUnsignedPersonalMessage(msgParams)
      // handle the promise so it doesn't throw an unhandledRejection
      promise.then(noop).catch(noop)

      metamaskPersonalMsgs = metamaskController.personalMessageManager.getUnapprovedMsgs()
      personalMessages = metamaskController.personalMessageManager.messages
      msgId = Object.keys(metamaskPersonalMsgs)[0]
      personalMessages[0].msgParams.metamaskId = parseInt(msgId)
    })

    it('persists address from msg params', function() {
      assert.strictEqual(metamaskPersonalMsgs[msgId].msgParams.from, address)
    })

    it('persists data from msg params', function() {
      assert.strictEqual(metamaskPersonalMsgs[msgId].msgParams.data, data)
    })

    it('sets the status to unapproved', function() {
      assert.strictEqual(metamaskPersonalMsgs[msgId].status, 'unapproved')
    })

    it('sets the type to personal_sign', function() {
      assert.strictEqual(metamaskPersonalMsgs[msgId].type, 'personal_sign')
    })

    it('rejects the message', function() {
      const msgIdInt = parseInt(msgId)
      metamaskController.cancelPersonalMessage(msgIdInt, noop)
      assert.strictEqual(personalMessages[0].status, 'rejected')
    })

    // it('errors when signing a message', async function() {
    //   await metamaskController.signPersonalMessage(personalMessages[0].msgParams)
    //   assert.strictEqual(metamaskPersonalMsgs[msgId].status, 'signed') // Not signed cause no keyringcontroller
    //   log.info(metamaskPersonalMsgs[msgId].rawSig)
    //   assert.strictEqual(
    //     metamaskPersonalMsgs[msgId].rawSig,
    //     '0x6a1b65e2b8ed53cf398a769fad24738f9fbe29841fe6854e226953542c4b6a173473cb152b6b1ae5f06d601d45dd699a129b0a8ca84e78b423031db5baa734741b'
    //   )
    // })
  })

  // describe('#setupUntrustedCommunication', function() {
  //   let streamTest

  //   const phishingUrl = 'myethereumwalletntw.com'

  //   afterEach(function() {
  //     streamTest.end()
  //   })

  //   it('sets up phishing stream for untrusted communication ', async () => {
  //     // await metamaskController.blacklistController.updatePhishingList()
  //     // log.info(blacklistJSON.blacklist.includes(phishingUrl))

  //     const { promise, resolve } = deferredPromise()

  //     streamTest = createThoughStream((chunk, enc, cb) => {
  //       if (chunk.name !== 'phishing') return cb()
  //       assert.strictEqual(chunk.data.hostname, phishingUrl)
  //       resolve()
  //       cb()
  //     })
  //     metamaskController.setupUntrustedCommunication(streamTest, phishingUrl)

  //     await promise
  //   })
  // })

  // Internal error - this.getApi is not a function ##fail
  // describe('#setupTrustedCommunication', function() {
  //   let streamTest
  //   let inStream

  //   afterEach(function() {
  //     streamTest.end()
  //     inStream.end()
  //   })

  //   it('sets up controller dnode api for trusted communication', function(done) {
  //     streamTest = createThoughStream((chunk, enc, cb) => {
  //       assert.strictEqual(chunk.name, 'controller')
  //       cb()
  //       done()
  //     })

  //     inStream = createThoughStream((chunk, enc, cb) => {
  //       log.info('finished')
  //     })

  //     metamaskController.setupTrustedCommunication(inStream, streamTest, 'mycrypto.com')
  //   })
  // })

  // describe('#markAccountsFound', function() {
  //   it('adds lost accounts to config manager data', function() {
  //     metamaskController.markAccountsFound(noop)
  //     const state = metamaskController.getState()
  //     assert.deepStrictEqual(state.lostAccounts, [])
  //   })
  // })

  // describe('#markPasswordForgotten', function() {
  //   it('adds and sets forgottenPassword to config data to true', function() {
  //     metamaskController.markPasswordForgotten(noop)
  //     const state = metamaskController.getState()
  //     assert.strictEqual(state.forgottenPassword, true)
  //   })
  // })

  // describe('#unMarkPasswordForgotten', function() {
  //   it('adds and sets forgottenPassword to config data to false', function() {
  //     metamaskController.unMarkPasswordForgotten(noop)
  //     const state = metamaskController.getState()
  //     assert.strictEqual(state.forgottenPassword, false)
  //   })
  // })

  describe('#_onKeyringControllerUpdate', function() {
    it('should update selected address if keyrings are provided', async function() {
      // const addAddresses = sinon.fake()
      // const getSelectedAddress = sinon.fake.returns('0x42')
      // const setSelectedAddress = sinon.fake()
      const syncWithAddresses = sinon.fake()
      const addAccounts = sinon.fake()
      const deserialize = sinon.fake.resolves()
      const addAccount = sinon.fake()
      sandbox.replace(metamaskController, 'keyringController', {
        deserialize,
        addAccount
      })
      sandbox.replace(metamaskController, 'accountTracker', {
        syncWithAddresses,
        addAccounts
      })

      const oldState = metamaskController.getState()
      await metamaskController.initTorusKeyring([testAccount.key], [testAccount.address])

      // assert.deepStrictEqual(addAddresses.args, [[['0x1', '0x2']]])
      assert.deepStrictEqual(syncWithAddresses.args, [[[testAccount.address]]])
      // assert.deepStrictEqual(setSelectedAddress.args, [['0x1']])
      assert.deepStrictEqual(metamaskController.getState(), oldState)
    })
  })
})
