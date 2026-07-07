declare module '*.wasm?url' {
  const url: string
  export default url
}

declare module '*.js?raw' {
  const content: string
  export default content
}
