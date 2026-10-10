export interface WorkflowPort { name: string; type: string | number | string[]; link?: number | null; links?: number[] | null; [key: string]: unknown }
export interface RawWorkflowNode {
  id: number | string; type: string; title?: string; pos: number[]; size: number[];
  flags: Record<string, unknown>; order: number; mode: number; properties: Record<string, unknown>;
  inputs?: WorkflowPort[]; outputs?: WorkflowPort[]; widgets_values?: unknown[] | Record<string, unknown>;
  [key: string]: unknown
}
export interface WorkflowData { label: string; classType: string; raw: RawWorkflowNode; status: 'idle' | 'running' | 'done' }
export interface WorkflowNode {
  id: string; type: 'milk'; position: { x: number; y: number }; data: WorkflowData; selected?: boolean
}
export interface WorkflowEdge {
  id: string; source: string; target: string; sourceHandle: string; targetHandle: string;
  type: string; data: { linkId: number; portType: string | number | string[] }; selected?: boolean
}
export interface WorkflowGraph { nodes: WorkflowNode[]; edges: WorkflowEdge[]; metadata: Record<string, unknown> }
export function importWorkflow(value: unknown): WorkflowGraph
export function exportWorkflow(graph: WorkflowGraph): Record<string, unknown> & { nodes: RawWorkflowNode[]; links: unknown[][] }
export function validateGraph(graph: Pick<WorkflowGraph, 'nodes' | 'edges'>): string[]
export function executionOrder(graph: Pick<WorkflowGraph, 'nodes' | 'edges'>): string[]
export function connectGraph(graph: WorkflowGraph, connection: { source: string | null; target: string | null; sourceHandle?: string | null; targetHandle?: string | null }): WorkflowEdge[]
export function createDefaultWorkflow(): WorkflowGraph
