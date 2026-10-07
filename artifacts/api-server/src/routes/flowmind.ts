import { randomUUID } from "node:crypto";
import { desc, eq } from "drizzle-orm";
import { Router, type IRouter } from "express";
import {
  db,
  flowmindExecutionsTable,
  flowmindWorkflowsTable,
  type ExecutionNodeLogRecord,
  type WorkflowEdgeRecord,
  type WorkflowNodeRecord,
} from "@workspace/db";
import {
  CreateFlowmindWorkflowBody,
  CreateFlowmindWorkflowResponse,
  DeleteFlowmindWorkflowParams,
  GetFlowmindDashboardResponse,
  GetFlowmindExecutionParams,
  GetFlowmindExecutionResponse,
  GetFlowmindWorkflowParams,
  GetFlowmindWorkflowResponse,
  GenerateFlowmindWorkflowBody,
  GenerateFlowmindWorkflowResponse,
  ListFlowmindExecutionsResponse,
  ListFlowmindTemplatesResponse,
  ListFlowmindWorkflowsResponse,
  RunFlowmindWorkflowBody,
  RunFlowmindWorkflowParams,
  RunFlowmindWorkflowResponse,
  UpdateFlowmindWorkflowBody,
  UpdateFlowmindWorkflowParams,
  UpdateFlowmindWorkflowResponse,
  UseFlowmindTemplateParams,
  UseFlowmindTemplateResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

type WorkflowDraft = {
  name: string;
  description: string;
  status: string;
  triggerType: string;
  nodes: WorkflowNodeRecord[];
  edges: WorkflowEdgeRecord[];
};

type TemplateDefinition = {
  id: string;
  name: string;
  description: string;
  triggerType: string;
  category: string;
  prompt: string;
};

const templates: TemplateDefinition[] = [
  {
    id: "customer-onboarding",
    name: "Customer Onboarding",
    description: "Welcome each new customer and keep sales in the loop.",
    triggerType: "customer.created",
    category: "Sales",
    prompt: "When a new customer registers, send a personalized welcome email, create a CRM record, and notify the sales team.",
  },
  {
    id: "low-inventory",
    name: "Low Inventory Alert",
    description: "Catch stock shortages before they interrupt fulfillment.",
    triggerType: "inventory.updated",
    category: "Operations",
    prompt: "If inventory falls below 10 units, notify the manager and create a purchase request.",
  },
  {
    id: "support-escalation",
    name: "Support Escalation",
    description: "Use AI to identify urgent support requests and escalate them.",
    triggerType: "support.created",
    category: "Support",
    prompt: "When a support request arrives, use AI to determine whether it is urgent. If urgent, notify the manager and create a high priority ticket.",
  },
  {
    id: "lead-follow-up",
    name: "Lead Follow-up",
    description: "Create a lead record and notify the owner when a form arrives.",
    triggerType: "form.submitted",
    category: "Sales",
    prompt: "When a new sales lead submits a form, create a CRM record and notify the sales owner.",
  },
  {
    id: "leave-approval",
    name: "Employee Leave Approval",
    description: "Route a leave request to a manager and record the decision.",
    triggerType: "form.submitted",
    category: "People",
    prompt: "When an employee submits a leave request, create an approval task and notify their manager.",
  },
  {
    id: "assignment-reminder",
    name: "Assignment Reminder",
    description: "Send a reminder when an assignment deadline is approaching.",
    triggerType: "scheduled.time",
    category: "Education",
    prompt: "Before an assignment deadline, send the student a reminder notification.",
  },
  {
    id: "order-confirmation",
    name: "Order Confirmation",
    description: "Confirm new orders and create a fulfillment record.",
    triggerType: "order.created",
    category: "Operations",
    prompt: "When a new order is created, email the customer and create a fulfillment record.",
  },
  {
    id: "expense-approval",
    name: "Expense Approval",
    description: "Request approval for new expense submissions.",
    triggerType: "form.submitted",
    category: "Finance",
    prompt: "When an expense is submitted, create an approval task and notify the finance manager.",
  },
];

function node(
  id: string,
  type: WorkflowNodeRecord["type"],
  label: string,
  x: number,
  y: number,
  config: Record<string, unknown> = {},
  actionType: string | null = null,
): WorkflowNodeRecord {
  return { id, type, label, actionType, position: { x, y }, config };
}

function edge(
  source: string,
  target: string,
  label?: string,
): WorkflowEdgeRecord {
  return {
    id: `edge-${source}-${target}-${label ?? "next"}`,
    source,
    target,
    label: label ?? null,
  };
}

function buildWorkflow(prompt: string): WorkflowDraft {
  const normalized = prompt.toLowerCase();
  const inventoryMatch = normalized.match(/(?:below|under|less than|fewer than)\s+(\d+)/);
  const isInventory = /inventory|stock|units/.test(normalized);
  const isSupport = /support|urgent|urgency|ticket/.test(normalized);

  if (isInventory) {
    const threshold = Number(inventoryMatch?.[1] ?? 10);
    return {
      name: "Low Inventory Alert",
      description: prompt.trim(),
      status: "draft",
      triggerType: "inventory.updated",
      nodes: [
        node("trigger-1", "trigger", "Inventory Updated", 80, 170, { event: "inventory.updated" }),
        node("condition-1", "condition", `Inventory < ${threshold}?`, 350, 170, {
          field: "inventory.quantity",
          operator: "lessThan",
          value: threshold,
        }),
        node("action-1", "action", "Notify Manager", 640, 80, {
          channel: "notification",
          recipient: "Manager",
          message: "Inventory is below the configured threshold.",
        }, "notification"),
        node("action-2", "action", "Create Purchase Request", 930, 80, {
          recordType: "purchase_request",
          quantity: "{{inventory.quantity}}",
        }, "create_record"),
        node("action-3", "action", "No action needed", 640, 270, {
          event: "inventory.check_passed",
        }, "log_event"),
      ],
      edges: [
        edge("trigger-1", "condition-1"),
        edge("condition-1", "action-1", "YES"),
        edge("action-1", "action-2"),
        edge("condition-1", "action-3", "NO"),
      ],
    };
  }

  if (isSupport) {
    return {
      name: "Support Escalation",
      description: prompt.trim(),
      status: "draft",
      triggerType: "support.created",
      nodes: [
        node("trigger-1", "trigger", "New Support Message", 60, 180, { event: "support.created" }),
        node("ai-1", "ai", "Classify Urgency", 330, 180, {
          task: "Determine urgency",
          input: "{{support.message}}",
          possibleValues: ["Low", "Medium", "High"],
        }),
        node("condition-1", "condition", "Urgency is High?", 600, 180, {
          field: "classification.urgency",
          operator: "equals",
          value: "High",
        }),
        node("action-1", "action", "Notify Support Manager", 900, 80, {
          channel: "notification",
          recipient: "Support Manager",
        }, "notification"),
        node("action-2", "action", "Create High-priority Ticket", 1170, 80, {
          recordType: "support_ticket",
          priority: "high",
        }, "create_record"),
        node("action-3", "action", "Add to Normal Queue", 900, 290, {
          queue: "normal",
        }, "create_record"),
      ],
      edges: [
        edge("trigger-1", "ai-1"),
        edge("ai-1", "condition-1"),
        edge("condition-1", "action-1", "YES"),
        edge("action-1", "action-2"),
        edge("condition-1", "action-3", "NO"),
      ],
    };
  }

  const nodes: WorkflowNodeRecord[] = [
    node("trigger-1", "trigger", "New Customer Registered", 80, 170, { event: "customer.created" }),
  ];
  const edges: WorkflowEdgeRecord[] = [];
  let previous = "trigger-1";
  let nextX = 360;
  const addAction = (
    id: string,
    label: string,
    type: string,
    config: Record<string, unknown>,
  ) => {
    nodes.push(node(id, "action", label, nextX, 170, config, type));
    edges.push(edge(previous, id));
    previous = id;
    nextX += 280;
  };

  if (/email|welcome|mail/.test(normalized)) {
    addAction("action-email", "Send Welcome Email", "send_email", {
      to: "{{customer.email}}",
      subject: "Welcome, {{customer.name}}!",
      message: "We're glad you're here, {{customer.name}}.",
    });
  }
  if (/crm|record|customer/.test(normalized)) {
    addAction("action-record", "Create CRM Record", "create_record", {
      recordType: "customer",
      name: "{{customer.name}}",
      email: "{{customer.email}}",
    });
  }
  if (/notify|notification|sales|team|manager/.test(normalized)) {
    addAction("action-notify", "Notify Sales Team", "notification", {
      recipient: "Sales Team",
      message: "A new customer has registered.",
    });
  }
  if (nodes.length === 1) {
    addAction("action-log", "Log Event", "log_event", { event: "workflow.triggered" });
  }

  return {
    name: "Customer Onboarding",
    description: prompt.trim(),
    status: "draft",
    triggerType: "customer.created",
    nodes,
    edges,
  };
}

function serializeWorkflow(row: typeof flowmindWorkflowsTable.$inferSelect) {
  return { ...row, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() };
}

function serializeExecution(row: typeof flowmindExecutionsTable.$inferSelect) {
  return { ...row, startedAt: row.startedAt.toISOString() };
}

function validateWorkflow(draft: WorkflowDraft): string[] {
  const issues: string[] = [];
  const triggers = draft.nodes.filter((item) => item.type === "trigger");
  if (triggers.length !== 1) issues.push("Workflow must have exactly one starting trigger.");
  const ids = new Set(draft.nodes.map((item) => item.id));
  const reachable = new Set<string>();
  if (triggers[0]) {
    const pending = [triggers[0].id];
    while (pending.length) {
      const current = pending.pop()!;
      if (reachable.has(current)) continue;
      reachable.add(current);
      for (const link of draft.edges) {
        if (link.source === current) pending.push(link.target);
      }
    }
  }
  for (const link of draft.edges) {
    if (!ids.has(link.source) || !ids.has(link.target)) {
      issues.push(`Connection ${link.id} points to a missing node.`);
    }
  }
  for (const item of draft.nodes) {
    if (!reachable.has(item.id)) issues.push(`${item.label} is disconnected from the trigger.`);
    if (item.type === "condition" && (item.config.field == null || item.config.value == null)) {
      issues.push(`${item.label}: configure the field and comparison value.`);
    }
    if (item.type === "action" && item.actionType === "send_email" && !item.config.to) {
      issues.push(`${item.label}: recipient is missing.`);
    }
  }

  const visiting = new Set<string>();
  const visited = new Set<string>();
  const hasCycle = (id: string): boolean => {
    if (visiting.has(id)) return true;
    if (visited.has(id)) return false;
    visiting.add(id);
    for (const link of draft.edges.filter((item) => item.source === id)) {
      if (hasCycle(link.target)) return true;
    }
    visiting.delete(id);
    visited.add(id);
    return false;
  };
  if (triggers[0] && hasCycle(triggers[0].id)) issues.push("Workflow contains a loop.");
  return [...new Set(issues)];
}

function sampleValue(source: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>((value, key) => {
    if (!value || typeof value !== "object") return undefined;
    return (value as Record<string, unknown>)[key];
  }, source);
}

function evaluateCondition(config: Record<string, unknown>, input: Record<string, unknown>): boolean {
  const field = String(config.field ?? "");
  const actual = sampleValue(input, field);
  const expected = config.value;
  switch (config.operator) {
    case "lessThan": return Number(actual) < Number(expected);
    case "greaterThan": return Number(actual) > Number(expected);
    case "contains": return String(actual ?? "").toLowerCase().includes(String(expected ?? "").toLowerCase());
    default: return String(actual ?? "").toLowerCase() === String(expected ?? "").toLowerCase();
  }
}

function classifyUrgency(input: Record<string, unknown>): string {
  const message = String(sampleValue(input, "support.message") ?? input.message ?? "").toLowerCase();
  return /urgent|asap|critical|immediately|payment issue/.test(message) ? "High" : "Low";
}

async function saveWorkflow(draft: WorkflowDraft) {
  const now = new Date();
  const [saved] = await db.insert(flowmindWorkflowsTable).values({
    id: randomUUID(),
    ...draft,
    createdAt: now,
    updatedAt: now,
  }).returning();
  return saved;
}

function templateWorkflow(template: TemplateDefinition): WorkflowDraft {
  return buildWorkflow(template.prompt);
}

function demoDrafts(): WorkflowDraft[] {
  return [
    buildWorkflow(templates[0]!.prompt),
    buildWorkflow(templates[1]!.prompt),
    buildWorkflow(templates[2]!.prompt),
    buildWorkflow(templates[3]!.prompt),
  ].map((item, index) => ({
    ...item,
    status: index === 2 ? "paused" : "active",
  }));
}

let seedPromise: Promise<void> | undefined;
async function ensureDemoSeeded(): Promise<void> {
  if (!seedPromise) {
    seedPromise = (async () => {
      const existing = await db.select({ id: flowmindWorkflowsTable.id })
        .from(flowmindWorkflowsTable).limit(1);
      if (existing.length) return;

      const drafts = demoDrafts();
      const rows = await db.insert(flowmindWorkflowsTable).values(
        drafts.map((draft) => ({
          id: randomUUID(),
          ...draft,
        })),
      ).returning();
      const first = rows[0];
      const second = rows[1];
      if (!first || !second) return;
      const now = new Date();
      const demoLogs = (workflow: typeof first): ExecutionNodeLogRecord[] =>
        workflow.nodes.map((item, index) => ({
          nodeId: item.id,
          label: item.label,
          status: item.type === "action" || item.type === "trigger" || item.type === "ai" || item.type === "condition" ? "success" : "skipped",
          detail: item.type === "action" ? "Simulated only — no external service was called." : "Node processed in demo history.",
          durationMs: index === 0 ? 24 : 180,
        }));
      await db.insert(flowmindExecutionsTable).values([
        {
          id: `EX-${randomUUID().slice(0, 8).toUpperCase()}`,
          workflowId: first.id,
          workflowName: first.name,
          status: "success",
          startedAt: new Date(now.getTime() - 2 * 60_000),
          durationMs: 1200,
          nodesExecuted: first.nodes.length,
          totalNodes: first.nodes.length,
          simulated: true,
          sampleData: { customer: { name: "Sarah", email: "sarah@example.com" } },
          nodeLogs: demoLogs(first),
        },
        {
          id: `EX-${randomUUID().slice(0, 8).toUpperCase()}`,
          workflowId: second.id,
          workflowName: second.name,
          status: "success",
          startedAt: new Date(now.getTime() - 12 * 60_000),
          durationMs: 830,
          nodesExecuted: second.nodes.length,
          totalNodes: second.nodes.length,
          simulated: true,
          sampleData: { inventory: { quantity: 7 } },
          nodeLogs: demoLogs(second),
        },
      ]);
    })().catch((error) => {
      seedPromise = undefined;
      throw error;
    });
  }
  await seedPromise;
}

router.get("/flowmind/dashboard", async (req, res): Promise<void> => {
  try {
    await ensureDemoSeeded();
    const [workflows, executions] = await Promise.all([
      db.select().from(flowmindWorkflowsTable).orderBy(desc(flowmindWorkflowsTable.updatedAt)),
      db.select().from(flowmindExecutionsTable).orderBy(desc(flowmindExecutionsTable.startedAt)).limit(8),
    ]);
    const midnight = new Date();
    midnight.setHours(0, 0, 0, 0);
    const todaysRuns = executions.filter((run) => run.startedAt >= midnight);
    const successCount = executions.filter((run) => run.status === "success").length;
    const response = GetFlowmindDashboardResponse.parse({
      activeWorkflows: workflows.filter((item) => item.status === "active").length,
      executionsToday: todaysRuns.length,
      successRate: executions.length ? Math.round((successCount / executions.length) * 1000) / 10 : 100,
      failedRuns: executions.filter((run) => run.status === "failed").length,
      recentWorkflows: workflows.slice(0, 4).map(serializeWorkflow),
      recentExecutions: executions.slice(0, 5).map(serializeExecution),
    });
    res.json(response);
  } catch (error) {
    req.log.error({ err: error }, "FlowMind dashboard query failed");
    res.status(500).json({ error: "Dashboard data is temporarily unavailable." });
  }
});

router.get("/flowmind/workflows", async (req, res): Promise<void> => {
  try {
    await ensureDemoSeeded();
    const rows = await db.select().from(flowmindWorkflowsTable).orderBy(desc(flowmindWorkflowsTable.updatedAt));
    res.json(ListFlowmindWorkflowsResponse.parse(rows.map(serializeWorkflow)));
  } catch (error) {
    req.log.error({ err: error }, "FlowMind workflow list failed");
    res.status(500).json({ error: "Workflows are temporarily unavailable." });
  }
});

router.post("/flowmind/workflows", async (req, res): Promise<void> => {
  const parsed = CreateFlowmindWorkflowBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  try {
    const draft = parsed.data;
    const issues = draft.status === "active" ? validateWorkflow(draft) : [];
    if (issues.length) {
      res.status(422).json({ error: "Workflow cannot be activated.", issues });
      return;
    }
    const saved = await saveWorkflow(draft);
    res.status(201).json(CreateFlowmindWorkflowResponse.parse(serializeWorkflow(saved)));
  } catch (error) {
    req.log.error({ err: error }, "FlowMind workflow creation failed");
    res.status(500).json({ error: "The workflow could not be saved." });
  }
});

router.post("/flowmind/workflows/generate", async (req, res): Promise<void> => {
  const parsed = GenerateFlowmindWorkflowBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const prompt = parsed.data.prompt.trim();
  if (prompt.length < 10) {
    res.status(400).json({ error: "Describe the automation in a little more detail." });
    return;
  }
  try {
    const workflow = buildWorkflow(prompt);
    const explanation = `I understood this as a ${workflow.triggerType.replaceAll(".", " ")} trigger followed by ${workflow.nodes.filter((item) => item.type === "condition").length} condition(s) and ${workflow.nodes.filter((item) => item.type === "action").length} action(s). Review the generated nodes before saving.`;
    res.json(GenerateFlowmindWorkflowResponse.parse({
      workflow,
      explanation,
      mode: "demo",
    }));
  } catch (error) {
    req.log.error({ err: error }, "FlowMind generation failed");
    res.status(500).json({ error: "We couldn't build that workflow. Try describing the trigger and outcome." });
  }
});

router.get("/flowmind/workflows/:id", async (req, res): Promise<void> => {
  const params = GetFlowmindWorkflowParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  try {
    const [row] = await db.select().from(flowmindWorkflowsTable).where(eq(flowmindWorkflowsTable.id, params.data.id)).limit(1);
    if (!row) {
      res.status(404).json({ error: "Workflow not found." });
      return;
    }
    res.json(GetFlowmindWorkflowResponse.parse(serializeWorkflow(row)));
  } catch (error) {
    req.log.error({ err: error }, "FlowMind workflow lookup failed");
    res.status(500).json({ error: "The workflow is temporarily unavailable." });
  }
});

router.patch("/flowmind/workflows/:id", async (req, res): Promise<void> => {
  const params = UpdateFlowmindWorkflowParams.safeParse(req.params);
  const parsed = UpdateFlowmindWorkflowBody.safeParse(req.body);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  try {
    const [existing] = await db.select().from(flowmindWorkflowsTable)
      .where(eq(flowmindWorkflowsTable.id, params.data.id)).limit(1);
    if (!existing) {
      res.status(404).json({ error: "Workflow not found." });
      return;
    }
    const updated = { ...existing, ...parsed.data };
    if (updated.status === "active") {
      const issues = validateWorkflow(updated);
      if (issues.length) {
        res.status(422).json({ error: "Workflow cannot be activated.", issues });
        return;
      }
    }
    const [row] = await db.update(flowmindWorkflowsTable)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(flowmindWorkflowsTable.id, params.data.id))
      .returning();
    if (!row) {
      res.status(404).json({ error: "Workflow not found." });
      return;
    }
    res.json(UpdateFlowmindWorkflowResponse.parse(serializeWorkflow(row)));
  } catch (error) {
    req.log.error({ err: error }, "FlowMind workflow update failed");
    res.status(500).json({ error: "The workflow could not be updated." });
  }
});

