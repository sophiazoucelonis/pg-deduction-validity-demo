/**
 * ContextModelGraph — SVG-based force-directed graph renderer for the Celonis
 * Context Model. Matches the real Celonis Context Model UI structure:
 * - Left sidebar (286px) with entity-type accordion sections
 * - Canvas area with force-directed graph (SVG approximation of the real WebGL)
 * - Right detail panel on node click (fields + data types, PQL, relationships)
 */

import { useRef, useEffect, useState, useCallback, useMemo } from "react";
import { Square, CircleGauge } from "lucide-react";
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceCollide,
  type SimulationNodeDatum,
  type SimulationLinkDatum,
} from "d3-force";
import { zoom, zoomIdentity, zoomTransform, type ZoomBehavior } from "d3-zoom";
import { select } from "d3-selection";
// Side-effect import: registers d3-transition's augmentation of the d3-selection
// `Selection` interface so `svg.transition()` type-checks. The runtime is already
// pulled in transitively by d3-zoom; this only brings in the types (tsconfig
// restricts `types` to vitest/globals, so @types/d3-transition isn't auto-included).
import "d3-transition";
import type { ContextModelSpec, CMRelationship, CMEvent } from "@/types/context-model";

// ---------- Layout types ----------

type NodeType = "object" | "event" | "metric" | "function" | "process" | "bpmn" | "perspective" | "information-system" | "business-rule" | "role";

interface GraphNode extends SimulationNodeDatum {
  id: string;
  displayName: string;
  nodeType: NodeType;
  fieldCount?: number;
  eventCount?: number;
  description?: string;
  fields?: string[];
  typedFields?: { name: string; dataType: string }[];
  /** Individual event names (Event Source nodes only) */
  events?: string[];
  objectIds?: string[];
  pql?: string;
  unit?: string;
  format?: string;
  /** Information System properties (System Name, System ID, Vendor, ...); also
   *  Role properties (costRate, numberOfFTE, workingHoursPerWeek) */
  properties?: Record<string, string>;
  /** True when this node is not directly connected to the active center — rendered as a faded peripheral puck. */
  isGhost?: boolean;
  /** Business Rule fields */
  scope?: string;
  rule?: string;
  /** Role: BPMN model ids this role participates in */
  bpmnIds?: string[];
}

interface GraphLink extends SimulationLinkDatum<GraphNode> {
  id: string;
  cardinality?: "ONE_TO_ONE" | "ONE_TO_MANY" | "MANY_TO_ONE" | "MANY_TO_MANY";
}

// ---------- Constants ----------

// NODE_SIZE = footprint diameter used by force-collision and as the icon width.
// Bumped from 13–22 → 44–72 because we now render isometric 3D PNG pucks instead
// of flat SVG shapes; the icons need real estate to read.
const NODE_SIZE: Record<NodeType, number> = {
  object: 56,
  event: 50,
  metric: 66,
  // function/process/bpmn shrunk below their bounding-box-equal value — their
  // artwork depicts a visually denser stacked-cylinder shape (vs. the other
  // types' single flat cube), which reads as bigger at an equal bounding box.
  // information-system similarly reads bigger than its box suggests. metric
  // reads smaller than its box suggests. All empirical compensation, not
  // derived ratios — tuned by eye, may need further adjustment.
  function: 43,
  process: 46,
  bpmn: 43,
  perspective: 50,
  "information-system": 45,
  "business-rule": 40,
  role: 40,
};
// Fixed reference size for the ground-shadow/selection ellipse — same for every
// node type, independent of NODE_SIZE (which varies per type for visual-density
// compensation above). Keeps every type's "footprint disc" equal in size.
const SHADOW_BASE_SIZE = 56;

const NODE_COLORS: Record<NodeType, string> = {
  object: "rgb(92, 170, 229)",
  event: "rgb(84, 176, 84)",
  metric: "rgb(147, 164, 244)",
  function: "rgb(218, 126, 208)",
  process: "rgb(19, 161, 14)",
  bpmn: "rgb(81, 178, 200)",
  perspective: "#8b5cf6",
  "information-system": "rgb(0, 43, 78)",
  "business-rule": "rgb(60, 81, 180)",
  role: "rgb(24, 164, 196)",
};

// Pre-rendered isometric 3D pucks (PNG, transparent) per node type. Anchored
// bottom-center so the puck's "footprint" sits at the simulation's (x, y) point.
// Aspect = height / width (from the trimmed transparent images).
const ICON_SRC: Record<NodeType, string> = {
  object: "/cm-icons/object.png",
  event: "/cm-icons/event.png",
  metric: "/cm-icons/kpi.png",
  function: "/cm-icons/functions.png",
  process: "/cm-icons/process.png",
  bpmn: "/cm-icons/bpmn.png",
  perspective: "/cm-icons/event.png",
  "information-system": "/cm-icons/information-system.png",
  "business-rule": "/cm-icons/business-rule-node.png",
  role: "/cm-icons/role-node.png",
};
// All icons normalized to a single aspect ratio (object.png's original 0.721)
// so NODE_SIZE alone controls relative on-screen scale, with no per-type aspect
// variance to compound against it.
const ICON_ASPECT: Record<NodeType, number> = {
  object: 0.721,
  event: 0.721,
  metric: 0.721,
  function: 0.721,
  process: 0.721,
  bpmn: 0.721,
  perspective: 0.721,
  "information-system": 0.721,
  "business-rule": 0.721,
  role: 0.721,
};
// Anchor offset from icon top to its visual footprint (where the puck "sits").
// Tighter than the old non-transparent icons (which had baked-in shadow padding).
const ICON_FOOT_OFFSET = 0.93;

// Rim-to-rim edge docking: fractional geometry of each puck's base (footprint)
// ellipse, derived from pixel analysis of the PNG's shadow boundary. cy is the
// fractional distance from image top to the ellipse center; rx/ry are fractional
// half-width/half-height relative to icon width. Used so edges terminate at the
// puck's visual rim instead of its center point.
const BASE_ELLIPSE_CY: Record<NodeType, number> = {
  object: 0.288, event: 0.292, metric: 0.287, function: 0.293,
  process: 0.299, bpmn: 0.291, perspective: 0.292, "information-system": 0.292,
  "business-rule": 0.292, role: 0.292,
};
const BASE_ELLIPSE_RX: Record<NodeType, number> = {
  object: 0.506, event: 0.505, metric: 0.508, function: 0.505,
  process: 0.501, bpmn: 0.505, perspective: 0.505, "information-system": 0.505,
  "business-rule": 0.505, role: 0.505,
};
const BASE_ELLIPSE_RY: Record<NodeType, number> = {
  object: 0.271, event: 0.277, metric: 0.270, function: 0.278,
  process: 0.286, bpmn: 0.276, perspective: 0.277, "information-system": 0.277,
  "business-rule": 0.277, role: 0.277,
};

// Absolute-space center + radii of a node's base (footprint) ellipse — used so
// edges dock at the puck's visual rim instead of its center point. node.y is
// the anchor/footprint point the image is drawn relative to
// (y = node.y - iconH * ICON_FOOT_OFFSET is the image's top edge).
function baseEllipse(node: { x?: number; y?: number }, nodeType: NodeType) {
  const iconH = NODE_SIZE[nodeType] * ICON_ASPECT[nodeType];
  return {
    cx: node.x ?? 0,
    cy: (node.y ?? 0) - iconH * BASE_ELLIPSE_CY[nodeType],
    rx: NODE_SIZE[nodeType] * BASE_ELLIPSE_RX[nodeType],
    ry: NODE_SIZE[nodeType] * BASE_ELLIPSE_RY[nodeType],
  };
}

// Pre-rendered SVG paths from the real Celonis CCM detail-panel hero icons.
// Each component takes a color so the icon picks up the type's hue.
function DetailIconProcess({ color }: { color: string }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path fill={color} d="M10.063 15.937a.5.5 0 0 0 .016-.69l-.334-.368a.5.5 0 0 0-.716-.025L7.57 16.247a.5.5 0 0 0-.008.715l.384.384a.5.5 0 0 0 .708 0zm2.066-8.584a.5.5 0 0 0 .009-.715l-.3-.3a.5.5 0 0 0-.69-.017L9.706 7.63a.5.5 0 0 0 0 .74l.349.317a.5.5 0 0 0 .68-.008z" />
      <path fill={color} d="M21.452 13.049a.776.776 0 0 0 0-1.098l-9.245-9.244a1 1 0 0 0-1.414 0L6.107 7.393a1 1 0 0 0 0 1.414L12.7 15.4l-4.4 4.5-4.652-4.652a.775.775 0 1 0-1.091 1.1l5.03 4.95a1 1 0 0 0 1.414-.01l5.103-5.18a1 1 0 0 0-.006-1.41L7.5 8.1l4-4 8.852 8.946a.776.776 0 0 0 1.1.003" />
    </svg>
  );
}

function DetailIconObject({ color }: { color: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path fill={color} d="M3 1.5L3 0L15 0V1.5L3 1.5ZM1.5 3L1.5 15C1.5 15.8284 2.17157 16.5 3 16.5L15 16.5C15.8284 16.5 16.5 15.8284 16.5 15L16.5 3C16.5 2.17157 15.8284 1.5 15 1.5V0C16.6569 2.57702e-07 18 1.34315 18 3L18 15C18 16.6569 16.6569 18 15 18L3 18C1.34315 18 0 16.6569 0 15L0 3C0 1.34315 1.34315 0 3 0L3 1.5C2.17157 1.5 1.5 2.17157 1.5 3Z" />
      <path fill={color} d="M9 4.75L4.75 4.75L4.75 9C4.75 9.41421 4.41421 9.75 4 9.75C3.58579 9.75 3.25 9.41421 3.25 9L3.25 4C3.25 3.58579 3.58579 3.25 4 3.25L9 3.25C9.41421 3.25 9.75 3.58579 9.75 4C9.75 4.41421 9.41421 4.75 9 4.75Z" />
    </svg>
  );
}

function DetailIconEvent({ color }: { color: string }) {
  return (
    <svg width="22" height="20" viewBox="0 0 20 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path fillRule="evenodd" clipRule="evenodd" fill={color} d="M3 0C3.41421 0 3.75 0.335786 3.75 0.75V4.84766C5.04354 5.18095 6 6.35239 6 7.75C6 9.14752 5.04342 10.318 3.75 10.6514V14.75C3.75 15.1642 3.41421 15.5 3 15.5C2.58579 15.5 2.25 15.1642 2.25 14.75V10.6514C0.956585 10.318 0 9.14752 0 7.75C0 6.35239 0.956465 5.18095 2.25 4.84766V0.75C2.25 0.335786 2.58579 0 3 0ZM3 6.25C2.17157 6.25 1.5 6.92157 1.5 7.75C1.5 8.57843 2.17157 9.25 3 9.25C3.82843 9.25 4.5 8.57843 4.5 7.75C4.5 6.92157 3.82843 6.25 3 6.25Z" />
      <path fillRule="evenodd" clipRule="evenodd" fill={color} d="M18 4.75C19.1046 4.75 20 5.64543 20 6.75V8.75C20 9.85457 19.1046 10.75 18 10.75H10C8.89543 10.75 8 9.85457 8 8.75V6.75C8 5.64543 8.89543 4.75 10 4.75H18ZM10 6.25C9.72386 6.25 9.5 6.47386 9.5 6.75V8.75C9.5 9.02614 9.72386 9.25 10 9.25H18C18.2761 9.25 18.5 9.02614 18.5 8.75V6.75C18.5 6.47386 18.2761 6.25 18 6.25H10Z" />
    </svg>
  );
}

function DetailIconKPI({ color }: { color: string }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path fill={color} d="M7.93413 16.0659C8.22703 16.3588 8.22703 16.8336 7.93413 17.1265C7.64124 17.4194 7.16637 17.4194 6.87347 17.1265C4.04217 14.2952 4.04217 9.70478 6.87347 6.87348C8.71833 5.02862 11.3099 4.38674 13.6723 4.94459C14.0755 5.03978 14.3251 5.44375 14.2299 5.84687C14.1347 6.25 13.7308 6.49963 13.3276 6.40444C11.45 5.96106 9.39622 6.47205 7.93413 7.93414C5.68862 10.1797 5.68862 13.8203 7.93413 16.0659ZM17.8879 9.1415C18.2789 9.00477 18.7067 9.21089 18.8435 9.60189C19.7333 12.1463 19.1624 15.0907 17.1265 17.1265C16.8336 17.4194 16.3588 17.4194 16.0659 17.1265C15.773 16.8336 15.773 16.3588 16.0659 16.0659C17.6791 14.4526 18.1344 12.1183 17.4276 10.097C17.2908 9.70604 17.4969 9.27824 17.8879 9.1415ZM15.8791 6.66732C16.1062 6.47297 16.439 6.46653 16.6734 6.65195C16.9078 6.83738 16.9781 7.16278 16.8412 7.42842L16.7119 7.67862C16.6295 7.83801 16.5113 8.06624 16.3681 8.34179C16.0818 8.89278 15.6954 9.63339 15.2955 10.3912C14.8959 11.1485 14.4815 11.9253 14.1395 12.5479C13.9686 12.8589 13.8142 13.1344 13.6879 13.3509C13.5703 13.5524 13.4548 13.7421 13.3688 13.8508C12.7263 14.6629 11.5471 14.8004 10.735 14.1579C9.92288 13.5154 9.78538 12.3362 10.4279 11.5241C10.5139 11.4154 10.672 11.2593 10.8409 11.0986C11.0226 10.9258 11.2552 10.7121 11.5185 10.4744C12.0457 9.9983 12.7063 9.41631 13.3514 8.85315C13.9969 8.28961 14.6288 7.74321 15.0991 7.33783C15.3343 7.1351 15.5292 6.96755 15.6654 6.85065L15.8791 6.66732ZM22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12ZM3.5 12C3.5 16.6944 7.30558 20.5 12 20.5C16.6944 20.5 20.5 16.6944 20.5 12C20.5 7.30558 16.6944 3.5 12 3.5C7.30558 3.5 3.5 7.30558 3.5 12Z" />
    </svg>
  );
}

// Function detail icon — invented in the same flat-filled style as the others.
// Italic ƒ (florin / function symbol) on a rounded square plate, both filled in
// the type's yellow. Reads as "this is a function/computation" without copying
// any specific real CCM glyph.
function DetailIconFunction({ color }: { color: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="3.2" fill={color} />
      <text
        x="12.6"
        y="18"
        textAnchor="middle"
        fontSize="17"
        fontStyle="italic"
        fontWeight="700"
        fontFamily="Georgia, 'Times New Roman', serif"
        fill="#FFFFFF"
      >
        ƒ
      </text>
    </svg>
  );
}

// BPMN Model detail icon — same connector/table-join glyph used for the
// sidebar/badge-grid flank icon, reused here at the header size.
function DetailIconBpmn({ color }: { color: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path fillRule="evenodd" clipRule="evenodd" d="M21.1025 7.00488C21.6067 7.05621 22 7.48232 22 8V16L21.9951 16.1025C21.9472 16.573 21.573 16.9472 21.1025 16.9951L21 17H3C2.48232 17 2.05621 16.6067 2.00488 16.1025L2 16V8C2 7.44772 2.44772 7 3 7H21L21.1025 7.00488ZM7.5 15.5H20.5V8.5H7.5V15.5ZM3.5 15.5H6V8.5H3.5V15.5Z" fill={color} />
    </svg>
  );
}

// Information System detail icon — connectivity/network glyph.
function DetailIconInformationSystem({ color }: { color: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path
        fill={color}
        d="M18.6512 1.00418C18.881 0.77446 18.881 0.40201 18.6512 0.17229C18.4215 -0.0574301 18.0491 -0.0574301 17.8193 0.17229L14.6802 3.31148C12.8175 1.85832 10.1205 1.9884 8.40714 3.70172L8.0542 4.05466C7.36966 4.7392 7.36965 5.84907 8.0542 6.53361L10.954 9.43344C11.2836 9.19853 11.636 8.99374 12.0075 8.82309L8.88609 5.70172C8.66099 5.47662 8.66099 5.11166 8.88609 4.88655L9.23903 4.53361C10.6337 3.13896 12.8948 3.13896 14.2895 4.53361C15.2943 5.53837 15.5751 6.99289 15.1322 8.24911C15.5356 8.27535 15.929 8.33858 16.309 8.43542C16.7446 6.99257 16.479 5.38324 15.512 4.14342L18.6512 1.00418ZM6.53404 8.05462L9.43344 10.954C9.19853 11.2836 8.99374 11.636 8.82309 12.0075L5.70215 8.88651C5.47704 8.66141 5.11208 8.66141 4.88698 8.88651L4.53404 9.23945C3.13939 10.6341 3.13939 12.8953 4.53404 14.2899C5.53869 15.2946 6.99301 15.5755 8.24915 15.1327C8.27542 15.5362 8.33868 15.9296 8.43555 16.3095C6.99259 16.7451 5.38317 16.4793 4.14337 15.5121L1.00418 18.6512C0.77446 18.881 0.40201 18.881 0.17229 18.6512C-0.0574301 18.4215 -0.0574301 18.0491 0.17229 17.8193L3.31153 14.6801C1.85877 12.8174 1.98898 10.1207 3.70215 8.40756L4.05509 8.05462C4.73963 7.37008 5.84949 7.37008 6.53404 8.05462ZM20 14.7059C20 17.6297 17.6297 20 14.7059 20C11.782 20 9.41177 17.6297 9.41177 14.7059C9.41177 11.782 11.782 9.41177 14.7059 9.41177C17.6297 9.41177 20 11.782 20 14.7059ZM17.4748 12.5252C17.245 12.2955 16.8726 12.2955 16.6429 12.5252L13.5294 15.6387L12.7689 14.8782C12.5392 14.6485 12.1667 14.6485 11.937 14.8782C11.7073 15.1079 11.7073 15.4803 11.937 15.7101L13.1135 16.8865C13.3432 17.1163 13.7156 17.1163 13.9454 16.8865L17.4748 13.3571C17.7045 13.1274 17.7045 12.755 17.4748 12.5252Z"
      />
    </svg>
  );
}

function DetailIconBusinessRule({ color = "currentColor", size = 24 }: { color?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M12.0004 2.00195C9.86006 2.00195 8.125 3.73701 8.125 5.87732C8.125 8.79606 9.33243 12.4289 9.93776 14.0759C10.2606 14.9542 11.097 15.4995 12.0025 15.4995C12.9057 15.4995 13.7409 14.957 14.0646 14.0809C14.6705 12.4412 15.8757 8.827 15.8757 5.87732C15.8757 3.73701 14.1407 2.00195 12.0004 2.00195ZM9.625 5.87732C9.625 4.56544 10.6885 3.50195 12.0004 3.50195C13.3122 3.50195 14.3757 4.56544 14.3757 5.87732C14.3757 8.53153 13.2639 11.9202 12.6576 13.561C12.5621 13.8194 12.3089 13.9995 12.0025 13.9995C11.6954 13.9995 11.4412 13.8184 11.3457 13.5585C10.7387 11.9069 9.625 8.50056 9.625 5.87732ZM12.0011 17.001C10.6198 17.001 9.5 18.1208 9.5 19.5021C9.5 20.8834 10.6198 22.0032 12.0011 22.0032C13.3825 22.0032 14.5022 20.8834 14.5022 19.5021C14.5022 18.1208 13.3825 17.001 12.0011 17.001ZM11 19.5021C11 18.9492 11.4482 18.501 12.0011 18.501C12.554 18.501 13.0022 18.9492 13.0022 19.5021C13.0022 20.055 12.554 20.5032 12.0011 20.5032C11.4482 20.5032 11 20.055 11 19.5021Z" fill={color} />
    </svg>
  );
}

function DetailIconRole({ color = "currentColor", size = 24 }: { color?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M17.7541 13.9992C18.9961 13.9992 20.0029 15.0061 20.0029 16.2481V16.8235C20.0029 17.7178 19.6833 18.5826 19.1018 19.262C17.5324 21.0955 15.1453 22.0004 11.9999 22.0004C8.85401 22.0004 6.468 21.0952 4.9017 19.2609C4.32194 18.582 4.00342 17.7185 4.00342 16.8258V16.2481C4.00342 15.0061 5.01027 13.9992 6.25229 13.9992H17.7541ZM17.7541 15.4992H6.25229C5.8387 15.4992 5.50342 15.8345 5.50342 16.2481V16.8258C5.50342 17.3614 5.69453 17.8795 6.04239 18.2869C7.29569 19.7546 9.26157 20.5004 11.9999 20.5004C14.7382 20.5004 16.7058 19.7545 17.9623 18.2866C18.3112 17.879 18.5029 17.3601 18.5029 16.8235V16.2481C18.5029 15.8345 18.1676 15.4992 17.7541 15.4992ZM11.9999 2.00391C14.7613 2.00391 16.9999 4.24248 16.9999 7.00391C16.9999 9.76533 14.7613 12.0039 11.9999 12.0039C9.23845 12.0039 6.99988 9.76533 6.99988 7.00391C6.99988 4.24248 9.23845 2.00391 11.9999 2.00391ZM11.9999 3.50391C10.0669 3.50391 8.49988 5.07091 8.49988 7.00391C8.49988 8.9369 10.0669 10.5039 11.9999 10.5039C13.9329 10.5039 15.4999 8.9369 15.4999 7.00391C15.4999 5.07091 13.9329 3.50391 11.9999 3.50391Z" fill={color} />
    </svg>
  );
}

function renderDetailIcon(type: NodeType, color: string) {
  switch (type) {
    case "process":     return <DetailIconProcess color={color} />;
    case "object":      return <DetailIconObject color={color} />;
    case "event":
    case "perspective": return <DetailIconEvent color={color} />;
    case "metric":      return <DetailIconKPI color={color} />;
    case "function":    return <DetailIconFunction color={color} />;
    case "bpmn":        return <DetailIconBpmn color={color} />;
    case "business-rule": return <DetailIconBusinessRule color={color} />;
    case "role":        return <DetailIconRole color={color} />;
    case "information-system": return <DetailIconInformationSystem color={color} />;
  }
}

// ---------- Detail-panel badge-grid ("Flank") icons ----------
// 20px corner icons used in the badge grid (Container 2) and reused, at 14px,
// as the shared entityTypeIcon dispatcher for relationship-table rows.

function IconFlankFunction({ size = 20, color = "#0A1F44" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M14.6894 3.87103C14.9958 2.04954 16.84 0.942746 18.5604 1.54779L19.0968 1.73646C19.4518 1.86131 19.8393 1.67046 19.9623 1.31019C20.0853 0.949927 19.8973 0.556666 19.5423 0.43182L19.0058 0.243154C16.4914 -0.641148 13.7961 0.976478 13.3483 3.63866L12.694 7.52767H8.84352C8.46782 7.52767 8.16326 7.83676 8.16326 8.21805C8.16326 8.59933 8.46782 8.90843 8.84352 8.90843H12.4617L11.752 13.1276C11.4108 15.1553 9.20164 16.2367 7.42561 15.2454L7.35733 15.2073C7.02813 15.0235 6.6145 15.1454 6.43344 15.4795C6.25238 15.8136 6.37247 16.2334 6.70167 16.4171L6.76995 16.4552C9.36569 17.9041 12.5945 16.3236 13.0931 13.3599L13.842 8.90843H17.4602C17.8359 8.90843 18.1404 8.59933 18.1404 8.21805C18.1404 7.83676 17.8359 7.52767 17.4602 7.52767H14.0742L14.6894 3.87103Z" fill={color} />
      <path d="M3.34908 4.74582L3.43135 4.74101C3.79313 4.74101 4.06612 5.01739 4.10687 5.37346L4.11161 5.45695V7.52812H6.1524C6.51418 7.52812 6.81236 7.77894 6.85311 8.13501L6.85786 8.2185C6.85786 8.58567 6.59027 8.86271 6.23942 8.90406L6.15714 8.90888H4.11636L4.11157 10.9544C4.11157 11.3216 3.86443 11.6242 3.51358 11.6656L3.4313 11.6704C3.06952 11.6704 2.79654 11.394 2.75579 11.0379L2.75104 10.9544L2.75584 8.90888H0.710203C0.34842 8.90888 0.0454968 8.65806 0.00474608 8.302L0 8.2185C0 7.85134 0.272334 7.5743 0.623185 7.53294L0.705456 7.52812H2.75109V5.45695C2.75109 5.08979 2.99823 4.78718 3.34908 4.74582L3.43135 4.74101L3.34908 4.74582Z" fill={color} />
    </svg>
  );
}

function IconFlankBpmn({ size = 20, color = "#0A1F44" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path fillRule="evenodd" clipRule="evenodd" d="M21.1025 7.00488C21.6067 7.05621 22 7.48232 22 8V16L21.9951 16.1025C21.9472 16.573 21.573 16.9472 21.1025 16.9951L21 17H3C2.48232 17 2.05621 16.6067 2.00488 16.1025L2 16V8C2 7.44772 2.44772 7 3 7H21L21.1025 7.00488ZM7.5 15.5H20.5V8.5H7.5V15.5ZM3.5 15.5H6V8.5H3.5V15.5Z" fill={color} />
    </svg>
  );
}

function IconFlankObject({ size = 20, color = "#0A1F44" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path fill={color} d="M3 1.5L3 0L15 0V1.5L3 1.5ZM1.5 3L1.5 15C1.5 15.8284 2.17157 16.5 3 16.5L15 16.5C15.8284 16.5 16.5 15.8284 16.5 15L16.5 3C16.5 2.17157 15.8284 1.5 15 1.5V0C16.6569 2.57702e-07 18 1.34315 18 3L18 15C18 16.6569 16.6569 18 15 18L3 18C1.34315 18 0 16.6569 0 15L0 3C0 1.34315 1.34315 0 3 0L3 1.5C2.17157 1.5 1.5 2.17157 1.5 3Z" />
      <path fill={color} d="M9 4.75L4.75 4.75L4.75 9C4.75 9.41421 4.41421 9.75 4 9.75C3.58579 9.75 3.25 9.41421 3.25 9L3.25 4C3.25 3.58579 3.58579 3.25 4 3.25L9 3.25C9.41421 3.25 9.75 3.58579 9.75 4C9.75 4.41421 9.41421 4.75 9 4.75Z" />
    </svg>
  );
}

function IconLocal({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path fill="#0A1F44" d="M8.5 5.5a1 1 0 1 0 0 2 1 1 0 0 0 0-2m-1 8a1 1 0 1 1 2 0 1 1 0 0 1-2 0m1-4.5a1 1 0 1 0 0 2 1 1 0 0 0 0-2M11 6.5a1 1 0 1 1 2 0 1 1 0 0 1-2 0m1 6a1 1 0 1 0 0 2 1 1 0 0 0 0-2m2.5 1a1 1 0 1 1 2 0 1 1 0 0 1-2 0M12 9a1 1 0 1 0 0 2 1 1 0 0 0 0-2M6.25 2A2.25 2.25 0 0 0 4 4.25v16.5c0 .414.336.75.75.75h14.503a.75.75 0 0 0 .75-.75v-9a2.25 2.25 0 0 0-2.25-2.25H16.5V4.25A2.25 2.25 0 0 0 14.25 2zM5.5 4.25a.75.75 0 0 1 .75-.75h8a.75.75 0 0 1 .75.75v6c0 .414.336.75.75.75h2.003a.75.75 0 0 1 .75.75V20H16.5v-2.75a.75.75 0 0 0-.75-.75h-7.5a.75.75 0 0 0-.75.75V20h-2zM15 18v2h-2.25v-2zm-3.75 0v2H9v-2z" />
    </svg>
  );
}

function IconFlankRelationship({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path fill="#0A1F44" d="m14.783 2.22 4.495 4.494a.75.75 0 0 1 .073.976l-.072.085-4.495 4.504a.75.75 0 0 1-1.135-.975l.073-.084 3.217-3.223H5.243A.75.75 0 0 1 4.5 7.35l-.007-.101a.75.75 0 0 1 .648-.743l.102-.007 11.698-.001-3.219-3.217a.75.75 0 0 1-.072-.976l.072-.084a.75.75 0 0 1 .977-.073zM19.5 16.65l.006.1a.75.75 0 0 1-.648.744l-.102.007L7.063 17.5l3.22 3.22a.75.75 0 0 1 .074.976l-.073.084a.75.75 0 0 1-.976.073l-.085-.072-4.5-4.497a.75.75 0 0 1-.073-.976l.073-.084 4.5-4.504a.75.75 0 0 1 1.134.976l-.073.084L7.066 16h11.692a.75.75 0 0 1 .743.65l.006.1z" />
    </svg>
  );
}

