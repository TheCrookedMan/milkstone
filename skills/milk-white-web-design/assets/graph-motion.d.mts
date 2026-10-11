export interface MotionTween { from: number; to: number; start: number; duration: number }
export interface DependencyPath { nodes: Map<string, number>; edges: Map<string, number> }
export interface ExecutionNode { id: string; start: number; end: number }
export interface ExecutionSignal extends ExecutionNode { source: string; target: string }
export interface ExecutionTimeline { nodes: ExecutionNode[]; edges: ExecutionSignal[]; duration: number; boundaries: number[] }
export function graphEdgeKey(from: string, to: string): string
export function dependencyPath(nodeIds: string[], edges: { from: string; to: string }[], target: string): DependencyPath
export function motionValue(tween: MotionTween, now: number): number
export function retargetMotion(tween: MotionTween, to: number, now: number, delay?: number, duration?: number): MotionTween
export function executionTimeline(nodeIds: string[], edges: { id: string; source: string; target: string }[], nodeDuration?: number, signalDuration?: number): ExecutionTimeline
export function executionSnapshot(plan: ExecutionTimeline, elapsed: number): { nodes: Map<string, 'idle' | 'running' | 'done'>; edges: Map<string, { state: 'idle' | 'running' | 'done'; progress: number }>; completed: number; done: boolean }
