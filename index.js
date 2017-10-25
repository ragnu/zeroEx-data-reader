const Interface = require('ethers-contracts').Interface
const utils = require('ethers-utils')

const state = {
  savedABIs: [],
  methodIds: {}
}

initialize()

function initialize() {
  const exchangeABI = require('./exchangeABI')
  exchangeABI.map(abi => {
    if (abi.name) {
      const signature = utils.id(abi.name + '(' + abi.inputs.map(input => input.type).join(',') + ')')
      if (abi.type === 'event') {
        state.methodIds[signature.slice(2)] = abi
      } else {
        state.methodIds[signature.slice(2, 10)] = abi
      }
    }
  })
  state.savedABIs = state.savedABIs.concat(exchangeABI)
}

function decodeInput(input) {
  const methodId = input.slice(2, 10)
  const abiItem = state.methodIds[methodId]
  if (abiItem) {
    const names = abiItem.inputs.map(item => item.name)
    const types = abiItem.inputs.map(item => item.type)
    return Interface.decodeParams(names, types, '0x' + input.slice(10))
  } else {
    return {}
  }
}

function decodeLogs(logs) {
  //
}

module.exports = {
  decodeInput,
  decodeLogs
}

function padZeroes(address) {
  const tempStr = address.substr(0, 2) === '0x' ? address.substr(2) : address
  return '0x' + tempStr.padStart(40, '0')
}
