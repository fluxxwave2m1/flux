import { createInsertSchema } from "drizzle-zod";
import { index, jsonb, pgTable, text, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { z } from "zod/v4";

export type WorkflowNodeRecord = {
  id: string;
  type: "trigger" | "condition" | "action" | "ai";
  label: string;
  actionType?: string | null;
  position: { x: number; y: number };
  config: Record<string, unknown>;
};

export type WorkflowEdgeRecord = {
  id: string;
  source: string;
  target: string;
  label?: string | null;
};

export type ExecutionNodeLogRecord = {
  nodeId: string;
  label: string;
  status: "success" | "skipped" | "failed";
  detail: string;
  durationMs: number;
};

export const flowmindWorkflowsTable = pgTable(
  "flowmind_workflows",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    status: text("status").notNull().default("draft"),
    triggerType: text("trigger_type").notNull(),
    nodes: jsonb("nodes").$type<WorkflowNodeRecord[]>().notNull().default([]),
    edges: jsonb("edges").$type<WorkflowEdgeRecord[]>().notNull().default([]),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => [index("flowmind_workflows_status_idx").on(table.status)],
);

export const insertFlowmindWorkflowSchema = createInsertSchema(flowmindWorkflowsTable).omit({
  createdAt: true,
  updatedAt: true,
});
export type InsertFlowmindWorkflow = z.infer<typeof insertFlowmindWorkflowSchema>;
export type FlowmindWorkflow = typeof flowmindWorkflowsTable.$inferSelect;

export const flowmindExecutionsTable = pgTable(
  "flowmind_executions",
  {
    id: text("id").primaryKey(),
    workflowId: text("workflow_id")
      .notNull()
      .references(() => flowmindWorkflowsTable.id, { onDelete: "cascade" }),
    workflowName: text("workflow_name").notNull(),
    status: text("status").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    durationMs: integer("duration_ms").notNull().default(0),
    nodesExecuted: integer("nodes_executed").notNull().default(0),
    totalNodes: integer("total_nodes").notNull().default(0),
    simulated: boolean("simulated").notNull().default(true),
    sampleData: jsonb("sample_data").$type<Record<string, unknown>>().notNull().default({}),
    nodeLogs: jsonb("node_logs").$type<ExecutionNodeLogRecord[]>().notNull().default([]),
  },
  (table) => [
    index("flowmind_executions_started_at_idx").on(table.startedAt),
    index("flowmind_executions_workflow_id_idx").on(table.workflowId),
  ],
);

export const insertFlowmindExecutionSchema = createInsertSchema(flowmindExecutionsTable).omit({
  startedAt: true,
});
export type InsertFlowmindExecution = z.infer<typeof insertFlowmindExecutionSchema>;
export type FlowmindExecution = typeof flowmindExecutionsTable.$inferSelect;
