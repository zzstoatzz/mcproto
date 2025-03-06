export interface ToolParameters {
    type: "object";
    properties: Record<string, {
        type: string;
        description: string;
    }>;
    required: string[];
}

export interface Tool {
    name: string;
    description: string;
    parameters: ToolParameters;
    handler: (args: Record<string, any>) => Promise<any>;
}

export class FastMCP {
    private tools: Tool[] = [];
    constructor(public readonly name: string) {}

    addTool(tool: Tool) {
        this.tools.push(tool);
        return this;
    }

    async listTools(): Promise<Tool[]> {
        return this.tools;
    }

    async callTool(name: string, args: Record<string, any>): Promise<any> {
        const tool = this.tools.find(t => t.name === name);
        if (!tool) {
            throw new Error(`Tool ${name} not found`);
        }
        return tool.handler(args);
    }
} 