router.delete("/flowmind/workflows/:id", async (req, res): Promise<void> => {
  const params = DeleteFlowmindWorkflowParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  try {
    const deleted = await db.delete(flowmindWorkflowsTable)
      .where(eq(flowmindWorkflowsTable.id, params.data.id)).returning({ id: flowmindWorkflowsTable.id });
    if (!deleted.length) {
      res.status(404).json({ error: "Workflow not found." });
      return;
    }
    res.sendStatus(204);
  } catch (error) {
    req.log.error({ err: error }, "FlowMind workflow deletion failed");
    res.status(500).json({ error: "The workflow could not be deleted." });
  }
});

router.post("/flowmind/workflows/:id/executions", async (req, res): Promise<void> => {
  const params = RunFlowmindWorkflowParams.safeParse(req.params);
  const parsed = RunFlowmindWorkflowBody.safeParse(req.body);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  try {
    const [workflow] = await db.select().from(flowmindWorkflowsTable)
      .where(eq(flowmindWorkflowsTable.id, params.data.id)).limit(1);
    if (!workflow) {
      res.status(404).json({ error: "Workflow not found." });
      return;
    }
    const issues = validateWorkflow(workflow);
    if (issues.length) {
      res.status(422).json({ error: "Workflow cannot be tested yet.", issues });
      return;
    }

    const input = parsed.data.sampleData as Record<string, unknown>;
    const nodeById = new Map(workflow.nodes.map((item) => [item.id, item]));
    const outgoing = new Map<string, WorkflowEdgeRecord[]>();
    for (const link of workflow.edges) {
      outgoing.set(link.source, [...(outgoing.get(link.source) ?? []), link]);
    }
    const trigger = workflow.nodes.find((item) => item.type === "trigger");
    const pending = trigger ? [trigger.id] : [];
    const visited = new Set<string>();
    const nodeLogs: ExecutionNodeLogRecord[] = [];
    const startedAt = new Date();
    let failed = false;
    while (pending.length && visited.size < workflow.nodes.length) {
      const currentId = pending.shift()!;
      if (visited.has(currentId)) continue;
      const current = nodeById.get(currentId);
      if (!current) continue;
      visited.add(currentId);
      let detail = "Node processed in simulated mode.";
      let shouldContinue = true;

      if (current.type === "condition") {
        const matches = evaluateCondition(current.config, input);
        detail = `Condition evaluated to ${matches ? "true" : "false"} using sample data.`;
        const links = outgoing.get(current.id) ?? [];
        const selected = links.filter((link) => {
          const label = String(link.label ?? "").toLowerCase();
          return label === (matches ? "yes" : "no") || label === (matches ? "true" : "false");
        });
        const next = selected.length ? selected : links;
        for (const link of next) pending.push(link.target);
        shouldContinue = false;
      } else if (current.type === "ai") {
        const urgency = classifyUrgency(input);
        input.classification = { ...(input.classification as object ?? {}), urgency };
        detail = `Demo classifier marked this message ${urgency.toLowerCase()}.`;
      } else if (current.type === "action") {
        detail = `Simulated only — ${current.label} was prepared; no external service was called.`;
      }

      nodeLogs.push({
        nodeId: current.id,
        label: current.label,
        status: "success",
        detail,
        durationMs: current.type === "trigger" ? 24 : 160,
      });
      if (shouldContinue) {
        for (const link of outgoing.get(current.id) ?? []) pending.push(link.target);
      }
    }

    for (const item of workflow.nodes) {
      if (!visited.has(item.id)) {
        nodeLogs.push({
          nodeId: item.id,
          label: item.label,
          status: "skipped",
          detail: "Branch was not selected for this sample input.",
          durationMs: 0,
        });
      }
    }
    const durationMs = Math.max(680, nodeLogs.reduce((sum, item) => sum + item.durationMs, 0));
    const execution = {
      id: `EX-${randomUUID().slice(0, 8).toUpperCase()}`,
      workflowId: workflow.id,
      workflowName: workflow.name,
      status: failed ? "failed" : "success",
      startedAt,
      durationMs,
      nodesExecuted: visited.size,
      totalNodes: workflow.nodes.length,
      simulated: true,
      sampleData: input,
      nodeLogs,
    } as const;
    const [saved] = await db.insert(flowmindExecutionsTable).values(execution).returning();
    res.status(201).json(RunFlowmindWorkflowResponse.parse(serializeExecution(saved!)));
  } catch (error) {
    req.log.error({ err: error }, "FlowMind workflow simulation failed");
    res.status(500).json({ error: "The workflow run could not be completed." });
  }
});

