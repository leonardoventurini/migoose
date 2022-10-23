export const asyncRun = foo => {
  foo().catch(console.error)
}
