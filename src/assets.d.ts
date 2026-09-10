declare module '*.png' {
  const url: string;
  export default url;
}

declare module '*.jpg' {
  const url: string;
  export default url;
}

declare module '*.jpeg' {
  const url: string;
  export default url;
}

declare module '*.woff2' {
  const url: string;
  export default url;
}

declare module '*?raw' {
  const content: string;
  export default content;
}