function IconBinding({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path fill="#0A1F44" d="M2.5 6v12c0 .69.315 1.293.774 1.78.455.482 1.079.883 1.793 1.203C6.496 21.623 8.417 22 10.5 22q.767 0 1.499-.066a4.8 4.8 0 0 1-1.623-1.434c-1.87-.015-3.527-.362-4.696-.886-.598-.268-1.036-.568-1.315-.864C4.09 18.46 4 18.207 4 18V8.392c.32.22.68.417 1.067.59C6.496 9.623 8.417 10 10.5 10s4.004-.377 5.433-1.018c.386-.173.746-.37 1.067-.59V13h.75q.383 0 .75.059V6c0-.69-.315-1.293-.774-1.78-.455-.482-1.079-.883-1.793-1.202C14.504 2.377 12.583 2 10.5 2s-4.004.377-5.433 1.018c-.714.32-1.338.72-1.793 1.202C2.815 4.707 2.5 5.31 2.5 6M4 6c0-.207.09-.46.365-.75.279-.296.717-.596 1.315-.864C6.875 3.851 8.58 3.5 10.5 3.5s3.625.35 4.82.886c.598.268 1.036.568 1.315.864.275.29.365.543.365.75s-.09.46-.365.75c-.279.296-.717.596-1.315.864-1.195.535-2.899.886-4.82.886s-3.625-.35-4.82-.886c-.598-.268-1.036-.568-1.315-.864C4.09 6.46 4 6.207 4 6m17.5 11.75A3.75 3.75 0 0 0 17.75 14l-.102.007a.75.75 0 0 0 .102 1.493l.154.005A2.25 2.25 0 0 1 17.75 20l-.003.005-.102.007a.75.75 0 0 0 .108 1.493V21.5l.2-.005A3.75 3.75 0 0 0 21.5 17.75m-6.5-3a.75.75 0 0 0-.75-.75l-.2.005a3.75 3.75 0 0 0 .2 7.495l.102-.007A.75.75 0 0 0 14.25 20l-.154-.005a2.25 2.25 0 0 1 .154-4.495l.102-.007A.75.75 0 0 0 15 14.75m3.5 3a.75.75 0 0 0-.75-.75h-3.5l-.102.007a.75.75 0 0 0 .102 1.493h3.5l.102-.007a.75.75 0 0 0 .648-.743" />
    </svg>
  );
}

// Dedicated 14px sidebar-only category icons — distinct glyphs from the
// IconFlankXxx badge-grid icons above. fill="currentColor" (no color prop) so
// they inherit tint from SidebarEntityRow's icon wrapper span.
function IconEvent({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path fill="currentColor" d="m13.738 17.752-1.028-1.029 1.064-1.064 1.029 1.028a1.004 1.004 0 0 0 1.42 0L20.2 12.71a1.004 1.004 0 0 0 0-1.42l-3.979-3.978a1.003 1.003 0 0 0-1.42 0L13.775 8.34 12.71 7.275l1.028-1.028c.98-.98 2.569-.98 3.549 0l3.978 3.978c.98.98.98 2.569 0 3.548l-3.978 3.979c-.98.98-2.569.98-3.549 0M6.713 6.247l-3.978 3.978c-.98.98-.98 2.569 0 3.548l3.978 3.979c.98.98 2.569.98 3.549 0l3.978-3.979c.98-.98.98-2.568 0-3.548l-3.978-3.978a2.51 2.51 0 0 0-3.549 0M3.8 11.29 7.778 7.31a1.004 1.004 0 0 1 1.42 0l3.978 3.979a1.004 1.004 0 0 1 0 1.419l-3.979 3.979a1.004 1.004 0 0 1-1.42 0L3.8 12.708a1.004 1.004 0 0 1 0-1.418"/>
    </svg>
  );
}

function IconFunction({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path fill="currentColor" d="M16.69 7.371c.306-1.821 2.15-2.928 3.87-2.323l.537.188a.68.68 0 0 0 .865-.426.693.693 0 0 0-.42-.878l-.536-.189c-2.515-.884-5.21.733-5.658 3.396l-.654 3.889h-3.85c-.376 0-.68.309-.68.69s.304.69.68.69h3.618l-.71 4.22c-.341 2.027-2.55 3.109-4.326 2.117l-.069-.038a.675.675 0 0 0-.924.273.696.696 0 0 0 .269.937l.068.038c2.596 1.45 5.825-.131 6.323-3.095l.749-4.452h3.618c.376 0 .68-.309.68-.69a.685.685 0 0 0-.68-.69h-3.386zM5.35 8.246l.081-.005c.362 0 .635.276.676.632l.005.084v2.071h2.04c.362 0 .66.25.701.607l.005.084a.683.683 0 0 1-.619.685l-.082.005h-2.04l-.005 2.045c0 .368-.248.67-.598.712l-.083.004c-.361 0-.634-.276-.675-.632l-.005-.084.005-2.045H2.71a.69.69 0 0 1-.705-.607L2 11.719c0-.368.272-.645.623-.686l.082-.005h2.046V8.957c0-.367.247-.67.598-.711l.082-.005z"/>
    </svg>
  );
}

function IconRelationship({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path fillRule="evenodd" d="M20 14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-8a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2zm-8 1.5a.5.5 0 0 0-.5.5v4a.5.5 0 0 0 .5.5h8a.5.5 0 0 0 .5-.5v-4a.5.5 0 0 0-.5-.5z" clipRule="evenodd"/>
      <path d="M17 4.25a.75.75 0 0 1 0 1.5h-1a.25.25 0 0 0-.25.25v1a.75.75 0 0 1-1.5 0V6c0-.966.784-1.75 1.75-1.75z"/>
      <path fillRule="evenodd" d="M19.154 2.004A3 3 0 0 1 22 5v4l-.004.154a3 3 0 0 1-2.842 2.842L19 12h-4a3 3 0 0 1-2.996-2.846L12 9V6.82A7.25 7.25 0 0 0 5.75 14v1.098A2.998 2.998 0 0 1 5 21a3 3 0 0 1-.75-5.902V14A8.75 8.75 0 0 1 12 5.308V5a3 3 0 0 1 3-3h4zM5 16.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3m10-13A1.5 1.5 0 0 0 13.5 5v4a1.5 1.5 0 0 0 1.5 1.5h4A1.5 1.5 0 0 0 20.5 9V5A1.5 1.5 0 0 0 19 3.5z" clipRule="evenodd"/>
    </svg>
  );
}

function IconBpmn({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path fill="currentColor" d="M5.248 2.996a2.25 2.25 0 0 0-2.25 2.25v2.507a2.25 2.25 0 0 0 2.25 2.25h.502v3.707a1 1 0 0 0-.134.116l-2.792 2.791a1.25 1.25 0 0 0 0 1.768l2.792 2.792a1.25 1.25 0 0 0 1.768 0l2.79-2.792q.064-.064.117-.134h3.714v.504a2.25 2.25 0 0 0 2.25 2.25h2.494a2.25 2.25 0 0 0 2.25-2.25V16.25a2.25 2.25 0 0 0-2.25-2.25h-2.494a2.25 2.25 0 0 0-2.25 2.25v.5H10.29a1 1 0 0 0-.116-.134l-2.79-2.79a1 1 0 0 0-.134-.117v-3.707h.505a2.25 2.25 0 0 0 2.25-2.25V5.246a2.25 2.25 0 0 0-2.25-2.25zm-.75 2.25a.75.75 0 0 1 .75-.75h2.507a.75.75 0 0 1 .75.75v2.507a.75.75 0 0 1-.75.75H5.248a.75.75 0 0 1-.75-.75zM4.06 17.501 6.5 15.063l2.437 2.438L6.5 19.94zm12.194-2h2.494a.75.75 0 0 1 .75.75v2.504a.75.75 0 0 1-.75.75h-2.494a.75.75 0 0 1-.75-.75V16.25a.75.75 0 0 1 .75-.75"/>
    </svg>
  );
}

// Corner slot for the badge grid: icon in a muted rounded-square chip + optional
// label below. Label omitted entirely (not just blank) when undefined — that's
// how BR stays icon-only for non-Object types.
function FlankSlot({ icon, label }: { icon: React.ReactNode; label?: string }) {
  return (
    <div style={{ width: 63, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", color: "oklch(0.185029 0.0904852 266.303 / 0.63)", backgroundColor: "#f1f5f9", borderRadius: 8, padding: 8 }}>
        {icon}
      </div>
      {label !== undefined && (
        <span style={{
          display: "block", textAlign: "center",
          fontFamily: "Inter, sans-serif", fontSize: "11px", fontWeight: 400, lineHeight: "14px",
          color: "oklch(0.185029 0.0904852 266.303 / 0.63)",
          WebkitFontSmoothing: "antialiased",
        }}>
          {label}
        </span>
      )}
    </div>
  );
}

// Real SVG icon per attribute data type (String/Timestamp/Integer/Double).
// Boolean/Date have no path — DataTypeCell falls through to text-only for those.
const DATA_TYPE_PATHS: Record<string, string> = {
  String: "M7 2a.75.75 0 0 1 .703.49l2.952 7.985.012.032.223.602-.828 2.086-.627-1.694H4.564L3.45 14.51a.75.75 0 1 1-1.407-.521l1.288-3.483.012-.033L6.296 2.49A.75.75 0 0 1 7 2m-1.882 8h3.763L7 4.914zm8.688-3.527a.75.75 0 0 1 1.394 0l5.555 14.031h.494a.75.75 0 1 1 0 1.5H18.75a.75.75 0 0 1 0-1.5h.392l-1.19-3.004h-6.91L9.85 20.504h.399a.75.75 0 1 1 0 1.5H7.75a.75.75 0 1 1 0-1.5h.486zM17.358 16l-2.856-7.215L11.638 16z",
  Timestamp: "M17.75 3A3.25 3.25 0 0 1 21 6.25v11.5A3.25 3.25 0 0 1 17.75 21H6.25A3.25 3.25 0 0 1 3 17.75V6.25A3.25 3.25 0 0 1 6.25 3zm1.75 5.5h-15v9.25c0 .966.784 1.75 1.75 1.75h11.5a1.75 1.75 0 0 0 1.75-1.75zm-11.75 6a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5m4.25 0a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5m-4.25-4a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5m4.25 0a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5m4.25 0a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5m1.5-6H6.25A1.75 1.75 0 0 0 4.5 6.25V7h15v-.75a1.75 1.75 0 0 0-1.75-1.75",
  Integer: "M10.987 2.89a.75.75 0 1 0-1.474-.28L8.494 7.999 3.75 8a.75.75 0 1 0 0 1.5l4.46-.002-.946 5-4.514.002a.75.75 0 0 0 0 1.5l4.23-.002-.967 5.116a.75.75 0 1 0 1.474.278l1.02-5.395 5.474-.002-.968 5.119a.75.75 0 1 0 1.474.278l1.021-5.398 4.742-.002a.75.75 0 1 0 0-1.5l-4.458.002.946-5 4.512-.002a.75.75 0 1 0 0-1.5l-4.229.002.966-5.104a.75.75 0 0 0-1.474-.28l-1.018 5.385-5.474.002zm-1.25 6.608 5.474-.003-.946 5-5.474.002z",
  Double: "M9.662 8.01a.5.5 0 0 1 .393.588l-.248 1.239 1.301.003a.5.5 0 0 1 .099.99l-.1.01-1.5-.004-.36 1.8 1.393.004a.5.5 0 0 1 .098.99l-.1.01-1.592-.004-.392 1.962a.5.5 0 0 1-.98-.196l.353-1.768-2.24-.005-.394 1.969a.5.5 0 0 1-.98-.196l.354-1.776-1.268-.002-.1-.01a.5.5 0 0 1 .102-.99l1.466.003.36-1.8-1.36-.003-.1-.01a.5.5 0 0 1 .103-.99l1.557.003.285-1.425a.5.5 0 1 1 .981.196l-.247 1.231 2.241.005.287-1.432a.5.5 0 0 1 .588-.392m-3.676 4.619 2.242.005.359-1.8-2.241-.005zM18.662 8.01a.5.5 0 0 1 .393.588l-.248 1.239 1.301.003a.5.5 0 0 1 .099.99l-.1.01-1.5-.004-.36 1.8 1.393.004a.5.5 0 0 1 .098.99l-.1.01-1.592-.004-.392 1.962a.5.5 0 0 1-.98-.196l.353-1.768-2.24-.005-.394 1.969a.5.5 0 0 1-.98-.196l.354-1.776-1.268-.002-.1-.01a.5.5 0 0 1 .102-.99l1.466.003.36-1.8-1.36-.003-.1-.01a.5.5 0 0 1 .103-.99l1.557.003.286-1.425a.5.5 0 1 1 .98.196l-.247 1.231 2.241.005.287-1.432a.5.5 0 0 1 .588-.392m-3.676 4.619 2.241.005.36-1.8-2.241-.005zM12.5 15a1 1 0 1 1-2 0 1 1 0 0 1 2 0",
};

function DataTypeCell({ type }: { type: string }) {
  const path = DATA_TYPE_PATHS[type];
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
      <span style={{ width: 14, flexShrink: 0, display: "inline-flex" }}>
        {path && (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path fill="#0A1F44" d={path} />
          </svg>
        )}
      </span>
      {type}
    </span>
  );
}

// Shared entity-type icon dispatcher — used for the badge grid's TL slot, the
// relationship table's EntityNameCell, and the sidebar's Information Systems row.
// One dispatcher, not separate icon paths per context.
function entityTypeIcon(type: string, size = 14): React.ReactNode {
  switch (type) {
    case "object":
    case "Object":
      return <IconFlankObject size={size} color="rgb(92, 170, 229)" />;
    case "event":
    case "Event Source":
      return (
        <svg width={size} height={size} viewBox="0 0 20 16" fill="none">
          <path fillRule="evenodd" clipRule="evenodd" fill="rgb(84, 176, 84)" d="M3 0C3.41421 0 3.75 0.335786 3.75 0.75V4.84766C5.04354 5.18095 6 6.35239 6 7.75C6 9.14752 5.04342 10.318 3.75 10.6514V14.75C3.75 15.1642 3.41421 15.5 3 15.5C2.58579 15.5 2.25 15.1642 2.25 14.75V10.6514C0.956585 10.318 0 9.14752 0 7.75C0 6.35239 0.956465 5.18095 2.25 4.84766V0.75C2.25 0.335786 2.58579 0 3 0ZM3 6.25C2.17157 6.25 1.5 6.92157 1.5 7.75C1.5 8.57843 2.17157 9.25 3 9.25C3.82843 9.25 4.5 8.57843 4.5 7.75C4.5 6.92157 3.82843 6.25 3 6.25Z" />
          <path fillRule="evenodd" clipRule="evenodd" fill="rgb(84, 176, 84)" d="M18 4.75C19.1046 4.75 20 5.64543 20 6.75V8.75C20 9.85457 19.1046 10.75 18 10.75H10C8.89543 10.75 8 9.85457 8 8.75V6.75C8 5.64543 8.89543 4.75 10 4.75H18ZM10 6.25C9.72386 6.25 9.5 6.47386 9.5 6.75V8.75C9.5 9.02614 9.72386 9.25 10 9.25H18C18.2761 9.25 18.5 9.02614 18.5 8.75V6.75C18.5 6.47386 18.2761 6.25 18 6.25H10Z" />
        </svg>
      );
    case "metric":
    case "Metric":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <path fill="rgb(147, 164, 244)" d="M7.93413 16.0659C8.22703 16.3588 8.22703 16.8336 7.93413 17.1265C7.64124 17.4194 7.16637 17.4194 6.87347 17.1265C4.04217 14.2952 4.04217 9.70478 6.87347 6.87348C8.71833 5.02862 11.3099 4.38674 13.6723 4.94459C14.0755 5.03978 14.3251 5.44375 14.2299 5.84687C14.1347 6.25 13.7308 6.49963 13.3276 6.40444C11.45 5.96106 9.39622 6.47205 7.93413 7.93414C5.68862 10.1797 5.68862 13.8203 7.93413 16.0659ZM17.8879 9.1415C18.2789 9.00477 18.7067 9.21089 18.8435 9.60189C19.7333 12.1463 19.1624 15.0907 17.1265 17.1265C16.8336 17.4194 16.3588 17.4194 16.0659 17.1265C15.773 16.8336 15.773 16.3588 16.0659 16.0659C17.6791 14.4526 18.1344 12.1183 17.4276 10.097C17.2908 9.70604 17.4969 9.27824 17.8879 9.1415ZM15.8791 6.66732C16.1062 6.47297 16.439 6.46653 16.6734 6.65195C16.9078 6.83738 16.9781 7.16278 16.8412 7.42842L16.7119 7.67862C16.6295 7.83801 16.5113 8.06624 16.3681 8.34179C16.0818 8.89278 15.6954 9.63339 15.2955 10.3912C14.8959 11.1485 14.4815 11.9253 14.1395 12.5479C13.9686 12.8589 13.8142 13.1344 13.6879 13.3509C13.5703 13.5524 13.4548 13.7421 13.3688 13.8508C12.7263 14.6629 11.5471 14.8004 10.735 14.1579C9.92288 13.5154 9.78538 12.3362 10.4279 11.5241C10.5139 11.4154 10.672 11.2593 10.8409 11.0986C11.0226 10.9258 11.2552 10.7121 11.5185 10.4744C12.0457 9.9983 12.7063 9.41631 13.3514 8.85315C13.9969 8.28961 14.6288 7.74321 15.0991 7.33783C15.3343 7.1351 15.5292 6.96755 15.6654 6.85065L15.8791 6.66732ZM22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12ZM3.5 12C3.5 16.6944 7.30558 20.5 12 20.5C16.6944 20.5 20.5 16.6944 20.5 12C20.5 7.30558 16.6944 3.5 12 3.5C7.30558 3.5 3.5 7.30558 3.5 12Z" />
        </svg>
      );
    case "process":
    case "Process":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <path fill="rgb(19, 161, 14)" d="M10.063 15.937a.5.5 0 0 0 .016-.69l-.334-.368a.5.5 0 0 0-.716-.025L7.57 16.247a.5.5 0 0 0-.008.715l.384.384a.5.5 0 0 0 .708 0zm2.066-8.584a.5.5 0 0 0 .009-.715l-.3-.3a.5.5 0 0 0-.69-.017L9.706 7.63a.5.5 0 0 0 0 .74l.349.317a.5.5 0 0 0 .68-.008z" />
          <path fill="rgb(19, 161, 14)" d="M21.452 13.049a.776.776 0 0 0 0-1.098l-9.245-9.244a1 1 0 0 0-1.414 0L6.107 7.393a1 1 0 0 0 0 1.414L12.7 15.4l-4.4 4.5-4.652-4.652a.775.775 0 1 0-1.091 1.1l5.03 4.95a1 1 0 0 0 1.414-.01l5.103-5.18a1 1 0 0 0-.006-1.41L7.5 8.1l4-4 8.852 8.946a.776.776 0 0 0 1.1.003" />
        </svg>
      );
    case "function":
    case "Function":
      return <IconFlankFunction size={size} color="rgb(218, 126, 208)" />;
    case "bpmn":
    case "BPMN Model":
    case "BPMN":
      return <IconFlankBpmn size={size} color="rgb(86, 191, 215)" />;
    case "Relationship":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <path fill="rgb(19, 161, 14)" d="m14.783 2.22 4.495 4.494a.75.75 0 0 1 .073.976l-.072.085-4.495 4.504a.75.75 0 0 1-1.135-.975l.073-.084 3.217-3.223H5.243A.75.75 0 0 1 4.5 7.35l-.007-.101a.75.75 0 0 1 .648-.743l.102-.007 11.698-.001-3.219-3.217a.75.75 0 0 1-.072-.976l.072-.084a.75.75 0 0 1 .977-.073zM19.5 16.65l.006.1a.75.75 0 0 1-.648.744l-.102.007L7.063 17.5l3.22 3.22a.75.75 0 0 1 .074.976l-.073.084a.75.75 0 0 1-.976.073l-.085-.072-4.5-4.497a.75.75 0 0 1-.073-.976l.073-.084 4.5-4.504a.75.75 0 0 1 1.134.976l-.073.084L7.066 16h11.692a.75.75 0 0 1 .743.65l.006.1z" />
        </svg>
      );
    case "information-system":
    case "Information System":
      return (
        <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
          <path d="M18.6512 1.00418C18.881 0.77446 18.881 0.40201 18.6512 0.17229C18.4215 -0.0574301 18.0491 -0.0574301 17.8193 0.17229L14.6802 3.31148C12.8175 1.85832 10.1205 1.9884 8.40714 3.70172L8.0542 4.05466C7.36966 4.7392 7.36965 5.84907 8.0542 6.53361L10.954 9.43344C11.2836 9.19853 11.636 8.99374 12.0075 8.82309L8.88609 5.70172C8.66099 5.47662 8.66099 5.11166 8.88609 4.88655L9.23903 4.53361C10.6337 3.13896 12.8948 3.13896 14.2895 4.53361C15.2943 5.53837 15.5751 6.99289 15.1322 8.24911C15.5356 8.27535 15.929 8.33858 16.309 8.43542C16.7446 6.99257 16.479 5.38324 15.512 4.14342L18.6512 1.00418ZM6.53404 8.05462L9.43344 10.954C9.19853 11.2836 8.99374 11.636 8.82309 12.0075L5.70215 8.88651C5.47704 8.66141 5.11208 8.66141 4.88698 8.88651L4.53404 9.23945C3.13939 10.6341 3.13939 12.8953 4.53404 14.2899C5.53869 15.2946 6.99301 15.5755 8.24915 15.1327C8.27542 15.5362 8.33868 15.9296 8.43555 16.3095C6.99259 16.7451 5.38317 16.4793 4.14337 15.5121L1.00418 18.6512C0.77446 18.881 0.40201 18.881 0.17229 18.6512C-0.0574301 18.4215 -0.0574301 18.0491 0.17229 17.8193L3.31153 14.6801C1.85877 12.8174 1.98898 10.1207 3.70215 8.40756L4.05509 8.05462C4.73963 7.37008 5.84949 7.37008 6.53404 8.05462ZM20 14.7059C20 17.6297 17.6297 20 14.7059 20C11.782 20 9.41177 17.6297 9.41177 14.7059C9.41177 11.782 11.782 9.41177 14.7059 9.41177C17.6297 9.41177 20 11.782 20 14.7059ZM17.4748 12.5252C17.245 12.2955 16.8726 12.2955 16.6429 12.5252L13.5294 15.6387L12.7689 14.8782C12.5392 14.6485 12.1667 14.6485 11.937 14.8782C11.7073 15.1079 11.7073 15.4803 11.937 15.7101L13.1135 16.8865C13.3432 17.1163 13.7156 17.1163 13.9454 16.8865L17.4748 13.3571C17.7045 13.1274 17.7045 12.755 17.4748 12.5252Z" fill="rgb(0, 43, 78)" />
        </svg>
      );
    case "business-rule":
    case "Business Rule":
      return <DetailIconBusinessRule color="rgb(60, 81, 180)" size={size} />;
    case "role":
    case "Role":
      return <DetailIconRole color="rgb(24, 164, 196)" size={size} />;
    default:
      return null;
  }
}

// Header badge (white icon) and TL flank slot (black icon) dispatchers — used
// ONLY for those two spots, never for relationship-table rows or sidebar rows
// (which keep using the colored entityTypeIcon dispatcher above). Ported
// verbatim per-type from the reference source, which never tints these two
// contexts with the type's brand color.
function detailHeaderIcon(type: NodeType) {
  switch (type) {
    case "object": return <IconFlankObject size={22} color="white" />;
    case "event":
    case "perspective": return renderDetailIcon("event", "white");
    case "metric": return renderDetailIcon("metric", "white");
    case "process": return renderDetailIcon("process", "white");
    case "function": return <IconFlankFunction size={22} color="white" />;
    case "bpmn": return <IconFlankBpmn size={22} color="white" />;
    case "information-system": return <DetailIconInformationSystem color="white" />;
    case "business-rule": return <DetailIconBusinessRule color="white" size={22} />;
    case "role": return <DetailIconRole color="white" size={22} />;
  }
}
function detailBadgeIcon(type: NodeType) {
  switch (type) {
    case "object": return <IconFlankObject size={20} />;
    case "event":
    case "perspective": return renderDetailIcon("event", "#0A1F44");
    case "metric": return renderDetailIcon("metric", "#0A1F44");
    case "process": return renderDetailIcon("process", "#0A1F44");
    case "function": return <IconFlankFunction size={20} />;
    case "bpmn": return <IconFlankBpmn size={20} />;
    case "information-system": return <DetailIconInformationSystem color="#0A1F44" />;
    case "business-rule": return <DetailIconBusinessRule color="#0A1F44" size={20} />;
    case "role": return <DetailIconRole color="#0A1F44" size={20} />;
  }
}

function EntityNameCell({ name, type }: { name: string; type: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
      {entityTypeIcon(type)}
      {name}
    </span>
  );
}

function formatCardinality(card: string, isSource: boolean): string {
  switch (card) {
    case "ONE_TO_ONE":   return "1:1";
    case "ONE_TO_MANY":  return isSource ? "1:N" : "N:1";
    case "MANY_TO_ONE":  return isSource ? "N:1" : "1:N";
    case "MANY_TO_MANY": return "N:M";
    default: return "—";
  }
}

function CardinalityCell({ value }: { value: string }) {
  if (value === "—") {
    return (
      <span aria-hidden="true" style={{
        fontFamily: "Inter, sans-serif", fontSize: "13px",
        color: "oklch(0.185029 0.0904852 266.303 / 0.63)",
      }}>–</span>
    );
  }
  const slotStyle: React.CSSProperties = {
    fontSize: "11px", color: "oklch(0.185029 0.0904852 266.303 / 0.63)",
    width: 10, textAlign: "center" as const, flexShrink: 0,
  };
  const leftSymbol  = value === "N:1" ? "←" : value === "1:N" ? "–" : null;
  const rightSymbol = value === "1:N" ? "→" : value === "N:1" ? "–" : null;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
      {leftSymbol  && <span aria-hidden="true" style={slotStyle}>{leftSymbol}</span>}
      <span style={{
        display: "inline-flex", alignItems: "center",
        borderRadius: 4, background: "#f1f5f9", border: "1px solid #e2e8f0",
        padding: "1px 6px",
        fontFamily: "Inter, sans-serif", fontSize: "11px", fontWeight: 500,
        lineHeight: "16px", color: "oklch(0.246918 0.0749452 260.778)",
        WebkitFontSmoothing: "antialiased", whiteSpace: "nowrap",
      }}>
        {value}
      </span>
      {rightSymbol && <span aria-hidden="true" style={slotStyle}>{rightSymbol}</span>}
    </span>
  );
}

