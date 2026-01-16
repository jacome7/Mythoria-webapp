declare module '@modelcontextprotocol/sdk/server/mcp.js' {
  export class McpServer {
    constructor(...args: any[]);
    registerTool(...args: any[]): void;
    connect(...args: any[]): Promise<void>;
    close(...args: any[]): Promise<void>;
    server: any;
  }
}

declare module '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js' {
  export class WebStandardStreamableHTTPServerTransport {
    constructor(...args: any[]);
    start(...args: any[]): Promise<void> | void;
    close(...args: any[]): Promise<void> | void;
    handleRequest(...args: any[]): Promise<Response>;
  }
}
