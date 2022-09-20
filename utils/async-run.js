const asyncRun = foo => {
  foo().catch(console.error)
}

module.exports = { asyncRun }