// Table used for both attributes/properties tables AND the relationships table
// — one component, col-count-driven: col1Header only → single 100%-width column;
// +col2Header → 50/50 two-column; +col3Header → 13%/20%/67% three-column (used
// by relationship tables, first column center-aligned for the entity icon).
function NewSectionTable({
  title, col1Header, col2Header, col3Header, rows, titleIcon, hideHeaders,
}: {
  title: string;
  col1Header: string;
  col2Header?: string;
  col3Header?: string;
  rows: { col1: React.ReactNode; col2?: React.ReactNode; col3?: React.ReactNode }[];
  titleIcon?: React.ReactNode;
  hideHeaders?: boolean;
}) {
  if (rows.length === 0) return null;

  const headerStyle: React.CSSProperties = {
    display: "table-cell",
    boxSizing: "border-box",
    height: "23.9941px",
    minHeight: "24px",
    verticalAlign: "middle",
    textAlign: "left",
    fontFamily: "Inter, sans-serif",
    fontSize: "13px",
    fontWeight: 600,
    lineHeight: "16px",
    color: "oklch(0.246918 0.0749452 260.778)",
    WebkitFontSmoothing: "antialiased",
    position: "sticky",
    top: 0,
    zIndex: 10,
    boxShadow: "none",
    padding: "0 12px",
  };

  const cellStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    columnGap: "2px",
    rowGap: "2px",
    boxSizing: "border-box",
    fontFamily: "Inter, sans-serif",
    fontSize: "13px",
    fontWeight: 400,
    lineHeight: "16px",
    color: "oklch(0.246918 0.0749452 260.778)",
    WebkitFontSmoothing: "antialiased",
    overflowWrap: "anywhere",
    wordBreak: "break-word",
    padding: "0 12px",
  };

  return (
    <div>
      <div style={{
        boxSizing: "border-box",
        height: "23.9941px",
        minHeight: "24px",
        display: "flex",
        alignItems: "center",
        gap: 6,
        fontFamily: "Inter, sans-serif",
        fontSize: "13px",
        fontWeight: 600,
        lineHeight: "16px",
        color: "oklch(0.246918 0.0749452 260.778)",
        WebkitFontSmoothing: "antialiased",
        padding: "0 12px",
      }}>
        {titleIcon && <span style={{ display: "inline-flex", alignItems: "center", flexShrink: 0 }}>{titleIcon}</span>}
        {title}
      </div>
      <div style={{ margin: "0 12px", borderRadius: 8, border: "1px solid #e2e8f0", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
          {!hideHeaders && (
            <thead>
              <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                {col3Header ? (
                  <>
                    <th style={{ ...headerStyle, width: "13%", textAlign: "center" }}>{col1Header}</th>
                    <th style={{ ...headerStyle, width: "20%" }}>{col2Header}</th>
                    <th style={{ ...headerStyle, width: "67%" }}>{col3Header}</th>
                  </>
                ) : col2Header ? (
                  <>
                    <th style={{ ...headerStyle, width: "50%" }}>{col1Header}</th>
                    <th style={{ ...headerStyle, width: "50%" }}>{col2Header}</th>
                  </>
                ) : (
                  <th style={{ ...headerStyle, width: "100%" }}>{col1Header}</th>
                )}
              </tr>
            </thead>
          )}
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} style={{ borderTop: i === 0 ? "none" : "1px solid #e2e8f0" }}>
                {col3Header ? (
                  <>
                    <td style={{ width: "13%", padding: "4px 0", textAlign: "center", verticalAlign: "middle" }}>
                      <span style={{ ...cellStyle, justifyContent: "center", padding: "0 4px" }}>{row.col1}</span>
                    </td>
                    <td style={{ width: "20%", padding: "4px 0" }}><span style={cellStyle}>{row.col2}</span></td>
                    <td style={{ width: "67%", padding: "4px 0" }}><span style={cellStyle}>{row.col3}</span></td>
                  </>
                ) : col2Header ? (
                  <>
                    <td style={{ width: "50%", padding: "4px 0" }}><span style={cellStyle}>{row.col1}</span></td>
                    <td style={{ width: "50%", padding: "4px 0" }}><span style={cellStyle}>{row.col2}</span></td>
                  </>
                ) : (
                  <td style={{ width: "100%", padding: "4px 0" }}><span style={cellStyle}>{row.col1}</span></td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const EDGE_COLOR = "oklch(0.7441 0.1406 243.29)";
const EDGE_COLOR_DIM = "#cbd5e1";

// ---------- SVG shape helpers ----------

function hexagonPath(cx: number, cy: number, r: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 6;
    pts.push(`${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`);
  }
  return `M${pts.join("L")}Z`;
}

function octagonPath(cx: number, cy: number, r: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 8; i++) {
    const angle = (Math.PI / 4) * i - Math.PI / 8;
    pts.push(`${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`);
  }
  return `M${pts.join("L")}Z`;
}

// Color helpers used to derive top-light / bottom-dark gradient stops + offset-depth
// fills from the canonical NODE_COLORS palette. SVG-only "fake 3D" — no three.js.
function lerpHex(hex: string, target: [number, number, number], amt: number): string {
  const n = parseInt(hex.replace("#", ""), 16);
  const r = (n >> 16) & 0xff, g = (n >> 8) & 0xff, b = n & 0xff;
  const lr = Math.round(r + (target[0] - r) * amt);
  const lg = Math.round(g + (target[1] - g) * amt);
  const lb = Math.round(b + (target[2] - b) * amt);
  return `#${[lr, lg, lb].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}
function lighten(hex: string, amt: number): string { return lerpHex(hex, [255, 255, 255], amt); }
function darken(hex: string, amt: number): string { return lerpHex(hex, [0, 0, 0], amt); }

// ---------- Left sidebar (matches real Celonis package-sidebar) ----------

interface SidebarProps {
  spec: ContextModelSpec;
  onFilterType: (type: NodeType | null) => void;
  activeFilter: NodeType | null;
  onOpenBpmn: (processName: string) => void;
  onSelectByName: (name: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

function LeftSidebar({ spec, onFilterType, activeFilter, onOpenBpmn, onSelectByName, searchQuery, onSearchChange }: SidebarProps) {
  const counts = useMemo(() => {
    const metrics = spec.metrics ?? [];
    const functions = metrics.filter((m) => m.isFunction);
    const pureMetrics = metrics.filter((m) => !m.isFunction);
    return {
      perspective: (spec.perspectives ?? []).length,
      process: (spec.processes ?? []).length,
      object: spec.objects.length,
      event: (spec.events ?? []).length,
      metric: pureMetrics.length,
      function: functions.length,
      taxonomy: (spec.taxonomies ?? []).length,
      relationship: spec.relationships.length,
      informationSystem: (spec.informationSystems ?? []).length,
      businessRule: (spec.businessRules ?? []).length,
      role: (spec.roles ?? []).length,
    };
  }, [spec]);

  return (
    // Full-height right border on the outer wrapper — simpler than the
    // split structure that tried to hide the border alongside Context Model
    // (the rounded top-left corner of the asset viewer made the spacer's
    // border-r look like a stray line above the chrome).
    <div className="w-[260px] shrink-0 border-r border-[#e2e8f0] bg-[#fafafd] flex flex-col overflow-hidden">
      {/* Top nav links — relabeled to match the reference: "Browse Context
          Model" / "AI Builder" / "Explore Data". */}
      <div className="px-2 pt-2 pb-1 space-y-0.5 shrink-0 border-b border-[#e2e8f0]">
        <SidebarNavLink active label="Browse Context Model" icon="context-model" />
        <SidebarNavLink label="AI Builder" icon="agents" />
        <SidebarNavLink label="Explore Data" icon="data" />
      </div>

      {/* (Inner wrapper retained so the tree section keeps its overflow scroll.)
          No search input here — the reference's LeftSidebar has none in the tree
          section; searchQuery/onSearchChange still flow into SidebarEntityRow
          from whatever search UI sets that shared state. */}
      <div className="flex-1 flex flex-col overflow-hidden">

      {/* Tree: single flattened "Process Intelligence Graph" accordion — the
          reference collapsed its earlier "Consumption" / "Process Intelligence
          Graph" split into one group; matched here per explicit direction to
          port all reference UI implementations. */}
      <div className="flex-1 overflow-y-auto">
        <SidebarOuterSection title="Process Intelligence Graph" defaultOpen>
          <div className="px-1.5">
            {counts.perspective > 0 && (
              <SidebarEntityRow
                label="Perspective"
                count={counts.perspective}
                color="#94a3b8"
                items={(spec.perspectives ?? []).map((p) => p.displayName)}
                searchQuery={searchQuery}
              />
            )}
            <SidebarEntityRow
              label="Object Type"
              count={counts.object}
              color={NODE_COLORS.object}
              icon={<Square size={14} strokeWidth={2} />}
              items={spec.objects.map((o) => o.displayName)}
              onItemClick={onSelectByName}
              searchQuery={searchQuery}
            />
            <SidebarEntityRow
              label="Events Source"
              count={counts.event}
              color={NODE_COLORS.event}
              icon={<IconEvent size={14} />}
              items={(spec.events ?? []).map((e) => e.displayName)}
              onItemClick={onSelectByName}
              searchQuery={searchQuery}
            />
            <SidebarEntityRow
              label="Metric"
              count={counts.metric}
              color={NODE_COLORS.metric}
              icon={<CircleGauge size={14} strokeWidth={2} />}
              items={(spec.metrics ?? []).filter((m) => !m.isFunction).map((m) => m.displayName)}
              onItemClick={onSelectByName}
              searchQuery={searchQuery}
            />
            {counts.function > 0 && (
              <SidebarEntityRow
                label="PQL Function"
                count={counts.function}
                color={NODE_COLORS.function}
                icon={<IconFunction size={14} />}
                items={(spec.metrics ?? []).filter((m) => m.isFunction).map((m) => m.displayName.replace(/^\[FUNCTION\]\s*/i, ""))}
                onItemClick={onSelectByName}
                searchQuery={searchQuery}
              />
            )}
            {counts.taxonomy > 0 && (
              <SidebarEntityRow label="Taxonomy" count={counts.taxonomy} color="#64748b" searchQuery={searchQuery} />
            )}
            <SidebarEntityRow
              label="Relationship"
              count={counts.relationship}
              color="#64748b"
              icon={<IconRelationship size={14} />}
              searchQuery={searchQuery}
            />
            <SidebarEntityRow
              label="BPMN Model"
              count={counts.process}
              color={NODE_COLORS.process}
              icon={<IconBpmn size={14} />}
              items={(spec.processes ?? []).map((p) => p.displayName)}
              onItemClick={(name) => onOpenBpmn(name)}
              searchQuery={searchQuery}
            />
            {counts.informationSystem > 0 && (
              <SidebarEntityRow
                label="Information Systems"
                count={counts.informationSystem}
                color={NODE_COLORS["information-system"]}
                icon={entityTypeIcon("information-system", 14)}
                items={(spec.informationSystems ?? []).map((s) => s.displayName)}
                onItemClick={onSelectByName}
                searchQuery={searchQuery}
              />
            )}
            {counts.businessRule > 0 && (
              <SidebarEntityRow
                label="Business Rules"
                count={counts.businessRule}
                color={NODE_COLORS["business-rule"]}
                icon={<DetailIconBusinessRule size={14} />}
                items={(spec.businessRules ?? []).map((br) => br.displayName)}
                onItemClick={onSelectByName}
                searchQuery={searchQuery}
              />
            )}
            {counts.role > 0 && (
              <SidebarEntityRow
                label="Roles"
                count={counts.role}
                color={NODE_COLORS.role}
                icon={<DetailIconRole size={14} />}
                items={(spec.roles ?? []).map((r) => r.displayName)}
                onItemClick={onSelectByName}
                searchQuery={searchQuery}
              />
            )}
          </div>
        </SidebarOuterSection>
      </div>
      </div>
    </div>
  );
}

// Outer accordion section ("Process Intelligence Graph"). Header is bold
// uppercase, chevron flips when expanded. Adds a divider above so sections
// stack visually.
function SidebarOuterSection({ title, defaultOpen, children }: { title: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  return (
    <div className="border-t border-[#e2e8f0] first:border-t-0">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full px-3 py-2 text-left hover:bg-[#f1f0f5]"
      >
        <h4 className="text-[11px] font-semibold text-[#475569] uppercase tracking-wide">{title}</h4>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className={`text-[#94a3b8] transition-transform ${open ? "" : "rotate-180"}`}>
          <path d="M6 15l6-6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && <div className="pb-1">{children}</div>}
    </div>
  );
}

function SidebarNavLink({ active, label, icon }: { active?: boolean; label: string; icon: string }) {
  return (
    <div
      className={`flex items-center gap-2 px-3 py-1.5 rounded-md cursor-pointer text-[13px] ${
        active
          ? "bg-[#e9e7ff] text-[#0a1f44] font-medium"
          : "text-[#334155] hover:bg-[#f1f0f5]"
      }`}
    >
      {/* Real Celonis pig-explorer icons (filled SVG paths from the original HTML). */}
      {icon === "context-model" && (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path fill="currentColor" d="M12.973 11.027a1.946 1.946 0 1 1-3.892 0 1.946 1.946 0 0 1 3.892 0M20.757 18.81a1.946 1.946 0 1 1-3.892 0 1.946 1.946 0 0 1 3.892 0M12.487 18.324a.973.973 0 1 0-.973.973v1.46a2.432 2.432 0 1 1 0-4.865 2.432 2.432 0 0 1 0 4.865v-1.46a.973.973 0 0 0 .973-.973M19.297 11.514a.973.973 0 1 0-.973.973v1.459a2.432 2.432 0 1 1 0-4.865 2.432 2.432 0 0 1 0 4.865v-1.46a.973.973 0 0 0 .973-.973"/>
          <path fill="currentColor" d="M16.349 12.457a.73.73 0 0 1 1.032 1.032l-3.892 3.892a.73.73 0 1 1-1.032-1.032zM19.54 5.676c0-.672-.544-1.217-1.216-1.217H5.676c-.672 0-1.217.545-1.217 1.217v.243h15.082zm1.46.486c0 .672-.544 1.216-1.216 1.216H4.459v10.946c0 .672.545 1.217 1.217 1.217h.973a.73.73 0 0 1 0 1.459h-.973A2.676 2.676 0 0 1 3 18.324V5.676A2.676 2.676 0 0 1 5.676 3h12.648A2.676 2.676 0 0 1 21 5.676z"/>
        </svg>
      )}
      {icon === "agents" && (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path fill="currentColor" d="M17.753 14a2.25 2.25 0 0 1 2.25 2.25v.904A3.75 3.75 0 0 1 18.696 20c-1.565 1.344-3.806 2-6.696 2s-5.128-.656-6.69-2a3.75 3.75 0 0 1-1.306-2.843v-.908A2.25 2.25 0 0 1 6.254 14zm0 1.5h-11.5a.75.75 0 0 0-.75.75v.907c0 .655.287 1.278.784 1.706C7.545 19.945 9.441 20.5 12 20.5s4.458-.557 5.72-1.64a2.25 2.25 0 0 0 .783-1.707v-.905a.75.75 0 0 0-.75-.75M11.9 2.006 12 2a.75.75 0 0 1 .743.648l.007.102-.001.749h3.5a2.25 2.25 0 0 1 2.25 2.25v4.505a2.25 2.25 0 0 1-2.25 2.25h-8.5a2.25 2.25 0 0 1-2.25-2.25V5.75A2.25 2.25 0 0 1 7.75 3.5l3.5-.001V2.75a.75.75 0 0 1 .649-.743L12 2zM16.25 5h-8.5a.75.75 0 0 0-.75.75v4.504c0 .414.336.75.75.75h8.5a.75.75 0 0 0 .75-.75V5.75a.75.75 0 0 0-.75-.75m-6.5 1.5a1.25 1.25 0 1 1 0 2.498 1.25 1.25 0 0 1 0-2.498m4.492 0a1.25 1.25 0 1 1 0 2.498 1.25 1.25 0 0 1 0-2.498"/>
        </svg>
      )}
      {icon === "data" && (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path fill="currentColor" d="M8.75 13A2.25 2.25 0 0 1 11 15.25v3.5A2.25 2.25 0 0 1 8.75 21h-3.5A2.25 2.25 0 0 1 3 18.75v-3.5A2.25 2.25 0 0 1 5.25 13zm10 0A2.25 2.25 0 0 1 21 15.25v3.5A2.25 2.25 0 0 1 18.75 21h-3.5A2.25 2.25 0 0 1 13 18.75v-3.5A2.25 2.25 0 0 1 15.25 13zm-10 1.5h-3.5a.75.75 0 0 0-.75.75v3.5c0 .414.336.75.75.75h3.5a.75.75 0 0 0 .75-.75v-3.5a.75.75 0 0 0-.75-.75m10 0h-3.5a.75.75 0 0 0-.75.75v3.5c0 .414.336.75.75.75h3.5a.75.75 0 0 0 .75-.75v-3.5a.75.75 0 0 0-.75-.75M8.75 3A2.25 2.25 0 0 1 11 5.25v3.5A2.25 2.25 0 0 1 8.75 11h-3.5A2.25 2.25 0 0 1 3 8.75v-3.5A2.25 2.25 0 0 1 5.25 3zm10 0A2.25 2.25 0 0 1 21 5.25v3.5A2.25 2.25 0 0 1 18.75 11h-3.5A2.25 2.25 0 0 1 13 8.75v-3.5A2.25 2.25 0 0 1 15.25 3zm-10 1.5h-3.5a.75.75 0 0 0-.75.75v3.5c0 .414.336.75.75.75h3.5a.75.75 0 0 0 .75-.75v-3.5a.75.75 0 0 0-.75-.75m10 0h-3.5a.75.75 0 0 0-.75.75v3.5c0 .414.336.75.75.75h3.5a.75.75 0 0 0 .75-.75v-3.5a.75.75 0 0 0-.75-.75" />
        </svg>
      )}
      <span>{label}</span>
    </div>
  );
}

function SidebarEntityRow({ label, count, color, icon, active, onClick, items, onItemClick, searchQuery }: {
  label: string;
  count: number;
  color: string;
  icon?: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
  items?: string[];
  onItemClick?: (name: string) => void;
  searchQuery?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  if (count === 0) return null;
  const filteredItems = items?.filter((item) =>
    !searchQuery || item.toLowerCase().includes(searchQuery.toLowerCase())
  );
  return (
    <div>
      <button
        onClick={() => {
          if (items && items.length > 0) setExpanded(!expanded);
          onClick?.();
        }}
        className={`flex items-center justify-between w-full px-3 py-1.5 rounded-md text-left ${
          active ? "bg-[#eff6ff]" : "hover:bg-[#f1f5f9]"
        }`}
      >
        <div className="flex items-center gap-2">
          {icon ? (
            <span className={`shrink-0 ${active ? "text-[#2563eb]" : "text-[#334155]"}`}>{icon}</span>
          ) : (
            <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: color }} />
          )}
          <span className={`text-[12px] ${active ? "text-[#2563eb] font-medium" : "text-[#334155]"}`}>
            {label} ({count})
          </span>
        </div>
        <svg
          width="12" height="12" viewBox="0 0 24 24" fill="none"
          className={`text-[#94a3b8] transition-transform ${expanded ? "" : "-rotate-90"}`}
        >
          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      </button>
      {expanded && filteredItems && filteredItems.length > 0 && (
        <div className="relative ml-[19px] mt-0.5 mb-0.5">
          {/* Vertical line: starts at top, ends at the vertical center of the last row.
              Each row is py-1 + 11px text ≈ 22px tall; half = 11px from the bottom. */}
          <div className="absolute left-0 top-0 bottom-[11px] w-px bg-[#e5e7eb]" />
          {filteredItems.map((item) => (
            <div
              key={item}
              onClick={() => onItemClick?.(item)}
              className={`flex items-center pl-3 py-1 text-[11px] text-[#475569] hover:bg-[#f1f5f9] rounded-r ${onItemClick ? "cursor-pointer" : "cursor-default"}`}
            >
              {item}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------- Right detail panel (matches real Celonis detail slide-in) ----------

interface DetailPanelProps {
  node: GraphNode;
  spec: ContextModelSpec;
  relationships: CMRelationship[];
  objectNames: Map<string, string>;
  entityNameById: Map<string, string>;
  onClose: () => void;
  onSelectEntity: (id: string) => void;
  onDataPreview?: (node: GraphNode) => void;
  dataPreviewOpen?: boolean;
}

const descriptionStyle: React.CSSProperties = {
  display: "block",
  fontFamily: "Inter, sans-serif",
  fontSize: "13px",
  fontWeight: 400,
  lineHeight: "16px",
  color: "oklch(0.246918 0.0749452 260.778)",
  marginTop: 4,
  marginBottom: 0,
  overflowWrap: "anywhere",
  WebkitFontSmoothing: "antialiased",
};

// Snake_case "key" shown under the entity name in the header — pulled verbatim
// from the reference source, not a fresh invention.
function nameToKey(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

function DetailPanel({ node, spec, relationships, objectNames, entityNameById, onClose, onSelectEntity, onDataPreview, dataPreviewOpen }: DetailPanelProps) {
  const cleanName = node.displayName.replace(/^\[FUNCTION\]\s*/i, "");

  const nodeRelationships = useMemo(() => {
    if (node.nodeType !== "object") return [];
    return relationships.filter((r) => r.source === node.id || r.target === node.id);
  }, [node, relationships]);

  // Object — "Type to Type" rows (relationships to a DIFFERENT entity type).
  const objectTypeToTypeRows = useMemo(() => {
    if (node.nodeType !== "object") return [];
    const rows: { col1: React.ReactNode; col2: React.ReactNode; col3: React.ReactNode }[] = [];
    for (const m of spec.metrics ?? []) {
      if (m.isFunction) continue;
      if ((m.objectIds ?? []).includes(node.id)) {
        rows.push({
          col1: entityTypeIcon("object"),
          col2: <CardinalityCell value="N:1" />,
          col3: <EntityNameCell name={m.displayName} type="Metric" />,
        });
      }
    }
    for (const m of spec.metrics ?? []) {
      if (!m.isFunction) continue;
      if ((m.objectIds ?? []).includes(node.id)) {
        rows.push({
          col1: entityTypeIcon("object"),
          col2: <CardinalityCell value="N:1" />,
          col3: <EntityNameCell name={m.displayName.replace(/^\[FUNCTION\]\s*/i, "")} type="Function" />,
        });
      }
    }
    for (const br of spec.businessRules ?? []) {
      if ((br.objectIds ?? []).includes(node.id)) {
        rows.push({
          col1: entityTypeIcon("object"),
          col2: <CardinalityCell value="N:1" />,
          col3: <EntityNameCell name={br.displayName} type="Business Rule" />,
        });
      }
    }
    return rows;
  }, [node, spec]);

  // Object — "Instance to Instance" rows: instance-kind relationships only
  // (type-kind relationships aren't shown anywhere on Object), plus events.
  const objectInstanceToInstanceRows = useMemo(() => {
    if (node.nodeType !== "object") return [];
    const rows: { col1: React.ReactNode; col2: React.ReactNode; col3: React.ReactNode }[] = [];
    for (const rel of nodeRelationships.filter((r) => r.type === "instance")) {
      const isSource = rel.source === node.id;
      const otherId = isSource ? rel.target : rel.source;
      rows.push({
        col1: entityTypeIcon("object"),
        col2: <CardinalityCell value={formatCardinality(rel.cardinality, isSource)} />,
        col3: <EntityNameCell name={objectNames.get(otherId) ?? otherId} type="Object" />,
      });
    }
    for (const evt of spec.events ?? []) {
      if (evt.objectIds.includes(node.id)) {
        rows.push({
          col1: entityTypeIcon("object"),
          col2: <CardinalityCell value="N:1" />,
          col3: <EntityNameCell name={evt.displayName} type="Event Source" />,
        });
      }
    }
    return rows;
  }, [node, spec, nodeRelationships, objectNames]);

  // Event Source — "Type to Type" rows (Information Systems overlapping objectIds).
  const eventTypeToTypeRows = useMemo(() => {
    if (node.nodeType !== "event") return [];
    const evtObjIds = new Set(node.objectIds ?? []);
    const rows: { col1: React.ReactNode; col2: React.ReactNode; col3: React.ReactNode }[] = [];
    for (const is of spec.informationSystems ?? []) {
      if ((is.objectIds ?? []).some((oid) => evtObjIds.has(oid))) {
        rows.push({
          col1: entityTypeIcon("event"),
          col2: <CardinalityCell value="N:1" />,
          col3: <EntityNameCell name={is.displayName} type="Information System" />,
        });
      }
    }
    return rows;
  }, [node, spec]);

  // Event Source — "Instance to Instance" rows (its objectIds).
  const eventInstanceToInstanceRows = useMemo(() => {
    if (node.nodeType !== "event") return [];
    return (node.objectIds ?? []).map((oid) => ({
      col1: entityTypeIcon("event"),
      col2: <CardinalityCell value="1:N" />,
      col3: <EntityNameCell name={entityNameById.get(oid) ?? oid} type="Object" />,
    }));
  }, [node, entityNameById]);

  // Metric / PQL Function — infer each objectId's actual entity type instead
  // of a flat "Object" label.
  const inferEntityType = (oid: string): string => {
    if (spec.objects.some((o) => o.id === oid)) return "Object";
    if ((spec.events ?? []).some((e) => e.id === oid)) return "Event Source";
    if ((spec.metrics ?? []).some((m) => m.id === oid)) return "Metric";
    return "Entity";
  };

  // Function — "Type to Type" rows: one per objectId, type-inferred.
  const functionRows = useMemo(() => {
    if (node.nodeType !== "function") return [];
    return (node.objectIds ?? []).map((oid) => ({
      col1: entityTypeIcon("function"),
      col2: <CardinalityCell value="1:N" />,
      col3: <EntityNameCell name={entityNameById.get(oid) ?? oid} type={inferEntityType(oid)} />,
    }));
  }, [node, entityNameById, spec]);

  // Metric — "Type to Type" rows: objectIds (type-inferred), then Functions
  // referencing this metric, then Processes whose composition overlaps it.
  const metricRows = useMemo(() => {
    if (node.nodeType !== "metric") return [];
    const rows: { col1: React.ReactNode; col2: React.ReactNode; col3: React.ReactNode }[] = [];
    for (const oid of node.objectIds ?? []) {
      rows.push({
        col1: entityTypeIcon("metric"),
        col2: <CardinalityCell value="1:N" />,
        col3: <EntityNameCell name={entityNameById.get(oid) ?? oid} type={inferEntityType(oid)} />,
      });
    }
    for (const m of (spec.metrics ?? []).filter((m) => m.isFunction && (m.objectIds ?? []).includes(node.id))) {
      rows.push({
        col1: entityTypeIcon("metric"),
        col2: <CardinalityCell value="N:1" />,
        col3: <EntityNameCell name={m.displayName.replace(/^\[FUNCTION\]\s*/i, "")} type="Function" />,
      });
    }
    for (const p of (spec.processes ?? []).filter((p) => (p.objectIds ?? []).some((oid) => (node.objectIds ?? []).includes(oid)))) {
      rows.push({
        col1: entityTypeIcon("metric"),
        col2: <CardinalityCell value="N:1" />,
        col3: <EntityNameCell name={p.displayName} type="Process" />,
      });
    }
    return rows;
  }, [node, entityNameById, spec]);

  // Process — "Objects" composition table (single column).
  const processObjectRows = useMemo(() => {
    if (node.nodeType !== "process") return [];
    return (node.objectIds ?? []).map((oid) => ({ col1: entityNameById.get(oid) ?? oid }));
  }, [node, entityNameById]);

  // Process — "Event Sources" table: events whose objectIds overlap the
  // process's composition objects.
  const processEventRows = useMemo(() => {
    if (node.nodeType !== "process") return [];
    const procObjSet = new Set(node.objectIds ?? []);
    return (spec.events ?? [])
      .filter((evt) => evt.objectIds.some((oid) => procObjSet.has(oid)))
      .map((evt) => ({ col1: evt.displayName }));
  }, [node, spec]);

  // Process — "Information Systems" table (single column, own section —
  // not part of Type-to-Type, matching reference).
  const processInformationSystemRows = useMemo(() => {
    if (node.nodeType !== "process") return [];
    const procObjSet = new Set(node.objectIds ?? []);
    return (spec.informationSystems ?? [])
      .filter((is) => (is.objectIds ?? []).some((oid) => procObjSet.has(oid)))
      .map((is) => ({ col1: is.displayName }));
  }, [node, spec]);

  // Process — "Type to Type" table: Metrics (object overlap), Functions
  // (direct process-id reference), BPMN (processId match — deliberate
  // deviation from reference, per explicit product decision), then
  // object↔object type relationships among composition objects. `relType`
  // tags each row for the relationship count formula below (which — per
  // reference — excludes Metric rows).
  const processTypeToTypeRows = useMemo(() => {
    if (node.nodeType !== "process") return [];
    const rows: { col1: React.ReactNode; col2: React.ReactNode; col3: React.ReactNode; relType: "METRIC" | "FUNCTION" | "BPMN" | "RELATIONSHIP" }[] = [];
    const procObjSet = new Set(node.objectIds ?? []);
    for (const m of spec.metrics ?? []) {
      if (m.isFunction) {
        if ((m.objectIds ?? []).includes(node.id)) {
          rows.push({
            col1: entityTypeIcon("process"),
            col2: <CardinalityCell value="N:1" />,
            col3: <EntityNameCell name={m.displayName.replace(/^\[FUNCTION\]\s*/i, "")} type="Function" />,
            relType: "FUNCTION",
          });
        }
      } else if ((m.objectIds ?? []).some((oid) => procObjSet.has(oid))) {
        rows.push({
          col1: entityTypeIcon("process"),
          col2: <CardinalityCell value="N:1" />,
          col3: <EntityNameCell name={m.displayName} type="Metric" />,
          relType: "METRIC",
        });
      }
    }
    for (const bm of spec.bpmnModels ?? []) {
      if (bm.processId === node.id) {
        rows.push({
          col1: entityTypeIcon("process"),
          col2: <CardinalityCell value="1:1" />,
          col3: <EntityNameCell name={bm.displayName} type="BPMN Model" />,
          relType: "BPMN",
        });
      }
    }
    for (const rel of spec.relationships) {
      if (rel.type !== "type") continue;
      if (procObjSet.has(rel.source) && procObjSet.has(rel.target)) {
        rows.push({
          col1: entityTypeIcon("object"),
          col2: <CardinalityCell value={formatCardinality(rel.cardinality, true)} />,
          col3: <EntityNameCell name={objectNames.get(rel.target) ?? rel.target} type="Object" />,
          relType: "RELATIONSHIP",
        });
      }
    }
    return rows;
  }, [node, spec, objectNames]);

  // BPMN Model — single "Type to Type" table: one row back to its process.
  const bpmnRows = useMemo(() => {
    if (node.nodeType !== "bpmn") return [];
    const processId = node.objectIds?.[0];
    if (!processId) return [];
    return [{
      col1: entityTypeIcon("bpmn"),
      col2: <CardinalityCell value="N:1" />,
      col3: <EntityNameCell name={entityNameById.get(processId) ?? processId} type="Process" />,
    }];
  }, [node, entityNameById]);

  // BPMN Model — FNV-1a-derived "Key" property. The node.id-derived tail is
  // unreachable (seed.repeat(8) already fills 64 chars) — ported faithfully
  // rather than "fixed", since it's cosmetic (a hex-looking string), not a
  // real identifier.
  const bpmnKey = useMemo(() => {
    if (node.nodeType !== "bpmn") return "";
    let h = 0x811c9dc5;
    for (let i = 0; i < node.id.length; i++) { h ^= node.id.charCodeAt(i); h = (Math.imul(h, 0x01000193) >>> 0); }
    const seed = h.toString(16).padStart(8, "0");
    return (seed.repeat(8) + node.id.replace(/[^a-f0-9]/g, "0").padEnd(32, "0")).slice(0, 64);
  }, [node]);

  // Information System — single "Type to Type" table: its objects, then events
  // whose objectIds overlap its objectIds.
  const isRows = useMemo(() => {
    if (node.nodeType !== "information-system") return [];
    const rows: { col1: React.ReactNode; col2: React.ReactNode; col3: React.ReactNode }[] = [];
    const isObjIds = node.objectIds ?? [];
    for (const oid of isObjIds) {
      rows.push({
        col1: entityTypeIcon("information-system"),
        col2: <CardinalityCell value="1:N" />,
        col3: <EntityNameCell name={entityNameById.get(oid) ?? oid} type="Object" />,
      });
    }
    const isObjSet = new Set(isObjIds);
    for (const evt of spec.events ?? []) {
      if (evt.objectIds.some((oid) => isObjSet.has(oid))) {
        rows.push({
          col1: entityTypeIcon("information-system"),
          col2: <CardinalityCell value="1:N" />,
          col3: <EntityNameCell name={evt.displayName} type="Event Source" />,
        });
      }
    }
    return rows;
  }, [node, spec, entityNameById]);

  // Badge grid's "N Relationships" count. Each formula is ported verbatim from
  // reference, which — for several types — counts a narrower set than what the
  // table below actually displays (e.g. Process excludes Metric rows from the
  // count; Event/Metric/Function count objectIds.length only, ignoring IS
  // overlap rows shown in their tables). Kept faithful rather than "fixed".
  const relationshipCount = useMemo(() => {
    switch (node.nodeType) {
      case "object": return nodeRelationships.length + (spec.events ?? []).filter((evt) => evt.objectIds.includes(node.id)).length + (spec.businessRules ?? []).filter((br) => (br.objectIds ?? []).includes(node.id)).length;
      case "event": return (node.objectIds ?? []).length;
      case "metric":
      case "function": return (node.objectIds ?? []).length;
      case "process": return processTypeToTypeRows.filter((r) => r.relType === "FUNCTION" || r.relType === "BPMN" || r.relType === "RELATIONSHIP").length;
      case "bpmn": return bpmnRows.length;
      case "information-system": return isRows.length;
      case "business-rule": return (node.objectIds ?? []).length;
      case "role": return (node.bpmnIds ?? []).length;
      default: return 0;
    }
  }, [node, spec, nodeRelationships, processTypeToTypeRows, bpmnRows, isRows]);

  const typeLabelMap: Record<NodeType, string> = {
    object: "Object Type",
    event: "Events Source",
    metric: "Metric",
    function: "PQL Function",
    process: "Process",
    bpmn: "BPMN Model",
    perspective: "Perspective",
    "information-system": "Information System",
    "business-rule": "Business Rule",
    role: "Role",
  };
  const typeLabel = typeLabelMap[node.nodeType];

  const topBarBtn = "w-8 h-8 flex items-center justify-center rounded-md border border-[#e2e8f0] bg-white hover:bg-[#f8fafc] text-[#0a1f44]";

  const showDescriptionBlock = !!node.description || (node.nodeType === "event" && (node.events?.length ?? 0) > 0);
  const showBadgeGrid = node.nodeType !== "perspective";

  return (
    <div className="absolute top-2 right-2 z-20 w-[360px] bg-white border border-[#e2e8f0] rounded-xl shadow-xl flex flex-col animate-[detail-slide-in_0.2s_ease-out]" style={{ height: dataPreviewOpen ? "calc(100% - 348px)" : "calc(100% - 72px)" }}>
      {/* Top bar — Edit + Close only. Data Preview moved to the fixed bottom
          area (Object nodes only), below the scroll area. */}
      <div className="sticky top-0 bg-white z-10 border-b border-[#e2e8f0] flex items-center justify-end gap-2 px-3 py-2.5 shrink-0">
        <button
          type="button"
          aria-label="Go to definition (read-only in demo)"
          className={topBarBtn}
        >
          {/* Edit pencil — real Celonis CCM "edit" icon paths. */}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" pointerEvents="none">
            <path
              fill="currentColor"
              d="M20.952 3.048a3.58 3.58 0 0 0-5.06 0L3.94 15a3.1 3.1 0 0 0-.825 1.476L2.02 21.078a.75.75 0 0 0 .904.903l4.601-1.096a3.1 3.1 0 0 0 1.477-.825L20.952 8.11a3.58 3.58 0 0 0 0-5.06m-4 1.06a2.078 2.078 0 1 1 2.94 2.94L19 7.939 16.06 5zM15 6.062 17.94 9 7.94 19c-.21.21-.474.357-.763.426l-3.416.814.813-3.416c.069-.29.217-.554.427-.764z"
            />
          </svg>
        </button>
        <button
          type="button"
          aria-label="Close detail panel"
          className={topBarBtn}
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
        >
          {/* Close — real Celonis CCM "dismiss-filled" icon paths. */}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" pointerEvents="none">
            <path
              fill="currentColor"
              d="m4.21 4.387.083-.094a1 1 0 0 1 1.32-.083l.094.083L12 10.585l6.293-6.292a1 1 0 1 1 1.414 1.414L13.415 12l6.292 6.293a1 1 0 0 1 .083 1.32l-.083.094a1 1 0 0 1-1.32.083l-.094-.083L12 13.415l-6.293 6.292a1 1 0 0 1-1.414-1.414L10.585 12 4.293 5.707a1 1 0 0 1-.083-1.32l.083-.094z"
            />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Header — colored badge (white icon inside) + name + snake_case key. */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 20px 0" }}>
          <div style={{ flexShrink: 0, height: 34, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ backgroundColor: NODE_COLORS[node.nodeType], borderRadius: 8, padding: 6, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {detailHeaderIcon(node.nodeType)}
            </div>
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <p style={{
              display: "block", minWidth: 0,
              fontFamily: "Inter, sans-serif", fontSize: "16px", fontWeight: 700, lineHeight: "20px",
              color: "oklch(0.246918 0.0749452 260.778)", margin: 0,
              overflowWrap: "anywhere", WebkitFontSmoothing: "antialiased",
            }}>
              {cleanName}
            </p>
            <p style={{
              display: "block", margin: 0, overflowWrap: "anywhere",
              fontFamily: "Inter, sans-serif", fontSize: "11px", fontWeight: 400, lineHeight: "14px",
              color: "oklch(0.185029 0.0904852 266.303 / 0.63)",
              WebkitFontSmoothing: "antialiased",
            }}>
              {nameToKey(cleanName)}
            </p>
          </div>
        </div>

        {/* Badge grid — center type icon behind four FlankSlot corners. Skipped
            entirely for Perspective (header + description only). */}
        {showBadgeGrid && (
          <div style={{ position: "relative", padding: "16px 20px 12px", minHeight: 210 }}>
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
              <div style={{ position: "relative", width: 128, height: 128 }}>
                {/* Ground-shadow ellipse — same visual language as the graph canvas's
                    puck shadow (flattened 2:1 disc, same color/opacity). Positioned
                    using the same per-type BASE_ELLIPSE_CY pixel-fit constants used
                    for edge-docking on the canvas, re-derived for this badge's
                    centered (not foot-anchored) 128px layout, so each type's icon
                    sits centered on its own shadow rather than one flat guess. */}
                {(() => {
                  const badgeIconH = 128 * ICON_ASPECT[node.nodeType];
                  const badgeIconTop = (128 - badgeIconH) / 2;
                  const fracFromTop = ICON_FOOT_OFFSET - BASE_ELLIPSE_CY[node.nodeType];
                  const cy = badgeIconTop + badgeIconH * fracFromTop;
                  return (
                    <svg width={128} height={128} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
                      <ellipse cx={64} cy={cy} rx={128 * 0.62} ry={128 * 0.62 * 0.5} fill="#0a1f44" opacity={0.11} />
                    </svg>
                  );
                })()}
                <img
                  src={ICON_SRC[node.nodeType]}
                  alt={node.nodeType}
                  style={{ position: "absolute", inset: 0, width: 128, height: 128, objectFit: "contain" }}
                />
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 20 }}>
              <FlankSlot icon={detailBadgeIcon(node.nodeType)} label={typeLabel} />
              <FlankSlot icon={<IconLocal size={20} />} label="local" />
            </div>
            <div style={{ position: "absolute", bottom: 12, left: 20, right: 20, display: "flex", justifyContent: "space-between" }}>
              <FlankSlot icon={<IconFlankRelationship size={20} />} label={`${relationshipCount} Relationships`} />
              {(node.nodeType === "object" || node.nodeType === "event")
                ? <FlankSlot icon={<IconBinding size={20} />} />
                : <div style={{ width: 63 }} />}
            </div>
          </div>
        )}

        {/* Description — plain text, plus (Event Source only) a bullet list of
            individual event names. Renders only if at least one is present;
            when absent, the next block (attributes/properties table, or
            relationships table) moves up — these are sequential conditional
            blocks, not fixed positional slots. */}
        {showDescriptionBlock && (
          <div style={{ padding: "12px 20px 0" }}>
            {node.description && <p style={descriptionStyle}>{node.description}</p>}
            {node.nodeType === "event" && node.events && node.events.length > 0 && (
              <ul style={{ margin: "8px 0 0", paddingLeft: 18 }}>
                {node.events.map((ev, i) => (
                  <li key={i} style={descriptionStyle}>{ev}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div style={{ paddingTop: 16 }}>
          {/* Object */}
          {node.nodeType === "object" && (
            <>
              <NewSectionTable
                title="Attributes"
                col1Header="Name"
                col2Header="Data Type"
                rows={(node.typedFields ?? (node.fields ?? []).map((n) => ({ name: n, dataType: "String" }))).map((f) => ({
                  col1: f.name,
                  col2: <DataTypeCell type={f.dataType} />,
                }))}
              />
              <div style={{ paddingTop: 16 }}>
                <NewSectionTable
                  title="Type to Type - Relationships"
                  hideHeaders
                  col1Header="From"
                  col2Header="Cardinality"
                  col3Header="To"
                  rows={objectTypeToTypeRows}
                />
              </div>
              <div style={{ paddingTop: 16, paddingBottom: 20 }}>
                <NewSectionTable
                  title="Instance to Instance - Relationships"
                  hideHeaders
                  col1Header="From"
                  col2Header="Cardinality"
                  col3Header="To"
                  rows={objectInstanceToInstanceRows}
                />
              </div>
            </>
          )}

          {/* Event Source */}
          {node.nodeType === "event" && (
            <>
              <NewSectionTable
                title="Attributes"
                col1Header="Name"
                col2Header="Data Type"
                rows={[
                  { col1: "ID", col2: <DataTypeCell type="String" /> },
                  { col1: "Time", col2: <DataTypeCell type="Timestamp" /> },
                  { col1: "ExecutedBy", col2: <DataTypeCell type="String" /> },
                ]}
              />
              <div style={{ paddingTop: 16 }}>
                <NewSectionTable
                  title="Type to Type - Relationships"
                  hideHeaders
                  col1Header="From"
                  col2Header="Cardinality"
                  col3Header="To"
                  rows={eventTypeToTypeRows}
                />
              </div>
              <div style={{ paddingTop: 16, paddingBottom: 20 }}>
                <NewSectionTable
                  title="Instance to Instance - Relationships"
                  hideHeaders
                  col1Header="From"
                  col2Header="Cardinality"
                  col3Header="To"
                  rows={eventInstanceToInstanceRows}
                />
              </div>
            </>
          )}

          {/* Metric */}
          {node.nodeType === "metric" && (
            <>
              <NewSectionTable
                title="Properties"
                col1Header="Property"
                col2Header="Value"
                rows={[
                  ...(node.unit ? [{ col1: "Unit", col2: node.unit }] : []),
                  { col1: "Format", col2: node.format ?? "—" },
                ]}
              />
              {node.pql && (
                <div style={{ paddingTop: 16 }}>
                  <div style={{
                    boxSizing: "border-box", height: "23.9941px", minHeight: "24px", display: "flex", alignItems: "center",
                    fontFamily: "Inter, sans-serif", fontSize: "13px", fontWeight: 600, lineHeight: "16px",
                    color: "oklch(0.246918 0.0749452 260.778)", WebkitFontSmoothing: "antialiased", padding: "0 12px",
                  }}>PQL</div>
                  <div style={{ margin: "0 12px", borderRadius: 8, border: "1px solid #e2e8f0", overflow: "hidden" }}>
                    <pre style={{
                      margin: 0, padding: "8px 12px",
                      fontFamily: "monospace", fontSize: "12px", lineHeight: "18px", color: "oklch(0.246918 0.0749452 260.778)",
                      background: "transparent", whiteSpace: "pre-wrap", wordBreak: "break-word",
                      overflowX: "auto", maxHeight: 300, overflowY: "auto",
                      WebkitFontSmoothing: "antialiased",
                    }}>{node.pql}</pre>
                  </div>
                </div>
              )}
              <div style={{ paddingTop: 16, paddingBottom: 20 }}>
                <NewSectionTable
                  title="Type to Type - Relationships"
                  hideHeaders
                  col1Header="From"
                  col2Header="Cardinality"
                  col3Header="To"
                  rows={metricRows}
                />
              </div>
            </>
          )}

          {/* PQL Function */}
          {node.nodeType === "function" && (
            <>
              <NewSectionTable
                title="Properties"
                col1Header="Property"
                col2Header="Value"
                rows={[
                  { col1: "Body Kind", col2: "PQL" },
                  { col1: "Body Shape", col2: "STATEMENTS" },
                  { col1: "Agent Visibility", col2: "NAMED" },
                  { col1: "Requires Perspective", col2: "Yes" },
                ]}
              />
              <div style={{ paddingTop: 16, paddingBottom: 20 }}>
                <NewSectionTable
                  title="Type to Type - Relationships"
                  hideHeaders
                  col1Header="From"
                  col2Header="Cardinality"
                  col3Header="To"
                  rows={functionRows}
                />
              </div>
            </>
          )}

          {/* Process */}
          {node.nodeType === "process" && (
            <>
              <NewSectionTable
                title="Objects"
                col1Header="Name"
                titleIcon={<svg width="14" height="14" viewBox="0 0 18 18" fill="none"><path d="M3 1.5L3 0L15 0V1.5L3 1.5ZM1.5 3L1.5 15C1.5 15.8284 2.17157 16.5 3 16.5L15 16.5C15.8284 16.5 16.5 15.8284 16.5 15L16.5 3C16.5 2.17157 15.8284 1.5 15 1.5V0C16.6569 2.57702e-07 18 1.34315 18 3L18 15C18 16.6569 16.6569 18 15 18L3 18C1.34315 18 0 16.6569 0 15L0 3C0 1.34315 1.34315 0 3 0L3 1.5C2.17157 1.5 1.5 2.17157 1.5 3Z" fill="rgb(92, 170, 229)"/><path d="M9 4.75L4.75 4.75L4.75 9C4.75 9.41421 4.41421 9.75 4 9.75C3.58579 9.75 3.25 9.41421 3.25 9L3.25 4C3.25 3.58579 3.58579 3.25 4 3.25L9 3.25C9.41421 3.25 9.75 3.58579 9.75 4C9.75 4.41421 9.41421 4.75 9 4.75Z" fill="rgb(92, 170, 229)"/></svg>}
                rows={processObjectRows}
              />
              {processEventRows.length > 0 && (
                <div style={{ paddingTop: 16 }}>
                  <NewSectionTable
                    title="Event Sources"
                    col1Header="Name"
                    titleIcon={<svg width="14" height="14" viewBox="0 0 20 16" fill="none"><path fillRule="evenodd" clipRule="evenodd" d="M3 0C3.41421 0 3.75 0.335786 3.75 0.75V4.84766C5.04354 5.18095 6 6.35239 6 7.75C6 9.14752 5.04342 10.318 3.75 10.6514V14.75C3.75 15.1642 3.41421 15.5 3 15.5C2.58579 15.5 2.25 15.1642 2.25 14.75V10.6514C0.956585 10.318 0 9.14752 0 7.75C0 6.35239 0.956465 5.18095 2.25 4.84766V0.75C2.25 0.335786 2.58579 0 3 0ZM3 6.25C2.17157 6.25 1.5 6.92157 1.5 7.75C1.5 8.57843 2.17157 9.25 3 9.25C3.82843 9.25 4.5 8.57843 4.5 7.75C4.5 6.92157 3.82843 6.25 3 6.25Z" fill="rgb(84, 176, 84)"/><path fillRule="evenodd" clipRule="evenodd" d="M18 4.75C19.1046 4.75 20 5.64543 20 6.75V8.75C20 9.85457 19.1046 10.75 18 10.75H10C8.89543 10.75 8 9.85457 8 8.75V6.75C8 5.64543 8.89543 4.75 10 4.75H18ZM10 6.25C9.72386 6.25 9.5 6.47386 9.5 6.75V8.75C9.5 9.02614 9.72386 9.25 10 9.25H18C18.2761 9.25 18.5 9.02614 18.5 8.75V6.75C18.5 6.47386 18.2761 6.25 18 6.25H10Z" fill="rgb(84, 176, 84)"/></svg>}
                    rows={processEventRows}
                  />
                </div>
              )}
              {processInformationSystemRows.length > 0 && (
                <div style={{ paddingTop: 16 }}>
                  <NewSectionTable
                    title="Information Systems"
                    col1Header="Name"
                    titleIcon={entityTypeIcon("information-system")}
                    rows={processInformationSystemRows}
                  />
                </div>
              )}
              <div style={{ paddingTop: 16, paddingBottom: 20 }}>
                <NewSectionTable
                  title="Type to Type - Relationships"
                  hideHeaders
                  col1Header="From"
                  col2Header="Cardinality"
                  col3Header="To"
                  titleIcon={<svg width="14" height="14" viewBox="0 0 22 22" fill="none"><path fill="rgb(19, 161, 14)" d="M5.381 7.758a.556.556 0 0 1 .733-.282l4.775 2.122 4.774-2.122a.556.556 0 0 1 .451 1.015l-4.67 2.076v5.194a.556.556 0 0 1-1.11 0v-5.194L5.663 8.49a.556.556 0 0 1-.283-.733m4.064-4.24a3.9 3.9 0 0 1 2.888 0l6.397 2.56a1.67 1.67 0 0 1 1.048 1.547v6.509a4 4 0 0 0-.556-.04h-.555v-6.47a.56.56 0 0 0-.35-.515L11.921 4.55a2.78 2.78 0 0 0-2.064 0L3.46 7.109a.56.56 0 0 0-.349.516v8.495c0 .227.138.431.35.516l6.396 2.559c.413.165.856.227 1.29.186.145.375.345.721.592 1.03-.761.17-1.561.109-2.294-.185l-6.397-2.558A1.67 1.67 0 0 1 2 16.12V7.625c0-.682.415-1.295 1.048-1.548zm5.333 11.688a2.778 2.778 0 0 0 0 5.555h.555a.556.556 0 1 0 0-1.11h-.555a1.667 1.667 0 1 1 0-3.334h.555a.556.556 0 1 0 0-1.111zm3.889 0a.556.556 0 1 0 0 1.11h.555a1.667 1.667 0 1 1 0 3.334h-.555a.556.556 0 1 0 0 1.111h.555a2.778 2.778 0 0 0 0-5.555zm-3.89 2.222a.556.556 0 0 0 0 1.111h4.445a.556.556 0 1 0 0-1.111z"/></svg>}
                  rows={processTypeToTypeRows}
                />
              </div>
            </>
          )}

          {/* BPMN Model */}
          {node.nodeType === "bpmn" && (
            <>
              <NewSectionTable
                title="Properties"
                col1Header="Property"
                col2Header="Value"
                rows={[{ col1: "Key", col2: bpmnKey }]}
              />
              <div style={{ paddingTop: 16, paddingBottom: 20 }}>
                <NewSectionTable
                  title="Type to Type - Relationships"
                  hideHeaders
                  col1Header="From"
                  col2Header="Cardinality"
                  col3Header="To"
                  rows={bpmnRows}
                />
              </div>
            </>
          )}

          {/* Information System */}
          {node.nodeType === "information-system" && (
            <>
              <NewSectionTable
                title="Properties"
                col1Header="Property"
                col2Header="Value"
                rows={Object.entries(node.properties ?? {}).map(([k, v]) => ({ col1: k, col2: v }))}
              />
              <div style={{ paddingTop: 16, paddingBottom: 20 }}>
                <NewSectionTable
                  title="Type to Type - Relationships"
                  hideHeaders
                  col1Header="From"
                  col2Header="Cardinality"
                  col3Header="To"
                  rows={isRows}
                />
              </div>
            </>
          )}

          {/* Business Rule */}
          {node.nodeType === "business-rule" && (
            <>
              {node.scope && (
                <div style={{ paddingTop: 4, paddingBottom: 4 }}>
                  <div style={{
                    boxSizing: "border-box", height: "23.9941px", minHeight: "24px", display: "flex", alignItems: "center",
                    fontFamily: "Inter, sans-serif", fontSize: "13px", fontWeight: 600, lineHeight: "16px",
                    color: "oklch(0.246918 0.0749452 260.778)", WebkitFontSmoothing: "antialiased", padding: "0 12px",
                  }}>Scope</div>
                  <div style={{ margin: "0 12px", borderRadius: 8, border: "1px solid #e2e8f0", overflow: "hidden" }}>
                    <pre style={{
                      margin: 0, padding: "8px 12px",
                      fontFamily: "monospace", fontSize: "12px", lineHeight: "18px", color: "oklch(0.246918 0.0749452 260.778)",
                      background: "#f8fafc", whiteSpace: "pre-wrap", wordBreak: "break-word",
                      overflowX: "auto", maxHeight: 300, overflowY: "auto",
                      WebkitFontSmoothing: "antialiased",
                    }}>{node.scope}</pre>
                  </div>
                </div>
              )}
              {node.rule && (
                <div style={{ paddingTop: 16 }}>
                  <div style={{
                    boxSizing: "border-box", height: "23.9941px", minHeight: "24px", display: "flex", alignItems: "center",
                    fontFamily: "Inter, sans-serif", fontSize: "13px", fontWeight: 600, lineHeight: "16px",
                    color: "oklch(0.246918 0.0749452 260.778)", WebkitFontSmoothing: "antialiased", padding: "0 12px",
                  }}>Condition</div>
                  <div style={{ margin: "0 12px", borderRadius: 8, border: "1px solid #e2e8f0", overflow: "hidden" }}>
                    <pre style={{
                      margin: 0, padding: "8px 12px",
                      fontFamily: "monospace", fontSize: "12px", lineHeight: "18px", color: "oklch(0.246918 0.0749452 260.778)",
                      background: "#f8fafc", whiteSpace: "pre-wrap", wordBreak: "break-word",
                      overflowX: "auto", maxHeight: 300, overflowY: "auto",
                      WebkitFontSmoothing: "antialiased",
                    }}>{node.rule}</pre>
                  </div>
                </div>
              )}
              {(node.objectIds ?? []).length > 0 && (
                <div style={{ paddingTop: 16, paddingBottom: 20 }}>
                  <NewSectionTable
                    title="Type to Type - Relationships"
                    hideHeaders
                    col1Header="From"
                    col2Header="Cardinality"
                    col3Header="To"
                    rows={(node.objectIds ?? []).map((oid) => ({
                      col1: entityTypeIcon("business-rule"),
                      col2: <CardinalityCell value="N:1" />,
                      col3: <EntityNameCell name={entityNameById.get(oid) ?? oid} type="Object" />,
                    }))}
                  />
                </div>
              )}
            </>
          )}

          {/* Role */}
          {node.nodeType === "role" && (
            <>
              <NewSectionTable
                title="Properties"
                col1Header="Key"
                col2Header="Value"
                rows={[
                  { col1: "Cost Rate", col2: (node.properties as { costRate?: string } | undefined)?.costRate ?? "—" },
                  { col1: "Number of FTE", col2: (node.properties as { numberOfFTE?: string } | undefined)?.numberOfFTE ?? "—" },
                  { col1: "Working hours per week (FTE)", col2: (node.properties as { workingHoursPerWeek?: string } | undefined)?.workingHoursPerWeek ?? "—" },
                ]}
              />
              {(node.bpmnIds ?? []).length > 0 && (
                <div style={{ paddingTop: 16, paddingBottom: 20 }}>
                  <NewSectionTable
                    title="Type to Type - Relationships"
                    hideHeaders
                    col1Header="From"
                    col2Header="Cardinality"
                    col3Header="To"
                    rows={(node.bpmnIds ?? []).map((bpmnId) => ({
                      col1: entityTypeIcon("role"),
                      col2: <CardinalityCell value="N:1" />,
                      col3: <EntityNameCell name={entityNameById.get(bpmnId) ?? bpmnId} type="BPMN Model" />,
                    }))}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Fixed bottom — Data Preview button, Object nodes only, outside the
          scroll area, below a divider. */}
      {node.nodeType === "object" && onDataPreview && (
        <div className="shrink-0 border-t border-[#e2e8f0] flex items-center justify-center gap-2 px-3 py-2.5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDataPreview(node);
            }}
            className="flex items-center gap-1.5 h-8 px-2.5 rounded-md border border-[#e2e8f0] bg-white hover:bg-[#f8fafc] text-[12px] text-[#0a1f44] font-medium"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" pointerEvents="none">
              <path
                fill="currentColor"
                d="M20.4 6.6a3 3 0 0 0-3-3H6.6a3 3 0 0 0-3 3v4.507a5.4 5.4 0 0 1 1.2-.274V8.4h14.4v9a1.8 1.8 0 0 1-1.8 1.8h-6.454l1.2 1.2H17.4a3 3 0 0 0 3-3zM6.6 4.8h10.8a1.8 1.8 0 0 1 1.8 1.8v.6H4.8v-.6a1.8 1.8 0 0 1 1.8-1.8m1.315 14.763a4.2 4.2 0 1 1 .849-.849l3.06 3.062a.6.6 0 1 1-.848.848zM8.4 16.2a3 3 0 1 0-6 0 3 3 0 0 0 6 0"
              />
            </svg>
            Data Preview
          </button>
        </div>
      )}
    </div>
  );
}

// ---------- Data Preview Panel ----------

function generateDummyRow(fields: { name: string; dataType: string }[]): Record<string, string> {
  const row: Record<string, string> = {};
  for (const f of fields) {
    switch (f.dataType) {
      case "String":
        if (f.name === "ID") row[f.name] = `${Math.floor(1000 + Math.random() * 9000)}`;
        else if (f.name.includes("Name") || f.name.includes("Description")) row[f.name] = ["Acme Corp", "Widget Pro", "Standard", "Premium"][Math.floor(Math.random() * 4)];
        else if (f.name.includes("Country")) row[f.name] = ["US", "DE", "UK", "FR"][Math.floor(Math.random() * 4)];
        else if (f.name.includes("City")) row[f.name] = ["New York", "Berlin", "London", "Paris"][Math.floor(Math.random() * 4)];
        else if (f.name.includes("Currency")) row[f.name] = ["USD", "EUR", "GBP"][Math.floor(Math.random() * 3)];
        else if (f.name.includes("Status")) row[f.name] = ["Complete", "In Progress", "Open", "Blocked"][Math.floor(Math.random() * 4)];
        else if (f.name.includes("Type")) row[f.name] = ["OR", "ZOR", "Standard", "Rush"][Math.floor(Math.random() * 4)];
        else if (f.name.includes("Unit")) row[f.name] = ["EA", "KG", "PC", "L"][Math.floor(Math.random() * 4)];
        else if (f.name.includes("Email")) row[f.name] = "j.smith@company.com";
        else row[f.name] = ["ABC-" + Math.floor(Math.random() * 999), "XYZ-" + Math.floor(Math.random() * 999), "1000" + Math.floor(Math.random() * 99)][Math.floor(Math.random() * 3)];
        break;
      case "Double":
        row[f.name] = (Math.random() * 10000).toFixed(2);
        break;
      case "Integer":
        row[f.name] = String(Math.floor(Math.random() * 1000));
        break;
      case "Timestamp":
        row[f.name] = `2024-${String(Math.floor(1 + Math.random() * 12)).padStart(2, "0")}-${String(Math.floor(1 + Math.random() * 28)).padStart(2, "0")} ${String(Math.floor(Math.random() * 24)).padStart(2, "0")}:${String(Math.floor(Math.random() * 60)).padStart(2, "0")}`;
        break;
      case "Date":
        row[f.name] = `2024-${String(Math.floor(1 + Math.random() * 12)).padStart(2, "0")}-${String(Math.floor(1 + Math.random() * 28)).padStart(2, "0")}`;
        break;
      case "Boolean":
        row[f.name] = Math.random() > 0.5 ? "true" : "false";
        break;
      default:
        row[f.name] = "—";
    }
  }
  return row;
}

function DataPreviewPanel({ node, spec, onClose }: { node: GraphNode; spec: ContextModelSpec; onClose: () => void }) {
  const [selectedId, setSelectedId] = useState(node.id);
  useEffect(() => { setSelectedId(node.id); }, [node.id]);

  // Entity dropdown lists all Objects and Events, defaulting to the clicked
  // entity. Switching regenerates rows for the newly selected entity's fields.
  const options = useMemo(() => [
    ...spec.objects.map((o) => ({
      id: o.id,
      label: o.displayName,
      typeLabel: "Object Type",
      fields: (o.typedFields ?? o.fields?.map((f) => ({ name: f, dataType: "String" })) ?? []) as { name: string; dataType: string }[],
      previewData: o.previewData,
    })),
    ...(spec.events ?? []).map((e) => ({
      id: e.id,
      label: e.displayName,
      typeLabel: "Event Source",
      fields: [
        { name: "ID", dataType: "String" },
        { name: "Time", dataType: "Timestamp" },
        { name: "ExecutedBy", dataType: "String" },
      ] as { name: string; dataType: string }[],
      previewData: undefined as Record<string, unknown>[] | undefined,
    })),
  ], [spec]);

  const selected = options.find((o) => o.id === selectedId) ?? options[0];
  const fields = selected?.fields ?? [];

  const rows = useMemo(() => {
    if (fields.length === 0) return [];
    if (selected?.previewData && selected.previewData.length > 0) {
      return selected.previewData.map((row) =>
        Object.fromEntries(fields.map((f) => [f.name, row[f.name] != null ? String(row[f.name]) : "—"]))
      );
    }
    return Array.from({ length: 10 }, () => generateDummyRow(fields));
  }, [fields, selected]);

  const mutedStyle: React.CSSProperties = {
    fontFamily: "Inter, sans-serif",
    fontSize: "11px",
    fontWeight: 400,
    lineHeight: "14px",
    color: "oklch(0.185029 0.0904852 266.303 / 0.63)",
    WebkitFontSmoothing: "antialiased",
    whiteSpace: "nowrap",
    userSelect: "none",
  };

  return (
    <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-[#e2e8f0]" style={{ height: 280, zIndex: 30 }}>
      <div className="flex items-center justify-between px-4 py-2">
        <div className="flex items-center gap-2">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="text-[#64748b]">
            <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <span style={{
            fontFamily: "Inter, sans-serif", fontSize: "11px", fontWeight: 600, lineHeight: "14px",
            color: "oklch(0.246918 0.0749452 260.778)", WebkitFontSmoothing: "antialiased",
            whiteSpace: "nowrap", userSelect: "none",
          }}>Browse data</span>
          <select
            value={selected?.id}
            onChange={(e) => setSelectedId(e.target.value)}
            className="border rounded bg-white w-auto max-w-[140px]"
            style={{
              fontFamily: "Inter, sans-serif", fontSize: "13px", fontWeight: 400, lineHeight: "16px",
              color: "oklch(0.246918 0.0749452 260.778)", borderColor: "#94a3b8",
              WebkitFontSmoothing: "antialiased", padding: "5px 6px",
            }}
          >
            {options.map((o) => (
              <option key={o.id} value={o.id}>{o.label}</option>
            ))}
          </select>
          {selected && <span style={mutedStyle}>{selected.typeLabel}</span>}
        </div>
        <div className="flex items-center gap-2">
          <span style={mutedStyle}>500 rows</span>
          <button onClick={onClose} className="w-5 h-5 flex items-center justify-center rounded hover:bg-[#f1f5f9] text-[#94a3b8]">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
          </button>
        </div>
      </div>
      <div className="overflow-x-auto overflow-y-auto" style={{ height: 240 }}>
        <table className="w-full" style={{ borderCollapse: "collapse" }}>
          <thead className="sticky top-0 bg-white">
            <tr className="border-b border-[#e2e8f0]">
              {fields.map((f) => (
                <th key={f.name} style={{
                  fontFamily: "Inter, sans-serif", fontSize: "13px", fontWeight: 600, lineHeight: "16px",
                  color: "oklch(0.246918 0.0749452 260.778)", WebkitFontSmoothing: "antialiased",
                  whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden",
                  paddingTop: 8, paddingBottom: 8, paddingLeft: 12, paddingRight: 12, textAlign: "left",
                }}>{f.name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-b border-[#e2e8f0] hover:bg-[#f8fafc]">
                {fields.map((f) => (
                  <td key={f.name} style={{
                    fontFamily: "Inter, sans-serif", fontSize: "13px", fontWeight: 400, lineHeight: "16px",
                    color: "oklch(0.246918 0.0749452 260.778)", WebkitFontSmoothing: "antialiased",
                    whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden",
                    paddingLeft: 12, paddingRight: 12, paddingTop: 6, paddingBottom: 6,
                  }}>{row[f.name]}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------- Main Component ----------

interface Props {
  spec: ContextModelSpec;
}

export function ContextModelGraph({ spec }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const gRef = useRef<SVGGElement>(null);
  const [dimensions, setDimensions] = useState({ width: 1200, height: 800 });
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [links, setLinks] = useState<GraphLink[]>([]);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [activeFilter, setActiveFilter] = useState<NodeType | null>(null);
  const [dataPreviewNode, setDataPreviewNode] = useState<GraphNode | null>(null);
  // Filter panel: filter the graph by Process, Information System, and/or
  // Entity Type, independent of activeFilter (the sidebar-category filter).
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [filterProcessIds, setFilterProcessIds] = useState<Set<string>>(new Set());
  const [filterISIds, setFilterISIds] = useState<Set<string>>(new Set());
  const [filterNodeTypes, setFilterNodeTypes] = useState<Set<string>>(new Set());
  const [filterEntitiesEngaged, setFilterEntitiesEngaged] = useState(false);
  // Tab system. The "context-model" tab is always present and non-closeable;
  // each clicked process from the sidebar opens a sibling BPMN tab. Real
  // Celonis pig-explorer uses DockView with the same model — Context Model
  // tab + N process tabs side-by-side, not a stacked overlay.
  type CMTab =
    | { id: "context-model"; label: string; type: "context-model" }
    | { id: string; label: string; type: "bpmn"; processId: string };
  const [openTabs, setOpenTabs] = useState<CMTab[]>([
    { id: "context-model", label: "Context Model", type: "context-model" },
  ]);
  const [activeTabId, setActiveTabId] = useState<string>("context-model");
  const [searchQuery, setSearchQuery] = useState("");
  const [zoomLevel, setZoomLevel] = useState(0.7);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  // Layered ("3-plate isometric") view — an alternate rendering mode over the
  // same graph data. layeredSubview isolates one plate (re-centered on
  // single-plate-bg.png) instead of showing the full 3-plate stack.
  const [layeredMode, setLayeredMode] = useState(false);
  const [layeredSubview, setLayeredSubview] = useState<"all" | "systems" | "pi-graph" | "intelligence">("all");
  const [dotTick, setDotTick] = useState(0);
  const [graphReady, setGraphReady] = useState(false);
  const simulationRef = useRef<ReturnType<typeof forceSimulation<GraphNode>> | null>(null);
  const draggingRef = useRef<{ nodeId: string } | null>(null);
  const zoomBehaviorRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null);

  const objectNames = useMemo(() => {
    const map = new Map<string, string>();
    for (const obj of spec.objects) map.set(obj.id, obj.displayName);
    return map;
  }, [spec.objects]);

  // Lookup map for any entity (object, event, metric, process, perspective) by id.
  // Used by the detail panel's composition table so process composition rows can
  // render the human-readable name regardless of entity type.
  const entityNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const o of spec.objects) map.set(o.id, o.displayName);
    for (const e of spec.events ?? []) map.set(e.id, e.displayName);
    for (const m of spec.metrics ?? []) map.set(m.id, m.displayName.replace(/^\[FUNCTION\]\s*/i, ""));
    for (const p of spec.processes ?? []) map.set(p.id, p.displayName);
    for (const pv of spec.perspectives ?? []) map.set(pv.id, pv.displayName);
    for (const br of spec.businessRules ?? []) map.set(br.id, br.displayName);
    for (const r of spec.roles ?? []) map.set(r.id, r.displayName);
    for (const bm of spec.bpmnModels ?? []) map.set(bm.id, bm.displayName);
    return map;
  }, [spec]);

  // Sidebar item click → select that node. Name lookup (inverse of
  // entityNameById) since sidebar rows only carry displayName strings.
  const nameToId = useMemo(() => {
    const m = new Map<string, string>();
    for (const [id, name] of entityNameById) m.set(name, id);
    return m;
  }, [entityNameById]);
  const selectByName = (name: string) => {
    const id = nameToId.get(name);
    if (!id) return;
    const target = nodes.find((n) => n.id === id);
    if (target) setSelectedNode((prev) => (prev?.id === id ? null : target));
  };

  const { graphNodes, graphLinks } = useMemo(() => {
    const allNodes: GraphNode[] = [];
    const allLinks: GraphLink[] = [];
    const nodeIdSet = new Set<string>();

    for (const obj of spec.objects) {
      allNodes.push({
        id: obj.id,
        displayName: obj.displayName,
        nodeType: "object",
        fieldCount: obj.fieldCount,
        eventCount: obj.eventCount,
        description: obj.description,
        fields: obj.fields,
        typedFields: obj.typedFields,
      });
      nodeIdSet.add(obj.id);
    }

    for (const evt of spec.events ?? []) {
      allNodes.push({
        id: evt.id,
        displayName: evt.displayName,
        nodeType: "event",
        description: evt.description,
        events: evt.events,
        objectIds: evt.objectIds,
      });
      nodeIdSet.add(evt.id);
      for (const objId of evt.objectIds) {
        if (nodeIdSet.has(objId)) {
          allLinks.push({ id: `evt-${evt.id}-${objId}`, source: evt.id, target: objId });
        }
      }
    }

    for (const m of spec.metrics ?? []) {
      const isFunc = m.isFunction ?? false;
      allNodes.push({
        id: m.id,
        displayName: m.displayName,
        nodeType: isFunc ? "function" : "metric",
        description: m.description,
        pql: m.pql,
        unit: m.unit,
        format: m.format,
        objectIds: m.objectIds,
      });
      nodeIdSet.add(m.id);
      for (const objId of m.objectIds ?? []) {
        if (nodeIdSet.has(objId)) {
          allLinks.push({ id: `met-${m.id}-${objId}`, source: m.id, target: objId });
        }
      }
    }

    for (const p of spec.processes ?? []) {
      allNodes.push({
        id: p.id,
        displayName: p.displayName,
        nodeType: "process",
        description: p.description,
        objectIds: p.objectIds,
      });
      nodeIdSet.add(p.id);
      const procObjSet = new Set(p.objectIds);
      for (const objId of p.objectIds) {
        if (nodeIdSet.has(objId)) {
          allLinks.push({ id: `proc-${p.id}-${objId}`, source: p.id, target: objId });
        }
      }
      // Transitive: events/metrics whose objectIds overlap this process's
      // composition objects — so the click-highlight set and detail panel
      // reflect everything actually connected to the process, not just its
      // direct objects.
      for (const evt of spec.events ?? []) {
        if (nodeIdSet.has(evt.id) && evt.objectIds.some((oid) => procObjSet.has(oid))) {
          allLinks.push({ id: `proc-evt-${p.id}-${evt.id}`, source: p.id, target: evt.id });
        }
      }
      for (const m of spec.metrics ?? []) {
        if (!nodeIdSet.has(m.id)) continue;
        if (m.isFunction) {
          // Function objectIds reference process ids directly (fixture convention).
          if ((m.objectIds ?? []).includes(p.id)) {
            allLinks.push({ id: `proc-fn-${p.id}-${m.id}`, source: p.id, target: m.id });
          }
        } else if ((m.objectIds ?? []).some((oid) => procObjSet.has(oid))) {
          allLinks.push({ id: `proc-met-${p.id}-${m.id}`, source: p.id, target: m.id });
        }
      }
    }

    for (const rel of spec.relationships) {
      if (nodeIdSet.has(rel.source) && nodeIdSet.has(rel.target)) {
        allLinks.push({ id: rel.id, source: rel.source, target: rel.target, cardinality: rel.cardinality });
      }
    }

    for (const bm of spec.bpmnModels ?? []) {
      allNodes.push({
        id: bm.id,
        displayName: bm.displayName,
        nodeType: "bpmn",
        description: bm.description,
        objectIds: [bm.processId],
      });
      nodeIdSet.add(bm.id);
      if (nodeIdSet.has(bm.processId)) {
        allLinks.push({ id: `bpmn-${bm.id}-${bm.processId}`, source: bm.id, target: bm.processId });
      }
    }

    for (const is of spec.informationSystems ?? []) {
      allNodes.push({
        id: is.id,
        displayName: is.displayName,
        nodeType: "information-system",
        description: is.description,
        properties: is.properties,
        objectIds: is.objectIds,
      });
      nodeIdSet.add(is.id);
      for (const objId of is.objectIds) {
        if (nodeIdSet.has(objId)) {
          allLinks.push({ id: `is-obj-${is.id}-${objId}`, source: is.id, target: objId });
        }
      }
      // Transitive: events whose objectIds overlap this IS's objectIds — needed
      // so selecting an IS keeps its objects AND their overlapping events opaque.
      const isObjSet = new Set(is.objectIds);
      for (const evt of spec.events ?? []) {
        if (nodeIdSet.has(evt.id) && evt.objectIds.some((oid) => isObjSet.has(oid))) {
          allLinks.push({ id: `is-evt-${is.id}-${evt.id}`, source: is.id, target: evt.id });
        }
      }
      // Transitive: processes whose composition objects overlap this IS's objects.
      for (const p of spec.processes ?? []) {
        if (nodeIdSet.has(p.id) && (p.objectIds ?? []).some((oid) => isObjSet.has(oid))) {
          allLinks.push({ id: `proc-is-${p.id}-${is.id}`, source: p.id, target: is.id });
        }
      }
    }

    for (const br of spec.businessRules ?? []) {
      allNodes.push({
        id: br.id,
        displayName: br.displayName,
        nodeType: "business-rule",
        description: br.description,
        scope: br.scope,
        rule: br.rule,
        objectIds: br.objectIds ?? [],
      });
      nodeIdSet.add(br.id);
      for (const objId of br.objectIds ?? []) {
        if (nodeIdSet.has(objId)) {
          allLinks.push({ id: `br-${br.id}-obj-${objId}`, source: br.id, target: objId });
        }
      }
    }

    for (const role of spec.roles ?? []) {
      allNodes.push({
        id: role.id,
        displayName: role.displayName,
        nodeType: "role",
        description: role.description,
        properties: role.properties as Record<string, string>,
        bpmnIds: role.bpmnIds ?? [],
      });
      nodeIdSet.add(role.id);
      for (const bpmnId of role.bpmnIds ?? []) {
        if (nodeIdSet.has(bpmnId)) {
          allLinks.push({ id: `role-${role.id}-bpmn-${bpmnId}`, source: role.id, target: bpmnId });
        }
      }
    }

    // Ensure no floating nodes — connect orphans to the first process or first object
    const connectedIds = new Set<string>();
    for (const link of allLinks) {
      connectedIds.add(typeof link.source === "string" ? link.source : (link.source as GraphNode).id);
      connectedIds.add(typeof link.target === "string" ? link.target : (link.target as GraphNode).id);
    }
    const anchorId = allNodes.find((n) => n.nodeType === "process")?.id ?? allNodes.find((n) => n.nodeType === "object")?.id;
    if (anchorId) {
      for (const node of allNodes) {
        if (!connectedIds.has(node.id) && node.id !== anchorId) {
          allLinks.push({ id: `orphan-${node.id}`, source: node.id, target: anchorId });
        }
      }
    }

    return { graphNodes: allNodes, graphLinks: allLinks };
  }, [spec]);

  // Single full-graph force simulation. Layout never changes on click/hover —
  // selecting a node only highlights it + its direct edges (see hasHighlight /
  // activeEdges below); the graph stays put. Mirrors the real Celonis CCM, where
  // hover is the canonical "show me this node's world" gesture.
  //
  // We pre-tick the simulation 300 iterations *synchronously* before the first
  // render, so the layout is already converged when the user sees the canvas —
  // no visible jitter. The on("tick") handler is attached after the pre-tick
  // so it only fires for future user-triggered motion (e.g. node drag).
  useEffect(() => {
    const nodesCopy = graphNodes.map((n) => ({ ...n }));
    const linksCopy = graphLinks.map((l) => ({ ...l }));
    const sim = forceSimulation<GraphNode>(nodesCopy)
      .force(
        "link",
        forceLink<GraphNode, GraphLink>(linksCopy)
          .id((d) => d.id)
          .distance(60)
          .strength(0.35),
      )
      .force("charge", forceManyBody().strength(-200))
      .force("center", forceCenter(dimensions.width / 2, dimensions.height / 2))
      .force("collide", forceCollide<GraphNode>().radius((d) => (NODE_SIZE[d.nodeType] ?? 12) + 10))
      .stop();  // disable auto-stepping; we drive the initial settle manually

    // Synchronously converge — no animation visible to user.
    sim.tick(300);

    // Push the settled positions to React state in one shot.
    setNodes([...nodesCopy]);
    setLinks([...linksCopy]);
    // Trigger fade-in after first paint of the settled layout.
    requestAnimationFrame(() => setGraphReady(true));

    // Now wire the tick handler for any subsequent motion (drag handles call
    // simulation.alphaTarget(0.3).restart()).
    sim.on("tick", () => {
      setNodes([...nodesCopy]);
      setLinks([...linksCopy]);
    });

    simulationRef.current = sim;
    return () => { sim.stop(); };
  }, [graphNodes, graphLinks, dimensions]);

  // Pan/zoom
  useEffect(() => {
    if (!svgRef.current || !gRef.current) return;
    const svgEl = svgRef.current;
    const svg = select(svgEl);
    const g = select(gRef.current);

    // Pinch-zoom (Ctrl+wheel on macOS trackpad) only via d3-zoom; regular two-finger
    // wheel events are intercepted below for panning. Drag-to-pan still works.
    const zoomBehavior = zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.15, 5])
      .filter((event) => {
        if (event.type === "wheel") return event.ctrlKey;     // pinch only
        return !event.button;                                  // primary button drag, touch
      })
      .on("zoom", (event) => {
        g.attr("transform", event.transform.toString());
        setZoomLevel(event.transform.k);
      });

    zoomBehaviorRef.current = zoomBehavior;
    svg.call(zoomBehavior);
    svg.call(zoomBehavior.transform, zoomIdentity.translate(0, 0).scale(0.7));

    // Manual wheel handler: two-finger trackpad scroll → pan the canvas.
    const onWheel = (event: WheelEvent) => {
      if (event.ctrlKey) return;  // pinch — let d3-zoom handle it
      event.preventDefault();
      const t = zoomTransform(svgEl);
      svg.call(zoomBehavior.transform, t.translate(-event.deltaX / t.k, -event.deltaY / t.k));
    };
    svgEl.addEventListener("wheel", onWheel, { passive: false });

    return () => {
      svg.on(".zoom", null);
      svgEl.removeEventListener("wheel", onWheel);
    };
  }, []);

  // Click on a node: zoom-and-fit to bring the node + its direct neighbors into view.
  // Reads fresh positions from the simulation (not React state) so it doesn't refire
  // on every simulation tick. When selectedNode goes from a node → null (deselect via
  // close button or empty-canvas click), smoothly zoom back to the overview transform.
  // In layered mode the view stays fixed — no zoom adjustments on selection or deselection.
  useEffect(() => {
    if (!svgRef.current || !zoomBehaviorRef.current || !simulationRef.current) return;
    if (layeredMode) return;
    if (!selectedNode) {
      // Fit-and-center the full graph — same as the "Fit all" button — instead
      // of a hardcoded overview transform that ignores current dimensions
      // (sidebar collapsed/expanded, panel closed, etc).
      handleZoomFit();
      return;
    }
    const sim = simulationRef.current;
    const simNodes = sim.nodes();
    const focus = simNodes.find((n) => n.id === selectedNode.id);
    if (!focus || focus.x == null || focus.y == null) return;
    const linkForce = sim.force("link") as { links?: () => GraphLink[] } | null;
    const allLinks = (linkForce?.links?.() ?? []) as GraphLink[];
    const neighborIds = new Set<string>([focus.id]);
    for (const link of allLinks) {
      const s = link.source as GraphNode;
      const t = link.target as GraphNode;
      if (s.id === focus.id) neighborIds.add(t.id);
      if (t.id === focus.id) neighborIds.add(s.id);
    }
    const visible = simNodes.filter((n) => neighborIds.has(n.id) && n.x != null && n.y != null);
    if (visible.length === 0) return;
    const xs = visible.map((n) => n.x!);
    const ys = visible.map((n) => n.y!);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const padding = 120;
    const w = (maxX - minX) + padding * 2;
    const h = (maxY - minY) + padding * 2;
    // Reserve room for the right-side detail panel (340px wide + 20px gap = 360px).
    // The graph's visual center shifts left into the remaining viewport.
    const panelReserve = 360;
    const visibleWidth = Math.max(dimensions.width - panelReserve, 320);
    const scale = Math.min(visibleWidth / w, dimensions.height / h, 2);
    const tx = visibleWidth / 2 - cx * scale;
    const ty = dimensions.height / 2 - cy * scale;
    const svg = select(svgRef.current);
    svg.transition().duration(450).call(
      zoomBehaviorRef.current.transform,
      zoomIdentity.translate(tx, ty).scale(scale),
    );
  }, [selectedNode, dimensions, layeredMode]);

  // Animated-dot ticker: only runs while a node is hovered or selected, since dots
  // on the full graph would be visual noise. ~5.5s per traversal.
  useEffect(() => {
    if (selectedNode == null && hoveredNode == null) return;
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      setDotTick((p) => (p + dt * 0.18) % 1);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [selectedNode, hoveredNode]);

  // Resize observer
  useEffect(() => {
    const container = svgRef.current?.parentElement;
    if (!container) return;
    const obs = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0) setDimensions({ width, height });
    });
    obs.observe(container);
    return () => obs.disconnect();
  }, []);

  const rot2d = (x: number, y: number, cx: number, cy: number, a: number) => ({
    x: cx + (x - cx) * Math.cos(a) - (y - cy) * Math.sin(a),
    y: cy + (x - cx) * Math.sin(a) + (y - cy) * Math.cos(a),
  });

  // Layered view — places each layer's nodes inside the corresponding glass plane
  // of layered-bg.png. The PNG is sized to fill the viewport; plate centers are
  // derived from pixel analysis of the PNG (2882×1368). x and y are scaled
  // independently to fill each plate's available width and height.
  const layeredData = useMemo<{
    positions: Map<string, { x: number; y: number; scale: number }>;
    stackBounds: { imgX: number; imgY: number; imgW: number; imgH: number };
    zoneSVG: Array<{ cx: number; cy: number; hw: number; hh: number; triBot: number; triTop: number; triTopDrop: number; hexYMax: number; yMin: number; yMax: number; rot: number }>;
    layerMeta: Array<{ gridCy: number; hwInner: number; hhInner: number; li: 0 | 1 | 2 }>;
  } | null>(() => {
    if (!layeredMode || nodes.length === 0) return null;

    const W = dimensions.width;
    const H = dimensions.height;
    // Positions are computed in fixed g-local coordinates matched to the initial zoom
    // (k=0.7, tx=ty=0). D3 zoom then scales/pans the entire scene — both the PNG and
    // the node positions — together, like zooming into a map.
    const INITIAL_K = 0.7;

    // Zones use intersection areas so each layer has more room.
    // Functions: top plate exclusive (y<0.168) + top∩middle intersection (y 0.168–0.315)
    // DataModel: middle exclusive (0.315–0.608) + both intersections (0.168–0.315 and 0.608–0.824)
    // IS: bottom plate exclusive (y>0.824) — works well at current size, unchanged.
    // Order: index 0 = top zone (Functions), 1 = middle zone (Data Model), 2 = bottom zone (IS).
    const ZONES = [
      // Functions: full top-plate face including intersection with middle plate (y 0.035–0.295).
      { cxf: 0.480, cyf: 0.165, hwf: 0.20, hhf: 0.115, triBotF: 0, triTopHF: 0, triTopDropF: 0, rotDeg: 0 },
      // DataModel: hexagon body + downward triangle extension at the bottom.
      { cxf: 0.491, cyf: 0.488, hwf: 0.395, hhf: 0.152, triBotF: 0.10, triTopHF: 0.04, triTopDropF: 0, rotDeg: 1 },
      // IS: inverted triangle + two upward triangles at the top (left △ and right △).
      { cxf: 0.499, cyf: 0.880, hwf: 0.32, hhf: 0.097, triBotF: 0, triTopHF: 0.07, triTopDropF: 0.015, rotDeg: 0 },
    ];
    // Layer index → zone index: IS(0)→2, DataModel(1)→1, Functions(2)→0
    const LAYER_TO_ZONE = [2, 1, 0] as const;

    // PNG sized so it fills ~90% of viewport width at the initial zoom (k=0.7).
    // At any other zoom level D3 scales/pans this naturally — no recalculation needed.
    // Aspect must match whichever background is actually shown — layered-bg.png
    // (3-plate stack) and single-plate-bg.png (filtered subviews) have different
    // proportions; using the wrong one pillarboxes the image inside stackBounds,
    // so nodes (positioned assuming a full-bleed diamond) end up outside its
    // actual rendered edges.
    const IMG_ASPECT = layeredSubview === "all" ? 2882 / 1368 : 2998 / 1658;
    const imgW = (W * 0.9) / INITIAL_K;
    const imgH = imgW / IMG_ASPECT;
    const imgX = W / 2 / INITIAL_K - imgW / 2;   // centered at screen-center-equivalent local x
    const imgY = H / 2 / INITIAL_K - imgH / 2;

    // Zone bounds in SVG coordinates (with hard y limits for clamping).
    // triBot: downward triangle extension below the hex body (DataModel only).
    // triTop: two upward triangles at the top-left and top-right of the IS zone (visual only).
    const zoneSVG = ZONES.map(z => ({
      cx: imgX + z.cxf * imgW,
      cy: imgY + z.cyf * imgH,
      hw: z.hwf * imgW,
      hh: z.hhf * imgH,
      triBot: z.triBotF * imgH,
      triTop: z.triTopHF * imgH,
      triTopDrop: z.triTopDropF * imgH,
      hexYMax: imgY + (z.cyf + z.hhf) * imgH,
      yMin: imgY + (z.cyf - z.hhf) * imgH,
      yMax: imgY + (z.cyf + z.hhf + z.triBotF) * imgH,
      rot: z.rotDeg * Math.PI / 180,
    }));

    const layerOf = (n: GraphNode): 0 | 1 | 2 =>
      n.nodeType === "information-system" ? 0 : n.nodeType === "function" ? 2 : 1;

    const settled = nodes.filter(n => n.x != null && n.y != null);

    // Max NODE_SIZE per layer (IS=56, DataModel=62 process, Functions=50)
    const LAYER_MAX_SIZE = [56, 62, 50] as const;

    const positions = new Map<string, { x: number; y: number; scale: number }>();
    const layerMetaOut: Array<{ gridCy: number; hwInner: number; hhInner: number; li: 0 | 1 | 2 }> = [];

    for (const li of [0, 1, 2] as const) {
      const layerNodes = settled.filter(n => layerOf(n) === li);
      if (layerNodes.length === 0) continue;

      const zone = zoneSVG[LAYER_TO_ZONE[li]];

      const n = layerNodes.length;
      const hw0 = zone.hw, hh0 = zone.hh, cy0 = zone.cy;
      let cx = zone.cx;

      // Detect single-layer subview early — polygon and spacing both depend on it.
      const isSingleLayerSpread =
        (li === 0 && layeredSubview === "systems") ||
        (li === 1 && layeredSubview === "pi-graph") ||
        (li === 2 && layeredSubview === "intelligence");

      // ─── Exact polygon vertices — identical math to the debug overlay ──────
      let zonePoly: Array<{ x: number; y: number }>;
      if (isSingleLayerSpread) {
        // The "all" zone fractions were calibrated against the 3-plate stack image.
        // single-plate-bg.png is ONE plate filling the full image; pixel analysis gives:
        //   center ≈ (0.51, 0.50), half-extents ≈ hwf 0.46, hhf 0.47.
        // Use slightly inset values (0.43) so nodes don't render on the rim.
        cx = imgX + 0.51 * imgW;
        const plCy = imgY + 0.50 * imgH;
        const plHw = 0.43 * imgW;
        const plHh = 0.43 * imgH;
        zonePoly = [
          { x: cx,        y: plCy - plHh },
          { x: cx + plHw, y: plCy },
          { x: cx,        y: plCy + plHh },
          { x: cx - plHw, y: plCy },
        ];
      } else if (li === 0) {
        const outerTopY = cy0 - hh0 + zone.triTopDrop;
        const botY      = cy0 + hh0;
        zonePoly = [
          { x: cx + hw0,              y: outerTopY },
          { x: cx,                     y: botY      },
          { x: cx - hw0 - hw0 * 0.015, y: outerTopY },
        ];
      } else if (li === 2) {
        const triH   = hh0 * 0.30;
        const sideW2 = 2 * hh0 * 0.40 * 1.4;
        zonePoly = [
          rot2d(cx,                 cy0 - hh0 - triH, cx, cy0, zone.rot),
          rot2d(cx + hw0 + sideW2,  cy0,              cx, cy0, zone.rot),
          rot2d(cx,                 cy0 + hh0 + triH, cx, cy0, zone.rot),
          rot2d(cx - hw0 - sideW2,  cy0,              cx, cy0, zone.rot),
        ];
      } else {
        const hwTop  = hw0 * 0.50; // shapeHwDebug(-hh0) for DataModel
        const hwLeft = hwTop * 0.8, hwRight = hwTop;
        const topY   = cy0 - hh0, apexY = topY - zone.triTop;
        const flatFrac = 0.25;
        const sideWL = 2 * hh0 * flatFrac * 1.4, sideWR = 2 * hh0 * flatFrac * 1.8;
        const yBot0  = hh0 + zone.triBot;
        zonePoly = [
          rot2d(cx - hwRight + hwLeft / 2, apexY,       cx, cy0, zone.rot),
          rot2d(cx - hwRight + hwLeft,     topY,         cx, cy0, zone.rot),
          rot2d(cx,                        topY,         cx, cy0, zone.rot),
          rot2d(cx + hwRight / 2,          apexY,        cx, cy0, zone.rot),
          rot2d(cx + hw0 + sideWR,         cy0,          cx, cy0, zone.rot),
          rot2d(cx + hw0 * 0.05,           cy0 + yBot0,  cx, cy0, zone.rot),
          rot2d(cx - hw0 - sideWL,         cy0,          cx, cy0, zone.rot),
        ];
      }

      // ─── Polygon area (shoelace) → accurate node-size estimate ────────────
      const polyArea = Math.abs(zonePoly.reduce((s, v, i) => {
        const nv = zonePoly[(i + 1) % zonePoly.length];
        return s + v.x * nv.y - nv.x * v.y;
      }, 0)) / 2;

      const areaCoeff = isSingleLayerSpread ? 0.22 : 0.65;
      const maxScale  = isSingleLayerSpread ? 0.65 : 0.85;
      const targetRx  = Math.sqrt(polyArea * areaCoeff / (n * 6.0));
      const nodeScale = Math.max(0.20, Math.min(maxScale, (targetRx * 2) / LAYER_MAX_SIZE[li]));
      const sizeMax   = LAYER_MAX_SIZE[li] * nodeScale;
      // r = half the icon's rendered width — the packing "radius".
      // (ICON_FOOT_OFFSET is a fraction of iconH, not sizeMax, so it plays no role here.)
      const R_x       = Math.ceil(sizeMax / 2);
      const MIN_SEP_ICON   = R_x * 2.2;
      const zoneFitsLabels = (polyArea * 0.6) / (70 * 70) >= n;
      // In spread mode: target 75% of the natural inter-node distance for the polygon
      // area, capped at 90px so a lone node doesn't push infinitely far. Makes spacing
      // adapt to node count — few nodes get generous room, many nodes still fit.
      const MIN_SEP_SPREAD = Math.min(Math.sqrt(polyArea / n) * 0.75, 90);
      const MIN_SEP        = isSingleLayerSpread
        ? Math.max(MIN_SEP_ICON, MIN_SEP_SPREAD)
        : (zoneFitsLabels ? Math.max(MIN_SEP_ICON, 70) : MIN_SEP_ICON);

      // ─── Polygon helpers ──────────────────────────────────────────────────
      const polyYMin  = Math.min(...zonePoly.map(v => v.y));
      const polyYMax  = Math.max(...zonePoly.map(v => v.y));
      // safeY*: restrict scans to the zone's hex body (zone.yMin/yMax).
      // For DataModel the polygon's polyYMin is the apex of the narrow upper triangles —
      // at those y values slicePolyAtY returns 4 intersections (the concave notch
      // splits into two disconnected ears) and xMin/xMax spans the empty gap between
      // them, placing nodes outside the polygon.  Clamping to zone.yMin (= topY of the
      // hex body) skips that region entirely.  For IS and Functions the safe bounds are
      // equal to or more conservative than the polygon extremes, so they're harmless.
      // In single-layer spread mode, use the full polygon y-extent — zone.yMin/yMax were
      // calibrated for the "all" view and clip the rotated rhombus by ~30% top/bottom.
      const safeYMin  = isSingleLayerSpread ? polyYMin : Math.max(zone.yMin, polyYMin);
      const safeYMax  = isSingleLayerSpread ? polyYMax : Math.min(zone.yMax, polyYMax);
      // Treat each node as a circle of radius R_x centred at its foot position.
      const sweepYMin = safeYMin + R_x;
      const sweepYMax = safeYMax - R_x;
      const gridCy    = (sweepYMin + sweepYMax) / 2;
      const hwInner   = Math.max(...zonePoly.map(v => Math.abs(v.x - cx)));
      const hhInner   = Math.max((sweepYMax - sweepYMin) / 2, 1);

      // Horizontal intersection with polygon edges at y; returns xMin/xMax or null.
      const slicePolyAtY = (y: number): { xMin: number; xMax: number } | null => {
        const xs: number[] = [];
        const m = zonePoly.length;
        for (let i = 0; i < m; i++) {
          const a = zonePoly[i], b = zonePoly[(i + 1) % m];
          if ((a.y <= y && b.y > y) || (b.y <= y && a.y > y))
            xs.push(a.x + (y - a.y) * (b.x - a.x) / (b.y - a.y));
        }
        if (xs.length < 2) return null;
        return { xMin: Math.min(...xs), xMax: Math.max(...xs) };
      };

      // Valid x range for a circle of radius R_x centred at (px, py).
      // Sweeps 13 horizontal slices through the circle — clamped to safeY* so scans
      // never enter the non-convex triangle regions — and takes the tightest polygon
      // x-constraint at each level, so slanted walls never let the circle poke through.
      const circleFitX = (py: number): { xMin: number; xMax: number } | null => {
        let xL = -Infinity, xR = Infinity;
        const STEPS = 12;
        for (let s = 0; s <= STEPS; s++) {
          const dy    = R_x * (2 * s / STEPS - 1);                           // −R_x … +R_x
          const h     = Math.max(safeYMin, Math.min(safeYMax, py + dy));      // stay in safe zone
          const slice = slicePolyAtY(h);
          if (!slice) continue;
          const halfX = Math.sqrt(Math.max(0, R_x * R_x - dy * dy));
          xL = Math.max(xL, slice.xMin + halfX);
          xR = Math.min(xR, slice.xMax - halfX);
        }
        return xR >= xL && xL > -Infinity ? { xMin: xL, xMax: xR } : null;
      };

      // Clamp a point so its circle stays entirely inside the polygon boundary.
      const applyShape = (p: { x: number; y: number }) => {
        p.y = Math.max(sweepYMin, Math.min(sweepYMax, p.y));
        const fit = circleFitX(p.y);
        if (fit) {
          p.x = Math.max(fit.xMin, Math.min(fit.xMax, p.x));
        } else {
          p.x = cx;
        }
      };

      // ─── Row-sweep candidate grid (polygon-clipped, staggered rows) ───────
      const rowStep  = isSingleLayerSpread ? MIN_SEP * 0.45 : MIN_SEP * 0.80;
      const colStep  = MIN_SEP;
      const candidates: Array<{ x: number; y: number }> = [];
      let rowIdx = 0;
      for (let ry = sweepYMin; ry <= sweepYMax + rowStep * 0.01; ry += rowStep) {
        const slice = slicePolyAtY(Math.min(ry, sweepYMax));
        if (slice) {
          const xL = slice.xMin + R_x, xR = slice.xMax - R_x;
          if (xR >= xL) {
            const hexOff = (rowIdx % 2) * (colStep * 0.5);
            for (let rx = xL + hexOff; rx <= xR + colStep * 0.01; rx += colStep)
              candidates.push({ x: Math.min(rx, xR), y: ry });
          }
        }
        rowIdx++;
      }

      // ─── Farthest-point greedy selection: pick n well-spread positions ─────
      const sortedNodes = [...layerNodes].sort((a, b) => (a.id < b.id ? -1 : 1));
      const selected: Array<{ x: number; y: number }> = [];

      if (candidates.length === 0) {
        for (let i = 0; i < n; i++) selected.push({ x: cx, y: gridCy });
      } else {
        // Seed nearest to centroid, then repeatedly pick the candidate farthest
        // from all already-selected — this spreads n points across the polygon.
        const startIdx = candidates.reduce((best, c, i) =>
          Math.hypot(c.x - cx, c.y - gridCy) < Math.hypot(candidates[best].x - cx, candidates[best].y - gridCy) ? i : best, 0);
        selected.push(candidates[startIdx]);
        const used = new Set([startIdx]);
        const dists = candidates.map((c, i) =>
          i === startIdx ? 0 : Math.hypot(c.x - candidates[startIdx].x, c.y - candidates[startIdx].y));
        while (selected.length < Math.min(n, candidates.length)) {
          let bestIdx = -1, bestDist = -1;
          for (let i = 0; i < candidates.length; i++) {
            if (!used.has(i) && dists[i] > bestDist) { bestDist = dists[i]; bestIdx = i; }
          }
          if (bestIdx < 0) break;
          used.add(bestIdx);
          selected.push(candidates[bestIdx]);
          const s = candidates[bestIdx];
          for (let i = 0; i < candidates.length; i++) {
            if (used.has(i)) continue;
            const d = Math.hypot(candidates[i].x - s.x, candidates[i].y - s.y);
            if (d < dists[i]) dists[i] = d;
          }
        }
        // Overflow: spiral near centre for any nodes that didn't get a grid slot.
        while (selected.length < n) {
          const angle = selected.length * 2.3999;
          selected.push({ x: cx + R_x * Math.cos(angle), y: gridCy + R_x * Math.sin(angle) });
        }
      }

      // ─── Assign + organic jitter + boundary clamp ─────────────────────────
      let pts: Array<{ id: string; x: number; y: number }> = selected.map((c, i) => {
        const jy = (((i * 0.618) % 1) - 0.5) * rowStep * 0.50;
        const jx = (((i * 0.382) % 1) - 0.5) * colStep * 0.35;
        return { id: sortedNodes[i].id, x: c.x + jx, y: c.y + jy };
      });
      for (const p of pts) applyShape(p);

      // ─── Repulsion: settle nodes to organic, non-overlapping positions ─────
      for (let iter = 0; iter < 200; iter++) {
        const cooling = 1 - iter / 200;
        for (let i = 0; i < pts.length; i++) {
          for (let j = i + 1; j < pts.length; j++) {
            const dx = pts[j].x - pts[i].x;
            const dy = pts[j].y - pts[i].y;
            const d  = Math.sqrt(dx * dx + dy * dy);
            if (d < MIN_SEP) {
              const ux = d > 0.5 ? dx / d : Math.cos(i * 2.399 + j);
              const uy = d > 0.5 ? dy / d : Math.sin(i * 2.399 + j);
              const push = (MIN_SEP - d) / 2 * (1 + cooling * 0.5);
              pts[i].x -= ux * push; pts[i].y -= uy * push;
              pts[j].x += ux * push; pts[j].y += uy * push;
            }
          }
        }
        for (const p of pts) applyShape(p);
      }

      for (const p of pts) positions.set(p.id, { x: p.x, y: p.y, scale: nodeScale });
      layerMetaOut.push({ gridCy, hwInner, hhInner, li });
    }

    return { positions, stackBounds: { imgX, imgY, imgW, imgH }, zoneSVG, layerMeta: layerMetaOut };
  }, [layeredMode, nodes, dimensions, layeredSubview]);

  const layeredPos = layeredData?.positions ?? null;

  // Drag via pointer events
  const onNodePointerDown = useCallback((e: React.PointerEvent, nodeId: string) => {
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    draggingRef.current = { nodeId };
    if (simulationRef.current) {
      simulationRef.current.alphaTarget(0.3).restart();
      const node = simulationRef.current.nodes().find((n) => n.id === nodeId);
      if (node) { node.fx = node.x; node.fy = node.y; }
    }
  }, []);

  const onNodePointerMove = useCallback((e: React.PointerEvent) => {
    if (!draggingRef.current || !simulationRef.current || !gRef.current) return;
    const ctm = gRef.current.getCTM();
    if (!ctm) return;
    const scale = ctm.a;
    const node = simulationRef.current.nodes().find((n) => n.id === draggingRef.current!.nodeId);
    if (node) {
      node.fx = (node.fx ?? 0) + (e.movementX / scale);
      node.fy = (node.fy ?? 0) + (e.movementY / scale);
    }
  }, []);

  const onNodePointerUp = useCallback((e: React.PointerEvent) => {
    if (!draggingRef.current) return;
    (e.target as Element).releasePointerCapture(e.pointerId);
    if (simulationRef.current) {
      simulationRef.current.alphaTarget(0);
      const node = simulationRef.current.nodes().find((n) => n.id === draggingRef.current!.nodeId);
      if (node) { node.fx = null; node.fy = null; }
    }
    draggingRef.current = null;
  }, []);

  // Zoom-control pill handlers. Fit generalizes the same "fit to node +
  // neighbors" logic the selection effect above already runs automatically —
  // fit-all when nothing is selected/filtered, fit-to-filtered-type when a
  // sidebar type filter is active, fit-to-neighbors when a node is selected.
  const handleZoomFit = useCallback(() => {
    if (!svgRef.current || !zoomBehaviorRef.current || !simulationRef.current) return;
    if (layeredMode) {
      const k = 0.85;
      const INITIAL_K = 0.7;
      const W = svgRef.current.clientWidth;
      const H = svgRef.current.clientHeight;
      const tx = W / 2 * (1 - k / INITIAL_K);
      const ty = H / 2 * (1 - k / INITIAL_K);
      select(svgRef.current).transition().duration(450).call(
        zoomBehaviorRef.current.transform,
        zoomIdentity.translate(tx, ty).scale(k),
      );
      return;
    }
    const sim = simulationRef.current;
    const simNodes = sim.nodes();
    let targets: GraphNode[];
    if (selectedNode) {
      const focus = simNodes.find((n) => n.id === selectedNode.id);
      if (!focus || focus.x == null) return;
      const linkForce = sim.force("link") as { links?: () => GraphLink[] } | null;
      const allLinks = (linkForce?.links?.() ?? []) as GraphLink[];
      const neighborIds = new Set<string>([focus.id]);
      for (const link of allLinks) {
        const s = link.source as GraphNode;
        const t = link.target as GraphNode;
        if (s.id === focus.id) neighborIds.add(t.id);
        if (t.id === focus.id) neighborIds.add(s.id);
      }
      targets = simNodes.filter((n) => neighborIds.has(n.id) && n.x != null && n.y != null);
    } else if (activeFilter) {
      targets = simNodes.filter((n) => n.nodeType === activeFilter && n.x != null && n.y != null);
    } else {
      targets = simNodes.filter((n) => n.x != null && n.y != null);
    }
    if (targets.length === 0) return;
    const xs = targets.map((n) => n.x!), ys = targets.map((n) => n.y!);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
    const padding = 120;
    const w = (maxX - minX) + padding * 2;
    const h = (maxY - minY) + padding * 2;
    const panelReserve = selectedNode ? 360 : 0;
    const visibleWidth = Math.max(dimensions.width - panelReserve, 320);
    const scale = Math.min(visibleWidth / w, dimensions.height / h, 2);
    const tx = visibleWidth / 2 - cx * scale;
    const ty = dimensions.height / 2 - cy * scale;
    const svg = select(svgRef.current);
    svg.transition().duration(450).call(
      zoomBehaviorRef.current.transform,
      zoomIdentity.translate(tx, ty).scale(scale),
    );
  }, [selectedNode, activeFilter, dimensions, layeredMode, filterProcessIds, filterISIds]);

  // Reset zoom when entering layered mode; restrict min scale to 0.85 (initial) so user
  // can only zoom in. When leaving, restore the full [0.15, 5] range.
  useEffect(() => {
    if (!zoomBehaviorRef.current) return;
    if (layeredMode) {
      zoomBehaviorRef.current.scaleExtent([0.85, 5]);
      // Defer the zoom reset to rAF so it fires outside the React lifecycle cycle,
      // allowing flushSync inside the zoom handler to work without warnings.
      const raf = requestAnimationFrame(() => {
        if (svgRef.current && zoomBehaviorRef.current) {
          const k = 0.85;
          const INITIAL_K = 0.7;
          const W = svgRef.current.clientWidth;
          const H = svgRef.current.clientHeight;
          // Plate local center is (W/2/INITIAL_K, H/2/INITIAL_K). Translate so it
          // lands at screen center (W/2, H/2) at scale k.
          const tx = W / 2 * (1 - k / INITIAL_K);
          const ty = H / 2 * (1 - k / INITIAL_K);
          select(svgRef.current).call(
            zoomBehaviorRef.current.transform,
            zoomIdentity.translate(tx, ty).scale(k),
          );
        }
      });
      return () => cancelAnimationFrame(raf);
    } else {
      zoomBehaviorRef.current.scaleExtent([0.15, 5]);
      // Exiting layered mode: fit and center the normal graph.
      const raf = requestAnimationFrame(() => handleZoomFit());
      return () => cancelAnimationFrame(raf);
    }
  }, [layeredMode]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto zoom-and-center once the force simulation has settled on initial load —
  // otherwise the graph sits at the fixed mount-time transform (scale 0.7, no pan),
  // which rarely lines up with where the nodes actually settle.
  useEffect(() => {
    if (graphReady) handleZoomFit();
  }, [graphReady]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!graphReady) return;
    const t = setTimeout(() => handleZoomFit(), 50);
    return () => clearTimeout(t);
  }, [filterProcessIds, filterISIds]); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-center when the sidebar collapses/expands — the canvas container's
  // width changes but nothing else was re-fitting the view for it.
  useEffect(() => {
    const raf = requestAnimationFrame(() => handleZoomFit());
    return () => cancelAnimationFrame(raf);
  }, [sidebarCollapsed]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleZoomOut = useCallback(() => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    select(svgRef.current).transition().duration(150).call(zoomBehaviorRef.current.scaleBy, 0.8);
  }, []);

  const handleZoomIn = useCallback(() => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    select(svgRef.current).transition().duration(150).call(zoomBehaviorRef.current.scaleBy, 1.25);
  }, []);

  const handleZoomReset = useCallback(() => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    select(svgRef.current).transition().duration(200).call(zoomBehaviorRef.current.scaleTo, 1);
  }, []);

  // Highlight connected nodes on hover or selection
  // Only highlight direct edges FROM the active node (outbound only)
  const activeNodeId = selectedNode?.id ?? hoveredNode;
  const connectedTo = useMemo(() => {
    if (!activeNodeId) return new Set<string>();
    const set = new Set<string>();
    set.add(activeNodeId);
    for (const link of links) {
      const src = typeof link.source === "string" ? link.source : (link.source as GraphNode).id;
      const tgt = typeof link.target === "string" ? link.target : (link.target as GraphNode).id;
      if (src === activeNodeId) set.add(tgt);
      if (tgt === activeNodeId) set.add(src);
    }
    return set;
  }, [activeNodeId, links]);

  // Track which edges are directly connected to the active node
  const activeEdges = useMemo(() => {
    if (!activeNodeId) return new Set<string>();
    const set = new Set<string>();
    for (const link of links) {
      const src = typeof link.source === "string" ? link.source : (link.source as GraphNode).id;
      const tgt = typeof link.target === "string" ? link.target : (link.target as GraphNode).id;
      if (src === activeNodeId || tgt === activeNodeId) set.add(link.id);
    }
    return set;
  }, [activeNodeId, links]);

  const hasHighlight = activeNodeId != null;

  // Subview node-type filters (empty = show all). Only meaningful in layered mode.
  const SUBVIEW_TYPES: Partial<Record<typeof layeredSubview, NodeType[]>> = {
    systems: ["information-system"],
    "pi-graph": ["object", "event", "process", "metric", "bpmn"],
    intelligence: ["function"],
  };
  const subviewTypes = layeredMode && layeredSubview !== "all" ? SUBVIEW_TYPES[layeredSubview] : null;

  // When a filtered subview is active, compute an offset + scale to center the visible
  // nodes on the plate and guarantee they fit inside its diamond (the per-layer packing
  // was tuned to a cramped irregular zone within the 3-plate stack, not to a plain
  // diamond, so a straight recenter can leave nodes past the single-plate's edges).
  let subviewNodeOffset = { x: 0, y: 0 };
  let subviewNodeScale = 1;
  if (subviewTypes && layeredData && layeredPos) {
    const visiblePos = nodes
      .filter((n) => subviewTypes.includes(n.nodeType))
      .map((n) => layeredPos.get(n.id))
      .filter((p): p is { x: number; y: number; scale: number } => p != null);
    if (visiblePos.length > 0) {
      const minX = Math.min(...visiblePos.map((p) => p.x));
      const maxX = Math.max(...visiblePos.map((p) => p.x));
      const minY = Math.min(...visiblePos.map((p) => p.y));
      const maxY = Math.max(...visiblePos.map((p) => p.y));
      const imgCx = layeredData.stackBounds.imgX + layeredData.stackBounds.imgW / 2;
      const imgCy = layeredData.stackBounds.imgY + layeredData.stackBounds.imgH / 2;
      const clusterCx = (minX + maxX) / 2;
      const clusterCy = (minY + maxY) / 2;
      // Diamond half-extents (padded so pucks don't sit flush on the sloped edge).
      const DIAMOND_SAFE_PAD = 0.75;
      const halfDiamondW = (layeredData.stackBounds.imgW / 2) * DIAMOND_SAFE_PAD;
      const halfDiamondH = (layeredData.stackBounds.imgH / 2) * DIAMOND_SAFE_PAD;
      // A point (dx, dy) from the cluster center sits inside a diamond of half-extents
      // (halfDiamondW, halfDiamondH) iff |dx|/halfDiamondW + |dy|/halfDiamondH <= 1 —
      // NOT two independent rectangular checks. A diamond tapers to a point at each
      // edge-midpoint, so a node far out horizontally has almost no vertical room even
      // if its x-offset alone looks "safe" — checking each axis separately (the
      // previous approach) misses that and lets such nodes poke past the sloped edge.
      // Find the worst-case node and scale so it lands exactly on the boundary.
      let maxRatio = 0;
      for (const p of visiblePos) {
        const ratio = Math.abs(p.x - clusterCx) / halfDiamondW + Math.abs(p.y - clusterCy) / halfDiamondH;
        if (ratio > maxRatio) maxRatio = ratio;
      }
      subviewNodeScale = maxRatio > 1 ? 1 / maxRatio : 1;
      // Call sites apply `raw * subviewNodeScale + subviewNodeOffset`, so the offset
      // must account for the scale too — otherwise the cluster's center wouldn't land
      // exactly on the diamond's center once scaled.
      subviewNodeOffset = { x: imgCx - clusterCx * subviewNodeScale, y: imgCy - clusterCy * subviewNodeScale };
    }
  }

  // Label visibility by zoom: below 1.0x, only process labels show; above
  // that, every node type shows its own label — purely zoom-driven, not
  // gated on how many processes happen to be visible at once (deliberate
  // deviation from the reference, which also suppresses non-process labels
  // whenever more than one process is in view regardless of zoom), and the
  // same fixed 1.0x threshold applies in layered mode too (previously scaled
  // with node count, which — combined with click-highlight dimming already
  // being mode-independent — meant a clicked/connected subset still couldn't
  // show labels unless zoomed in far past what regular mode requires).
  const allowedLabelTypes = useMemo(() => {
    const forceAllLabels = hoveredNode != null || selectedNode != null
      || filterProcessIds.size > 0 || filterISIds.size > 0 || filterEntitiesEngaged;
    if (!forceAllLabels && zoomLevel < (layeredMode ? 1.15 : 1.0)) {
      if (layeredMode && layeredSubview === "systems") return new Set<NodeType>(["information-system"]);
      if (layeredMode && layeredSubview === "intelligence") return new Set<NodeType>(["function"]);
      if (layeredMode && layeredSubview === "pi-graph") return new Set<NodeType>(["object", "event", "metric", "process", "bpmn", "perspective"]);
      return new Set<NodeType>(["process"]);
    }
    return new Set<NodeType>(["process", "object", "event", "metric", "function", "bpmn", "perspective", "information-system", "business-rule", "role"]);
  }, [zoomLevel, hoveredNode, selectedNode, layeredMode, layeredSubview, filterProcessIds, filterISIds, filterEntitiesEngaged]);

  // Canvas shrinks when the Data Preview panel is open so nodes don't hide
  // behind it; zoom controls shift up to sit above it too.
  const graphH = dimensions.height - (dataPreviewNode ? 280 : 0);
  const zoomBottom = dataPreviewNode ? 296 : 16;

  // Effective render position for a node — the layered-plate position (plus
  // subview re-centering offset) when layered mode is on, otherwise its normal
  // force-simulation position. Returns null when the node shouldn't render at
  // all (e.g. filtered out of the active subview).
  const effPos = (n: GraphNode): { x: number; y: number } | null => {
    if (layeredMode) {
      const p = layeredPos?.get(n.id);
      if (!p) return null;
      const s = subviewTypes ? subviewNodeScale : 1;
      const ox = subviewTypes ? subviewNodeOffset.x : 0;
      const oy = subviewTypes ? subviewNodeOffset.y : 0;
      return { x: p.x * s + ox, y: p.y * s + oy };
    }
    if (n.x == null || n.y == null) return null;
    return { x: n.x, y: n.y };
  };

  return (
    <div className="w-full h-full flex flex-col overflow-hidden">
      {/* Row 1: blank sidebar-width spacer + tab bar — spans the full width,
          above both the sidebar and the canvas, so the sidebar itself sits
          lower (aligned with the canvas content), matching the reference. */}
      <div className="flex shrink-0 border-b border-[#e2e8f0] bg-[#fafafd]">
        {!sidebarCollapsed && <div className="w-[260px] shrink-0 border-r border-[#e2e8f0]" />}
        <div className="flex-1 flex items-end gap-1 px-2">
          <button
            type="button"
            onClick={() => setSidebarCollapsed((c) => !c)}
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="shrink-0 self-end mb-1 h-7 w-7 flex items-center justify-center rounded text-[#94a3b8] hover:text-[#0a1f44] hover:bg-[#e2e8f0] transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" style={sidebarCollapsed ? { transform: "scaleX(-1)" } : undefined}>
              <path fill="currentColor" d="M14.808 9.249a.75.75 0 0 0-1.06-.056l-2.5 2.25a.75.75 0 0 0 0 1.114l2.5 2.25a.75.75 0 0 0 1.004-1.115l-1.048-.942h3.546a.75.75 0 1 0 0-1.5h-3.546l1.048-.942a.75.75 0 0 0 .055-1.059M2 17.251A2.75 2.75 0 0 0 4.75 20h14.5A2.75 2.75 0 0 0 22 17.25V6.75A2.75 2.75 0 0 0 19.25 4H4.75A2.75 2.75 0 0 0 2 6.75zm2.75 1.25c-.69 0-1.25-.56-1.25-1.25V6.749c0-.69.56-1.25 1.25-1.25h3.254V18.5zm4.754 0V5.5h9.746c.69 0 1.25.56 1.25 1.25v10.5c0 .69-.56 1.25-1.25 1.25z" />
            </svg>
          </button>
          {openTabs.map((tab) => {
            const isActive = tab.id === activeTabId;
            return (
              <div
                key={tab.id}
                onClick={() => setActiveTabId(tab.id)}
                className={
                  "flex items-center gap-2 h-8 pl-3 pr-1.5 text-[12px] cursor-pointer rounded-t-md select-none border border-[#e2e8f0] -mb-px " +
                  (isActive
                    ? "bg-white text-[#0a1f44] font-medium border-b-white"
                    : "bg-[#fafafd] text-[#64748b] hover:bg-white")
                }
              >
                <span>{tab.label}</span>
                {tab.type !== "context-model" && (
                  <button
                    type="button"
                    aria-label={`Close ${tab.label}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenTabs((tabs) => {
                        const filtered = tabs.filter((t) => t.id !== tab.id);
                        if (tab.id === activeTabId) {
                          setActiveTabId(filtered[filtered.length - 1]?.id ?? "context-model");
                        }
                        return filtered;
                      });
                    }}
                    className="w-5 h-5 flex items-center justify-center rounded hover:bg-[#e2e8f0] text-[#94a3b8] hover:text-[#0a1f44]"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" pointerEvents="none">
                      <path
                        fill="currentColor"
                        d="m4.21 4.387.083-.094a1 1 0 0 1 1.32-.083l.094.083L12 10.585l6.293-6.292a1 1 0 1 1 1.414 1.414L13.415 12l6.292 6.293a1 1 0 0 1 .083 1.32l-.083.094a1 1 0 0 1-1.32.083l-.094-.083L12 13.415l-6.293 6.292a1 1 0 0 1-1.414-1.414L10.585 12 4.293 5.707a1 1 0 0 1-.083-1.32l.083-.094z"
                      />
                    </svg>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Row 2: sidebar + canvas, side by side, below Row 1. */}
      <div className="flex-1 flex overflow-hidden">
      {!sidebarCollapsed && (
        <LeftSidebar
          spec={spec}
          onFilterType={setActiveFilter}
          activeFilter={activeFilter}
          onOpenBpmn={(name) => {
            // Sidebar process click → open as a sibling tab next to Context Model
            // (not a stacked overlay), matching the real CCM DockView behavior.
            const proc = (spec.processes ?? []).find((p) => p.displayName === name);
            if (!proc) return;
            const tabId = `bpmn-${proc.id}`;
            setOpenTabs((tabs) =>
              tabs.some((t) => t.id === tabId)
                ? tabs
                : [...tabs, { id: tabId, label: proc.displayName, type: "bpmn", processId: proc.id }],
            );
            setActiveTabId(tabId);
          }}
          onSelectByName={selectByName}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />
      )}

      {/* Main canvas area */}
      <div className="flex-1 relative overflow-hidden flex flex-col">
        {/* Canvas with grid background — always mounted (so the d3 simulation
            doesn't restart on tab switches); display:none hides it when a BPMN
            tab is active. */}
        <div
          className="flex-1 relative overflow-hidden"
          style={{
            display: activeTabId === "context-model" ? undefined : "none",
            background: subviewTypes ? "#ffffff" : "#fafbfc",
          }}
        >
        {/* Floating search + filter — top-left of the canvas. Shares the same
            searchQuery state as the sidebar search input. */}
        <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 w-[18%]">
          <div className="flex items-center gap-1.5 flex-1 h-8 px-2 rounded border border-[#e2e8f0] bg-white/90 backdrop-blur-sm shadow-sm">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" className="shrink-0 text-[#94a3b8]">
              <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2"/>
              <path d="m21 21-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search…"
              className="flex-1 min-w-0 bg-transparent text-[11px] text-[#334155] placeholder:text-[#94a3b8] outline-none"
            />
          </div>
          <button
            onClick={() => setFilterPanelOpen((o) => !o)}
            style={filterPanelOpen
              ? { background: "oklch(0.52201 0.266224 266.442)", color: "white", borderColor: "transparent" }
              : undefined}
            className="shrink-0 h-8 w-8 flex items-center justify-center rounded border border-[#e2e8f0] bg-white/90 backdrop-blur-sm shadow-sm hover:bg-[#f1f5f9] text-[#64748b] hover:text-[#0a1f44] transition-all"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path fillRule="evenodd" d="m9.401 12.66-6.21-7.344A.8.8 0 0 1 3.8 4h16a.8.8 0 0 1 .61 1.316l-6.21 7.344V19.2a.8.8 0 0 1-1.158.715l-3.2-1.6a.8.8 0 0 1-.442-.715zm8.675-7.06H5.526l5.286 6.25a.8.8 0 0 1 .189.517v4.737l1.6.8v-5.537a.8.8 0 0 1 .189-.516z" clipRule="evenodd"/>
            </svg>
          </button>
        </div>

        {/* Active filter chips */}
        {(filterProcessIds.size > 0 || filterISIds.size > 0 || filterEntitiesEngaged) && (() => {
          const chipStyle: React.CSSProperties = {
            display: "flex", alignItems: "center", gap: 5, height: 28,
            padding: "0 8px", borderRadius: 6, fontSize: 11, fontWeight: 500,
            fontFamily: "Inter, sans-serif", whiteSpace: "nowrap",
            background: "white", border: "1px solid #e2e8f0",
            boxShadow: "0 1px 2px rgba(0,0,0,0.06)", color: "#334155",
          };
          const xBtn: React.CSSProperties = {
            display: "flex", alignItems: "center", justifyContent: "center",
            width: 14, height: 14, borderRadius: 3, cursor: "pointer",
            color: "#94a3b8", flexShrink: 0, background: "none", border: "none", padding: 0,
          };

          const processChips = (spec.processes ?? []).filter((p) => filterProcessIds.has(p.id));
          const isChips = (spec.informationSystems ?? []).filter((is) => filterISIds.has(is.id));

          let entityChip: React.ReactNode = null;
          if (filterEntitiesEngaged) {
            const allEntityTypes = [...new Set(nodes.map((n) => n.nodeType))];
            const totalTypes = allEntityTypes.length;
            const visibleTypes = filterNodeTypes.size;
            const hiddenTypes = totalTypes - visibleTypes;
            const label = hiddenTypes === totalTypes
              ? `${totalTypes} Entity Types Hidden`
              : hiddenTypes > 0
              ? `${hiddenTypes} of ${totalTypes} Entity Types Hidden`
              : "All Entity Types Visible";
            entityChip = (
              <div style={chipStyle}>
                <span>{label}</span>
                <button style={xBtn} onClick={() => { setFilterEntitiesEngaged(false); setFilterNodeTypes(new Set()); }}>
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M1 1l8 8M9 1L1 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                </button>
              </div>
            );
          }

          return (
            <div className="absolute top-3 z-10 flex items-center gap-1.5 flex-wrap" style={{ left: "calc(18% + 24px)" }}>
              {processChips.map((p) => (
                <div key={p.id} style={chipStyle}>
                  <span>{p.displayName}</span>
                  <button style={xBtn} onClick={() => { const s = new Set(filterProcessIds); s.delete(p.id); setFilterProcessIds(s); }}>
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M1 1l8 8M9 1L1 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                  </button>
                </div>
              ))}
              {isChips.map((is) => (
                <div key={is.id} style={chipStyle}>
                  <span>{is.displayName}</span>
                  <button style={xBtn} onClick={() => { const s = new Set(filterISIds); s.delete(is.id); setFilterISIds(s); }}>
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M1 1l8 8M9 1L1 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                  </button>
                </div>
              ))}
              {entityChip}
            </div>
          );
        })()}

        {/* Filter panel */}
        {filterPanelOpen && (() => {
          const processes = spec.processes ?? [];
          const infoSystems = spec.informationSystems ?? [];
          const Icon = ({ children }: { children: React.ReactNode }) => (
            <span style={{ width: 14, height: 14, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "hidden" }}>
              {children}
            </span>
          );
          const entityTypes: { type: string; label: string; count: number; color: string; icon: React.ReactNode }[] = [
            { type: "object", label: "Object Types", count: spec.objects.length, color: NODE_COLORS.object, icon: <Icon>{entityTypeIcon("object", 14)}</Icon> },
            { type: "event", label: "Event Sources", count: (spec.events ?? []).length, color: NODE_COLORS.event, icon: <Icon>{entityTypeIcon("event", 14)}</Icon> },
            { type: "process", label: "Processes", count: processes.length, color: NODE_COLORS.process, icon: <Icon>{entityTypeIcon("process", 14)}</Icon> },
            { type: "metric", label: "Metrics", count: (spec.metrics ?? []).filter((m) => !m.isFunction).length, color: NODE_COLORS.metric, icon: <Icon>{entityTypeIcon("metric", 14)}</Icon> },
            { type: "function", label: "PQL Functions", count: (spec.metrics ?? []).filter((m) => m.isFunction).length, color: NODE_COLORS.function, icon: <Icon>{entityTypeIcon("function", 14)}</Icon> },
            { type: "bpmn", label: "BPMN Models", count: (spec.bpmnModels ?? []).length, color: NODE_COLORS.bpmn, icon: <Icon>{entityTypeIcon("bpmn", 14)}</Icon> },
            { type: "information-system", label: "Information Systems", count: infoSystems.length, color: NODE_COLORS["information-system"], icon: <Icon>{entityTypeIcon("information-system", 14)}</Icon> },
            { type: "business-rule", label: "Business Rules", count: (spec.businessRules ?? []).length, color: NODE_COLORS["business-rule"], icon: <Icon>{entityTypeIcon("business-rule", 14)}</Icon> },
            { type: "role", label: "Roles", count: (spec.roles ?? []).length, color: NODE_COLORS.role, icon: <Icon>{entityTypeIcon("role", 14)}</Icon> },
          ].filter((e) => e.count > 0);

          const toggle = (set: Set<string>, val: string, setter: (s: Set<string>) => void) => {
            const next = new Set(set);
            if (next.has(val)) next.delete(val); else next.add(val);
            setter(next);
          };
          const allTypesSelected = !filterEntitiesEngaged || entityTypes.every((e) => filterNodeTypes.has(e.type));
          const hasAnyFilter = filterProcessIds.size > 0 || filterISIds.size > 0 || filterEntitiesEngaged;

          return (
            <div className="absolute left-3 z-20 bg-white border border-[#e2e8f0] rounded-xl shadow-xl flex flex-col w-[18%]"
              style={{ top: 48, maxHeight: "calc(100% - 48px - 64px)", overflow: "hidden" }}>
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#e2e8f0] shrink-0">
                <span style={{ fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600, color: "#0a1f44" }}>Filters</span>
                {hasAnyFilter && (
                  <button onClick={() => { setFilterProcessIds(new Set()); setFilterISIds(new Set()); setFilterNodeTypes(new Set()); setFilterEntitiesEngaged(false); }}
                    style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: "oklch(0.52201 0.266224 266.442)", fontWeight: 500 }}>
                    Clear All
                  </button>
                )}
              </div>

              <div className="overflow-y-auto">
                {processes.length > 0 && (
                  <div className="px-4 py-3 border-b border-[#f1f5f9]">
                    <div className="flex items-center gap-1.5 mb-2">
                      <span style={{ color: NODE_COLORS.process, display: "flex", width: 14, height: 14, alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{entityTypeIcon("process", 14)}</span>
                      <span style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, color: "#0a1f44" }}>
                        Processes <span style={{ color: "#94a3b8", fontWeight: 400 }}>({processes.length})</span>
                      </span>
                    </div>
                    {processes.map((p) => (
                      <label key={p.id} className="flex items-center gap-2 py-1 cursor-pointer">
                        <input type="checkbox" checked={filterProcessIds.has(p.id)}
                          onChange={() => toggle(filterProcessIds, p.id, setFilterProcessIds)}
                          className="rounded border-[#cbd5e1] w-3.5 h-3.5 shrink-0 accent-[#0a1f44]" />
                        <span style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: "#334155" }}>{p.displayName}</span>
                      </label>
                    ))}
                  </div>
                )}

                <div className="px-4 py-3 border-b border-[#f1f5f9]">
                  <div className="flex items-center justify-between mb-2">
                    <span style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, color: "#0a1f44" }}>Entities</span>
                    <button onClick={() => {
                        if (allTypesSelected) {
                          setFilterEntitiesEngaged(true); setFilterNodeTypes(new Set());
                        } else {
                          setFilterEntitiesEngaged(false); setFilterNodeTypes(new Set());
                        }
                      }}
                      style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: "#0a1f44", fontWeight: 700 }}>
                      {allTypesSelected ? "Deselect all" : "Select all"}
                    </button>
                  </div>
                  {entityTypes.map((e) => (
                    <div key={e.type} className="flex items-center gap-2 py-1">
                      <input type="checkbox" checked={!filterEntitiesEngaged || filterNodeTypes.has(e.type)}
                        onChange={() => {
                          if (!filterEntitiesEngaged) {
                            setFilterEntitiesEngaged(true);
                            setFilterNodeTypes(new Set(entityTypes.filter((t) => t.type !== e.type).map((t) => t.type)));
                          } else {
                            toggle(filterNodeTypes, e.type, setFilterNodeTypes);
                          }
                        }}
                        className="rounded border-[#cbd5e1] w-3.5 h-3.5 shrink-0 accent-[#0a1f44] cursor-pointer" />
                      <span style={{ color: e.color, display: "flex", width: 14, height: 14, alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{e.icon}</span>
                      <span
                        onClick={() => { setFilterEntitiesEngaged(true); setFilterNodeTypes(new Set([e.type])); }}
                        style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, color: "#334155", flex: 1, cursor: "pointer", userSelect: "none" }}
                      >{e.label}</span>
                      <span style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: "#94a3b8" }}>{e.count}</span>
                    </div>
                  ))}
                </div>

                {infoSystems.length > 0 && (
                  <div className="px-4 py-3">
                    <div className="flex items-center gap-1.5 mb-2">
                      <span style={{ color: NODE_COLORS["information-system"], display: "flex", width: 14, height: 14, alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{entityTypeIcon("information-system", 14)}</span>
                      <span style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, color: "#0a1f44" }}>
                        Information Systems <span style={{ color: "#94a3b8", fontWeight: 400 }}>({infoSystems.length})</span>
                      </span>
                    </div>
                    {infoSystems.map((is) => (
                      <label key={is.id} className="flex items-center gap-2 py-1 cursor-pointer">
                        <input type="checkbox" checked={filterISIds.has(is.id)}
                          onChange={() => toggle(filterISIds, is.id, setFilterISIds)}
                          className="rounded border-[#cbd5e1] w-3.5 h-3.5 shrink-0 accent-[#0a1f44]" />
                        <span style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: "#334155" }}>{is.displayName}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* Detail panel (right side) */}
        {selectedNode && (
          <DetailPanel
            node={selectedNode}
            spec={spec}
            relationships={spec.relationships}
            objectNames={objectNames}
            entityNameById={entityNameById}
            onClose={() => setSelectedNode(null)}
            onSelectEntity={(id) => {
              const target = nodes.find((n) => n.id === id);
              if (target) setSelectedNode(target);
            }}
            onDataPreview={(node) => setDataPreviewNode(node)}
            dataPreviewOpen={!!dataPreviewNode}
          />
        )}

        {/* SVG Canvas */}
        <svg
          ref={svgRef}
          width={dimensions.width}
          height={graphH}
          className="w-full"
          style={{
            height: graphH,
            cursor: "grab",
            pointerEvents: "all",
            opacity: graphReady ? 1 : 0,
            transition: "opacity 240ms ease-out",
          }}
          onClick={(e) => {
            // Clicked SVG itself (not a child node) → deselect + close filter panel.
            if (e.target === e.currentTarget) {
              setSelectedNode(null);
              setFilterPanelOpen(false);
            }
          }}
        >
          {/* Transparent background rect: catches clicks on empty canvas (where the SVG
              alone won't register hits) so deselect works reliably between nodes. */}
          <rect
            x={0}
            y={0}
            width={dimensions.width}
            height={graphH}
            fill="transparent"
            onClick={() => { setSelectedNode(null); setFilterPanelOpen(false); }}
          />
          <defs>
            <filter id="node-shadow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceAlpha" stdDeviation="1.4" />
              <feOffset dx="0" dy="1.6" result="offsetblur" />
              <feComponentTransfer>
                <feFuncA type="linear" slope="0.32" />
              </feComponentTransfer>
              <feMerge>
                <feMergeNode />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="node-shadow-strong" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceAlpha" stdDeviation="2.2" />
              <feOffset dx="0" dy="2.4" result="offsetblur" />
              <feComponentTransfer>
                <feFuncA type="linear" slope="0.38" />
              </feComponentTransfer>
              <feMerge>
                <feMergeNode />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            {/* Isometric grid pattern — tiles the source PNG. Sits inside the
                transformed <g> below so it pans + zooms with the canvas. */}
            {/* Pure-SVG iso grid: two diagonal lines from corner to corner of each
                tile, drawn at 30° (tile height = width × tan 30°). Adjacent tiles share
                corners, so the chevrons form a continuous diamond grid with zero seam
                artifacts at any zoom. Replaces the non-tileable PNG that produced
                visible breaks in the line pattern. */}
            <pattern id="iso-grid" patternUnits="userSpaceOnUse" width="200" height="115.47">
              <path
                d="M0 0 L200 115.47 M0 115.47 L200 0"
                stroke="#dfe5ee"
                strokeWidth="1"
                fill="none"
                shapeRendering="geometricPrecision"
              />
            </pattern>
          </defs>
          <g ref={gRef}>
            {layeredMode && layeredData ? (
              /* Layered background — the 3-plate stack, or a single re-centered
                 plate when a filtered subview is active. */
              <image
                href={layeredSubview === "all" ? "/layered-bg.png" : "/single-plate-bg.png"}
                x={layeredData.stackBounds.imgX}
                y={layeredData.stackBounds.imgY}
                width={layeredData.stackBounds.imgW}
                height={layeredData.stackBounds.imgH}
                preserveAspectRatio="xMidYMid meet"
                pointerEvents="none"
              />
            ) : (
              /* Pannable isometric grid background — large rect filled with the iso-grid
                 pattern so it tiles to cover any pan/zoom position. pointerEvents:none lets
                 clicks fall through to the deselect rect outside <g>. */
              <rect
                x={-8000}
                y={-8000}
                width={16000}
                height={16000}
                fill="url(#iso-grid)"
                pointerEvents="none"
              />
            )}
            {/* Edges — rim-to-rim: each line docks at the base ellipse boundary of
                its source/target puck rather than the raw simulation point. */}
            {links.map((link) => {
              const src = link.source as GraphNode;
              const tgt = link.target as GraphNode;
              if (subviewTypes && (!subviewTypes.includes(src.nodeType) || !subviewTypes.includes(tgt.nodeType))) return null;
              const srcPos = effPos(src);
              const tgtPos = effPos(tgt);
              if (!srcPos || !tgtPos) return null;
              const isHighlighted = hasHighlight && activeEdges.has(link.id);
              const isDimmed = hasHighlight && !isHighlighted;

              // Hide edge if either endpoint is filtered out by the entity/process/IS filters.
              const nodePassesFilter = (n: GraphNode) => {
                if (activeFilter != null) return n.nodeType === activeFilter;
                const hasProcessFilter = filterProcessIds.size > 0;
                const hasISFilter = filterISIds.size > 0;
                if (!hasProcessFilter && !hasISFilter && !filterEntitiesEngaged) return true;
                const passesType = !filterEntitiesEngaged || filterNodeTypes.has(n.nodeType);
                const passesProcess = !hasProcessFilter || (() => {
                  if (filterProcessIds.has(n.id)) return true;
                  const selProcs = (spec.processes ?? []).filter((p) => filterProcessIds.has(p.id));
                  const procObjSet = new Set(selProcs.flatMap((p) => p.objectIds ?? []));
                  const procIds = new Set(selProcs.map((p) => p.id));
                  if (procObjSet.has(n.id)) return true;
                  if (n.nodeType === "event") { const e = (spec.events ?? []).find((e) => e.id === n.id); return e ? (e.objectIds ?? []).some((oid) => procObjSet.has(oid)) : false; }
                  if (n.nodeType === "metric" || n.nodeType === "function") { const m = (spec.metrics ?? []).find((m) => m.id === n.id); return m ? (m.objectIds ?? []).some((oid) => procObjSet.has(oid) || procIds.has(oid)) : false; }
                  if (n.nodeType === "information-system") { const is = (spec.informationSystems ?? []).find((is) => is.id === n.id); return is ? (is.objectIds ?? []).some((oid) => procObjSet.has(oid)) : false; }
                  if (n.nodeType === "bpmn") return (spec.bpmnModels ?? []).some((bm) => bm.id === n.id && procIds.has(bm.processId));
                  return false;
                })();
                const passesIS = !hasISFilter || (() => {
                  if (filterISIds.has(n.id)) return true;
                  const selIS = (spec.informationSystems ?? []).filter((is) => filterISIds.has(is.id));
                  const isObjSet = new Set(selIS.flatMap((is) => is.objectIds ?? []));
                  if (isObjSet.has(n.id)) return true;
                  if (n.nodeType === "event") { const e = (spec.events ?? []).find((e) => e.id === n.id); return e ? (e.objectIds ?? []).some((oid) => isObjSet.has(oid)) : false; }
                  return false;
                })();
                const passesScope = (hasProcessFilter && hasISFilter) ? (passesProcess || passesIS) : (passesProcess && passesIS);
                return passesType && passesScope;
              };
              if (!nodePassesFilter(src) || !nodePassesFilter(tgt)) return null;

              const srcE = baseEllipse(srcPos, src.nodeType);
              const tgtE = baseEllipse(tgtPos, tgt.nodeType);
              const dx = tgtE.cx - srcE.cx, dy = tgtE.cy - srcE.cy;
              const len = Math.sqrt(dx * dx + dy * dy);
              if (len < 1) return null;
              const ux = dx / len, uy = dy / len;
              const tSrc = 1 / Math.sqrt((ux / srcE.rx) ** 2 + (uy / srcE.ry) ** 2);
              const tTgt = 1 / Math.sqrt((ux / tgtE.rx) ** 2 + (uy / tgtE.ry) ** 2);
              const x1 = srcE.cx + ux * tSrc, y1 = srcE.cy + uy * tSrc;
              const x2 = tgtE.cx - ux * tTgt, y2 = tgtE.cy - uy * tTgt;

              return (
                <line
                  key={link.id}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={isHighlighted ? EDGE_COLOR : EDGE_COLOR_DIM}
                  strokeWidth={isHighlighted ? 1.8 : 0.8}
                  opacity={isDimmed ? 0.08 : isHighlighted ? 1 : 0.5}
                />
              );
            })}

            {/* Direction indicator: a single rotating triangle per highlighted edge,
                traveling the same rim-to-rim segment as the edge line. Direction
                (which node is "from"/"to") follows a fixed priority chain; each
                edge gets a hash-based phase offset so triangles don't move in
                unison. */}
            {hasHighlight && activeNodeId != null && links.map((link) => {
              if (!activeEdges.has(link.id)) return null;
              const src = link.source as GraphNode;
              const tgt = link.target as GraphNode;
              if (subviewTypes && (!subviewTypes.includes(src.nodeType) || !subviewTypes.includes(tgt.nodeType))) return null;
              const srcPos = effPos(src);
              const tgtPos = effPos(tgt);
              if (!srcPos || !tgtPos) return null;
              const focusIsSrc = src.id === activeNodeId;
              const neighbor = focusIsSrc ? tgt : src;
              const focus = focusIsSrc ? src : tgt;
              if (neighbor.id === focus.id) return null;

              const types = (a: NodeType, b: NodeType) =>
                (focus.nodeType === a && neighbor.nodeType === b) ||
                (focus.nodeType === b && neighbor.nodeType === a);
              const nodeOfType = (t: NodeType) => (focus.nodeType === t ? focus : neighbor);

              const isProcessBpmn     = types("process", "bpmn");
              const isMetricObject    = types("metric", "object");
              const isObjectEvent     = types("object", "event");
              const isProcessObject   = types("process", "object");
              const isProcessEvent    = types("process", "event");
              const isFunctionProcess = types("function", "process");
              const isObjObjCardinality =
                focus.nodeType === "object" && neighbor.nodeType === "object" &&
                (link.cardinality === "ONE_TO_MANY" || link.cardinality === "MANY_TO_ONE");
              const inbound = neighbor.nodeType === "metric" || neighbor.nodeType === "function";

              const from = isProcessBpmn       ? nodeOfType("process")
                         : isMetricObject      ? nodeOfType("metric")
                         : isObjectEvent       ? nodeOfType("event")
                         : isProcessObject     ? nodeOfType("process")
                         : isProcessEvent      ? nodeOfType("process")
                         : isFunctionProcess   ? nodeOfType("function")
                         : isObjObjCardinality ? (link.cardinality === "ONE_TO_MANY" ? src : tgt)
                         : inbound             ? neighbor : focus;
              const to   = isProcessBpmn       ? nodeOfType("bpmn")
                         : isMetricObject      ? nodeOfType("object")
                         : isObjectEvent       ? nodeOfType("object")
                         : isProcessObject     ? nodeOfType("object")
                         : isProcessEvent      ? nodeOfType("event")
                         : isFunctionProcess   ? nodeOfType("process")
                         : isObjObjCardinality ? (link.cardinality === "ONE_TO_MANY" ? tgt : src)
                         : inbound             ? focus : neighbor;

              let h = 0;
              for (let i = 0; i < link.id.length; i++) h = ((h << 5) - h + link.id.charCodeAt(i)) | 0;
              const offset = ((h >>> 0) % 1000) / 1000;
              const p = (dotTick + offset) % 1;

              const fromPos = from.id === src.id ? srcPos : tgtPos;
              const toPos = to.id === src.id ? srcPos : tgtPos;
              const fromE = baseEllipse(fromPos, from.nodeType);
              const toE = baseEllipse(toPos, to.nodeType);
              const ddx = toE.cx - fromE.cx, ddy = toE.cy - fromE.cy;
              const dlen = Math.sqrt(ddx * ddx + ddy * ddy);
              if (dlen < 1) return null;
              const dux = ddx / dlen, duy = ddy / dlen;
              const tFrom = 1 / Math.sqrt((dux / fromE.rx) ** 2 + (duy / fromE.ry) ** 2);
              const tTo = 1 / Math.sqrt((dux / toE.rx) ** 2 + (duy / toE.ry) ** 2);
              const ex1 = fromE.cx + dux * tFrom, ey1 = fromE.cy + duy * tFrom;
              const ex2 = toE.cx - dux * tTo, ey2 = toE.cy - duy * tTo;
              const x = ex1 + (ex2 - ex1) * p;
              const y = ey1 + (ey2 - ey1) * p;
              const angleDeg = Math.atan2(ey2 - ey1, ex2 - ex1) * 180 / Math.PI;

              return (
                <polygon
                  key={`dir-${link.id}`}
                  points="5,0 -2.5,-3 -2.5,3"
                  fill={EDGE_COLOR}
                  transform={`translate(${x},${y}) rotate(${angleDeg})`}
                  style={{ pointerEvents: "none" }}
                />
              );
            })}

            {/* Nodes */}
            {nodes.map((node) => {
              const layeredEntry = layeredMode ? layeredPos?.get(node.id) : null;
              if (layeredMode) {
                if (!layeredPos?.has(node.id)) return null;
                if (subviewTypes && !subviewTypes.includes(node.nodeType)) return null;
              } else if (node.x == null || node.y == null) {
                return null;
              }
              const subScale = subviewTypes ? subviewNodeScale : 1;
              const ox = subviewTypes ? subviewNodeOffset.x : 0;
              const oy = subviewTypes ? subviewNodeOffset.y : 0;
              const nx = (layeredEntry ? layeredEntry.x * subScale : node.x!) + ox;
              const ny = (layeredEntry ? layeredEntry.y * subScale : node.y!) + oy;
              const iconScale = layeredMode ? (layeredEntry?.scale ?? 0.5) * subScale : 1;
              const size = NODE_SIZE[node.nodeType] * iconScale;
              const color = NODE_COLORS[node.nodeType];
              const isHovered = hoveredNode === node.id;
              const isSelected = selectedNode?.id === node.id;
              const isDimmedByHighlight = hasHighlight && !connectedTo.has(node.id);
              const isDimmedByFilter = (() => {
                if (activeFilter != null) return node.nodeType !== activeFilter;
                const hasProcessFilter = filterProcessIds.size > 0;
                const hasISFilter = filterISIds.size > 0;
                if (!hasProcessFilter && !hasISFilter && !filterEntitiesEngaged) return false;
                const passesType = !filterEntitiesEngaged || filterNodeTypes.has(node.nodeType);
                const passesProcess = !hasProcessFilter || (() => {
                  if (filterProcessIds.has(node.id)) return true;
                  const selProcs = (spec.processes ?? []).filter((p) => filterProcessIds.has(p.id));
                  const procObjSet = new Set(selProcs.flatMap((p) => p.objectIds ?? []));
                  const procIds = new Set(selProcs.map((p) => p.id));
                  if (procObjSet.has(node.id)) return true;
                  if (node.nodeType === "event") { const e = (spec.events ?? []).find((e) => e.id === node.id); return e ? (e.objectIds ?? []).some((oid) => procObjSet.has(oid)) : false; }
                  if (node.nodeType === "metric" || node.nodeType === "function") { const m = (spec.metrics ?? []).find((m) => m.id === node.id); return m ? (m.objectIds ?? []).some((oid) => procObjSet.has(oid) || procIds.has(oid)) : false; }
                  if (node.nodeType === "information-system") { const is = (spec.informationSystems ?? []).find((is) => is.id === node.id); return is ? (is.objectIds ?? []).some((oid) => procObjSet.has(oid)) : false; }
                  if (node.nodeType === "bpmn") return (spec.bpmnModels ?? []).some((bm) => bm.id === node.id && procIds.has(bm.processId));
                  return false;
                })();
                const passesIS = !hasISFilter || (() => {
                  if (filterISIds.has(node.id)) return true;
                  const selIS = (spec.informationSystems ?? []).filter((is) => filterISIds.has(is.id));
                  const isObjSet = new Set(selIS.flatMap((is) => is.objectIds ?? []));
                  if (isObjSet.has(node.id)) return true;
                  if (node.nodeType === "event") { const e = (spec.events ?? []).find((e) => e.id === node.id); return e ? (e.objectIds ?? []).some((oid) => isObjSet.has(oid)) : false; }
                  return false;
                })();
                const passesScope = (hasProcessFilter && hasISFilter) ? (passesProcess || passesIS) : (passesProcess && passesIS);
                return !(passesType && passesScope);
              })();
              const isDimmed = isDimmedByHighlight || isDimmedByFilter;
              const half = size / 2;

              const maxLen = node.nodeType === "object" || node.nodeType === "process" ? 18 : 20;
              const cleanName = node.displayName.replace(/^\[FUNCTION\]\s*/i, "");
              const label = cleanName.length > maxLen
                ? cleanName.slice(0, maxLen - 1) + "…"
                : cleanName;

              return (
                <g
                  key={node.id}
                  opacity={isDimmed ? 0.12 : 1}
                  style={{ cursor: "pointer", touchAction: "none" }}
                  onMouseEnter={() => setHoveredNode(node.id)}
                  onMouseLeave={() => setHoveredNode(null)}
                  onClick={() => {
                    if (isDimmed) return;
                    setSelectedNode(node);
                  }}
                  onPointerDown={(e) => onNodePointerDown(e, node.id)}
                  onPointerMove={onNodePointerMove}
                  onPointerUp={onNodePointerUp}
                >
                  {/* Each node is rendered as a stack: ground-plane shadow disc → optional
                      selection ring → the pre-rendered isometric 3D PNG icon. Drawing the
                      shadow as a separate ellipse (rather than relying on the icon's baked-in
                      shadow) means it stays correct once the icons are re-exported with
                      transparent backgrounds, and lets us scale / dim it independently. */}
                  {(() => {
                    const iconW = size;
                    const iconH = size * ICON_ASPECT[node.nodeType];
                    // Shadow/selection ellipse size is decoupled from the per-type NODE_SIZE
                    // (which now varies to compensate for each icon's visual density) — every
                    // type gets the same base-size ellipse, scaled only by iconScale (layered
                    // mode depth), not by which node type it is.
                    const shadowW = SHADOW_BASE_SIZE * iconScale;
                    return (
                      <>
                        {/* Shadow + selection ring use the same iso ground-plane foreshortening
                            (ry/rx ≈ 0.50) as the puck's top face, so they read as discs lying
                            flat on the same surface as the iso grid background. */}
                        {!isDimmed && (
                          <ellipse
                            cx={nx}
                            cy={ny - 9}
                            rx={shadowW * 0.62}
                            ry={shadowW * 0.62 * 0.50}
                            fill="#0a1f44"
                            opacity={0.11}
                            style={{ pointerEvents: "none" }}
                          />
                        )}
                        {(isHovered || isSelected) && !isDimmed && (
                          <ellipse
                            cx={nx}
                            cy={ny - 9}
                            rx={shadowW * 0.66}
                            ry={shadowW * 0.66 * 0.50}
                            fill="none"
                            stroke={color}
                            strokeWidth={2.2}
                            opacity={0.55}
                            style={{ pointerEvents: "none" }}
                          />
                        )}
                        <image
                          href={ICON_SRC[node.nodeType]}
                          x={nx - iconW / 2}
                          y={ny - iconH * ICON_FOOT_OFFSET}
                          width={iconW}
                          height={iconH}
                          opacity={isDimmed ? 0.22 : 1}
                          preserveAspectRatio="xMidYMid meet"
                          style={{ pointerEvents: "auto" }}
                        />
                      </>
                    );
                  })()}

                  {/* Labels — every node type gets the same white pill treatment
                      (previously Process-only). Visibility follows the zoom-threshold
                      rule (allowedLabelTypes): below 1.0x zoom (or with >1 process
                      visible), only process labels show; above that, every type shows
                      its own label. Pill/font size scales as sqrt(zoomLevel) (clamped to
                      a 0.75 floor) rather than linearly — `ls` is expressed in world-space
                      (divided by zoomLevel) so that after the canvas group's own zoom
                      transform is applied, the on-screen result matches that sub-linear
                      curve exactly. */}
                  {!isDimmed && allowedLabelTypes.has(node.nodeType) && (() => {
                    const ls = Math.max(0.75, Math.sqrt(zoomLevel)) / zoomLevel;
                    const charW = 5.0 * ls;
                    const padX = 5 * ls;
                    const pillW = label.length * charW + padX * 2;
                    const pillH = 15 * ls;
                    const pillX = nx - pillW / 2;
                    // Gap below the icon's actual rendered bottom edge (not just the foot
                    // anchor point) — matters in layered mode, where iconScale varies
                    // per-node, so the icon's bottom sits a different distance from ny
                    // node to node.
                    const labelIconH = size * ICON_ASPECT[node.nodeType];
                    const iconBelowFoot = labelIconH * (1 - ICON_FOOT_OFFSET);
                    const pillY = ny + iconBelowFoot + 5 * ls;
                    return (
                      <g style={{ pointerEvents: "none" }}>
                        <rect
                          x={pillX}
                          y={pillY}
                          width={pillW}
                          height={pillH}
                          rx={3 * ls}
                          fill="white"
                          stroke="#e2e8f0"
                          strokeWidth={ls}
                          filter="url(#node-shadow)"
                        />
                        <text
                          x={nx}
                          y={pillY + pillH / 2 + 3.5 * ls}
                          textAnchor="middle"
                          fontSize={9 * ls}
                          fontWeight={500}
                          fill="#0a1f44"
                          fontFamily="Inter, -apple-system, sans-serif"
                        >
                          {label}
                        </text>
                      </g>
                    );
                  })()}

                </g>
              );
            })}
          </g>
        </svg>

        {/* Zoom controls — fixed bottom-right, always visible. Six controls:
            Fit all / 3D (placeholder) / − / % / + / Expand to fit (bookend
            duplicate of Fit all, not a different action). */}
        <div className="absolute right-4 z-10 flex items-center gap-px bg-white/90 backdrop-blur-sm border border-[#e2e8f0] shadow-sm rounded-lg overflow-hidden pointer-events-auto" style={{ bottom: zoomBottom }}>
          <button
            onClick={handleZoomFit}
            title="Fit all"
            className="h-8 w-8 flex items-center justify-center text-[#64748b] hover:text-[#0a1f44] hover:bg-[#f1f5f9] transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24"><path fill="currentColor" d="M4.5 5.75c0-.69.56-1.25 1.25-1.25h2a.75.75 0 0 0 0-1.5h-2A2.75 2.75 0 0 0 3 5.75v2a.75.75 0 0 0 1.5 0zm0 12.5c0 .69.56 1.25 1.25 1.25h2a.75.75 0 0 1 0 1.5h-2A2.75 2.75 0 0 1 3 18.25v-2a.75.75 0 0 1 1.5 0zM18.25 4.5c.69 0 1.25.56 1.25 1.25v2a.75.75 0 0 0 1.5 0v-2A2.75 2.75 0 0 0 18.25 3h-2a.75.75 0 0 0 0 1.5zm1.25 13.75c0 .69-.56 1.25-1.25 1.25h-2a.75.75 0 0 0 0 1.5h2A2.75 2.75 0 0 0 21 18.25v-2a.75.75 0 0 0-1.5 0z"/></svg>
          </button>
          <div className="w-px h-5 bg-[#e2e8f0]" />
          <button
            title="3D"
            className="h-8 px-2.5 text-[11px] font-semibold text-[#64748b] hover:text-[#0a1f44] hover:bg-[#f1f5f9] transition-colors tracking-wide"
          >3D</button>
          <div className="w-px h-5 bg-[#e2e8f0]" />
          {!layeredMode && <button onClick={handleZoomOut} title="Zoom out" className="h-8 w-8 flex items-center justify-center text-[#64748b] hover:text-[#0a1f44] hover:bg-[#f1f5f9] transition-colors text-base leading-none">−</button>}
          <button onClick={handleZoomReset} title="Reset to 100%" className="h-8 px-1.5 text-[11px] font-medium text-[#64748b] hover:text-[#0a1f44] hover:bg-[#f1f5f9] transition-colors tabular-nums w-11">{Math.round(zoomLevel * 100)}%</button>
          <button onClick={handleZoomIn} title="Zoom in" className="h-8 w-8 flex items-center justify-center text-[#64748b] hover:text-[#0a1f44] hover:bg-[#f1f5f9] transition-colors text-base leading-none">+</button>
          <div className="w-px h-5 bg-[#e2e8f0]" />
          <button
            onClick={handleZoomFit}
            title="Expand to fit"
            className="h-8 w-8 flex items-center justify-center text-[#64748b] hover:text-[#0a1f44] hover:bg-[#f1f5f9] transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24"><path fill="currentColor" d="M6.192 8.433a.625.625 0 0 1 0 .884l-2.058 2.058h5.991a.625.625 0 1 1 0 1.25H4.134l2.058 2.058a.625.625 0 1 1-.884.884l-3.125-3.125a.625.625 0 0 1 0-.884l3.125-3.125a.625.625 0 0 1 .884 0m11.616 0a.625.625 0 0 1 .884 0l3.125 3.125a.625.625 0 0 1 0 .884l-3.125 3.125a.625.625 0 1 1-.884-.884l2.058-2.058h-5.991a.625.625 0 1 1 0-1.25h5.991l-2.058-2.058a.625.625 0 0 1 0-.884"/></svg>
          </button>
        </div>

        {/* Layered view toggle + subview tabs — bottom-left, tabs stack above button */}
        <div className="absolute left-4 z-10 pointer-events-auto flex flex-col items-start gap-2" style={{ bottom: zoomBottom }}>
          {layeredMode && (
            <div className="flex items-center bg-white/90 backdrop-blur-sm border border-[#e2e8f0] shadow-sm rounded-lg p-1 gap-0.5">
              {(["all", "systems", "pi-graph", "intelligence"] as const).map((view) => (
                <button
                  key={view}
                  onClick={() => setLayeredSubview(view)}
                  className={`h-[26px] px-3 text-[11px] font-semibold rounded-md transition-all ${
                    layeredSubview === view
                      ? ""
                      : "text-[#64748b] hover:text-[#0a1f44] hover:bg-[#f1f5f9]"
                  }`}
                  style={layeredSubview === view ? {
                    background: "oklch(0.59563 0.221408 258.734 / 0.19)",
                    color: "oklch(0.52201 0.266224 266.442)",
                  } : undefined}
                >
                  {view === "all" ? "All" : view === "systems" ? "Systems" : view === "pi-graph" ? "PI Graph" : "Intelligence"}
                </button>
              ))}
            </div>
          )}
          <button
            onClick={() => setLayeredMode((m) => { if (m) setLayeredSubview("all"); return !m; })}
            title="Toggle layered pipeline view"
            style={layeredMode
              ? { background: "oklch(0.59563 0.221408 258.734 / 0.19)", color: "oklch(0.52201 0.266224 266.442)", borderColor: "transparent" }
              : { background: "white", color: "oklch(0.246918 0.0749452 260.778)", borderColor: "#e2e8f0" }
            }
            className="h-8 px-3 text-[11px] font-semibold rounded-lg border shadow-sm backdrop-blur-sm transition-all flex items-center gap-1.5"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path fill="currentColor" d="M20.026 12.191a2 2 0 0 1-.577.598l-6.05 4.084a2.5 2.5 0 0 1-2.798 0l-6.05-4.084a2 2 0 0 1-.779-2.29l6.841 4.56a2.5 2.5 0 0 0 2.613.098l.16-.098 6.841-4.56a2 2 0 0 1-.201 1.692m.201 1.558a1.996 1.996 0 0 1-.778 2.29l-6.05 4.084a2.5 2.5 0 0 1-2.798 0l-6.05-4.084a2 2 0 0 1-.779-2.29l6.841 4.56a2.5 2.5 0 0 0 2.613.098l.16-.098zm-6.84-10.325 6.365 4.243a1 1 0 0 1 0 1.664l-6.365 4.244a2.5 2.5 0 0 1-2.774 0L4.248 9.33a1 1 0 0 1 0-1.664l6.365-4.243a2.5 2.5 0 0 1 2.774 0M11.56 4.606l-.116.066-5.74 3.827 5.74 3.828a1 1 0 0 0 .994.066l.116-.066 5.739-3.828-5.74-3.827a1 1 0 0 0-.993-.066" />
            </svg>
            Layered
          </button>
        </div>

        {/* Data Preview Panel */}
        {dataPreviewNode && (
          <DataPreviewPanel node={dataPreviewNode} spec={spec} onClose={() => setDataPreviewNode(null)} />
        )}
        </div>

        {/* BPMN Process Diagram — sibling tab content. Renders only when the
            active tab is a BPMN tab (no inner tab bar; the parent's unified
            tab bar handles tab switching + close). */}
        {(() => {
          const activeTab = openTabs.find((t) => t.id === activeTabId);
          if (!activeTab || activeTab.type !== "bpmn") return null;
          const proc = (spec.processes ?? []).find((p) => p.id === activeTab.processId);
          if (!proc) return null;

          // ── Swimlane BPMN renderer ─────────────────────────────────────────
          // Alternate rendering: when the process's BPMN model carries
          // lanes/nodes/flows data, render a full auto-layout swimlane diagram
          // instead of the simple milestone flow below. Falls through to the
          // milestone flow when that data isn't present.
          const swModel = (spec.bpmnModels ?? []).find(
            (bm) => bm.processId === proc.id && (bm.lanes?.length ?? 0) > 0
          );
          if (swModel?.lanes && swModel.nodes && swModel.flows) {
            const swLanes = swModel.lanes;
            const swNodes = swModel.nodes;
            const swFlows = swModel.flows;

            // Styling — match original Celonis BPMN palette
            const SW_S = "#475569"; const SW_NAVY = "#0a1f44";
            const NW = 124; const NH = 48; const GR = 19; const ER = 16;
            const CW = 160; const ROW_H = 120; const LHW = 44; const PAD_L = 16; const PAD_T = 16;

            // Longest-path column assignment via topological sort (Kahn's)
            const adjOut = new Map<string, string[]>(swNodes.map((n) => [n.id, []]));
            const inDeg = new Map<string, number>(swNodes.map((n) => [n.id, 0]));
            for (const f of swFlows) {
              adjOut.get(f.from)?.push(f.to);
              inDeg.set(f.to, (inDeg.get(f.to) ?? 0) + 1);
            }
            const topoQ = swNodes.filter((n) => (inDeg.get(n.id) ?? 0) === 0).map((n) => n.id);
            const topo: string[] = [];
            const inDegCopy = new Map(inDeg);
            while (topoQ.length) {
              const tid = topoQ.shift()!;
              topo.push(tid);
              for (const next of adjOut.get(tid) ?? []) {
                const d = (inDegCopy.get(next) ?? 1) - 1;
                inDegCopy.set(next, d);
                if (d === 0) topoQ.push(next);
              }
            }
            for (const n of swNodes) if (!topo.includes(n.id)) topo.push(n.id);
            const colMap = new Map<string, number>(swNodes.map((n) => [n.id, 0]));
            for (const tid of topo) {
              const c = colMap.get(tid) ?? 0;
              for (const next of adjOut.get(tid) ?? []) {
                colMap.set(next, Math.max(colMap.get(next) ?? 0, c + 1));
              }
            }
            const numCols = Math.max(0, ...[...colMap.values()]) + 1;

            // Row-aware lane heights
            const laneMaxRow = new Map<string, number>();
            for (const n of swNodes) {
              const r = (n.row ?? 0) + 1;
              laneMaxRow.set(n.lane, Math.max(laneMaxRow.get(n.lane) ?? 1, r));
            }
            const laneTops: number[] = [];
            const laneHeights: number[] = [];
            let curTop = PAD_T;
            for (const lane of swLanes) {
              laneTops.push(curTop);
              const h = (laneMaxRow.get(lane.id) ?? 1) * ROW_H;
              laneHeights.push(h);
              curTop += h;
            }
            const laneIdx = new Map(swLanes.map((l, i) => [l.id, i]));

            // Node center positions (row-aware)
            const npos = new Map<string, { x: number; y: number }>();
            for (const n of swNodes) {
              const c = colMap.get(n.id) ?? 0;
              const row = n.row ?? 0;
              const li = laneIdx.get(n.lane) ?? 0;
              const cx = PAD_L + LHW + c * CW + CW / 2;
              const cy = laneTops[li] + row * ROW_H + ROW_H / 2;
              npos.set(n.id, { x: cx, y: cy });
            }

            const totalH = curTop + PAD_T;
            const svgW = PAD_L * 2 + LHW + numCols * CW;
            const svgH = totalH;

            const wrapSw = (text: string, maxW = 15): string[] => {
              const words = text.split(" ");
              const lines: string[] = [];
              let cur = "";
              for (const w of words) {
                if (!cur) { cur = w; }
                else if ((cur + " " + w).length <= maxW) { cur += " " + w; }
                else { lines.push(cur); cur = w; }
              }
              if (cur) lines.push(cur);
              return lines;
            };

            const getHW = (nId: string) => {
              const nd = swNodes.find((n) => n.id === nId);
              if (!nd || nd.type === "task") return NW / 2;
              if (nd.type === "xor" || nd.type === "parallel") return GR;
              return ER;
            };
            const getHH = (nId: string) => {
              const nd = swNodes.find((n) => n.id === nId);
              if (!nd || nd.type === "task") return NH / 2;
              if (nd.type === "xor" || nd.type === "parallel") return GR;
              return ER;
            };

            // Edge routing: polyline with one mid-point bend for cross-row flows
            const edgePath = (fromId: string, toId: string, isMsg: boolean): string => {
              const fp = npos.get(fromId);
              const tp = npos.get(toId);
              if (!fp || !tp) return "";
              if (isMsg) {
                // Vertical-dominant message flow: exit top/bottom, enter top/bottom
                const goesDown = tp.y > fp.y;
                const sx = fp.x; const sy = fp.y + (goesDown ? getHH(fromId) : -getHH(fromId));
                const tx = tp.x; const ty = tp.y + (goesDown ? -getHH(toId) : getHH(toId));
                if (Math.abs(sx - tx) < 2) return `M ${sx} ${sy} L ${tx} ${ty}`;
                const midY = (sy + ty) / 2;
                return `M ${sx} ${sy} C ${sx} ${midY} ${tx} ${midY} ${tx} ${ty}`;
              }
              const sx = fp.x + getHW(fromId); const sy = fp.y;
              const tx = tp.x - getHW(toId);   const ty = tp.y;
              if (Math.abs(ty - sy) < 2) return `M ${sx} ${sy} L ${tx} ${ty}`;
              // Elbow: go right to midpoint x, then drop/rise to target y
              const midX = sx + Math.max(20, (tx - sx) * 0.5);
              return `M ${sx} ${sy} L ${midX} ${sy} L ${midX} ${ty} L ${tx} ${ty}`;
            };

            const swArrId = `sw-a-${swModel.id}`;
            const swOpenId = `sw-o-${swModel.id}`;

            const renderSwNode = (n: typeof swNodes[0]) => {
              const p = npos.get(n.id);
              if (!p) return null;
              const { x, y } = p;
              const lns = wrapSw(n.label ?? "");
              const y0 = y - (lns.length - 1) * 6;
              const labelEls = lns.map((ln, li) => (
                <text key={li} x={x} y={y0 + li * 12 + 3.5} textAnchor="middle" fontSize="10" fill={SW_NAVY}>{ln}</text>
              ));
              if (n.type === "start") return (
                <g key={n.id}>
                  <circle cx={x} cy={y} r={ER} fill="white" stroke={SW_S} strokeWidth="1.5" />
                  {n.label ? <text x={x} y={y + ER + 12} textAnchor="middle" fontSize="9" fill={SW_S}>{n.label}</text> : null}
                </g>
              );
              if (n.type === "end") return (
                <g key={n.id}>
                  <circle cx={x} cy={y} r={ER} fill="white" stroke={SW_S} strokeWidth="2.5" />
                  {n.label ? <text x={x} y={y + ER + 12} textAnchor="middle" fontSize="9" fill={SW_S}>{n.label}</text> : null}
                </g>
              );
              if (n.type === "task") return (
                <g key={n.id}>
                  <rect x={x - NW / 2} y={y - NH / 2} width={NW} height={NH} rx="6" fill="white" stroke={SW_S} strokeWidth="1.5" />
                  {labelEls}
                </g>
              );
              if (n.type === "xor") return (
                <g key={n.id}>
                  <path d={`M ${x} ${y - GR} L ${x + GR} ${y} L ${x} ${y + GR} L ${x - GR} ${y} Z`} fill="white" stroke={SW_S} strokeWidth="1.5" />
                  <path d={`M ${x - 6} ${y - 6} L ${x + 6} ${y + 6} M ${x + 6} ${y - 6} L ${x - 6} ${y + 6}`} stroke={SW_S} strokeWidth="1.5" />
                </g>
              );
              if (n.type === "parallel") return (
                <g key={n.id}>
                  <path d={`M ${x} ${y - GR} L ${x + GR} ${y} L ${x} ${y + GR} L ${x - GR} ${y} Z`} fill="white" stroke={SW_S} strokeWidth="1.5" />
                  <path d={`M ${x - 8} ${y} L ${x + 8} ${y} M ${x} ${y - 8} L ${x} ${y + 8}`} stroke={SW_S} strokeWidth="1.5" />
                </g>
              );
              if (n.type === "messageEvent") return (
                <g key={n.id}>
                  <circle cx={x} cy={y} r={ER} fill="white" stroke={SW_S} strokeWidth="1.5" />
                  <rect x={x - 7} y={y - 5} width="14" height="10" fill="none" stroke={SW_S} strokeWidth="1" />
                  <path d={`M ${x - 7} ${y - 5} L ${x} ${y + 1.5} L ${x + 7} ${y - 5}`} fill="none" stroke={SW_S} strokeWidth="1" />
                  {lns.slice(0, 2).map((ln, li) => (
                    <text key={li} x={x} y={y + ER + 10 + li * 11} textAnchor="middle" fontSize="9" fill={SW_S}>{ln}</text>
                  ))}
                </g>
              );
              return null;
            };

            return (
              <div className="flex-1 flex flex-col bg-white">
                <div className="px-6 py-4">
                  <h2 className="text-[18px] font-semibold text-[#0a1f44]">{swModel.displayName}</h2>
                </div>
                <div className="flex-1 overflow-auto px-6"
                  style={{ backgroundImage: "radial-gradient(circle, #e2e8f0 0.8px, transparent 0.8px)", backgroundSize: "24px 24px" }}>
                  <svg width={svgW} height={svgH} className="mx-auto">
                    <defs>
                      <marker id={swArrId} markerWidth="9" markerHeight="9" refX="7.5" refY="4.5"
                        orient="auto" markerUnits="userSpaceOnUse">
                        <path d="M0 0 L9 4.5 L0 9 Z" fill={SW_S} />
                      </marker>
                      <marker id={swOpenId} markerWidth="12" markerHeight="12" refX="9" refY="6"
                        orient="auto" markerUnits="userSpaceOnUse">
                        <path d="M0 1 L10 6 L0 11" fill="none" stroke={SW_S} strokeWidth="1.2" />
                      </marker>
                    </defs>

                    {/* Pool outer border */}
                    <rect x={PAD_L} y={PAD_T} width={svgW - PAD_L * 2} height={totalH - PAD_T * 2}
                      fill="none" stroke={SW_NAVY} strokeWidth="1.5" />
                    {/* Lane header column separator */}
                    <line x1={PAD_L + LHW} y1={PAD_T} x2={PAD_L + LHW} y2={totalH - PAD_T}
                      stroke={SW_NAVY} strokeWidth="1" />

                    {/* Lane rows + labels */}
                    {swLanes.map((lane, li) => {
                      const lTop = laneTops[li];
                      const lH = laneHeights[li];
                      return (
                        <g key={lane.id}>
                          {li > 0 && <line x1={PAD_L} y1={lTop} x2={svgW - PAD_L} y2={lTop} stroke={SW_NAVY} strokeWidth="1" />}
                          <text x={PAD_L + LHW / 2} y={lTop + lH / 2}
                            transform={`rotate(-90, ${PAD_L + LHW / 2}, ${lTop + lH / 2})`}
                            textAnchor="middle" dominantBaseline="middle"
                            fontSize="11" fontWeight="600" fill={SW_NAVY}>{lane.label}</text>
                        </g>
                      );
                    })}

                    {/* Edges */}
                    {swFlows.map((f, fi) => {
                      const isMsg = f.type === "message";
                      const d = edgePath(f.from, f.to, isMsg);
                      if (!d) return null;
                      const fp2 = npos.get(f.from); const tp2 = npos.get(f.to);
                      const lp = (f.label && fp2 && tp2)
                        ? { x: Math.min(fp2.x, tp2.x) + Math.abs(tp2.x - fp2.x) * 0.5, y: Math.min(fp2.y, tp2.y) - 14 }
                        : null;
                      return (
                        <g key={fi}>
                          <path d={d} fill="none" stroke={SW_S} strokeWidth="1.4"
                            strokeDasharray={isMsg ? "4 3" : undefined}
                            markerEnd={`url(#${isMsg ? swOpenId : swArrId})`} />
                          {lp && f.label && (
                            <g>
                              <rect x={lp.x - 42} y={lp.y - 10} width="84" height="20" fill="white" />
                              <text x={lp.x} y={lp.y + 1} textAnchor="middle" dominantBaseline="middle"
                                fontSize="9" fill={SW_S}>{f.label}</text>
                            </g>
                          )}
                        </g>
                      );
                    })}

                    {/* Nodes (on top of edges) */}
                    {swNodes.map((n) => renderSwNode(n))}
                  </svg>
                </div>
              </div>
            );
          }
          // ── End swimlane renderer ──────────────────────────────────────────

          // Generic, data-driven milestone flow built from process.eventIds —
          // replaces the old fully-hardcoded SCM-specific diagram. Falls back
          // to a generic (non-domain-specific) linear placeholder only when a
          // process has no eventIds, which shouldn't happen for a correctly
          // authored spec.
          const bpmnSteps: CMEvent[] = (proc.eventIds ?? [])
            .map((id) => (spec.events ?? []).find((e) => e.id === id))
            .filter((e): e is CMEvent => !!e);

          function wrapBpmnLabel(label: string, maxChars = 16): string[] {
            const words = label.split(" ");
            const lines: string[] = [];
            let cur = "";
            for (const w of words) {
              if (!cur) { cur = w; continue; }
              if ((cur + " " + w).length <= maxChars) { cur += " " + w; }
              else { lines.push(cur); cur = w; }
            }
            if (cur) lines.push(cur);
            return lines;
          }

          if (bpmnSteps.length >= 1) {
            const n = bpmnSteps.length;
            // pos[0] = start circle, pos[1..n] = task boxes, pos[n+1] = end circle
            const totalNodes = n + 2;
            const cw = Math.max(1300, totalNodes * 148 + 80);
            const cy = 130;
            const r = 15;
            const tw = 110;
            const th = 44;
            const sx = 50;
            const ex = cw - 50;
            const sp = (ex - sx) / (totalNodes - 1);
            const pos = Array.from({ length: totalNodes }, (_, i) => Math.round(sx + i * sp));
            return (
              <div className="flex-1 flex flex-col bg-white">
                <div className="px-6 py-4">
                  <h2 className="text-[18px] font-semibold text-[#0a1f44]">{proc.displayName}</h2>
                </div>
                <div className="flex-1 overflow-auto px-6" style={{ backgroundImage: "radial-gradient(circle, #e2e8f0 0.8px, transparent 0.8px)", backgroundSize: "24px 24px" }}>
                  <svg width={cw} height={300} className="mx-auto">
                    <defs>
                      <marker id="bpmn-arrow-d" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="userSpaceOnUse">
                        <path d="M0 0 L8 4 L0 8 Z" fill="#444" />
                      </marker>
                    </defs>

                    {/* Start event — thin circle */}
                    <circle cx={pos[0]} cy={cy} r={r} fill="white" stroke="#444" strokeWidth="1.5" />
                    <line x1={pos[0] + r} y1={cy} x2={pos[1] - tw / 2} y2={cy} stroke="#444" strokeWidth="1.5" markerEnd="url(#bpmn-arrow-d)" />

                    {/* One task box per event in the process's eventIds */}
                    {bpmnSteps.map((step, i) => {
                      const x = pos[i + 1];
                      const lines = wrapBpmnLabel(step.displayName);
                      const isLast = i === n - 1;
                      const connX2 = isLast ? pos[n + 1] - r : pos[i + 2] - tw / 2;
                      const textYsInBox =
                        lines.length === 1 ? [cy + 2] :
                        lines.length === 2 ? [cy - 6, cy + 6] :
                        [cy - 10, cy + 2, cy + 14];
                      return (
                        <g key={step.id}>
                          <rect x={x - tw / 2} y={cy - th / 2} width={tw} height={th} rx="6" fill="white" stroke="#444" strokeWidth="1.5" />
                          {lines.slice(0, 3).map((ln, li) => (
                            <text key={li} x={x} y={textYsInBox[li] ?? textYsInBox[textYsInBox.length - 1]} textAnchor="middle" fontSize="10" fill="#0a1f44">{ln}</text>
                          ))}
                          <line x1={x + tw / 2} y1={cy} x2={connX2} y2={cy} stroke="#444" strokeWidth="1.5" markerEnd="url(#bpmn-arrow-d)" />
                        </g>
                      );
                    })}

                    {/* End event — thick circle (BPMN convention) */}
                    <circle cx={pos[n + 1]} cy={cy} r={r} fill="white" stroke="#444" strokeWidth="3" />
                  </svg>
                </div>
              </div>
            );
          }

          // Fallback — generic, domain-neutral linear placeholder for the rare
          // case a process has no eventIds. Real process name still shows in
          // the title; only the step labels are generic.
          const placeholderSteps = ["Step 1", "Step 2", "Step 3", "Step 4", "Step 5", "Step 6", "Step 7"];
          const fbCy = 130, fbR = 15, fbTw = 130, fbTh = 50, fbSx = 40, fbSp = 155;
          const fbEndX = fbSx + fbR + fbSp * placeholderSteps.length + 15;
          return (
            <div className="flex-1 flex flex-col bg-white">
              <div className="px-6 py-4">
                <h2 className="text-[18px] font-semibold text-[#0a1f44]">{proc.displayName}</h2>
              </div>
              <div className="flex-1 overflow-auto px-6" style={{ backgroundImage: "radial-gradient(circle, #e2e8f0 0.8px, transparent 0.8px)", backgroundSize: "24px 24px" }}>
                <svg width={fbEndX + 40} height={260} className="mx-auto">
                  <defs>
                    <marker id="bpmn-arrow-fb" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="userSpaceOnUse">
                      <path d="M0 0 L8 4 L0 8 Z" fill="#444" />
                    </marker>
                  </defs>
                  <circle cx={fbSx} cy={fbCy} r={fbR} fill="white" stroke="#444" strokeWidth="1.5" />
                  <line x1={fbSx + fbR} y1={fbCy} x2={fbSx + fbR + fbSp - fbTw / 2} y2={fbCy} stroke="#444" strokeWidth="1.5" markerEnd="url(#bpmn-arrow-fb)" />
                  {placeholderSteps.map((label, i) => {
                    const x = fbSx + fbR + fbSp * (i + 1) - fbTw / 2 + fbTw / 2;
                    const isLast = i === placeholderSteps.length - 1;
                    const nextX = isLast ? fbEndX - fbR : x + fbSp - fbTw / 2;
                    return (
                      <g key={i}>
                        <rect x={x - fbTw / 2} y={fbCy - fbTh / 2} width={fbTw} height={fbTh} rx="6" fill="white" stroke="#444" strokeWidth="1.5" />
                        <text x={x} y={fbCy + 4} textAnchor="middle" fontSize="11" fill="#0a1f44">{label}</text>
                        <line x1={x + fbTw / 2} y1={fbCy} x2={nextX} y2={fbCy} stroke="#444" strokeWidth="1.5" markerEnd="url(#bpmn-arrow-fb)" />
                      </g>
                    );
                  })}
                  <circle cx={fbEndX} cy={fbCy} r={fbR} fill="white" stroke="#444" strokeWidth="3" />
                </svg>
              </div>
            </div>
          );
        })()}
      </div>
      </div>
    </div>
  );
}
