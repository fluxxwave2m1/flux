import { useCallback, useEffect, useRef, useState } from "react";
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  Background,
  Controls,
  Handle,
  MiniMap,
  Position,
  ReactFlow,
  reconnectEdge,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
  type NodeProps,
  type NodeTypes,
} from "@xyflow/react";
import { Bot, GitBranch, Mail, Zap } from "lucide-react";
import type { Workflow } from "@workspace/api-client-react";
import "@xyflow/react/dist/style.css";

type WorkflowNodeRecord = Workflow["nodes"][number];
type WorkflowEdgeRecord = Workflow["edges"][number];
type CanvasNodeData = { step: WorkflowNodeRecord };
type CanvasNode = Node<CanvasNodeData, "flowmindStep">;
type GraphSnapshot = { nodes: CanvasNode[]; edges: Edge[] };

type WorkflowCanvasProps = {
  workflow: Workflow;
  selectedNodeId: string | null;
  onSelectNode: (id: string) => void;
  onGraphPersist: (nodes: WorkflowNodeRecord[], edges: WorkflowEdgeRecord[]) => void;
};

function iconFor(type: WorkflowNodeRecord["type"], actionType?: string | null) {
  if (type === "trigger") return <Zap size={14} />;
  if (type === "condition") return <GitBranch size={14} />;
  if (type === "ai") return <Bot size={14} />;
  if (actionType === "send_email") return <Mail size={14} />;
  return <Zap size={14} />;
}

