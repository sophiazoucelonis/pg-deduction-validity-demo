/**
 * Data types for the Celonis Context Model graph visualization.
 *
 * The Context Model is the semantic layer showing objects, their relationships,
 * events, metrics, and taxonomies. This type system mirrors the real Celonis
 * Context Model API payload structure, simplified for demo rendering.
 */

// ---------- Core entities ----------

export interface CMField {
  name: string;
  dataType: "String" | "Double" | "Integer" | "Timestamp" | "Boolean" | "Date";
}

export interface CMObject {
  id: string;
  displayName: string;
  description?: string;
  /** Object classification — drives visual grouping & icon */
  kind?: "transaction" | "asset" | "resource" | "master-data";
  /** Number of fields/attributes (shown as badge) */
  fieldCount?: number;
  /** Event sources attached to this object (shown as sub-badges) */
  eventCount?: number;
  /** Field names (legacy simple list) */
  fields?: string[];
  /** Typed field definitions (for detail panel with data types) */
  typedFields?: CMField[];
  /** Sample rows for the Data Preview panel (keyed by field name) */
  previewData?: Record<string, unknown>[];
}

export interface CMRelationship {
  id: string;
  displayName?: string;
  source: string; // CMObject.id
  target: string; // CMObject.id
  cardinality: "ONE_TO_ONE" | "ONE_TO_MANY" | "MANY_TO_ONE" | "MANY_TO_MANY";
  /** Relationship type — drives edge style */
  type: "instance" | "type" | "event";
}

export interface CMEvent {
  id: string;
  displayName: string;
  description?: string;
  /** Individual event names in this source */
  events?: string[];
  /** Which objects this event fires on */
  objectIds: string[];
}

export interface CMMetric {
  id: string;
  displayName: string;
  description?: string;
  unit?: string;
  format?: string;
  /** Which objects/perspectives this metric is attached to */
  objectIds?: string[];
  /** Whether this is a function (conformance check, variant analysis, etc.) */
  isFunction?: boolean;
  /** PQL expression (for detail panel) */
  pql?: string;
}

export interface CMTaxonomyNode {
  id: string;
  displayName: string;
  parentId?: string;
  /** Object or event IDs that belong to this taxonomy node */
  members: { entityId: string; entityType: "OBJECT" | "EVENT" }[];
}

export interface CMProcess {
  id: string;
  displayName: string;
  description?: string;
  /** Objects involved in this process */
  objectIds: string[];
  /** Ordered event IDs for the BPMN milestone flow */
  eventIds?: string[];
}

export interface CMBpmnLane {
  id: string;
  label: string;
}

export type CMBpmnNodeType = "start" | "end" | "task" | "xor" | "parallel" | "messageEvent";

export interface CMBpmnNode {
  id: string;
  type: CMBpmnNodeType;
  label: string;
  /** Lane this node belongs to (must match a CMBpmnLane.id) */
  lane: string;
  /** Vertical row within the lane (0 = top row, 1 = second row, etc.) — defaults to 0 */
  row?: number;
}

export interface CMBpmnFlow {
  from: string;
  to: string;
  type: "sequence" | "message";
  label?: string;
}

export interface CMBpmnModel {
  id: string;
  displayName: string;
  description?: string;
  /** Must match a CMProcess.id */
  processId: string;
  /** Swimlane-driven rendering — if present, renders auto-layout BPMN diagram */
  lanes?: CMBpmnLane[];
  nodes?: CMBpmnNode[];
  flows?: CMBpmnFlow[];
}

export interface CMPerspective {
  id: string;
  displayName: string;
  description?: string;
  /** Objects visible in this perspective */
  objectIds: string[];
  /** Relationships visible in this perspective */
  relationshipIds: string[];
  /** Events visible in this perspective */
  eventIds: string[];
}

export interface CMInformationSystem {
  id: string;
  displayName: string;
  description?: string;
  /** e.g. "System Name", "System ID", "Vendor" */
  properties?: Record<string, string>;
  /** Object IDs this system manages */
  objectIds: string[];
}

export interface CMBusinessRule {
  id: string;
  displayName: string;
  description?: string;
  scope?: string;
  rule?: string;
  objectIds?: string[];
}

export interface CMRole {
  id: string;
  displayName: string;
  description?: string;
  properties?: {
    costRate?: string;
    numberOfFTE?: string;
    workingHoursPerWeek?: string;
  };
  bpmnIds?: string[];
}

// ---------- Component spec ----------

export interface ContextModelSpec {
  kind: "context-model";
  title?: string;
  objects: CMObject[];
  relationships: CMRelationship[];
  events?: CMEvent[];
  metrics?: CMMetric[];
  taxonomies?: CMTaxonomyNode[];
  processes?: CMProcess[];
  bpmnModels?: CMBpmnModel[];
  perspectives?: CMPerspective[];
  informationSystems?: CMInformationSystem[];
  businessRules?: CMBusinessRule[];
  roles?: CMRole[];
  /** Which perspective to render initially (filters visible nodes/edges) */
  activePerspective?: string;
  /** Layout hints — force-directed params or fixed positions */
  layout?: {
    /** Cluster objects by taxonomy node */
    clusterBy?: string;
    /** Fixed positions for specific objects (for repeatable layouts) */
    positions?: Record<string, { x: number; y: number }>;
  };
}
