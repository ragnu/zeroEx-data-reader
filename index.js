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
  return logs.map(logItem => {
    const methodId = logItem.topics[0].slice(2)
    const method = state.methodIds[methodId]
    if (method) {
      const logData = logItem.data
      const decodedParams = []
      let dataIndex = 0
      let topicsIndex = 1
      const dataTypes = method.inputs.map(input => {
        if (!input.indexed) return input.type
      })
      // const decodedData = SolidityCoder.decodeParams(dataTypes, logData.slice(2))
      const decodedData = Interface.decodeParams(dataTypes, '0x' + logData.slice(2))
      method.inputs.map(input => {
        const decodedInput = {
          name: input.name,
          type: input.type
        }
        if (input.indexed) {
          decodedInput.value = logItem.topics[topicsIndex]
          topicsIndex++
        } else {
          decodedInput.value = decodedData[dataIndex]
          dataIndex++
        }
        if (input.type === 'address') {
          // decodedInput.value = padZeroes(new Web3().toBigNumber(decodedInput.value).toString(16))
          decodedInput.value = padZeroes(utils.bigNumberify(decodedInput.value).toString(16))
        } else if (input.type === 'uint256' || input.type === 'uint8' || input.type === 'int') {
          // decodedInput.value = new Web3().toBigNumber(decodedInput.value).toString(10)
          decodedInput.value = utils.bigNumberify(decodedInput.value).toString(10)
        }
        decodedParams.push(decodedInput)
      })
      return {
        name: method.name,
        events: decodedParams,
        address: logItem.address
      }
    } else {
      return {}
    }
  })
}

module.exports = {
  decodeInput,
  decodeLogs
}

function padZeroes(address) {
  const tempStr = address.substr(0, 2) === '0x' ? address.substr(2) : address
  return '0x' + tempStr.padStart(40, '0')
}