function FlowmindStep({ data, selected }: NodeProps<CanvasNode>) {
  const step = data.step;
  return (
    <div className={`flowmind-node flowmind-node-${step.type}${selected ? " is-selected" : ""}`}>
      {step.type !== "trigger" && <Handle type="target" position={Position.Top} />}
      <div className="flex items-center gap-3">
        <span className={`flowmind-node-icon flowmind-node-icon-${step.type}`}>
          {iconFor(step.type, step.actionType)}
        </span>
        <span className="min-w-0">
          <span className="block font-mono text-[8px] uppercase tracking-[.14em] text-slate-500">
            {step.type}{step.actionType ? ` / ${step.actionType}` : ""}
          </span>
          <span className="mt-1 block max-w-[190px] truncate text-[11px] font-bold text-slate-100">
            {step.label}
          </span>
        </span>
      </div>
      {step.type !== "trigger" && (
        <div className="mt-2 truncate border-t border-white/[.05] pt-2 text-[9px] text-slate-500">
          {step.type === "condition"
            ? `${String(step.config.field ?? "field")} ${String(step.config.operator ?? "equals")} ${String(step.config.value ?? "value")}`
            : step.type === "ai"
              ? String(step.config.task ?? "AI operation")
              : "Simulated action"}
        </div>
      )}
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}

const nodeTypes: NodeTypes = { flowmindStep: FlowmindStep };

function toCanvasNodes(items: WorkflowNodeRecord[]): CanvasNode[] {
  return items.map((step) => ({
    id: step.id,
    type: "flowmindStep",
    position: { ...step.position },
    data: { step },
    selected: false,
  }));
}

function toCanvasEdges(items: WorkflowEdgeRecord[]): Edge[] {
  return items.map((item) => ({
    id: item.id,
    source: item.source,
    target: item.target,
    label: item.label ?? undefined,
    type: "smoothstep",
    reconnectable: true,
    style: { stroke: "#657598", strokeWidth: 1.5 },
    labelStyle: { fill: "#cbd5e1", fontSize: 9, fontWeight: 700 },
    labelBgStyle: { fill: "#101624", fillOpacity: 0.95 },
  }));
}

function toWorkflowNodes(items: CanvasNode[]): WorkflowNodeRecord[] {
  return items.map(({ data, position }) => ({ ...data.step, position: { x: position.x, y: position.y } }));
}

function toWorkflowEdges(items: Edge[]): WorkflowEdgeRecord[] {
  return items
    .filter((item): item is Edge & { source: string; target: string } => !!item.source && !!item.target)
    .map((item) => ({
      id: item.id,
      source: item.source,
      target: item.target,
      label: typeof item.label === "string" ? item.label : null,
    }));
}

function snapshot(nodes: CanvasNode[], edges: Edge[]): GraphSnapshot {
  return {
    nodes: nodes.map((item) => ({
      ...item,
      position: { ...item.position },
      data: { step: { ...item.data.step, position: { ...item.data.step.position }, config: { ...item.data.step.config } } },
    })),
    edges: edges.map((item) => ({ ...item })),
  };
}

function graphKey(nodes: CanvasNode[], edges: Edge[]) {
  return JSON.stringify({ nodes: toWorkflowNodes(nodes), edges: toWorkflowEdges(edges) });
}

export function WorkflowCanvas({
  workflow,
  selectedNodeId,
  onSelectNode,
  onGraphPersist,
}: WorkflowCanvasProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<CanvasNode>(toCanvasNodes(workflow.nodes));
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(toCanvasEdges(workflow.edges));
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  const incomingKey = useRef(graphKey(toCanvasNodes(workflow.nodes), toCanvasEdges(workflow.edges)));
  const past = useRef<GraphSnapshot[]>([]);
  const future = useRef<GraphSnapshot[]>([]);
  const [historyState, setHistoryState] = useState({ canUndo: false, canRedo: false });

  nodesRef.current = nodes;
  edgesRef.current = edges;

  useEffect(() => {
    const nextNodes = toCanvasNodes(workflow.nodes);
    const nextEdges = toCanvasEdges(workflow.edges);
    const nextKey = graphKey(nextNodes, nextEdges);
    if (nextKey === incomingKey.current) return;
    incomingKey.current = nextKey;
    if (nextKey !== graphKey(nodesRef.current, edgesRef.current)) {
      setNodes(nextNodes);
      setEdges(nextEdges);
      past.current = [];
      future.current = [];
      setHistoryState({ canUndo: false, canRedo: false });
    }
  }, [workflow.nodes, workflow.edges, setEdges, setNodes]);

  const remember = useCallback(() => {
    past.current.push(snapshot(nodesRef.current, edgesRef.current));
    if (past.current.length > 40) past.current.shift();
    future.current = [];
    setHistoryState({ canUndo: true, canRedo: false });
  }, []);

  const persistGraph = useCallback((nextNodes: CanvasNode[], nextEdges: Edge[]) => {
    nodesRef.current = nextNodes;
    edgesRef.current = nextEdges;
    setNodes(nextNodes);
    setEdges(nextEdges);
    onGraphPersist(toWorkflowNodes(nextNodes), toWorkflowEdges(nextEdges));
  }, [onGraphPersist, setEdges, setNodes]);

  const undo = useCallback(() => {
    const previous = past.current.pop();
    if (!previous) return;
    future.current.push(snapshot(nodesRef.current, edgesRef.current));
    persistGraph(previous.nodes, previous.edges);
    setHistoryState({ canUndo: past.current.length > 0, canRedo: true });
  }, [persistGraph]);

  const redo = useCallback(() => {
    const next = future.current.pop();
    if (!next) return;
    past.current.push(snapshot(nodesRef.current, edgesRef.current));
    persistGraph(next.nodes, next.edges);
    setHistoryState({ canUndo: true, canRedo: future.current.length > 0 });
  }, [persistGraph]);

  const handleConnect = useCallback((connection: Connection) => {
    if (!connection.source || !connection.target || connection.source === connection.target) return;
    const target = nodesRef.current.find((item) => item.id === connection.target);
    if (target?.data.step.type === "trigger") return;
    remember();
    const next = addEdge({
      ...connection,
      id: `edge-${crypto.randomUUID()}`,
      type: "smoothstep",
      reconnectable: true,
      style: { stroke: "#657598", strokeWidth: 1.5 },
    }, edgesRef.current);
    edgesRef.current = next;
    setEdges(next);
    onGraphPersist(toWorkflowNodes(nodesRef.current), toWorkflowEdges(next));
  }, [onGraphPersist, remember, setEdges]);

  const handleReconnect = useCallback((oldEdge: Edge, connection: Connection) => {
    if (!connection.source || !connection.target || connection.source === connection.target) return;
    const target = nodesRef.current.find((item) => item.id === connection.target);
    if (target?.data.step.type === "trigger") return;
    remember();
    const next = reconnectEdge(oldEdge, connection, edgesRef.current);
    edgesRef.current = next;
    setEdges(next);
    onGraphPersist(toWorkflowNodes(nodesRef.current), toWorkflowEdges(next));
  }, [onGraphPersist, remember, setEdges]);

  const handleNodeChanges = useCallback((changes: NodeChange<CanvasNode>[]) => {
    setNodes((current) => applyNodeChanges(changes, current) as CanvasNode[]);
  }, [setNodes]);

  const handleEdgeChanges = useCallback((changes: EdgeChange<Edge>[]) => {
    setEdges((current) => applyEdgeChanges(changes, current));
  }, [setEdges]);

  const handleDragStart = useCallback(() => remember(), [remember]);
  const handleDragStop = useCallback(() => {
    onGraphPersist(toWorkflowNodes(nodesRef.current), toWorkflowEdges(edgesRef.current));
  }, [onGraphPersist]);

  const isValidConnection = useCallback((connection: Connection) => {
    if (!connection.source || !connection.target || connection.source === connection.target) return false;
    return nodesRef.current.find((item) => item.id === connection.target)?.data.step.type !== "trigger";
  }, []);

  return (
    <div className="relative h-[490px] min-w-0 w-full overflow-hidden rounded-b-xl bg-[#0b0f19]">
      <div className="absolute right-3 top-3 z-10 flex gap-1.5">
        <button type="button" onClick={undo} disabled={!historyState.canUndo} aria-label="Undo canvas change" className="rounded-md border border-[#30364b] bg-[#111624] px-2 py-1 text-[9px] text-slate-400 hover:text-white disabled:opacity-35">Undo</button>
        <button type="button" onClick={redo} disabled={!historyState.canRedo} aria-label="Redo canvas change" className="rounded-md border border-[#30364b] bg-[#111624] px-2 py-1 text-[9px] text-slate-400 hover:text-white disabled:opacity-35">Redo</button>
      </div>
      <ReactFlow
        nodes={nodes.map((item) => ({ ...item, selected: item.id === selectedNodeId }))}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={handleNodeChanges}
        onEdgesChange={handleEdgeChanges}
        onNodeClick={(_event, item) => onSelectNode(item.id)}
        onConnect={handleConnect}
        onReconnect={handleReconnect}
        onNodeDragStart={handleDragStart}
        onNodeDragStop={handleDragStop}
        isValidConnection={isValidConnection}
        deleteKeyCode={null}
        fitView
        fitViewOptions={{ padding: 0.25 }}
        minZoom={0.25}
        maxZoom={1.6}
      >
        <Background gap={22} size={1} color="#1e2638" />
        <MiniMap
          pannable
          zoomable
          nodeColor={(item) => {
            const step = (item.data as CanvasNodeData | undefined)?.step;
            return step?.type === "trigger" ? "#33b38a" : step?.type === "condition" ? "#e0ad52" : step?.type === "ai" ? "#9a79df" : "#4d8bff";
          }}
          maskColor="rgba(6,9,16,.72)"
          className="!border !border-[#30364b] !bg-[#101624]"
        />
        <Controls showInteractive={false} className="!overflow-hidden !rounded-lg !border !border-[#30364b] !bg-[#101624] [&>button]:!border-[#30364b] [&>button]:!bg-[#101624] [&>button]:!fill-slate-300" />
      </ReactFlow>
    </div>
  );
}