router.get("/flowmind/executions", async (req, res): Promise<void> => {
  try {
    await ensureDemoSeeded();
    const rows = await db.select().from(flowmindExecutionsTable)
      .orderBy(desc(flowmindExecutionsTable.startedAt)).limit(50);
    res.json(ListFlowmindExecutionsResponse.parse(rows.map(serializeExecution)));
  } catch (error) {
    req.log.error({ err: error }, "FlowMind execution list failed");
    res.status(500).json({ error: "Execution history is temporarily unavailable." });
  }
});

router.get("/flowmind/executions/:id", async (req, res): Promise<void> => {
  const params = GetFlowmindExecutionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  try {
    const [row] = await db.select().from(flowmindExecutionsTable)
      .where(eq(flowmindExecutionsTable.id, params.data.id)).limit(1);
    if (!row) {
      res.status(404).json({ error: "Execution not found." });
      return;
    }
    res.json(GetFlowmindExecutionResponse.parse(serializeExecution(row)));
  } catch (error) {
    req.log.error({ err: error }, "FlowMind execution lookup failed");
    res.status(500).json({ error: "Execution details are temporarily unavailable." });
  }
});

router.get("/flowmind/templates", async (_req, res): Promise<void> => {
  res.json(ListFlowmindTemplatesResponse.parse(templates.map(({ prompt, ...item }) => ({
    ...item,
    actionCount: buildWorkflow(prompt).nodes.filter((workflowNode) => workflowNode.type === "action").length,
  }))));
});

router.post("/flowmind/templates/:templateId/use", async (req, res): Promise<void> => {
  const params = UseFlowmindTemplateParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const template = templates.find((item) => item.id === params.data.templateId);
  if (!template) {
    res.status(404).json({ error: "Template not found." });
    return;
  }
  try {
    const workflow = await saveWorkflow(templateWorkflow(template));
    res.status(201).json(UseFlowmindTemplateResponse.parse(serializeWorkflow(workflow)));
  } catch (error) {
    req.log.error({ err: error }, "FlowMind template creation failed");
    res.status(500).json({ error: "The workflow could not be created from this template." });
  }
});

export default router;
